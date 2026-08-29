import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("..");
const uploads = path.join(root, "uploads");
const review = path.join(root, "active", "higgsfield-review");
const publicMedia = path.resolve("public", "media");
const immersive = path.resolve("public", "imersiv");

await fs.mkdir(publicMedia, { recursive: true });
await fs.mkdir(path.join(publicMedia, "library"), { recursive: true });

const whatsapp = [
  ["real-01", "WhatsApp Image 2026-06-30 at 23.38.18.jpeg"],
  ["real-02", "WhatsApp Image 2026-06-30 at 23.38.22 (1).jpeg"],
  ["real-03", "WhatsApp Image 2026-06-30 at 23.38.22.jpeg"],
  ["real-04", "WhatsApp Image 2026-06-30 at 23.38.26.jpeg"],
  ["real-05", "WhatsApp Image 2026-06-30 at 23.38.27 (1).jpeg"],
  ["real-06", "WhatsApp Image 2026-06-30 at 23.38.27 (2).jpeg"],
  ["real-07", "WhatsApp Image 2026-06-30 at 23.38.27 (3).jpeg"],
  ["real-08", "WhatsApp Image 2026-06-30 at 23.38.27 (4).jpeg"],
  ["real-09", "WhatsApp Image 2026-06-30 at 23.38.27 (5).jpeg"],
  ["real-10", "WhatsApp Image 2026-06-30 at 23.38.27 (6).jpeg"],
  ["real-11", "WhatsApp Image 2026-06-30 at 23.38.27 (7).jpeg"],
  ["real-12", "WhatsApp Image 2026-06-30 at 23.38.27 (8).jpeg"],
  ["real-13", "WhatsApp Image 2026-06-30 at 23.38.27 (9).jpeg"],
  ["real-14", "WhatsApp Image 2026-06-30 at 23.38.27 (10).jpeg"],
  ["real-15", "WhatsApp Image 2026-06-30 at 23.38.27 (11).jpeg"],
  ["real-16", "WhatsApp Image 2026-06-30 at 23.38.27 (12).jpeg"],
  ["real-17", "WhatsApp Image 2026-06-30 at 23.38.27 (13).jpeg"],
  ["real-18", "WhatsApp Image 2026-06-30 at 23.38.27 (14).jpeg"],
  ["real-19", "WhatsApp Image 2026-06-30 at 23.38.27 (15).jpeg"],
  ["real-20", "WhatsApp Image 2026-06-30 at 23.38.27 (16).jpeg"],
  ["real-21", "WhatsApp Image 2026-06-30 at 23.38.27 (17).jpeg"],
  ["real-22", "WhatsApp Image 2026-06-30 at 23.38.27 (18).jpeg"],
  ["real-23", "WhatsApp Image 2026-06-30 at 23.38.27 (19).jpeg"],
  ["real-24", "WhatsApp Image 2026-06-30 at 23.38.27 (20).jpeg"],
  ["real-25", "WhatsApp Image 2026-06-30 at 23.38.27 (21).jpeg"],
  ["real-26", "WhatsApp Image 2026-06-30 at 23.38.27 (22).jpeg"],
  ["real-27", "WhatsApp Image 2026-06-30 at 23.38.27 (23).jpeg"],
  ["real-28", "WhatsApp Image 2026-06-30 at 23.38.27 (24).jpeg"],
  ["real-29", "WhatsApp Image 2026-06-30 at 23.38.27.jpeg"],
];

async function encode(source, destination, options = {}) {
  const image = sharp(source).rotate();
  if (options.width || options.height) {
    image.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? "cover",
      position: options.position ?? "attention",
      withoutEnlargement: options.withoutEnlargement ?? false,
    });
  }
  await image.webp({ quality: options.quality ?? 80, effort: 5, smartSubsample: true }).toFile(destination);
}

for (const [slug, file] of whatsapp) {
  await encode(path.join(uploads, file), path.join(publicMedia, "library", `${slug}.webp`), {
    width: 1600,
    fit: "inside",
    withoutEnlargement: true,
    quality: 78,
  });
}

const curated = [
  [path.join(review, "hero-desktop.png"), path.join(publicMedia, "hero-desktop.webp"), { width: 2200, height: 1238, position: "center" }],
  [path.join(review, "hero-mobile.png"), path.join(publicMedia, "hero-mobile.webp"), { width: 1040, height: 1300, position: "center" }],
  [path.join(review, "interview-candidate.png"), path.join(publicMedia, "interview-editorial.webp"), { width: 1600, height: 1067, position: "center" }],
  [path.join(uploads, whatsapp[20][1]), path.join(publicMedia, "recruitment-candidate.webp"), { width: 1400, height: 1050, position: "center" }],
  [path.join(uploads, whatsapp[23][1]), path.join(publicMedia, "story-event.webp"), { width: 1400, height: 1000, position: "center" }],
  [path.join(uploads, whatsapp[3][1]), path.join(publicMedia, "story-community.webp"), { width: 1400, height: 900, position: "center" }],
  [path.join(uploads, whatsapp[6][1]), path.join(publicMedia, "story-recruitment.webp"), { width: 1000, height: 1300, position: "center" }],
  [path.join(review, "interview-candidate.png"), path.join(publicMedia, "story-interview.webp"), { width: 1200, height: 900, position: "center" }],
];
for (const [source, destination, options] of curated) await encode(source, destination, options);

// The immersive HTML keeps stable filenames. Replace only the bytes behind them
// so route structure and markup remain recognizable.
const landing = [
  [path.join(review, "hero-mobile.png"), "church.webp", { width: 1040, height: 1300, position: "center" }],
  [path.join(uploads, whatsapp[23][1]), "echoes-unplugged.webp", { width: 1100, height: 1375, position: "center" }],
  [path.join(uploads, whatsapp[1][1]), "event-easter.webp", { width: 900, height: 1125, position: "center" }],
  [path.join(uploads, whatsapp[2][1]), "event-cupid.webp", { width: 900, height: 1125, position: "center" }],
  [path.join(uploads, whatsapp[23][1]), "year-2024.webp", { width: 1300, height: 820, position: "center" }],
  [path.join(uploads, whatsapp[18][1]), "year-2025.webp", { width: 1300, height: 820, position: "center" }],
  [path.join(uploads, whatsapp[20][1]), "year-2026.webp", { width: 1300, height: 820, position: "center" }],
  [path.join(uploads, whatsapp[20][1]), "team-interact.webp", { width: 1500, height: 900, position: "center" }],
  [path.join(uploads, whatsapp[3][1]), "stat-community.webp", { width: 700, height: 700, position: "center" }],
  [path.join(uploads, whatsapp[23][1]), "stat-concert.webp", { width: 700, height: 700, position: "center" }],
  [path.join(uploads, whatsapp[19][1]), "stat-scan.webp", { width: 700, height: 700, position: "center" }],
];
for (const [source, name, options] of landing) await encode(source, path.join(immersive, name), options);

console.log(`Prepared ${whatsapp.length} library assets, ${curated.length} curated variants, and ${landing.length} landing replacements.`);
