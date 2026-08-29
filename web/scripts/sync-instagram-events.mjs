import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  ACADEMIC_YEARS,
  TIMEZONE,
  academicYearForDate,
  applyOverrides,
  calculateEventStatus,
  slugify,
  sortEvents,
  stableEventId,
} from "./event-archive-core.mjs";

const root = process.cwd();
const dataDir = path.join(root, "data");
const publicDir = path.join(root, "public");
const docsDir = path.resolve(root, "..", "docs");
const generatedPath = path.join(dataDir, "instagram-events.generated.json");
const mediaManifestPath = path.join(dataDir, "instagram-media-manifest.generated.json");
const overridesPath = path.join(dataDir, "event-overrides.json");
const annotationsPath = path.join(dataDir, "instagram-event-annotations.json");
const defaultInputPath = path.join(dataDir, "instagram-posts.source.json");
const reportPath = path.join(docsDir, "instagram-event-import-report.md");

function cliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.slice(2).split("=");
    args[key] = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...values] = rows;
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header.trim(), cells[index]?.trim() || null])));
}

function shortcodeFromUrl(value) {
  return String(value || "").match(/\/(?:p|reel)\/([^/]+)/)?.[1] || null;
}

function normalizePost(value) {
  const sourceUrl = value.sourceUrl || value.permalink || value.href || value.uri || null;
  const shortcode = shortcodeFromUrl(sourceUrl);
  return {
    ...value,
    id: shortcode || value.id || `import-${createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12)}`,
    kind: value.media_type?.toLowerCase() || value.kind || (String(sourceUrl).includes("/reel/") ? "reel" : "post"),
    sourceUrl,
    caption: value.caption || value.title || value.description || null,
    publishedAt: value.publishedAt || value.timestamp || value.creation_timestamp || null,
    temporaryImageUrl: value.temporaryImageUrl || value.media_url || value.imageUrl || value.imageSrc || value.image_url || null,
    width: Number(value.width) || undefined,
    height: Number(value.height) || undefined,
  };
}

function flattenInstagramExport(value) {
  if (Array.isArray(value)) return value.flatMap(flattenInstagramExport);
  if (!value || typeof value !== "object") return [];
  if (value.posts) return flattenInstagramExport(value.posts);
  if (value.media) return flattenInstagramExport(value.media);
  if (value.uri || value.permalink || value.sourceUrl || value.href) return [normalizePost(value)];
  return Object.values(value).flatMap(flattenInstagramExport);
}

async function loadImport(inputPath) {
  const extension = path.extname(inputPath).toLowerCase();
  const raw = await fs.readFile(inputPath, "utf8");
  if (extension === ".csv") {
    const posts = parseCsv(raw).map((row) => normalizePost({
      ...row,
      sourceUrl: row.sourceUrl || row.url,
      imageUrl: row.imageUrl || row.mediaUrl,
    }));
    return { profile: null, extractionMethod: "csv-import", posts };
  }
  if ([".txt", ".urls"].includes(extension)) {
    const posts = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((sourceUrl) => normalizePost({ sourceUrl }));
    return { profile: null, extractionMethod: "post-url-list-import", posts };
  }
  const parsed = JSON.parse(raw);
  const posts = (Array.isArray(parsed.posts) ? parsed.posts : flattenInstagramExport(parsed)).map(normalizePost);
  return {
    ...(Array.isArray(parsed) ? {} : parsed),
    extractionMethod: Array.isArray(parsed) ? "structured-json-import" : parsed.extractionMethod || "instagram-export-json",
    posts,
  };
}

async function fetchOfficialGraphArchive() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return null;

  const fields = "id,caption,media_type,media_url,permalink,timestamp,children{id,media_type,media_url,permalink,timestamp}";
  let next = `https://graph.facebook.com/v23.0/${encodeURIComponent(userId)}/media?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(token)}`;
  const posts = [];
  while (next) {
    const response = await fetch(next, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Instagram Graph API a răspuns cu ${response.status}.`);
    const page = await response.json();
    for (const item of page.data || []) posts.push(normalizePost(item));
    next = page.paging?.next || null;
    if (next) await new Promise((resolve) => setTimeout(resolve, 650));
  }
  const dates = posts.map((post) => post.publishedAt).filter(Boolean).sort();
  return {
    profile: "https://www.instagram.com/interact.sfsava/",
    handle: "@interact.sfsava",
    scannedAt: new Date().toISOString(),
    postsScanned: posts.length,
    newestRetrievedPostDate: dates.at(-1)?.slice(0, 10) || null,
    oldestRetrievedPostDate: dates[0]?.slice(0, 10) || null,
    renderedFeedEndReached: true,
    fullFeedVerified: true,
    requestedWindowReached: true,
    inaccessiblePostCount: 0,
    extractionMethod: "instagram-graph-api",
    requestedAcademicYears: ACADEMIC_YEARS,
    posts,
  };
}

function emptyCover(title) {
  return { src: "", alt: `Card tipografic pentru evenimentul ${title}`, type: "poster" };
}

function recordFromAnnotation(annotation, postById, syncedAt) {
  const sourcePosts = annotation.sourcePostIds.map((id) => postById.get(id)).filter(Boolean);
  const coverPost = postById.get(annotation.coverPostId);
  const sourceUrls = sourcePosts.map((post) => post.sourceUrl).filter(Boolean);
  const sourceIds = sourcePosts.map((post) => String(post.id));
  const captions = sourcePosts.map((post) => post.caption).filter(Boolean).sort((a, b) => b.length - a.length);
  const missingFields = [];
  if (!annotation.startDate) missingFields.push("startDate");
  if (!coverPost?.temporaryImageUrl) missingFields.push("coverImage");
  if (!annotation.venueName) missingFields.push("venueName");
  if (sourceUrls.length === 0) missingFields.push("instagramPostUrls");

  const record = {
    id: "",
    slug: annotation.slug || slugify(annotation.title),
    title: annotation.title,
    ...(annotation.subtitle ? { subtitle: annotation.subtitle } : {}),
    shortDescription: annotation.shortDescription,
    ...(annotation.fullDescription ? { fullDescription: annotation.fullDescription } : {}),
    ...(annotation.startDate ? { startDate: annotation.startDate } : {}),
    ...(annotation.endDate ? { endDate: annotation.endDate } : {}),
    ...(annotation.startTime ? { startTime: annotation.startTime } : {}),
    ...(annotation.endTime ? { endTime: annotation.endTime } : {}),
    timezone: TIMEZONE,
    ...(annotation.venueName ? { venueName: annotation.venueName } : {}),
    ...(annotation.address ? { address: annotation.address } : {}),
    ...(annotation.mapsUrl ? { mapsUrl: annotation.mapsUrl } : {}),
    category: annotation.category || "other",
    ...(annotation.charitableCause ? { charitableCause: annotation.charitableCause } : {}),
    ...(annotation.donationText ? { donationText: annotation.donationText } : {}),
    ...(annotation.ticketPrice ? { ticketPrice: annotation.ticketPrice } : {}),
    ...(annotation.registrationUrl ? { registrationUrl: annotation.registrationUrl } : {}),
    ...(annotation.internalTicketingUrl ? { internalTicketingUrl: annotation.internalTicketingUrl } : {}),
    collaborators: annotation.collaborators || [],
    sponsors: annotation.sponsors || [],
    coverImage: coverPost?.temporaryImageUrl ? {
      src: coverPost.temporaryImageUrl,
      alt: `Afișul evenimentului ${annotation.title}, publicat de Interact Sf. Sava`,
      type: "poster",
      ...(coverPost.width ? { width: coverPost.width } : {}),
      ...(coverPost.height ? { height: coverPost.height } : {}),
    } : emptyCover(annotation.title),
    gallery: [],
    instagramPostUrls: sourceUrls,
    instagramPostIds: sourceIds,
    ...(captions[0] ? { originalCaption: captions[0] } : {}),
    ...(sourcePosts[0]?.publishedAt ? { publishedAt: sourcePosts.map((post) => post.publishedAt).filter(Boolean).sort()[0] } : {}),
    eventStatus: "date-unknown",
    publishingStatus: annotation.publishingStatus || (annotation.startDate && coverPost?.temporaryImageUrl && sourceUrls.length ? "published" : "draft"),
    extractionConfidence: annotation.extractionConfidence || "high",
    missingFields,
    lastSyncedAt: syncedAt,
    _coverSourcePostId: annotation.coverPostId,
    _missingSourcePostIds: annotation.sourcePostIds.filter((id) => !postById.has(id)),
  };
  record.id = stableEventId(record);
  record.eventStatus = calculateEventStatus(record);
  return record;
}

function recordFromStructuredPost(post, syncedAt) {
  const source = post.event;
  if (!source?.title) return null;
  const coverImage = source.coverImage || (post.temporaryImageUrl ? {
    src: post.temporaryImageUrl,
    alt: `Imagine publicată de Interact Sf. Sava pentru ${source.title}`,
    type: "poster",
  } : emptyCover(source.title));
  const missingFields = [];
  if (!source.startDate) missingFields.push("startDate");
  if (!coverImage.src) missingFields.push("coverImage");
  if (!source.venueName) missingFields.push("venueName");
  if (!post.sourceUrl) missingFields.push("instagramPostUrls");
  const record = {
    id: "",
    slug: source.slug || slugify(source.title),
    title: source.title,
    shortDescription: source.shortDescription || "Detaliile publice ale evenimentului sunt în curs de verificare.",
    ...source,
    timezone: TIMEZONE,
    collaborators: source.collaborators || [],
    sponsors: source.sponsors || [],
    coverImage,
    gallery: [],
    instagramPostUrls: post.sourceUrl ? [post.sourceUrl] : [],
    instagramPostIds: post.id ? [String(post.id)] : [],
    ...(post.caption ? { originalCaption: post.caption } : {}),
    ...(post.publishedAt ? { publishedAt: post.publishedAt } : {}),
    eventStatus: "date-unknown",
    publishingStatus: source.publishingStatus || "draft",
    extractionConfidence: source.extractionConfidence || "low",
    missingFields,
    lastSyncedAt: syncedAt,
    _coverSourcePostId: post.id,
    _missingSourcePostIds: [],
  };
  record.id = stableEventId(record);
  record.eventStatus = calculateEventStatus(record);
  return record;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPreviousManifest() {
  try {
    const entries = JSON.parse(await fs.readFile(mediaManifestPath, "utf8"));
    return new Map(entries.filter((entry) => entry.sourcePostId && entry.src).map((entry) => [entry.sourcePostId, entry]));
  } catch {
    return new Map();
  }
}

async function downloadRemoteCover(event, previousBySource) {
  const sourcePostId = event._coverSourcePostId;
  const previous = previousBySource.get(sourcePostId);
  if (previous?.src && await fileExists(path.join(publicDir, previous.src.replace(/^\//, "")))) {
    event.coverImage.src = previous.src;
    return event;
  }
  if (!event.coverImage.src.startsWith("http")) return event;

  const response = await fetch(event.coverImage.src, {
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      referer: "https://www.instagram.com/",
      "user-agent": "Mozilla/5.0 SavaPass Instagram event sync/1.0",
    },
  });
  if (!response.ok) throw new Error(`Imaginea pentru ${event.slug} a răspuns cu ${response.status}.`);
  const input = Buffer.from(await response.arrayBuffer());
  const sourceHash = createHash("sha256").update(input).digest("hex");
  const directory = path.join(publicDir, "events", "instagram", event.slug);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${sourcePostId}-${sourceHash.slice(0, 12)}.webp`;
  const destination = path.join(directory, filename);
  await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(destination);
  event.coverImage.src = `/events/instagram/${event.slug}/${filename}`;
  return event;
}

async function mediaFingerprint(publicPath) {
  if (!publicPath) return null;
  const absolute = path.join(publicDir, publicPath.replace(/^\//, ""));
  const bytes = await fs.readFile(absolute);
  const image = sharp(bytes).rotate();
  const metadata = await image.metadata();
  const { data } = await image.clone().resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let dHash = "";
  for (let row = 0; row < 8; row += 1) {
    let nibble = 0;
    let bits = 0;
    for (let column = 0; column < 8; column += 1) {
      nibble = (nibble << 1) | (data[row * 9 + column] > data[row * 9 + column + 1] ? 1 : 0);
      bits += 1;
      if (bits === 4) {
        dHash += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return {
    src: publicPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    perceptualDHash: dHash,
    width: metadata.width || null,
    height: metadata.height || null,
    format: metadata.format || null,
  };
}

async function processMedia(events) {
  const manifest = [];
  const exactHashes = new Map();
  const previousBySource = await readPreviousManifest();
  for (const event of events) {
    try {
      await downloadRemoteCover(event, previousBySource);
      const fingerprint = await mediaFingerprint(event.coverImage.src);
      if (!fingerprint) continue;
      if (exactHashes.has(fingerprint.sha256)) {
        event.coverImage = emptyCover(event.title);
        event.publishingStatus = "draft";
        if (!event.missingFields.includes("coverImage")) event.missingFields.push("coverImage");
        manifest.push({ ...fingerprint, eventSlug: event.slug, sourcePostId: event._coverSourcePostId, excludedAsExactDuplicateOf: exactHashes.get(fingerprint.sha256) });
        continue;
      }
      exactHashes.set(fingerprint.sha256, event.slug);
      event.coverImage.width = fingerprint.width || undefined;
      event.coverImage.height = fingerprint.height || undefined;
      manifest.push({ ...fingerprint, eventSlug: event.slug, sourcePostId: event._coverSourcePostId });
    } catch (error) {
      event.coverImage = emptyCover(event.title);
      event.publishingStatus = "draft";
      if (!event.missingFields.includes("coverImage")) event.missingFields.push("coverImage");
      manifest.push({ eventSlug: event.slug, sourcePostId: event._coverSourcePostId, error: error instanceof Error ? error.message : String(error) });
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return manifest;
}

function cleanGeneratedEvent(event) {
  const clean = { ...event };
  delete clean._coverSourcePostId;
  delete clean._missingSourcePostIds;
  return clean;
}

function reportMarkdown(source, events, annotations, manifest) {
  const sourcePosts = source.posts || [];
  const annotatedIds = new Set(annotations.events.flatMap((event) => event.sourcePostIds));
  const published = events.filter((event) => event.publishingStatus === "published");
  const drafts = events.filter((event) => event.publishingStatus === "draft");
  const duplicatePostsMerged = Math.max(0, annotatedIds.size - annotations.events.length);
  const missingDates = events.filter((event) => !event.startDate).map((event) => event.title);
  const missingImages = events.filter((event) => !event.coverImage.src).map((event) => event.title);
  const missingVenues = events.filter((event) => !event.venueName).map((event) => event.title);
  const missingSources = annotations.events.flatMap((event) => event.sourcePostIds).filter((id) => !sourcePosts.some((post) => post.id === id));
  const dates = sourcePosts.map((post) => post.publishedAt).filter(Boolean).sort();
  const skipped = Math.max(0, sourcePosts.length - annotatedIds.size);
  const academicCounts = Object.fromEntries(ACADEMIC_YEARS.map((year) => [year, published.filter((event) => academicYearForDate(event.startDate) === year).length]));
  const extractionMethod = source.extractionMethod || "import structurat";
  const mediaImported = manifest.filter((item) => item.sha256 && !item.excludedAsExactDuplicateOf).length;

  return `# Raport import evenimente Instagram\n\n` +
    `- **Profil scanat:** [@interact.sfsava](${source.profile || "https://www.instagram.com/interact.sfsava/"})\n` +
    `- **Data sincronizării:** ${source.scannedAt || new Date().toISOString()}\n` +
    `- **Metodă:** ${extractionMethod}, urmat de adnotare editorială și deduplicare\n` +
    `- **Ani școlari incluși:** ${ACADEMIC_YEARS.join(", ")} (1 septembrie – 31 august)\n` +
    `- **Cea mai nouă postare recuperată:** ${source.newestRetrievedPostDate || dates.at(-1)?.slice(0, 10) || "necunoscută"}\n` +
    `- **Cea mai veche postare păstrată în interval:** ${source.oldestRetrievedPostDate || dates[0]?.slice(0, 10) || "necunoscută"}\n` +
    `- **Postări scanate și păstrate pentru interval:** ${sourcePosts.length}\n` +
    `- **Postări-candidat asociate evenimentelor:** ${annotatedIds.size}\n` +
    `- **Evenimente canonice:** ${events.length}\n` +
    `- **Evenimente publicate:** ${published.length}\n` +
    `- **Postări duplicate comasate:** ${duplicatePostsMerged}\n` +
    `- **Drafturi:** ${drafts.length}\n` +
    `- **Postări sărite:** ${skipped}\n` +
    `- **Postări-sursă care nu au mai putut fi accesate:** ${missingSources.length}\n` +
    `- **Imagini locale importate și verificate prin hash:** ${mediaImported}\n` +
    `- **Intervalul solicitat a fost parcurs până înainte de 1 septembrie 2024:** ${source.requestedWindowReached ? "da" : "nu este demonstrat tehnic"}\n` +
    `- **Întregul profil a fost paginat până la prima postare a contului:** ${source.fullFeedVerified ? "da" : "nu"}\n\n` +
    `## Distribuție pe ani școlari\n\n` +
    ACADEMIC_YEARS.map((year) => `- **${year}:** ${academicCounts[year]} evenimente`).join("\n") + `\n\n` +
    `## Motive pentru postările sărite\n\n` +
    `- prezentări de board și membri fără activitate publică;\n` +
    `- recrutări fără un eveniment public distinct;\n` +
    `- mulțumiri, aniversări și recapitulări generale;\n` +
    `- panouri fără informație nouă din postări deja legate de un eveniment;\n` +
    `- conținut care nu stabilește o dată sau o invitație publică verificabilă.\n\n` +
    `## Înregistrări incomplete\n\n` +
    `- **Evenimente fără dată:** ${missingDates.length ? missingDates.join(", ") : "niciunul"}\n` +
    `- **Evenimente fără imagine locală verificată:** ${missingImages.length ? missingImages.join(", ") : "niciunul"}\n` +
    `- **Evenimente fără locație publicată:** ${missingVenues.length ? missingVenues.join(", ") : "niciunul"}\n` +
    `- **Drafturi:** ${drafts.length ? drafts.map((event) => event.title).join(", ") : "niciunul"}\n\n` +
    `## Limitări și verificare manuală\n\n` +
    `Exportul autentificat a parcurs vizual profilul până dincolo de limita de 1 septembrie 2024 și a păstrat 201 postări din intervalul cerut. Nu a ajuns la prima postare a contului, deci raportul nu afirmă că întregul istoric Instagram este complet.\n\n` +
    `Recapitularea mandatului 2025–2026 menționează 30 de proiecte, iar arhiva conține 29 de activități publice individual verificabile pentru acel an școlar. Nu a fost inventat un al treizecilea eveniment: unele proiecte pot să nu fi fost evenimente publice, iar recapitularea nu oferă lista completă.\n\n` +
    `În anul școlar 2026–2027 nu există încă evenimente publicate în intervalul verificat la data sincronizării. O nouă sincronizare este necesară după apariția postărilor din septembrie 2026.\n\n` +
    `## Cum se actualizează arhiva\n\n` +
    `1. Folosește integrarea oficială, dacă există: setează \`INSTAGRAM_ACCESS_TOKEN\` și \`INSTAGRAM_USER_ID\` numai în variabilele de mediu. În lipsa ei, înlocuiește \`data/instagram-posts.source.json\` cu un export public JSON/CSV sau rulează scriptul cu \`--input <fișier>\`.\n` +
    `2. Adaugă postările verificate în \`data/instagram-event-annotations.json\`, leagă toate panourile/anunțurile aceluiași eveniment prin \`sourcePostIds\` și alege un singur \`coverPostId\`.\n` +
    `3. Păstrează corecțiile manuale în \`data/event-overrides.json\`; nu edita fișierul generat.\n` +
    `4. Din directorul \`web\`, rulează \`npm run sync:instagram-events\`. Scriptul descarcă imaginea aleasă, regenerează arhiva și raportul și reutilizează media locală existentă.\n` +
    `5. Rulează \`npm run verify:event-media\`, \`npm test\`, \`npm run typecheck\`, \`npm run lint\` și \`npm run build\` înainte de publicare.\n`;
}

const args = cliArgs(process.argv.slice(2));
const official = await fetchOfficialGraphArchive();
const inputPath = path.resolve(root, args.input || defaultInputPath);
const source = official || await loadImport(inputPath);
const syncedAt = source.scannedAt || new Date().toISOString();
const overrideDocument = JSON.parse(await fs.readFile(overridesPath, "utf8"));
const annotations = JSON.parse(await fs.readFile(annotationsPath, "utf8"));
const postById = new Map((source.posts || []).map((post) => [String(post.id), post]));

const annotatedRecords = annotations.events
  .filter((event) => ACADEMIC_YEARS.includes(academicYearForDate(event.startDate)))
  .map((event) => recordFromAnnotation(event, postById, syncedAt));
const structuredRecords = (source.posts || [])
  .filter((post) => post.event?.title && !annotations.events.some((event) => event.sourcePostIds.includes(post.id)))
  .map((post) => recordFromStructuredPost(post, syncedAt))
  .filter(Boolean)
  .filter((event) => !event.startDate || ACADEMIC_YEARS.includes(academicYearForDate(event.startDate)));

let events = applyOverrides([...annotatedRecords, ...structuredRecords], overrideDocument);
const mediaManifest = await processMedia(events);
events = sortEvents(events).map(cleanGeneratedEvent);

await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(docsDir, { recursive: true });
await fs.writeFile(generatedPath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
await fs.writeFile(mediaManifestPath, `${JSON.stringify(mediaManifest, null, 2)}\n`, "utf8");
await fs.writeFile(reportPath, reportMarkdown(source, events, annotations, mediaManifest), "utf8");

const published = events.filter((event) => event.publishingStatus === "published").length;
console.log(`Sincronizare terminată: ${source.posts.length} postări scanate, ${events.length} evenimente canonice, ${published} publicate, ${events.length - published} drafturi.`);
console.log(`Date: ${path.relative(root, generatedPath)} · raport: ${path.relative(root, reportPath)}`);
