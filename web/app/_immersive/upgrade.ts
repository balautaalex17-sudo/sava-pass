import { renderEditorialBoard } from "./board-showcase";
import { recruitmentSteps } from "@/lib/recruitment-copy";
export { BOARD_SHOWCASE_CSS } from "./board-styles";

const INTRO_VIDEOS = `  <video class="mhi-ambient" autoplay muted loop playsinline preload="metadata" aria-hidden="true" src="/imersiv/intro-ambient.mp4"></video>
  <video class="intro-video" autoplay muted loop playsinline preload="metadata" fetchpriority="low" aria-hidden="true" src="/imersiv/savapass-ticket-engine-loop.mp4"></video>`;

const HERO_VIDEO = `  <video class="hero-video" autoplay muted loop playsinline preload="metadata" fetchpriority="low" aria-hidden="true" src="/imersiv/savapass-hero-loop.mp4"></video>`;

// Mobile uses the CSS ticket-engine artwork, so these decorative videos only
// receive a source on viewports where they are actually visible.
const DESKTOP_INTRO_VIDEOS = `  <video class="mhi-ambient" width="540" height="960" autoplay muted loop playsinline preload="none" aria-hidden="true" style="visibility:hidden"><source media="(min-width: 761px)" data-src="/imersiv/intro-ambient.mp4" type="video/mp4" /></video>
  <video class="intro-video" width="1280" height="720" autoplay muted loop playsinline preload="none" fetchpriority="low" aria-hidden="true" style="visibility:hidden"><source media="(min-width: 761px)" data-src="/imersiv/savapass-ticket-engine-loop.mp4" type="video/mp4" /></video>`;

const DESKTOP_HERO_VIDEO = `  <video class="hero-video" width="1280" height="720" autoplay muted loop playsinline preload="none" fetchpriority="low" aria-hidden="true" style="visibility:hidden"><source media="(min-width: 761px)" data-src="/imersiv/savapass-hero-loop.mp4" type="video/mp4" /></video>`;

const FOOTER_NAVIGATION = `    <nav class="foot-nav rv" style="--d:.04s" aria-label="Navigare">
      <a href="#event">Evenimente</a>
      <a href="#hero">Bilete</a>
      <a href="#stats">Impact</a>
      <a href="#join">Devino membru</a>
      <a href="https://instagram.com/interact.sfsava" target="_blank" rel="noopener">Instagram</a>
    </nav>`;

const SECTION_DOTS = `<nav class="dots" aria-hidden="true">
  <a href="#intro" data-s="intro" class="on">01<span class="b"></span></a>
  <a href="#hero" data-s="hero">02<span class="b"></span></a>
  <a href="#event" data-s="event">03<span class="b"></span></a>
  <a href="#stats" data-s="stats">04<span class="b"></span></a>
  <a href="#join" data-s="join">05<span class="b"></span></a>
</nav>`;

const LEFT_PROGRESS_RAIL = `<div class="lrail" aria-hidden="true"><span class="fill"></span><span class="tag">SavaPass · Interact Sf. Sava</span></div>`;

function buildInteractWheelSvg() {
  const center = 120;
  const color = "#00A7E8";
  const point = (x: number, y: number, cosine: number, sine: number) =>
    `${(x * cosine - y * sine + center).toFixed(1)},${(x * sine + y * cosine + center).toFixed(1)}`;
  const polygons = (count: number, points: number[][]) =>
    Array.from({ length: count }, (_, index) => {
      const angle = (index * 2 * Math.PI) / count;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return `<polygon points="${points.map(([x, y]) => point(x, y, cosine, sine)).join(" ")}" fill="${color}" />`;
    }).join("");

  const teeth = polygons(24, [[-7, -100], [-4, -116], [4, -116], [7, -100]]);
  const spokes = polygons(8, [[-4.5, -30], [-8.5, -86], [8.5, -86], [4.5, -30]]);
  return `<svg viewBox="0 0 240 240" class="wheel-svg" aria-hidden="true"><g class="gear">${teeth}<circle cx="120" cy="120" r="93" fill="none" stroke="${color}" stroke-width="15" />${spokes}<circle cx="120" cy="120" r="30" fill="${color}" /><circle cx="120" cy="120" r="9" fill="#F7FAFC" /></g></svg>`;
}

const INTERACT_WHEEL_SVG = buildInteractWheelSvg();

export type LandingShowcaseEvent = {
  title: string;
  subtitle: string | null;
  about: string | null;
  dateLabel: string;
  venue: string;
  priceBani: number;
  photoUrl: string | null;
  detailsHref: string;
  checkoutHref: string;
  status: "active" | "ended";
};

export type LandingRecruitment = {
  title: string;
  intro: string;
  closedMessage: string;
  isOpen: boolean;
  closesAt?: string | null;
};

const BOARD_MEMBERS = [
  {
    role: "President",
    name: "Rugină Maia",
    initials: "RM",
    area: "Direcție generală",
    summary: "Coordonează direcția clubului și activitatea întregului board.",
  },
  {
    role: "Past President",
    name: "Bogdan Mircea",
    initials: "BM",
    area: "Continuitate",
    summary: "Păstrează continuitatea între mandate și sprijină deciziile board-ului.",
  },
  {
    role: "Vice President",
    name: "Țone Adelina",
    initials: "ȚA",
    area: "Coordonare internă",
    summary: "Urmărește prioritățile și susține coordonarea internă a clubului.",
  },
  {
    role: "Secretary",
    name: "Balașcă Carla",
    initials: "BC",
    area: "Organizare",
    summary: "Ține evidența ședințelor, documentelor și calendarului de lucru.",
  },
  {
    role: "Treasurer",
    name: "Niemesch Cristian",
    initials: "NC",
    area: "Finanțe",
    summary: "Gestionează bugetul, plățile și raportarea financiară a proiectelor.",
  },
  {
    role: "Director PR",
    name: "Craciun Daria",
    initials: "CD",
    area: "Comunicare",
    summary: "Coordonează imaginea clubului și comunicarea cu publicul.",
  },
  {
    role: "Director HR",
    name: "Naghi Sabin",
    initials: "NS",
    area: "Echipă",
    summary: "Are grijă de integrarea membrilor și de dinamica echipei.",
  },
  {
    role: "Project Manager",
    name: "Bălulescu Sara",
    initials: "BS",
    area: "Proiecte",
    summary: "Planifică proiectele și ține echipele aliniate pe parcursul lor.",
  },
  {
    role: "I&E Relations Director",
    name: "Ogrezeanu-Costescu Sofia",
    showName: false,
    initials: "OS",
    area: "Relații externe",
    summary: "Ține legătura cu partenerii și cu celelalte cluburi Interact.",
  },
] as const;

function renderBoardSection() {
  return renderEditorialBoard(BOARD_MEMBERS);
}

function replaceLegacyStatsSection(markup: string) {
  return markup.replace(
    /<!-- ═══ STATS ═══ -->[\s\S]*?(?=<!-- ═══ JOIN · Devino membru ═══ -->)/,
    `${renderBoardSection()}\n\n`,
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function safePhotoUrl(value: string | null) {
  if (value && (value.startsWith("/") || value.startsWith("https://"))) return escapeHtml(value);
  return "/media/story-event.webp";
}

const MAX_SHOWCASE_EVENTS = 3;
const EVENT_SECTION_PATTERN = /<section class="sec" id="event"[\s\S]*?<\/section>/;

export function prepareShowcaseEvents(events: readonly LandingShowcaseEvent[]) {
  return events
    .map((event, index) => ({ event, index }))
    .sort((first, second) => {
      const firstIsActive = first.event.status === "active";
      const secondIsActive = second.event.status === "active";
      if (firstIsActive !== secondIsActive) return firstIsActive ? -1 : 1;
      return first.index - second.index;
    })
    .slice(0, MAX_SHOWCASE_EVENTS)
    .map(({ event }) => event);
}

function renderShowcaseCards(events: readonly LandingShowcaseEvent[]) {
  return events.map((event, index) => {
    const description = event.about ?? event.subtitle ?? "Detaliile acestei ediții sunt disponibile pe pagina evenimentului.";
    const isActive = event.status === "active";
    const statusLabel = isActive ? "Activ" : "Eveniment încheiat";
    const actionLabel = isActive ? "Rezervă bilet" : "Vezi ediția";
    const href = isActive ? event.checkoutHref : event.detailsHref;
    const price = event.priceBani > 0 ? `${Math.round(event.priceBani / 100)} RON` : "Acces gratuit";
    const cardRole = index === 0 ? " ev-past--lead" : " ev-past--support";
    const priceMarkup = isActive ? `<span class="ev-past-price">${escapeHtml(price)}</span>` : "";
    const locationMarkup = isActive
      ? `<div class="ev-active-location" aria-label="Locație: ${escapeHtml(event.venue)}"><span>Locație</span><strong>${escapeHtml(event.venue)}</strong></div>`
      : "";
    const descriptionMarkup = isActive
      ? escapeHtml(description)
      : `<strong>${escapeHtml(event.venue)}</strong> · ${escapeHtml(description)}`;

    return `<a href="${escapeHtml(href)}" class="ev-past ev-past--managed${cardRole}${isActive ? " ev-past--active" : ""}" aria-label="${escapeHtml(`${actionLabel}: ${event.title}`)}">
        <div class="ev-past-poster"><img src="${safePhotoUrl(event.photoUrl)}" loading="lazy" decoding="async" alt="Afișul evenimentului ${escapeHtml(event.title)}" /></div>
        <div class="ev-past-body">
          <div class="ev-past-tags"><span class="ev-cat">${escapeHtml(event.dateLabel)}</span><span class="ev-sold${isActive ? " ev-sold--active" : ""}">${escapeHtml(statusLabel)}</span></div>
          ${locationMarkup}
          <h4 class="ev-past-title">${escapeHtml(event.title)}</h4>
          <p class="ev-past-desc">${descriptionMarkup}</p>
          <div class="ev-past-footer">${priceMarkup}<span class="ev-past-action">${escapeHtml(actionLabel)} <span class="ar" data-i="arrow" aria-hidden="true"></span></span></div>
        </div>
      </a>`;
  }).join("\n      ");
}

function applyShowcaseContent(markup: string, events: readonly LandingShowcaseEvent[]) {
  if (events.length === 0) return markup.replace(EVENT_SECTION_PATTERN, "");

  return markup.replace(EVENT_SECTION_PATTERN, `<section class="sec" id="event" data-screen-label="Evenimente" aria-labelledby="showcase-title">
  <div class="wrap">
    <div class="ev-showcase-head rv">
      <div class="ev-showcase-copy"><h2 class="ev-showcase-title" id="showcase-title">Seri care ne aduc împreună</h2><p>O selecție de evenimente SavaPass, fiecare cu atmosfera, energia și povestea ei.</p></div>
      <a href="/evenimente#toate-evenimentele" class="ev-all rv" style="--d:.12s;">Toate edițiile <span class="ar" data-i="arrow"></span></a>
    </div>
    <div class="ev-arch ev-showcase-grid">
      ${renderShowcaseCards(events)}
    </div>
  </div>
</section>`);
}

function applyGenericTicketDemo(markup: string) {
  return markup
    .replace(
      '<div><div class="e">Bilet activ</div><h3>Echoes<br/>Unplugged</h3></div>',
      '<div><div class="e">Model SavaPass</div><h3>Bilet<br/>digital</h3></div>',
    )
    .replace('<span class="tk-stat"><span class="tk-live"></span>Valid</span>', '<span class="tk-stat"><span class="tk-live"></span>Demo</span>')
    .replace('<div>Locul<b>Curtea Veche</b></div>', '<div>Locul<b>De anunțat</b></div>')
    .replace('<div style="text-align:right;">Data<b>Vin · 14 Nov</b></div>', '<div style="text-align:right;">Data<b>În curând</b></div>');
}

function applyEventsFooter(markup: string) {
  const footerCopy = '<p class="nx rv" style="--d:.08s">O selecție din serile SavaPass, într-un singur loc.<br/>Descoperă evenimentele active și poveștile edițiilor încheiate.</p><a href="/evenimente#toate-evenimentele" class="btn btn-p mag rv" style="--d:.14s">Toate edițiile <span class="ar" data-i="arrow"></span></a>';
  return markup.replace(/<p class="nx rv" style="--d:\.08s">[\s\S]*?<\/p>\n      <a href="__CTA_HREF__" class="btn btn-p mag rv" style="--d:\.14s">[\s\S]*?<\/a>/, footerCopy);
}

function applyRecruitmentContent(markup: string, recruitment: LandingRecruitment | null) {
  const linkedMarkup = markup
    .replace(
      '<a href="/devino-membru" class="btn btn-p mag">Aplică acum <span class="ar" data-i="arrow"></span></a>',
      '<a href="/devino-membru#aplica" class="btn btn-p mag">Completează formularul <span class="ar" data-i="arrow"></span></a>',
    )
    .replace(
      '<button class="btn btn-g mag">Cum decurge</button>',
      '<a href="/devino-membru#process-title" class="btn btn-g mag">Vezi pașii</a>',
    );

  if (!recruitment) return linkedMarkup;
  const start = linkedMarkup.indexOf('<section class="sec join"');
  const end = start === -1 ? -1 : linkedMarkup.indexOf("</section>", start);
  if (start === -1 || end === -1) return linkedMarkup;

  const sectionEnd = end + "</section>".length;
  const section = linkedMarkup.slice(start, sectionEnd);
  const eyebrow = recruitment.isOpen
    ? `Devino membru · ${escapeHtml(recruitment.title)}`
    : `Recrutare · ${escapeHtml(recruitment.title)}`;
  const copy = escapeHtml(recruitment.isOpen ? recruitment.intro : recruitment.closedMessage);
  const primary = recruitment.isOpen
    ? '<a href="/devino-membru#aplica" class="btn btn-p mag">Completează formularul <span class="ar" data-i="arrow"></span></a>'
    : '<span class="btn btn-g recruitment-locked" aria-disabled="true">Înscrieri închise</span>';

  const updated = section
    .replace(/<h2 class="h2 rv"[^>]*>[\s\S]*?<\/h2>/, '<h2 class="h2 rv" style="--d:.06s;margin-top:16px;">Fă parte din <em>echipă.</em></h2>')
    .replace(/<div class="pipe">[\s\S]*?<\/div>\n    <\/div>/, `<ol class="join-timeline" aria-label="Calendarul recrutării 2026">${recruitmentSteps(recruitment.closesAt ?? null).map(step => `<li><span class="join-step-number">${step.number}</span><div><span class="join-step-date">${escapeHtml(step.date)}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.copy)}</p></div></li>`).join("")}</ol>\n    </div>`)
    .replace(/<div class="eyebrow rv">[\s\S]*?<\/div>/, `<div class="eyebrow rv">${eyebrow}</div>`)
    .replace(/<p class="lede rv" style="--d:\.12s">[\s\S]*?<\/p>/, `<p class="lede rv" style="--d:.12s">${copy}</p>`)
    .replace(/<a href="\/devino-membru(?:#aplica)?" class="btn btn-p mag">[\s\S]*?<\/a>/, primary);

  return `${linkedMarkup.slice(0, start)}${updated}${linkedMarkup.slice(sectionEnd)}`;
}

const INSTAGRAM_POSTS = [
  {
    href: "https://www.instagram.com/interact.sfsava/p/Db-lXIsNJXf/",
    image: "/instagram/Db-lXIsNJXf.jpg",
    label: "Golden Hour · detalii",
    alt: "Afiș Golden Hour cu donația minimă de 35 de lei și consumația minimă de 50 de lei",
  },
  {
    href: "https://www.instagram.com/interact.sfsava/p/Db-lR7Qtfy2/",
    image: "/instagram/Db-lR7Qtfy2.jpg",
    label: "Golden Hour",
    alt: "Afișul evenimentului Golden Hour organizat de cluburile Interact Sf. Sava, OCTO și Cișmigiu",
  },
  {
    href: "https://www.instagram.com/interact.sfsava/p/Db-lIvmtsK5/",
    image: "/instagram/Db-lIvmtsK5.jpg",
    label: "Golden Hour · 30 aug.",
    alt: "Afiș Golden Hour cu data de 30 august și locația NOOK Club",
  },
  {
    href: "https://www.instagram.com/interact.sfsava/p/DaOLt3iNQgA/",
    image: "/instagram/DaOLt3iNQgA.jpg",
    label: "Mandatul 2025–2026",
    alt: "Rezumat vizual al mandatului Interact Sf. Sava 2025–2026",
  },
] as const;

function applyInstagramFeed(markup: string) {
  const posts = INSTAGRAM_POSTS.map((post) => `
          <a class="ig-ph" href="${post.href}" target="_blank" rel="noopener noreferrer" aria-label="Vezi ${post.label} pe Instagram">
            <img src="${post.image}" width="640" height="640" alt="${post.alt}" loading="lazy" decoding="async" />
            <span class="ig-cap">${post.label}</span>
          </a>`).join("");

  return markup.replace(
    /<div class="ig-feed">[\s\S]*?<\/div>/,
    `<div class="ig-feed">${posts}\n        </div>`,
  );
}

// The original immersive homepage keeps its animated intro. The event section
// is replaced wholesale with the single dashboard-managed showcase below it.
export function renderImmersiveMarkup(
  markup: string,
  options: {
    recruitment?: LandingRecruitment | null;
    showcaseEvents?: LandingShowcaseEvent[];
  } = {},
) {
  const recruitment = options.recruitment ?? null;
  const showcaseEvents = prepareShowcaseEvents(options.showcaseEvents ?? []);
  const reservableEvent = showcaseEvents.find((event) => event.status === "active") ?? null;
  const heroHref = reservableEvent ? "/rezerva" : "/evenimente";
  const heroAction = reservableEvent ? "Rezervă bilet" : "Vezi evenimentele";
  const heroSecondaryHref = reservableEvent ? "/evenimente#toate-evenimentele" : "/#board";
  const heroSecondaryAction = reservableEvent ? "Toate evenimentele" : "Cunoaște echipa";
  const upgraded = applyEventsFooter(applyGenericTicketDemo(applyShowcaseContent(replaceLegacyStatsSection(markup), showcaseEvents)))
    .replace(SECTION_DOTS, "")
    .replace(LEFT_PROGRESS_RAIL, "")
    .replace('<div class="rail"><i id="rail"></i></div>', "")
    .replace('<span>Biletul tău,</span>', '<span>Biletul tău</span>')
    .replace('Scanezi, <em>intri</em>.', 'Scanezi și intri.')
    .replace(
      "SavaPass e modul prin care Interact Sf. Sava vinde bilete la concerte, baluri și proiecte caritabile — fără cont, fără hârtie. Cumperi în 30 de secunde, primești QR-ul pe loc.",
      "Cumperi online, primești QR-ul instant și intri. Vezi ce pregătim la Interact Sf. Sava, alege evenimentul care îți place și cheamă-ți prietenii. Ne vedem acolo.",
    )
    .replace(INTRO_VIDEOS, DESKTOP_INTRO_VIDEOS)
    .replace(HERO_VIDEO, DESKTOP_HERO_VIDEO)
    .replace('<div class="ll-wheel" id="ll-wheel"></div>', `<div class="ll-wheel" id="ll-wheel">${INTERACT_WHEEL_SVG}</div>`)
    .replace(
      '<a href="__CTA_HREF__" class="btn btn-p mag">Vezi evenimentul <span class="ar" data-i="arrow"></span></a>',
      `<a href="${heroHref}" class="btn btn-p mag">${heroAction} <span class="ar" data-i="arrow"></span></a>`,
    )
    .replace(
      '<button class="btn btn-g mag">Vezi arhiva</button>',
      `<a href="${heroSecondaryHref}" class="btn btn-g mag">${heroSecondaryAction}</a>`,
    )
    .replace('<div class="mhi-church"><img src="/imersiv/church.webp" alt="" fetchpriority="high" decoding="async"/></div>', "")
    .replace('<div class="tele tl">SavaPass<br/><b>Bilete digitale</b></div>', "")
    .replace(FOOTER_NAVIGATION, "")
    .replace("3 ediții · 264 bilete · cca 13.500 RON donați", "Evenimente și proiecte Interact Sf. Sava")
    .replace("Devino membru · Toamna 2025", "Devino membru")
    .replace(
      '<span class="pic" data-i="spark"></span>',
      '<span class="pic" aria-hidden="true"><img src="/icon.svg" width="24" height="24" alt="" /></span>',
    )
    .replace(
      "Înscrierile pentru noua generație de membri sunt deschise până pe 30 noiembrie. Patru minute de aplicație, un scurt interviu, apoi ești în echipă.",
      "Vezi dacă recrutarea este deschisă și parcurge pașii aplicației. După formular, primești pe email detaliile pentru conversația cu board-ul.",
    )
    .replace(
      '<a href="#join">Devino membru</a>',
      '<a href="/devino-membru">Devino membru</a>',
    )
    .replace('<a href="#stats">Impact</a>', '<a href="#board">Board</a>')
    .replaceAll('href="#stats"', 'href="#board"')
    .replace(
      '<img src="/imersiv/team-interact.webp" alt="" loading="lazy" />',
      '<picture><source media="(max-width: 820px)" srcset="/media/story-interview.webp" /><img src="/imersiv/team-interact.webp" alt="" loading="lazy" /></picture>',
    )
    .replaceAll("Sold out", "Ediție încheiată")
    .replace("© 2025 SavaPass", "© 2026 SavaPass");

  return applyInstagramFeed(applyRecruitmentContent(upgraded, recruitment));
}

export const LANDING_REFINEMENT_CSS = `
/* Quiet refinement layer: preserve the immersive composition while removing the
   repeated typography, icon-tile, over-rounding, and cyan-halo treatments that
   make otherwise intentional art direction feel generated. */
.sp-immersive-root .recruitment-locked{opacity:.68;cursor:not-allowed;pointer-events:none}
.sp-immersive-root #join .grid { align-items: start; gap: clamp(32px, 6vw, 88px); }
.sp-immersive-root #join .lede { max-width: 38ch; font-size: clamp(16px, 1.45vw, 19px); line-height: 1.65; color: #536171; }
.sp-immersive-root #join .h2 { max-width: 11ch; }
.sp-immersive-root #join .cta { margin-top: 28px; }
.sp-immersive-root .join-timeline { list-style: none; margin: 0; padding: 0; border-top: 1px solid #d7dfe6; }
.sp-immersive-root .join-timeline li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 16px; padding: 20px 0; border-bottom: 1px solid #d7dfe6; }
.sp-immersive-root .join-step-number { padding-top: 2px; color: #007ba5; font-family: var(--f-mono), monospace; font-size: 11px; }
.sp-immersive-root .join-step-date { color: #007ba5; font-size: 12px; font-weight: 650; }
.sp-immersive-root .join-timeline h3 { margin: 5px 0 6px; color: #101823; font-size: 18px; line-height: 1.3; letter-spacing: -.02em; }
.sp-immersive-root .join-timeline p { margin: 0; max-width: 47ch; color: #536171; font-size: 14px; line-height: 1.55; }
@media (max-width: 760px) {
  .sp-immersive-root #join .grid { gap: 32px; }
  .sp-immersive-root .join-timeline li { padding: 18px 0; gap: 12px; }
  .sp-immersive-root .join-timeline h3 { font-size: 17px; }
}
.sp-immersive-root .ev-past--managed{color:inherit;text-decoration:none}
.sp-immersive-root .ev-past--managed:hover{transform:none;border-color:var(--line-l);box-shadow:none}
.sp-immersive-root .ev-past--managed:hover .ev-past-poster img{transform:none}
.sp-immersive-root .ev-past--active .ev-sold--active{color:var(--cyan)}
.sp-immersive-root .h2 em,
.sp-immersive-root .feat-media .ov .ti em,
.sp-immersive-root .jt-line em,
.sp-immersive-root .foot .big em {
  font-family: inherit;
  font-style: normal;
  font-weight: inherit;
  letter-spacing: inherit;
  color: inherit;
}
.sp-immersive-root .h2,
.sp-immersive-root .ev-title,
.sp-immersive-root .ev-past-title,
.sp-immersive-root .ev-map-info .place,
.sp-immersive-root .foot .big {
  font-family: var(--font-brand);
  font-variation-settings: "FLAR" 34, "VOLM" 12;
  font-weight: 720;
  letter-spacing: -.03em;
}
.sp-immersive-root .eyebrow {
  font-family: var(--f-sans);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: .01em;
  text-transform: none;
}
.sp-immersive-root .hero .eyebrow { color: rgba(224,244,252,.68); }
.sp-immersive-root .sec .eyebrow { color: #475569; }
.sp-immersive-root .eyebrow::before { display: none; }
.sp-immersive-root .eyebrow { gap: 0; }
.sp-immersive-root .hero .eyebrow {
  gap: 11px;
  margin-bottom: 22px;
  color: var(--cyan);
  font-family: var(--f-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.sp-immersive-root .hero .eyebrow::before { display: block; }
.sp-immersive-root .hero { box-shadow: none; }
.sp-immersive-root .hero .wrap { width: 100%; top: -12px; }
.sp-immersive-root .hero .grid > div:first-child { container-type: inline-size; min-width: 0; }
.sp-immersive-root .hero h1 {
  max-width: none;
  margin-top: 0 !important;
  font-size: clamp(20px, 14cqi, 88px);
  line-height: 1.06;
}
.sp-immersive-root .hero .hline { white-space: nowrap; }
.sp-immersive-root .hero .sub { margin-top: 30px; }
.sp-immersive-root .hero .cta { margin-top: 36px; gap: 18px; }
@media (min-width: 1024px) {
  .sp-immersive-root .hero .wrap { max-width: 1280px; }
  .sp-immersive-root .hero .grid { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); }
  .sp-immersive-root .hero .sub { font-size: 18px; }
  .sp-immersive-root .hero .cta .btn { font-size: 15px; }
}
.sp-immersive-root .ev-when,
.sp-immersive-root .ev-cat,
.sp-immersive-root .ev-arch-head .t,
.sp-immersive-root .gen-kicker,
.sp-immersive-root .jt-sub,
.sp-immersive-root .foot-nav a,
.sp-immersive-root .ig-feed-lab,
.sp-immersive-root .ig-feed-all,
.sp-immersive-root .ev-sub,
.sp-immersive-root .ev-sold,
.sp-immersive-root .ev-past-stat span,
.sp-immersive-root .gen-tag,
.sp-immersive-root .gen-unit b,
.sp-immersive-root .gen-meta,
.sp-immersive-root .gen-foot,
.sp-immersive-root .when,
.sp-immersive-root .soc-more,
.sp-immersive-root .ig-cap,
.sp-immersive-root .ev-poster .pbadge,
.sp-immersive-root .hero .ln .k,
.sp-immersive-root .ev-prog-meta .l,
.sp-immersive-root .ev-map-info .eb {
  font-family: var(--f-sans);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 700;
}
.sp-immersive-root .gen-kicker { font-size: 13px; }
.sp-immersive-root .gen-kicker .gen-idx { display: none; }
.sp-immersive-root .jt-sub { font-size: 12px; font-weight: 600; }
.sp-immersive-root .foot-nav a { font-size: 12px; font-weight: 600; }
.sp-immersive-root .foot .legal {
  font-family: var(--f-sans);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}
.sp-immersive-root .btn {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.sp-immersive-root .btn-p {
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.18);
  background: var(--cyan);
  color: #03111a;
  box-shadow: none;
}
.sp-immersive-root .btn-p::after { display: none; }
.sp-immersive-root .btn-p:hover {
  transform: translateY(-1px);
  box-shadow: none;
}
.sp-immersive-root .btn-g,
.sp-immersive-root .ev-all,
.sp-immersive-root .ev-ghost { border-radius: 10px; }
.sp-immersive-root .ev-all {
  font-family: var(--f-sans);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.sp-immersive-root .ev-tag {
  font-family: var(--f-sans);
  font-size: 16px;
  font-style: normal;
  line-height: 1.55;
}
.sp-immersive-root .ev-sold {
  border: 0;
  border-radius: 0;
  padding: 0;
}
.sp-immersive-root [data-i] svg { stroke-width: 1.75; }

/* Keep the hero navigation instruments; only the intro corner telemetry is quieted. */
.sp-immersive-root .intro .bl,
.sp-immersive-root .intro .br { display: none; }
@media (prefers-reduced-motion: reduce) {
  .sp-immersive-root .hero .strip .lane {
    animation: none !important;
    transform: none;
  }
}
.sp-immersive-root .intro .tele {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  backdrop-filter: none;
  color: rgba(15,23,42,.58);
  font-family: var(--f-sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.45;
  text-transform: none;
}
@media (max-width: 760px) {
  .sp-immersive-root .mhi-row,
  .sp-immersive-root .mhi-features { display: none; }
  .sp-immersive-root .hero .grid {
    padding-top: max(92px, calc(72px + env(safe-area-inset-top)));
  }
  .sp-immersive-root section[id],
  .cl-teasers { scroll-margin-top: 72px; }
}

/* The year photography is useful; provisional figures in the source are not. */
.sp-immersive-root .stats .gen-figure,
.sp-immersive-root .stats .gen-bar,
.sp-immersive-root .stats .gen-meta,
.sp-immersive-root .stats .gen-foot,
.sp-immersive-root .stats .gen-ghost,
.sp-immersive-root .ev-past-stats { display: none; }
.sp-immersive-root .stats .gen-body { justify-content: center; }
.sp-immersive-root .stats .gen-story { margin-top: 18px; max-width: 48ch; }

/* The four membership steps remain a real sequence. Phosphor's duotone icons
   add optical weight without returning to repeated icon tiles. */
.sp-immersive-root .sec.join {
  background: var(--paper);
  padding-top: clamp(40px, 6vw, 72px);
}
.sp-immersive-root .prow::before { display: none; }
.sp-immersive-root .prow .pic {
  width: 28px;
  height: 28px;
  border-radius: 0;
  background: transparent;
  color: var(--cyan);
  display: grid;
  place-items: center;
}
.sp-immersive-root .prow .pic svg {
  width: 24px;
  height: 24px;
  transition: transform .35s var(--e), color .35s var(--e);
}
.sp-immersive-root .pipe {
  gap: 0;
  border-top: 1px solid rgba(15,23,42,.12);
}
.sp-immersive-root .prow {
  border: 0;
  border-bottom: 1px solid rgba(15,23,42,.12);
  border-radius: 0;
  padding: 18px 0;
  background: transparent;
}
.sp-immersive-root .prow .pn {
  font-family: var(--f-sans);
  font-weight: 750;
}
.sp-immersive-root .prow:hover {
  transform: none;
  border-color: rgba(15,23,42,.12);
  box-shadow: none;
}
.sp-immersive-root .prow:hover .pic { transform: none; background: transparent; color: var(--cyan-2); }
.sp-immersive-root .prow:hover .pic svg { transform: translateY(-2px); }

@media(prefers-reduced-motion:reduce) {
  .sp-immersive-root .prow .pic svg { transition: none; }
}

/* Reduce the soft-card signature without changing the section geometry. */
.sp-immersive-root .ev-feat { border-radius: 18px; }
.sp-immersive-root .ev-map { border-radius: 18px; }
.sp-immersive-root .ev-past { border-radius: 15px; }
.sp-immersive-root .jt { border-radius: 16px; }
.cl-teasers__join { border-radius: 0; }

/* Cyan is still the action/state color. These values keep that identity while
   removing the neon halo from decorative surfaces and progress chrome. */
.sp-immersive-root .ev-prog-bar i,
.sp-immersive-root .gen-bar i { box-shadow: none; }
.sp-immersive-root .intro .glow { opacity: .28; filter: blur(72px); }
.sp-immersive-root .tk-glow {
  background: radial-gradient(circle at 50% 46%, rgba(0,167,232,.18), transparent 64%);
  filter: blur(8px);
}
.sp-immersive-root .phone-aurora {
  background: radial-gradient(72% 50% at 50% 0, rgba(0,167,232,.22), transparent 70%);
  filter: blur(7px);
  opacity: .52;
}
.sp-immersive-root .qr {
  border-color: rgba(0,167,232,.24);
  box-shadow: 0 0 12px rgba(0,167,232,.14);
}
.sp-immersive-root .qr-scan {
  background: linear-gradient(180deg, transparent, rgba(127,224,255,.38), transparent);
  box-shadow: 0 0 7px rgba(127,224,255,.28);
}
.sp-immersive-root .phone-orbit { opacity: .55; }
.sp-immersive-root .phone-orbit::before { box-shadow: 0 0 8px rgba(0,167,232,.32); }
.sp-immersive-root .strip .dot { box-shadow: 0 0 7px rgba(0,167,232,.36); }
.sp-immersive-root .ev-map-sweep { opacity: .2; }
.sp-immersive-root .ev-map-pin {
  box-shadow: 0 0 0 5px rgba(0,167,232,.1), 0 8px 16px rgba(15,23,42,.2);
}
.sp-immersive-root .seam b,
.sp-immersive-root .gen-thread b {
  box-shadow: 0 0 0 3px rgba(0,167,232,.12), 0 0 8px rgba(0,167,232,.34);
}
.sp-immersive-root .gen-foot .dot { box-shadow: none; }
.sp-immersive-root .gen-now .gen-tag { box-shadow: 0 4px 10px rgba(7,10,18,.18); }
.sp-immersive-root .gen-now .gen-media {
  box-shadow: 0 30px 64px -48px rgba(0,0,0,.82), 0 0 0 1px rgba(0,167,232,.16);
}
.sp-immersive-root .ev-all:hover { box-shadow: none; }
.sp-immersive-root .jt:hover { box-shadow: 0 24px 48px -36px rgba(15,23,42,.45); }
.sp-immersive-root .ig-mark { box-shadow: 0 4px 10px rgba(7,10,18,.2); }
.sp-immersive-root .ig-cta:hover { box-shadow: 0 8px 18px -12px rgba(7,10,18,.36); }

/* React-rendered teaser band follows the same restrained cadence. */
.cl-teasers .cl-label {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .01em;
  text-transform: none;
}
.cl-teasers .cl-hero__accent {
  font-family: inherit;
  font-style: normal;
  font-weight: inherit;
  color: inherit;
}
.cl-teasers .cl-btn { box-shadow: none; }

/* Mobile and tablet translation of the desktop immersive composition. */
@media (max-width: 820px) {
  .sp-immersive-root { --im-gutter: clamp(16px, 5vw, 32px); }
  .sp-immersive-root .wrap {
    width: 100%;
    max-width: none;
    padding-right: var(--im-gutter);
    padding-left: var(--im-gutter);
  }
  .sp-immersive-root .btn { min-height: 48px; justify-content: center; padding: 13px 18px; }
  .sp-immersive-root .eyebrow { font-size: 11px; letter-spacing: .12em; }
  .sp-immersive-root .h2 { font-size: clamp(34px, 10.5vw, 48px); line-height: .98; }

  .sp-immersive-root .intro {
    position: relative;
    top: auto;
    min-height: 100svh;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    place-items: center;
    padding: max(96px, calc(72px + env(safe-area-inset-top))) var(--im-gutter) max(40px, env(safe-area-inset-bottom));
  }
  .sp-immersive-root .mhi-church { display: none !important; }
  .sp-immersive-root .engine-stage { display: block !important; }
  .sp-immersive-root .mhi-ambient { display: none !important; }
  .sp-immersive-root .intro-video {
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
    object-position: center 52%;
    transform: none;
  }
  .sp-immersive-root #logo-stage {
    width: 100%;
    height: auto;
    min-height: 150px;
    margin: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    justify-self: stretch;
    gap: clamp(14px, 5vw, 28px);
  }
  .sp-immersive-root #logo-stage .ll-text { width: auto; min-width: 0; flex: 0 1 180px; }
  .sp-immersive-root #logo-stage .ll-interact { font-size: clamp(38px, 12vw, 58px); }
  .sp-immersive-root #logo-stage .ll-sub { margin-top: 16px; }
  .sp-immersive-root #logo-stage .ll-wheel {
    width: clamp(88px, 26vw, 132px);
    height: auto;
    flex: none;
    aspect-ratio: 1;
  }
  .sp-immersive-root .intro .tele.tr {
    display: none;
  }
  .sp-immersive-root #logo-stage,
  .sp-immersive-root #logo-stage * {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .sp-immersive-root #logo-stage .ch,
  .sp-immersive-root #logo-stage .sl,
  .sp-immersive-root #logo-stage .ll-wheel {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none;
  }
  .sp-immersive-root > .intro ~ section,
  .sp-immersive-root > .intro ~ footer {
    content-visibility: auto;
    contain-intrinsic-size: auto 1100px;
  }
  .sp-immersive-root .intro .scrollhint {
    display: none;
  }

  .sp-immersive-root .hero {
    min-height: auto;
    display: block;
    padding: 0;
  }
  .sp-immersive-root .hero .grid {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(42px, 12vw, 64px);
    padding: max(68px, calc(48px + env(safe-area-inset-top))) 0 clamp(72px, 18vw, 104px);
  }
  /* Adapt the desktop marquee for portrait instead of hiding it: the hero
     grid already reserves >=112px of top padding, so the band clears the
     eyebrow line and reads as the top border of the section. */
  .sp-immersive-root .hero .strip {
    display: block;
    top: 12px;
  }
  .sp-immersive-root .hero .strip .run {
    gap: clamp(12px, 3vw, 22px);
    padding-right: clamp(12px, 3vw, 22px);
  }
  .sp-immersive-root .hero .strip .item {
    gap: clamp(8px, 1.8vw, 12px);
    font-size: clamp(26px, 5.4vw, 34px);
    line-height: 1.1;
    letter-spacing: 0;
  }
  .sp-immersive-root .hero .strip .item .d {
    width: clamp(6px, 1.5vw, 8px);
    height: clamp(6px, 1.5vw, 8px);
    box-shadow: 0 0 10px rgba(0, 167, 232, .55);
  }
  .sp-immersive-root .hero .hline > span {
    transform: none !important;
    will-change: auto;
  }
  .sp-immersive-root .hero .sub { max-width: 38ch; margin-top: 26px; font-size: clamp(15px, 4.2vw, 17px); line-height: 1.58; }
  .sp-immersive-root .hero .cta { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 32px; }
  .sp-immersive-root .hero .cta .btn { width: 100%; }
  .sp-immersive-root .hero .tk-wrap { min-height: clamp(440px, 138vw, 540px); display: grid; place-items: center; }
  .sp-immersive-root .hero .phone {
    width: clamp(220px, 70vw, 292px);
    height: auto;
    aspect-ratio: 9 / 19;
    transform: none !important;
  }
  .sp-immersive-root .hero .scrollhint { display: none; }

  .sp-immersive-root .sec { padding: clamp(72px, 18vw, 104px) 0; }
  .sp-immersive-root .sec-head { align-items: flex-start; flex-direction: column; gap: 18px; margin-bottom: 30px; }
  .sp-immersive-root .sec-head > :last-child { align-self: flex-start; }
  .sp-immersive-root .ev-feat { grid-template-columns: minmax(0, 1fr); border-radius: 14px; }
  .sp-immersive-root .ev-poster { min-height: 0; aspect-ratio: 4 / 3; }
  .sp-immersive-root .ev-poster img { width: 100%; height: 100%; object-fit: cover; object-position: center 48%; }
  .sp-immersive-root .ev-detail { min-width: 0; padding: clamp(22px, 7vw, 34px); }
  .sp-immersive-root .ev-title { max-width: 15ch; font-size: clamp(30px, 9vw, 42px); line-height: .98; }
  .sp-immersive-root .ev-desc { font-size: 15px; line-height: 1.62; }
  .sp-immersive-root .ev-cta .btn { width: 100%; }
  .sp-immersive-root .ev-map {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: clamp(190px, 58vw, 224px) auto;
    min-height: 0;
    border-radius: 12px;
  }
  .sp-immersive-root .ev-map-canvas { min-height: 0; }
  .sp-immersive-root .ev-map-info {
    min-width: 0;
    padding: clamp(22px, 7vw, 30px);
    border-top: 1px solid var(--line-l);
    border-left: 0;
  }
  .sp-immersive-root .ev-map-info .maps {
    width: 100%;
    min-height: 48px;
    justify-content: space-between;
  }
  .sp-immersive-root .ev-arch-head { align-items: flex-start; margin-top: 54px; }
  .sp-immersive-root .ev-arch { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .sp-immersive-root .ev-past {
    min-width: 0;
    grid-template-columns: minmax(96px, .4fr) minmax(0, 1fr);
    border-radius: 12px;
  }
  .sp-immersive-root .ev-past-poster { min-height: 100%; }
  .sp-immersive-root .ev-past-poster img { width: 100%; height: 100%; object-fit: cover; }
  .sp-immersive-root .ev-past-body { min-width: 0; padding: 16px; }
  .sp-immersive-root .ev-past-tags { align-items: flex-start; flex-direction: column; gap: 4px; }
  .sp-immersive-root .ev-past-title { font-size: clamp(18px, 5.5vw, 22px); }
  .sp-immersive-root .ev-past-desc { font-size: 13px; line-height: 1.5; }

  .sp-immersive-root .stats { padding: clamp(78px, 18vw, 110px) 0; }
  .sp-immersive-root .stats .wrap { width: 100%; max-width: none; margin: 0; }
  .sp-immersive-root .stats .st-head { max-width: 38ch; margin: 0 0 44px; text-align: left; }
  .sp-immersive-root .stats .gen { gap: clamp(68px, 18vw, 94px); }
  .sp-immersive-root .stats .gen-row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }
  .sp-immersive-root .stats .gen-media {
    width: min(84%, 340px);
    max-width: none;
    justify-self: start;
    aspect-ratio: 4 / 5;
  }
  .sp-immersive-root .stats .gen-row:nth-child(even) .gen-media { justify-self: end; }
  .sp-immersive-root .stats .gen-body { width: min(92%, 390px); min-width: 0; justify-self: start; padding: 0; }
  .sp-immersive-root .stats .gen-row:nth-child(even) .gen-body { justify-self: end; }
  .sp-immersive-root .stats .gen-story { margin-top: 12px; font-size: 15px; line-height: 1.62; }
  .sp-immersive-root .stats .gen-thread { display: none; }
  .sp-immersive-root .stats .eq { height: 64px; }

  .sp-immersive-root .join .grid { grid-template-columns: minmax(0, 1fr); gap: 44px; }
  .sp-immersive-root .join .lede { max-width: 38ch; margin-top: 18px; font-size: 16px; }
  .sp-immersive-root .join .cta { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 24px; }
  .sp-immersive-root .join .cta .btn { width: 100%; }
  .sp-immersive-root .join .pipe { width: 100%; }
  .sp-immersive-root .join .prow {
    min-height: 88px;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 5px 12px;
    padding: 16px 0;
  }
  .sp-immersive-root .join .prow .pn { grid-column: 1; grid-row: 1; }
  .sp-immersive-root .join .prow .pic { grid-column: 1; grid-row: 2; align-self: end; }
  .sp-immersive-root .join .prow .pt { min-width: 0; grid-column: 2; grid-row: 1 / 3; align-self: center; }
  .sp-immersive-root .join .prow .when { grid-column: 3; grid-row: 1 / 3; align-self: center; white-space: nowrap; }
  .sp-immersive-root .join .jt { margin-top: 52px; border-radius: 12px; aspect-ratio: 4 / 3; }
  .sp-immersive-root .join .jt img { object-position: center 36%; }

  .sp-immersive-root .foot {
    min-height: auto;
    margin: 0;
    padding: clamp(82px, 20vw, 118px) 0 calc(34px + env(safe-area-inset-bottom));
  }
  .sp-immersive-root .foot > .wrap { width: 100%; max-width: none; margin: 0; }
  .sp-immersive-root .foot .big { max-width: 12ch; font-size: clamp(42px, 13vw, 60px); line-height: .96; }
  .sp-immersive-root .foot .row { align-items: flex-start; flex-direction: column; gap: 22px; margin-top: 28px; }
  .sp-immersive-root .foot .row .btn { width: 100%; }
  .sp-immersive-root .foot .social { grid-template-columns: minmax(0, 1fr); gap: 38px; margin-top: 54px; }
  .sp-immersive-root .foot .ig-cta { min-height: 64px; }
  .sp-immersive-root .foot .soc-more a { min-width: 44px; min-height: 44px; display: inline-grid; place-items: center; }
  .sp-immersive-root .foot .ig-feed { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .sp-immersive-root .foot .ig-ph { min-width: 0; aspect-ratio: 1; }
  .sp-immersive-root .foot .ig-ph picture { display: contents; }
  .sp-immersive-root .foot .ig-ph img { width: 100%; height: 100%; object-fit: cover; }
  .sp-immersive-root .foot .foot-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; margin-top: 48px; }
  .sp-immersive-root .foot .foot-nav a { min-height: 44px; display: flex; align-items: center; }
  .sp-immersive-root .foot .legal { align-items: flex-start; flex-direction: column; gap: 7px; margin-top: 34px; padding-top: 20px; }

  .sp-immersive-root .lbx { padding: max(64px, env(safe-area-inset-top)) var(--im-gutter) max(24px, env(safe-area-inset-bottom)); }
  .sp-immersive-root .lbx-x { top: max(12px, env(safe-area-inset-top)); right: var(--im-gutter); width: 46px; height: 46px; }
  .sp-immersive-root .lbx-fig { max-width: 100%; max-height: calc(100dvh - 112px); }
  .sp-immersive-root .lbx-img { max-height: calc(100dvh - 150px); object-fit: contain; }
}

@media (max-width: 760px) {
  .sp-immersive-root .engine-track {
    width: 112vw;
    height: min(55svh, 520px);
    opacity: .68;
  }
  .sp-immersive-root .engine-scan {
    height: clamp(70px, 10vw, 92px);
    opacity: .48;
  }
  .sp-immersive-root .engine-ticket {
    width: clamp(130px, 28vw, 190px);
    height: clamp(48px, 10.5vw, 72px);
    opacity: .66;
  }
  .sp-immersive-root .engine-ticket::before {
    top: clamp(11px, 2vw, 14px);
    left: clamp(13px, 2.6vw, 18px);
    font-size: clamp(9px, 1.4vw, 10px);
  }
  .sp-immersive-root .engine-ticket::after {
    top: clamp(12px, 2.4vw, 17px);
    right: clamp(12px, 2.4vw, 16px);
    width: clamp(22px, 5vw, 32px);
    height: clamp(22px, 5vw, 32px);
  }
  .sp-immersive-root .engine-ticket.t1 { top: 22%; left: clamp(8px, 3vw, 22px); }
  .sp-immersive-root .engine-ticket.t2 { top: 30%; right: clamp(8px, 3vw, 22px); }
  .sp-immersive-root .engine-ticket.t3 { bottom: 20%; left: clamp(12px, 5vw, 36px); }
  .sp-immersive-root .engine-ticket.t4 { right: clamp(12px, 5vw, 36px); bottom: 21%; }
}

@media (min-width: 640px) and (max-width: 820px) {
  .sp-immersive-root #logo-stage .ll-text { flex-basis: 260px; }
  .sp-immersive-root .hero .grid { grid-template-columns: minmax(0, 1fr) minmax(250px, .78fr); align-items: center; gap: 34px; }
  .sp-immersive-root .hero .tk-wrap { min-height: 540px; }
  .sp-immersive-root .hero .phone { width: min(35vw, 280px); }
  .sp-immersive-root .ev-feat { grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); }
  .sp-immersive-root .ev-poster { aspect-ratio: auto; }
  .sp-immersive-root .ev-arch { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sp-immersive-root .ev-past { grid-template-columns: minmax(104px, .42fr) minmax(0, 1fr); }
  .sp-immersive-root .stats .gen-row { grid-template-columns: minmax(250px, .84fr) minmax(0, 1fr); align-items: center; gap: 36px; }
  .sp-immersive-root .stats .gen-media { width: 100%; justify-self: stretch; }
  .sp-immersive-root .stats .gen-body { width: 100%; justify-self: stretch; }
  .sp-immersive-root .stats .gen-row:nth-child(even) .gen-media { grid-column: 2; grid-row: 1; justify-self: stretch; }
  .sp-immersive-root .stats .gen-row:nth-child(even) .gen-body { grid-column: 1; grid-row: 1; justify-self: stretch; }
  .sp-immersive-root .join .grid { grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 40px; }
  .sp-immersive-root .join .jt { aspect-ratio: 16 / 7; }
  .sp-immersive-root .foot .social { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}

/* The three admin-selected events form one editorial showcase, not a small archive row. */
.sp-immersive-root #event {
  padding-top: clamp(80px, 7vw, 96px);
  border-top: 1px solid var(--paper-2);
}
.sp-immersive-root .ev-showcase-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
  margin-top: 0;
}
.sp-immersive-root .ev-showcase-copy { max-width: 680px; }
.sp-immersive-root .ev-showcase-title {
  color: var(--ink);
  font-size: clamp(2rem, 4vw, 3.35rem);
  font-weight: 800;
  letter-spacing: -.04em;
  line-height: .98;
  text-wrap: balance;
}
.sp-immersive-root .ev-showcase-copy p {
  max-width: 52ch;
  margin-top: 24px;
  color: var(--mut-l);
  font-size: clamp(.94rem, 1.2vw, 1.05rem);
  line-height: 1.65;
}
.sp-immersive-root .ev-arch.ev-showcase-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(250px, auto));
  gap: clamp(14px, 1.7vw, 22px);
  margin-top: 30px;
}
.sp-immersive-root .ev-showcase-grid .ev-past--managed {
  min-width: 0;
  padding: 0;
  overflow: hidden;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line-l);
  border-radius: 18px;
  transition: transform .28s var(--e), border-color .28s var(--e);
}
.sp-immersive-root .ev-showcase-grid .ev-past--lead {
  grid-column: 1 / span 7;
  grid-row: 1 / span 2;
  grid-template-columns: minmax(300px, 1.08fr) minmax(250px, .92fr);
  grid-template-rows: minmax(0, 1fr);
  min-height: 562px;
}
.sp-immersive-root .ev-showcase-grid .ev-past--support {
  grid-column: 8 / -1;
  grid-template-columns: minmax(150px, .82fr) minmax(0, 1.18fr);
  min-height: 250px;
}
.sp-immersive-root .ev-showcase-grid .ev-past--support:nth-child(2) { grid-row: 1; }
.sp-immersive-root .ev-showcase-grid .ev-past--support:nth-child(3) { grid-row: 2; }
.sp-immersive-root .ev-showcase-grid .ev-past-poster {
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
  border-radius: 0;
}
.sp-immersive-root .ev-showcase-grid .ev-past-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .45s var(--e);
}
.sp-immersive-root .ev-showcase-grid .ev-past-body {
  min-width: 0;
  padding: clamp(22px, 2.5vw, 34px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-body { padding: clamp(18px, 2vw, 26px); }
.sp-immersive-root .ev-showcase-grid .ev-past-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.sp-immersive-root .ev-showcase-grid .ev-cat,
.sp-immersive-root .ev-showcase-grid .ev-sold {
  font-size: 10px;
  line-height: 1.35;
}
.sp-immersive-root .ev-showcase-grid .ev-sold { color: var(--used); }
.sp-immersive-root .ev-active-location {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 12px;
  font-family: var(--f-mono);
  font-size: 10px;
  line-height: 1.4;
}
.sp-immersive-root .ev-active-location span {
  color: var(--cyan);
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.sp-immersive-root .ev-active-location strong { color: var(--ink); font-weight: 700; }
.sp-immersive-root .ev-showcase-grid .ev-past-title {
  margin-top: clamp(16px, 2vw, 24px);
  font-size: clamp(1.55rem, 2.8vw, 2.7rem);
  line-height: 1;
  letter-spacing: -.045em;
}
.sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-title {
  margin-top: 16px;
  font-size: clamp(1.25rem, 1.7vw, 1.65rem);
}
.sp-immersive-root .ev-showcase-grid .ev-past-desc {
  display: -webkit-box;
  margin: 14px 0 0;
  overflow: hidden;
  color: var(--mut-l);
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-desc {
  font-size: 12.5px;
  -webkit-line-clamp: 4;
}
.sp-immersive-root .ev-past-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding-top: 22px;
}
.sp-immersive-root .ev-past-price { color: var(--ink); font-size: 13px; font-weight: 800; }
.sp-immersive-root .ev-past-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: var(--cyan);
  font-size: 12px;
  font-weight: 800;
}
.sp-immersive-root .ev-past-action .ar { display: inline-grid; transition: transform .28s var(--e); }
.sp-immersive-root .ev-past-action svg { width: 15px; height: 15px; }
.sp-immersive-root .ev-showcase-grid .ev-past--managed:focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 4px;
}
@media (hover: hover) {
  .sp-immersive-root .ev-showcase-grid .ev-past--managed:hover {
    transform: translateY(-3px);
    border-color: rgba(0, 167, 232, .42);
    box-shadow: none;
  }
  .sp-immersive-root .ev-showcase-grid .ev-past--managed:hover .ev-past-poster img { transform: scale(1.025); }
  .sp-immersive-root .ev-showcase-grid .ev-past--managed:hover .ev-past-action .ar { transform: translateX(4px); }
}
@media (max-width: 980px) {
  .sp-immersive-root .ev-arch.ev-showcase-grid { grid-template-rows: none; }
  .sp-immersive-root .ev-showcase-grid .ev-past--lead {
    grid-column: 1 / -1;
    grid-row: auto;
    grid-template-columns: minmax(280px, .9fr) minmax(0, 1.1fr);
    grid-template-rows: minmax(330px, auto);
    min-height: 430px;
  }
  .sp-immersive-root .ev-showcase-grid .ev-past--support {
    grid-column: span 6;
    grid-row: auto !important;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-poster { aspect-ratio: 16 / 10; }
}
@media (max-width: 720px) {
  .sp-immersive-root .ev-showcase-head { align-items: flex-start; flex-direction: column; margin-top: 0; }
  .sp-immersive-root .ev-showcase-head .ev-all { width: 100%; min-height: 48px; justify-content: space-between; }
  .sp-immersive-root .ev-arch.ev-showcase-grid { grid-template-columns: minmax(0, 1fr); margin-top: 22px; }
  .sp-immersive-root .ev-showcase-grid .ev-past--lead,
  .sp-immersive-root .ev-showcase-grid .ev-past--support {
    grid-column: 1;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
    min-height: 0;
  }
  .sp-immersive-root .ev-showcase-grid .ev-past-poster { min-height: 0; aspect-ratio: 16 / 10; }
  .sp-immersive-root .ev-showcase-grid .ev-past-body,
  .sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-body { padding: 22px; }
  .sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-title { font-size: 1.5rem; }
  .sp-immersive-root .ev-showcase-grid .ev-past--support .ev-past-desc { font-size: 13px; -webkit-line-clamp: 3; }
}

@media (prefers-reduced-motion: reduce) {
  .sp-immersive-root .rv,
  .sp-immersive-root .hline > span,
  .sp-immersive-root #logo-stage .ch,
  .sp-immersive-root #logo-stage .sl,
  .sp-immersive-root #logo-stage .ll-wheel {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
  .sp-immersive-root .ev-showcase-grid .ev-past--managed,
  .sp-immersive-root .ev-showcase-grid .ev-past-poster img,
  .sp-immersive-root .ev-past-action .ar { transition: none !important; }
}
`;
