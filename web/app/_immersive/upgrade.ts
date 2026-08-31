const INTRO_VIDEOS = `  <video class="mhi-ambient" autoplay muted loop playsinline preload="metadata" aria-hidden="true" src="/imersiv/intro-ambient.mp4"></video>
  <video class="intro-video" autoplay muted loop playsinline preload="metadata" fetchpriority="low" aria-hidden="true" src="/imersiv/savapass-ticket-engine-loop.mp4"></video>`;

const INTRO_PHOTO = `  <picture class="intro-photo" aria-hidden="true">
    <source media="(max-width: 760px)" srcset="/media/hero-mobile.webp" />
    <img src="/media/hero-desktop.webp" width="2200" height="1238" alt="" fetchpriority="high" decoding="async" />
  </picture>`;

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

const SECTION_NAVIGATION = `<nav class="dots" aria-label="Navigare între secțiunile paginii">
  <a href="#intro" data-s="intro" class="on" aria-label="01 · Introducere" aria-current="location">01<span class="b"></span></a>
  <a href="#hero" data-s="hero" aria-label="02 · SavaPass">02<span class="b"></span></a>
  <a href="#event" data-s="event" aria-label="03 · Evenimente">03<span class="b"></span></a>
  <a href="#board" data-s="board" aria-label="04 · Board">04<span class="b"></span></a>
  <a href="#join" data-s="join" aria-label="05 · Devino membru">05<span class="b"></span></a>
</nav>`;

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

const HERO_PHOTO = `  <picture class="hero-photo" aria-hidden="true">
    <source media="(max-width: 760px)" srcset="/media/story-event.webp" />
    <img src="/media/story-event.webp" width="1400" height="1000" alt="" loading="lazy" decoding="async" />
  </picture>`;

export type LandingEvent = {
  title: string;
  subtitle: string | null;
  about: string | null;
  dateLabel: string;
  doors: string;
  venue: string;
  venueLine: string | null;
  capacity: number | null;
  sold: number | null;
  priceBani: number;
  photoUrl: string | null;
  href: string;
  checkoutHref: string;
  hasProgram: boolean;
};

export type LandingArchivedEvent = {
  title: string;
  subtitle: string | null;
  about: string | null;
  dateLabel: string;
  venue: string;
  priceBani: number;
  photoUrl: string | null;
  href: string;
};

export type LandingRecruitment = {
  title: string;
  intro: string;
  closedMessage: string;
  isOpen: boolean;
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
    initials: "OS",
    area: "Relații externe",
    summary: "Ține legătura cu partenerii și cu celelalte cluburi Interact.",
  },
] as const;

const BOARD_GROUPS = [
  {
    key: "operations",
    title: "Conducere & operațiuni",
    summary: "Continuitate, priorități, documente și buget.",
    members: BOARD_MEMBERS.slice(1, 5),
  },
  {
    key: "people",
    title: "Oameni, proiecte & relații",
    summary: "Comunicare, cultură internă, livrare și parteneriate.",
    members: BOARD_MEMBERS.slice(5),
  },
] as const;

function renderBoardPortrait(name: string, initials: string, lead = false) {
  return `<div class="board-photo${lead ? " board-photo--lead" : ""}" role="img" aria-label="Monogramă pentru ${name}; fotografia urmează să fie adăugată">
    <span class="board-photo__status" aria-hidden="true">Portret în pregătire</span>
    <span class="board-photo__initials" aria-hidden="true">${initials}</span>
  </div>`;
}

function renderBoardSection() {
  const [president] = BOARD_MEMBERS;
  const roster = BOARD_GROUPS.map((group) => {
    const members = group.members.map((member) => `<article class="board-member">
      ${renderBoardPortrait(member.name, member.initials)}
      <div class="board-member__body">
        <p class="board-member__role">${member.role}</p>
        <h4 class="board-member__name">${member.name}</h4>
        <p class="board-member__summary">${member.summary}</p>
        <p class="board-member__area"><span>Arie</span>${member.area}</p>
      </div>
    </article>`).join("");

    return `<section class="board-group" aria-labelledby="board-group-${group.key}">
      <header class="board-group__head">
        <div>
          <h3 class="board-group__title" id="board-group-${group.key}">${group.title}</h3>
          <p class="board-group__summary">${group.summary}</p>
        </div>
        <span class="board-group__count">${group.members.length} roluri</span>
      </header>
      <div class="board-group__members">${members}</div>
    </section>`;
  }).join("");

  return `<!-- ═══ BOARD ITC ═══ -->
<section class="board-showcase" id="board" data-screen-label="Board" aria-labelledby="board-title">
  <div class="wrap board-wrap">
    <header class="board-head">
      <div class="board-head__copy">
        <h2 class="board-title" id="board-title">Board <em>Interact</em></h2>
        <p class="board-summary">Nouă membri coordonează proiectele, bugetul, echipa, comunicarea și parteneriatele clubului. Mai jos găsești rolul fiecăruia.</p>
        <p class="board-context"><span>${BOARD_MEMBERS.length} membri</span><i aria-hidden="true">·</i><span>${BOARD_MEMBERS.length} roluri</span><i aria-hidden="true">·</i><span>${BOARD_GROUPS.length} arii de lucru</span></p>
      </div>
    </header>

    <article class="board-lead">
      ${renderBoardPortrait(president.name, president.initials, true)}
      <div class="board-lead__body">
        <p class="board-lead__role">${president.role}</p>
        <h3 class="board-lead__name">${president.name}</h3>
        <p class="board-lead__summary">${president.summary}</p>
        <ul class="board-lead__focus" aria-label="Responsabilitățile principale ale rolului">
          <li>Direcție de mandat</li>
          <li>Reprezentare</li>
          <li>Coordonare board</li>
        </ul>
      </div>
    </article>

    <div class="board-directory-head">
      <h3>Roluri care țin clubul în mișcare.</h3>
      <p>Fiecare zonă are un punct clar de responsabilitate, iar deciziile sunt coordonate împreună la nivel de board.</p>
    </div>

    <div class="board-roster" aria-label="Structura Board-ului Interact">
      ${roster}
    </div>

    <footer class="board-note">
      <span>Portretele vor înlocui aceste cadre după ședința foto.</span>
      <span>Interact Sf. Sava · Structura mandatului curent</span>
    </footer>
  </div>
</section>`;
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

function renderFeaturedEvent(event: LandingEvent | null) {
  if (!event) {
    return `<article class="ev-feat ev-feat--empty">
      <div class="ev-poster rv"><img src="/media/story-event.webp" alt="Membri Interact dansând aproape de scenă la un eveniment" width="1400" height="1000" loading="lazy" decoding="async" /><span class="pbadge"><i></i>Calendar în pregătire</span></div>
      <div class="ev-detail">
        <div class="ev-when rv">Următorul eveniment</div>
        <h3 class="ev-title rv">Revenim curând cu o ediție nouă.</h3>
        <div class="ev-tag rv">Până atunci, vezi proiectele și momentele comunității.</div>
        <p class="ev-desc rv">Când echipa publică un eveniment, aici apar automat data, locurile disponibile și tipurile de bilet. Nu afișăm date provizorii.</p>
        <div class="ev-cta rv"><a href="/proiecte" class="btn btn-p mag">Vezi proiectele <span class="ar" data-i="arrow"></span></a></div>
      </div>
    </article>`;
  }

  const capacity = Math.max(0, event.capacity ?? 0);
  const sold = Math.min(capacity, Math.max(0, event.sold ?? 0));
  const hasAvailability = event.capacity !== null && event.sold !== null && capacity > 0;
  const left = Math.max(0, capacity - sold);
  const fill = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
  const description = event.about ?? event.subtitle ?? "Detaliile complete sunt disponibile pe pagina evenimentului.";
  const purchaseHref = escapeHtml(event.checkoutHref);
  const secondaryHref = escapeHtml(`${event.href}${event.hasProgram ? "#program" : "#detalii"}`);
  const secondaryAction = event.hasProgram ? "Vezi programul" : "Detalii complete";

  return `<article class="ev-feat">
      <div class="ev-poster rv"><img src="${safePhotoUrl(event.photoUrl)}" alt="${escapeHtml(event.title)}" loading="lazy" decoding="async" /><span class="pbadge"><i></i>Următorul eveniment</span></div>
      <div class="ev-detail">
        <div class="ev-when rv">${escapeHtml(event.dateLabel)}</div>
        <h3 class="ev-title rv">${escapeHtml(event.title)}</h3>
        ${event.subtitle ? `<div class="ev-tag rv">${escapeHtml(event.subtitle)}</div>` : ""}
        <p class="ev-desc rv">${escapeHtml(description)}</p>
        <div class="ev-facts rv">
          <span class="ev-fact"><span class="fi" data-i="pin"></span>${escapeHtml(event.venue)}</span>
          <span class="ev-fact"><span class="fi" data-i="clock"></span>Acces de la ${escapeHtml(event.doors)}</span>
          ${hasAvailability ? `<span class="ev-fact"><span class="fi" data-i="ticket"></span>${left} ${left === 1 ? "loc rămas" : "locuri rămase"}</span>` : ""}
        </div>
        ${hasAvailability ? `<div class="ev-prog rv"><div class="ev-prog-bar"><i style="width:${fill}%"></i></div><div class="ev-prog-meta"><span class="l">${sold} din ${capacity} bilete</span><span class="r">${fill}% ocupat</span></div></div>` : ""}
        <div class="ev-cta rv">
          <a href="${purchaseHref}" class="btn btn-p mag">Rezervă bilet <span class="ar" data-i="arrow"></span></a>
          <a href="${secondaryHref}" class="ev-ghost">${secondaryAction}</a>
        </div>
      </div>
    </article>`;
}

function renderArchivedEvents(events: LandingArchivedEvent[]) {
  if (events.length === 0) {
    return '<p class="ev-archive-empty">Arhiva va apărea aici când un eveniment este marcat „Arhivat” în admin.</p>';
  }

  return events.slice(0, 2).map((event) => {
    const description = event.about ?? event.subtitle ?? "Detaliile acestei ediții sunt disponibile în arhiva evenimentelor.";
    const price = event.priceBani > 0 ? `${Math.round(event.priceBani / 100)} RON` : "Acces gratuit";

    return `<article class="ev-past ev-past--managed">
        <div class="ev-past-poster"><img src="${safePhotoUrl(event.photoUrl)}" loading="lazy" decoding="async" alt="Afișul evenimentului ${escapeHtml(event.title)}" /></div>
        <div class="ev-past-body">
          <div class="ev-past-tags"><span class="ev-cat">${escapeHtml(event.dateLabel)}</span><span class="ev-sold">Ediție încheiată · ${escapeHtml(price)}</span></div>
          <h4 class="ev-past-title">${escapeHtml(event.title)}</h4>
          <p class="ev-past-desc"><strong>${escapeHtml(event.venue)}</strong> · ${escapeHtml(description)}</p>
        </div>
      </article>`;
  }).join("\n      ");
}

function applyArchiveContent(markup: string, events: LandingArchivedEvent[]) {
  const cards = renderArchivedEvents(events);
  return markup.replace(
    /    <div class="ev-arch">[\s\S]*?    <\/div>\r?\n  <\/div>\r?\n<\/section>/,
    `    <div class="ev-arch">\n      ${cards}\n    </div>\n  </div>\n</section>`,
  );
}

function applyEventContent(markup: string, event: LandingEvent | null) {
  const featuredMarkup = renderFeaturedEvent(event);
  let next = markup.replace(/<article class="ev-feat">[\s\S]*?<\/article>\n\n    <div class="ev-map">/, `${featuredMarkup}\n\n    <div class="ev-map">`);

  if (event) {
    const address = escapeHtml(event.venueLine ?? event.venue).replace(/\r?\n/g, "<br/>");
    const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(`${event.venue} ${event.venueLine ?? ""}`.trim())}`;
    next = next
      .replace('<div><div class="e">Bilet activ</div><h3>Echoes<br/>Unplugged</h3></div>', `<div><div class="e">Bilet activ</div><h3>${escapeHtml(event.title)}</h3></div>`)
      .replace('<div>Locul<b>Curtea Veche</b></div>', `<div>Locul<b>${escapeHtml(event.venue)}</b></div>`)
      .replace('<div style="text-align:right;">Data<b>Vin · 14 Nov</b></div>', `<div style="text-align:right;">Data<b>${escapeHtml(event.dateLabel)}</b></div>`)
      .replace('<div class="place rv" style="--d:.08s">Curtea Veche</div>', `<div class="place rv" style="--d:.08s">${escapeHtml(event.venue)}</div>`)
      .replace('<div class="addr rv" style="--d:.12s">Strada Franceză 25<br/>București</div>', `<div class="addr rv" style="--d:.12s">${address}</div>`)
      .replace(
        '<button class="ev-ghost maps rv" style="--d:.24s">Deschide în Maps <span class="ar" data-i="arrow"></span></button>',
        `<a class="ev-ghost maps rv" style="--d:.24s" href="${escapeHtml(mapsHref)}" target="_blank" rel="noopener noreferrer">Deschide în Maps <span class="ar" data-i="arrow"></span></a>`,
      )
      .replace('href="https://maps.google.com/?q=Curtea+Veche+Bucuresti"', `href="${mapsHref}"`);
  } else {
    next = next
      .replace(
        '<div><div class="e">Bilet activ</div><h3>Echoes<br/>Unplugged</h3></div>',
        '<div><div class="e">Model SavaPass</div><h3>Bilet<br/>digital</h3></div>',
      )
      .replace('<span class="tk-stat"><span class="tk-live"></span>Valid</span>', '<span class="tk-stat"><span class="tk-live"></span>Demo</span>')
      .replace('<div>Locul<b>Curtea Veche</b></div>', '<div>Locul<b>De anunțat</b></div>')
      .replace('<div style="text-align:right;">Data<b>Vin · 14 Nov</b></div>', '<div style="text-align:right;">Data<b>În curând</b></div>')
      .replace('<div class="ev-map">', '<div class="ev-map" hidden>');
  }

  const footerCopy = event
    ? `<p class="nx rv" style="--d:.08s">Următorul eveniment: <b>${escapeHtml(event.title)}</b> · ${escapeHtml(event.dateLabel)}.<br/>Ai deja bilet? Îl găsești oricând în contul tău.</p><a href="/conta" class="btn btn-p mag rv" style="--d:.14s">Biletele mele <span class="ar" data-i="arrow"></span></a>`
    : '<p class="nx rv" style="--d:.08s">Următorul eveniment este în pregătire.<br/>Ai o întrebare sau o idee? Scrie echipei Interact Sf. Sava.</p><a href="/contact" class="btn btn-p mag rv" style="--d:.14s">Scrie-ne <span class="ar" data-i="arrow"></span></a>';

  return next.replace(/<p class="nx rv" style="--d:\.08s">[\s\S]*?<\/p>\n      <a href="__CTA_HREF__" class="btn btn-p mag rv" style="--d:\.14s">[\s\S]*?<\/a>/, footerCopy);
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

const PHOTO_STORY = `
<!-- Curated editorial grid, adapted to SavaPass from the layout-grid interaction pattern -->
<section class="photo-story" id="community" data-screen-label="Comunitate">
  <div class="wrap">
    <header class="photo-story__head">
      <div>
        <div class="eyebrow rv">Din culise</div>
        <h2 class="h2 rv" style="--d:.06s;">O platformă construită pentru <em>oameni reali.</em></h2>
      </div>
      <p class="rv" style="--d:.12s;">De la energia unui eveniment la discuția calmă de la interviu, fiecare modul pornește din felul în care lucrează echipa Interact Sf. Sava.</p>
    </header>
    <div class="photo-grid">
      <a class="photo-card photo-card--event rv" href="#event" style="--d:.04s;">
        <img src="/media/story-event.webp" width="1400" height="1000" loading="lazy" decoding="async" alt="Membri Interact dansând la un eveniment cu lumini de scenă" />
        <span class="photo-card__shade"></span><span class="photo-card__copy"><small>Evenimente</small><b>Energia din sală, accesul fără haos.</b><em>Descoperă biletele și check-in-ul.</em></span>
      </a>
      <a class="photo-card photo-card--community rv" href="/proiecte" style="--d:.09s;">
        <img src="/media/story-community.webp" width="1400" height="900" loading="lazy" decoding="async" alt="Grup mare de voluntari Interact ținând certificate în aer liber" />
        <span class="photo-card__shade"></span><span class="photo-card__copy"><small>Comunitate</small><b>Proiecte care se văd în afara ecranului.</b><em>Vezi inițiativele echipei.</em></span>
      </a>
      <a class="photo-card photo-card--recruitment rv" href="/devino-membru" style="--d:.14s;">
        <img src="/media/story-recruitment.webp" width="1000" height="1300" loading="lazy" decoding="async" alt="Elevi colaborând în jurul unor materiale tipărite" />
        <span class="photo-card__shade"></span><span class="photo-card__copy"><small>Recrutare</small><b>Idei puse împreună.</b><em>Aplică pentru generația nouă.</em></span>
      </a>
      <a class="photo-card photo-card--interview rv" href="/devino-membru#aplica" style="--d:.18s;">
        <img src="/media/story-interview.webp" width="1200" height="900" loading="lazy" decoding="async" alt="Trei elevi discutând relaxat la o masă în timpul unui interviu" />
        <span class="photo-card__shade"></span><span class="photo-card__copy"><small>Interviuri</small><b>O conversație, nu un examen.</b><em>Află cum decurge selecția.</em></span>
      </a>
    </div>
  </div>
</section>

`;

export function enhanceLandingMarkup(markup: string, event: LandingEvent | null = null) {
  const upgraded = markup
    .replace(INTRO_VIDEOS, INTRO_PHOTO)
    .replace(HERO_VIDEO, HERO_PHOTO)
    .replace('<div class="mhi-church"><img src="/imersiv/church.webp" alt="" fetchpriority="high" decoding="async"/></div>', "")
    .replace('<!-- ═══ STATS ═══ -->', `${PHOTO_STORY}<!-- ═══ STATS ═══ -->`)
    .replace('<button class="btn btn-g mag">Vezi arhiva</button>', '<a href="/evenimente#toate-evenimentele" class="btn btn-g mag">Toate evenimentele</a>')
    .replace('<button class="ev-all rv" style="--d:.12s;">Toate edițiile <span class="ar" data-i="arrow"></span></button>', '<a href="/evenimente?period=past#toate-evenimentele" class="ev-all rv" style="--d:.12s;">Ediții încheiate <span class="ar" data-i="arrow"></span></a>')
    .replace('<button class="ev-ghost">Programul serii</button>', '<a href="__CTA_HREF__#program" class="ev-ghost">Vezi programul</a>')
    .replace('<button class="ev-ghost maps rv" style="--d:.24s">Deschide în Maps <span class="ar" data-i="arrow"></span></button>', '<a class="ev-ghost maps rv" style="--d:.24s" href="https://maps.google.com/?q=Curtea+Veche+Bucuresti" target="_blank" rel="noopener">Deschide în Maps <span class="ar" data-i="arrow"></span></a>')
    .replace('<button class="btn btn-g mag">Cum decurge</button>', '<a href="/devino-membru#process-title" class="btn btn-g mag">Vezi pașii</a>')
    .replace("Devino membru · Toamna 2025", "Devino membru · Generația 2026–2027")
    .replace("3 ediții · 264 bilete · cca 13.500 RON donați", "Fotografii reale · proiecte și evenimente Interact")
    .replace("Easter Egg Hunt", "Momente de la evenimente")
    .replace('<h4 class="ev-past-title">Easter Egg Hunt</h4>', '<h4 class="ev-past-title">Momente de la evenimente</h4>')
    .replace("Eveniment de primăvară", "Din comunitate")
    .replace("O dimineață de primăvară în curtea liceului — ouă ascunse, premii dulci și cea mai veselă vânătoare a anului. Fondurile au susținut bursele Sava.", "Cadre autentice din serile în care participanții, voluntarii și organizatorii se întâlnesc în același loc.")
    .replace("Cupid's Hex", "Echipa în acțiune")
    .replace('<h4 class="ev-past-title">Cupid\'s Hex</h4>', '<h4 class="ev-past-title">Echipa în acțiune</h4>')
    .replace("Bal · Arhivă", "Din culise")
    .replace("O seară roșu-burgund, măști de carton și scrisori de dragoste anonime. Cel mai bine costumat a câștigat un weekend la Brașov.", "Pregătirea, coordonarea și energia din spatele unui proiect Interact, surprinse fără decor de reclamă.")
    .replaceAll("Sold out", "Fotografie reală")
    .replace("Trei generații <em>de board.</em>", "Din sală până <em>în echipă.</em>")
    .replace("De la primul concert din curtea liceului la o sală plină — trei ani, trei echipe, aceeași seară caldă.", "Evenimente, drumuri și întâlniri de echipă. Câteva cadre reale din felul în care se construiește comunitatea Interact Sf. Sava.")
    .replace("Prima generație · 2024", "În sală · Evenimente")
    .replace("A doua generație · 2025", "Pe drum · Comunitate")
    .replace("A treia generație · 2026", "În echipă · Board")
    .replace("Unde a început", "Energia din sală")
    .replace("Cum a crescut", "Timpul împreună")
    .replace("Generația de azi", "O echipă care organizează")
    .replace("Un singur concert, în curtea liceului. O chitară, lumânări și un public cât o clasă — și ideea că merită repetată.", "Oameni aproape de scenă, lumină joasă și energia care transformă un eveniment într-o amintire comună.")
    .replace("Două ediții, o curte plină și o echipă mai mare. Mai mulți oameni, aceeași seară caldă — doar că de două ori.", "Comunitatea se construiește și între proiecte: pe drum, în conversații și în momentele care nu ajung într-un raport.")
    .replace("O sală plină și un board care duce mai departe aceeași seară. Iar SavaPass e felul în care o ținem să crească.", "Board-ul coordonează oamenii, proiectele și deciziile din spatele fiecărei ediții. SavaPass îi oferă un singur loc în care să le gestioneze.")
    .replace("Alegi singur slotul, online sau în liceu", "Primești ora și locul confirmate")
    .replace("© 2025 SavaPass", "© 2026 SavaPass")
    .replace('alt="Echoes Unplugged — concert acustic Interact Sf. Sava"', 'alt="Membri Interact dansând aproape de scenă la un eveniment"')
    .replace('alt="Easter Egg Hunt — eveniment de primăvară Interact Sf. Sava"', 'alt="Masă aglomerată și participanți la un eveniment Interact"')
    .replace('alt="Cupid\'s Hex — bal mascat Interact Sf. Sava"', 'alt="Grup Interact într-un coridor din culisele unui eveniment"')
    .replace('alt="Prima generație a board-ului Interact Sf. Sava, un concert acustic intim în Curtea Veche, 2024"', 'alt="Membri Interact dansând la un eveniment cu lumini de scenă"')
    .replace('alt="A doua generație a board-ului Interact Sf. Sava, o seară mai aglomerată cu lumini de sărbătoare, 2025"', 'alt="Membri Interact călătorind împreună spre o activitate"')
    .replace('alt="Generația de azi a board-ului Interact Sf. Sava, o echipă tânără la un eveniment plin, 2026"', 'alt="Board-ul Interact Sf. Sava reunit pe o scară de marmură"')
    .replace('alt="Echipa de voluntari Interact Sf. Sava împreună seara după un eveniment"', 'alt="Board-ul Interact Sf. Sava reunit pe o scară de marmură"');

  return applyInstagramFeed(applyEventContent(upgraded, event));
}

// The original immersive homepage keeps the animated engine intro and only
// applies live event data to the content below it.
export function renderImmersiveMarkup(
  markup: string,
  event: LandingEvent | null = null,
  recruitment: LandingRecruitment | null = null,
  archivedEvents: LandingArchivedEvent[] = [],
) {
  const heroHref = escapeHtml(event?.href ?? "/evenimente");
  const heroAction = event ? "Vezi detaliile" : "Vezi evenimentele";
  const heroSecondaryHref = event ? "/evenimente#toate-evenimentele" : "/echipa";
  const heroSecondaryAction = event ? "Toate evenimentele" : "Cunoaște echipa";
  const upgraded = applyArchiveContent(applyEventContent(replaceLegacyStatsSection(markup), event), archivedEvents)
    .replace(SECTION_DOTS, SECTION_NAVIGATION)
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
    .replace(
      '<button class="ev-all rv" style="--d:.12s;">Toate edițiile <span class="ar" data-i="arrow"></span></button>',
      '<a href="/evenimente?period=past#toate-evenimentele" class="ev-all rv" style="--d:.12s;">Ediții încheiate <span class="ar" data-i="arrow"></span></a>',
    )
    .replace(
      '<button class="ev-ghost maps rv" style="--d:.24s">Deschide în Maps <span class="ar" data-i="arrow"></span></button>',
      '<a class="ev-ghost maps rv" style="--d:.24s" href="https://maps.google.com/?q=Curtea+Veche+Bucuresti" target="_blank" rel="noopener noreferrer">Deschide în Maps <span class="ar" data-i="arrow"></span></a>',
    )
    .replace('<div class="mhi-church"><img src="/imersiv/church.webp" alt="" fetchpriority="high" decoding="async"/></div>', "")
    .replace('<div class="tele tl">SavaPass<br/><b>Bilete digitale</b></div>', "")
    .replace(FOOTER_NAVIGATION, "")
    .replace("3 ediții · 264 bilete · cca 13.500 RON donați", "Evenimente și proiecte Interact Sf. Sava")
    .replace("Devino membru · Toamna 2025", "Devino membru")
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
.sp-immersive-root .ev-past--managed{color:inherit;text-decoration:none}
.sp-immersive-root .ev-past--managed:hover{transform:none;border-color:var(--line-l);box-shadow:none}
.sp-immersive-root .ev-past--managed:hover .ev-past-poster img{transform:none}
.sp-immersive-root .ev-archive-empty{grid-column:1/-1;color:var(--mut-d);font-size:14px;line-height:1.6;margin:0}
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
  color: var(--cyan);
  font-family: var(--f-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.sp-immersive-root .hero .eyebrow::before { display: block; }
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
.sp-immersive-root .join {
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(circle at 84% 24%, rgba(0,167,232,.09), transparent 30%),
    radial-gradient(circle at 12% 88%, rgba(37,99,235,.055), transparent 25%),
    linear-gradient(180deg, var(--paper-2), var(--paper));
}
.sp-immersive-root .join::before {
  content: "";
  position: absolute;
  z-index: 0;
  top: clamp(72px, 9vw, 126px);
  right: clamp(-360px, -17vw, -180px);
  width: clamp(390px, 48vw, 720px);
  aspect-ratio: 1;
  border: 1px solid rgba(0,167,232,.13);
  border-radius: 50%;
  box-shadow:
    0 0 0 clamp(46px, 5vw, 76px) rgba(0,167,232,.038),
    0 0 0 clamp(92px, 10vw, 152px) rgba(37,99,235,.026);
  pointer-events: none;
  animation: join-orbit-drift 16s cubic-bezier(.22,1,.36,1) infinite alternate;
}
.sp-immersive-root .join::after {
  content: "";
  position: absolute;
  z-index: 0;
  top: 31%;
  right: -5%;
  width: min(46vw, 680px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,167,232,.22), transparent);
  transform: rotate(-15deg);
  pointer-events: none;
}
.sp-immersive-root .join > .wrap { position: relative; z-index: 1; }
@keyframes join-orbit-drift {
  from { transform: translate3d(0, 0, 0) rotate(-2deg); }
  to { transform: translate3d(-18px, 12px, 0) rotate(2deg); }
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

@media(max-width:760px) {
  .sp-immersive-root .join::before {
    top: 38%;
    right: -250px;
    width: 430px;
    opacity: .72;
  }
  .sp-immersive-root .join::after { top: 48%; right: -28%; width: 88vw; }
}
@media(prefers-reduced-motion:reduce) {
  .sp-immersive-root .join::before { animation: none; }
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
  .sp-immersive-root .hero h1 {
    max-width: 11ch;
    margin-top: 18px !important;
    font-size: clamp(43px, 13.6vw, 64px);
    line-height: .93;
  }
  .sp-immersive-root .hero .hline > span {
    transform: none !important;
    will-change: auto;
  }
  .sp-immersive-root .hero .sub { max-width: 38ch; margin-top: 20px; font-size: clamp(15px, 4.2vw, 17px); line-height: 1.58; }
  .sp-immersive-root .hero .cta { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 26px; }
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
  .sp-immersive-root .hero h1 { font-size: clamp(48px, 7.4vw, 58px); }
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
}
`;

export const LANDING_UPGRADE_CSS = `
/* Photography-led art direction layered over the preserved immersive structure. */
.sp-immersive-root .intro-photo,.sp-immersive-root .hero-photo{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.sp-immersive-root .intro-photo img,.sp-immersive-root .hero-photo img{width:100%;height:100%;max-width:none;object-fit:cover}
.sp-immersive-root .intro-photo img{object-position:center 56%;filter:saturate(.82) contrast(.94)}
.sp-immersive-root .intro::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,.88) 0%,rgba(255,255,255,.72) 45%,rgba(255,255,255,.42) 100%),linear-gradient(180deg,rgba(255,255,255,.18),rgba(247,250,252,.62))}
.sp-immersive-root .intro .engine-stage,.sp-immersive-root .intro .glow,.sp-immersive-root .intro .tele,.sp-immersive-root .mhi-row,.sp-immersive-root .mhi-features,.sp-immersive-root .mhi-ambient,.sp-immersive-root .intro-video{display:none!important}
.sp-immersive-root .hero{background:#070a12}
.sp-immersive-root .hero-photo img{object-position:center 48%;filter:saturate(.82) contrast(1.02)}
.sp-immersive-root .hero::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(4,8,15,.96) 0%,rgba(4,8,15,.86) 43%,rgba(4,8,15,.38) 72%,rgba(4,8,15,.66) 100%),linear-gradient(180deg,rgba(4,8,15,.35),rgba(4,8,15,.72))}
.sp-immersive-root .hero>.wrap,.sp-immersive-root .hero>.scrollhint{position:relative;z-index:2}
.sp-immersive-root .hero .strip{display:none}
.sp-immersive-root .hero .sub{color:rgba(239,248,252,.78)}
.sp-immersive-root .hero .tk-glow,.sp-immersive-root .hero .phone-orbit{opacity:.36}
.sp-immersive-root .ev-all,.sp-immersive-root .ev-ghost{text-decoration:none}
.sp-immersive-root [hidden]{display:none!important}.sp-immersive-root .ev-feat--empty .ev-poster img{filter:saturate(.8) brightness(.72)}.sp-immersive-root .ev-feat--empty .ev-detail{justify-content:center}.sp-immersive-root .ev-past-stats{display:none}.sp-immersive-root .ev-past-desc{margin-bottom:12px}
.sp-immersive-root .photo-story{padding:clamp(84px,10vw,150px) 0;background:#f4f1ea;color:#111827;content-visibility:auto;contain-intrinsic-size:900px}
.sp-immersive-root section[id],.sp-immersive-root footer[id]{scroll-margin-top:76px}
.sp-immersive-root .photo-story__head{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.55fr);gap:clamp(30px,7vw,90px);align-items:end;margin-bottom:34px}
.sp-immersive-root .photo-story .h2{max-width:760px;color:#111827}
.sp-immersive-root .photo-story__head>p{max-width:48ch;color:#475569;font-size:15px;line-height:1.7}
.sp-immersive-root .photo-grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-template-rows:repeat(2,minmax(220px,1fr));gap:12px;min-height:590px}
.sp-immersive-root .photo-card{position:relative;overflow:hidden;border-radius:18px;color:#fff;text-decoration:none;background:#101827;isolation:isolate;outline:none}
.sp-immersive-root .photo-card--event{grid-column:1/7;grid-row:1/3}.sp-immersive-root .photo-card--community{grid-column:7/11;grid-row:1}.sp-immersive-root .photo-card--recruitment{grid-column:7/9;grid-row:2}.sp-immersive-root .photo-card--interview{grid-column:9/11;grid-row:2}
.sp-immersive-root .photo-card img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;transition:transform .55s cubic-bezier(.22,1,.36,1),filter .35s ease}
.sp-immersive-root .photo-card--recruitment img{object-position:center 38%}.sp-immersive-root .photo-card--interview img{object-position:47% center}
.sp-immersive-root .photo-card__shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 28%,rgba(3,7,15,.9) 100%);z-index:1}
.sp-immersive-root .photo-card__copy{position:absolute;z-index:2;left:0;right:0;bottom:0;display:grid;gap:6px;padding:clamp(16px,2vw,26px)}
.sp-immersive-root .photo-card__copy small{font-family:var(--f-mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#7fe0ff}.sp-immersive-root .photo-card__copy b{max-width:30ch;font-size:clamp(15px,1.5vw,23px);line-height:1.15}.sp-immersive-root .photo-card__copy em{font-style:normal;font-size:11px;color:rgba(255,255,255,.72);opacity:0;transform:translateY(7px);transition:opacity .25s ease,transform .25s ease}
.sp-immersive-root .photo-card:hover img,.sp-immersive-root .photo-card:focus-visible img{transform:scale(1.035);filter:saturate(1.06)}.sp-immersive-root .photo-card:hover .photo-card__copy em,.sp-immersive-root .photo-card:focus-visible .photo-card__copy em{opacity:1;transform:none}.sp-immersive-root .photo-card:focus-visible{box-shadow:0 0 0 3px #f4f1ea,0 0 0 6px #00a7e8}
.sp-immersive-root .stats .gen-figure,.sp-immersive-root .stats .gen-bar,.sp-immersive-root .stats .gen-meta,.sp-immersive-root .stats .gen-foot,.sp-immersive-root .stats .gen-ghost{display:none!important}.sp-immersive-root .stats .gen-body{justify-content:center}.sp-immersive-root .stats .gen-story{margin-top:20px;max-width:48ch}
@media(max-width:900px){.sp-immersive-root .photo-story__head{grid-template-columns:1fr}.sp-immersive-root .photo-grid{grid-template-columns:1.2fr .8fr;grid-template-rows:360px 280px 280px;min-height:0}.sp-immersive-root .photo-card--event{grid-column:1/3;grid-row:1}.sp-immersive-root .photo-card--community{grid-column:1;grid-row:2}.sp-immersive-root .photo-card--recruitment{grid-column:2;grid-row:2}.sp-immersive-root .photo-card--interview{grid-column:1/3;grid-row:3}}
@media(max-width:760px){.sp-immersive-root .intro-photo img{object-position:center 58%}.sp-immersive-root .intro::after{background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.94) 70%,#f7fafc)}.sp-immersive-root .hero::after{background:linear-gradient(180deg,rgba(4,8,15,.66),rgba(4,8,15,.96) 66%)}.sp-immersive-root .hero-photo img{object-position:center 45%}.sp-immersive-root .photo-grid{display:grid;grid-template-columns:1fr;grid-template-rows:none;gap:10px}.sp-immersive-root .photo-card--event,.sp-immersive-root .photo-card--community,.sp-immersive-root .photo-card--recruitment,.sp-immersive-root .photo-card--interview{grid-column:1;grid-row:auto;min-height:310px}.sp-immersive-root .photo-card--recruitment{min-height:420px}.sp-immersive-root .photo-card__copy em{opacity:1;transform:none}}
@media(hover:none){.sp-immersive-root .photo-card__copy em{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.sp-immersive-root *{scroll-behavior:auto!important}.sp-immersive-root .rv,.sp-immersive-root .hline>span{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}.sp-immersive-root .photo-card img,.sp-immersive-root .photo-card__copy em{transition:none!important}.sp-immersive-root .gear,.sp-immersive-root .lane,.sp-immersive-root .tk-glow,.sp-immersive-root .phone-aurora,.sp-immersive-root .tk-live,.sp-immersive-root .eq span{animation:none!important}.sp-immersive-root .scrollhint{display:none!important}}
`;

export const BOARD_SHOWCASE_CSS = `
/* Board ITC: a direct text masthead and a compact directory. */
.sp-immersive-root .board-showcase{
  position:relative;
  padding:clamp(72px,8vw,112px) 0 clamp(92px,11vw,148px);
  background:var(--ink);
  color:var(--paper);
}
.sp-immersive-root .board-wrap{position:relative;z-index:1;max-width:1200px}
.sp-immersive-root .board-motion-reveal{
  opacity:0;
  transform:translate3d(0,28px,0);
  transition:opacity .7s var(--ease-out),transform .7s var(--ease-out);
  transition-delay:var(--board-delay,0ms);
  will-change:opacity,transform;
}
.sp-immersive-root .board-motion-reveal--photo{transform:translate3d(0,28px,0) scale(.92)}
.sp-immersive-root .board-motion-reveal--copy{transform:translate3d(28px,0,0)}
.sp-immersive-root .board-group:nth-child(odd) .board-motion-reveal--photo{transform:translate3d(-32px,18px,0) scale(.92)}
.sp-immersive-root .board-group:nth-child(even) .board-motion-reveal--photo{transform:translate3d(32px,18px,0) scale(.92)}
.sp-immersive-root .board-motion-reveal.board-motion-in{
  opacity:1;
  transform:none;
  will-change:auto;
}
.sp-immersive-root .board-head{
  padding-bottom:clamp(42px,5vw,62px);
}
.sp-immersive-root .board-head__copy{
  max-width:760px;
}
.sp-immersive-root .board-title{
  margin:0;
  color:var(--paper);
  font-family:var(--font-brand),var(--f-sans);
  font-size:clamp(58px,7vw,84px);
  font-variation-settings:"FLAR" 34,"VOLM" 12;
  font-weight:720;
  font-kerning:normal;
  letter-spacing:-.035em;
  line-height:.9;
  white-space:nowrap;
}
.sp-immersive-root .board-title em{
  margin-left:.12em;
  color:var(--cyan);
  font-style:normal;
}
.sp-immersive-root .board-summary{
  max-width:58ch;
  margin:clamp(22px,2.6vw,30px) 0 0;
  color:rgba(239,248,252,.76);
  font-size:clamp(16px,1.35vw,18px);
  line-height:1.68;
  text-wrap:pretty;
}
.sp-immersive-root .board-context{
  display:flex;
  align-items:center;
  gap:9px;
  margin:clamp(26px,3vw,36px) 0 0;
  color:rgba(239,248,252,.6);
  font-size:13.5px;
  font-weight:700;
}
.sp-immersive-root .board-context i{
  color:var(--cyan);
  font-style:normal;
}
.sp-immersive-root .board-lead{
  display:grid;
  grid-template-columns:minmax(320px,.72fr) minmax(0,1.28fr);
  gap:clamp(40px,8vw,104px);
  align-items:center;
  padding:clamp(58px,7vw,88px) 0;
}
.sp-immersive-root .board-photo{
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:space-between;
  width:100%;
  aspect-ratio:1;
  overflow:hidden;
  padding:16px;
  border-radius:10px;
  background:var(--ink-3);
}
.sp-immersive-root .board-photo--lead{
  max-width:420px;
  aspect-ratio:4/5;
  background:var(--ink-3);
}
.sp-immersive-root .board-photo__status{
  max-width:13ch;
  color:rgba(239,248,252,.58);
  font-size:9px;
  font-weight:700;
  line-height:1.35;
}
.sp-immersive-root .board-photo__initials{
  color:rgba(127,224,255,.76);
  font-family:var(--font-brand),var(--f-sans);
  font-size:clamp(52px,4.6vw,72px);
  font-variation-settings:"FLAR" 34,"VOLM" 12;
  font-weight:720;
  letter-spacing:-.035em;
  line-height:.82;
}
.sp-immersive-root .board-photo--lead .board-photo__initials{
  color:var(--cyan);
  font-size:clamp(72px,8vw,108px);
}
.sp-immersive-root .board-lead__role,
.sp-immersive-root .board-member__role{
  margin:0;
  color:var(--cyan);
  font-size:13px;
  font-weight:800;
  line-height:1.4;
}
.sp-immersive-root .board-lead__name{
  max-width:12ch;
  margin:12px 0 0;
  color:#fff;
  font-family:var(--font-brand),var(--f-sans);
  font-size:clamp(42px,5.2vw,68px);
  font-variation-settings:"FLAR" 34,"VOLM" 12;
  font-weight:720;
  letter-spacing:-.035em;
  line-height:.98;
  text-wrap:balance;
}
.sp-immersive-root .board-lead__summary{
  max-width:42ch;
  margin:22px 0 0;
  color:rgba(239,248,252,.8);
  font-size:clamp(17px,1.6vw,20px);
  line-height:1.65;
  text-wrap:pretty;
}
.sp-immersive-root .board-lead__focus{
  display:flex;
  flex-wrap:wrap;
  gap:8px 0;
  list-style:none;
  margin:28px 0 0;
  padding:0;
  color:rgba(239,248,252,.56);
  font-size:13px;
}
.sp-immersive-root .board-lead__focus li{display:flex;align-items:center;white-space:nowrap}
.sp-immersive-root .board-lead__focus li:not(:last-child)::after{
  content:"·";
  margin:0 10px;
  color:var(--cyan);
}
.sp-immersive-root .board-directory-head{
  display:grid;
  grid-template-columns:minmax(280px,.72fr) minmax(0,1.28fr);
  gap:clamp(40px,8vw,104px);
  align-items:end;
  padding:clamp(54px,7vw,82px) 0 clamp(40px,5vw,56px);
}
.sp-immersive-root .board-directory-head h3{
  max-width:15ch;
  margin:0;
  color:var(--paper);
  font-family:var(--font-brand),var(--f-sans);
  font-size:clamp(28px,3.2vw,42px);
  font-variation-settings:"FLAR" 34,"VOLM" 12;
  font-weight:720;
  letter-spacing:-.03em;
  line-height:1.02;
  text-wrap:balance;
}
.sp-immersive-root .board-directory-head p{
  max-width:52ch;
  margin:0;
  color:rgba(239,248,252,.66);
  font-size:14px;
  line-height:1.65;
  text-wrap:pretty;
}
.sp-immersive-root .board-roster{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:clamp(36px,5vw,68px);
}
.sp-immersive-root .board-group{min-width:0}
.sp-immersive-root .board-group__head{
  display:flex;
  justify-content:space-between;
  gap:24px;
  min-height:96px;
  padding:0 0 28px;
}
.sp-immersive-root .board-group__title{
  margin:0;
  color:var(--paper);
  font-size:17px;
  font-weight:800;
  letter-spacing:-.015em;
  line-height:1.3;
}
.sp-immersive-root .board-group__summary{
  max-width:34ch;
  margin:7px 0 0;
  color:rgba(239,248,252,.58);
  font-size:12.5px;
  line-height:1.5;
  text-wrap:pretty;
}
.sp-immersive-root .board-group__count{
  flex:0 0 auto;
  color:var(--cyan);
  font-size:11px;
  font-weight:800;
  line-height:1.45;
  white-space:nowrap;
}
.sp-immersive-root .board-group__members{
  display:grid;
  gap:clamp(48px,5vw,64px);
}
.sp-immersive-root .board-member{
  display:grid;
  grid-template-columns:clamp(168px,16vw,200px) minmax(0,1fr);
  gap:clamp(24px,3vw,36px);
  align-items:center;
  min-width:0;
}
.sp-immersive-root .board-member__body{min-width:0}
.sp-immersive-root .board-member__name{
  margin:6px 0 0;
  color:var(--paper);
  font-family:var(--font-brand),var(--f-sans);
  font-size:clamp(21px,1.75vw,25px);
  font-variation-settings:"FLAR" 34,"VOLM" 12;
  font-weight:720;
  letter-spacing:-.025em;
  line-height:1.08;
  overflow-wrap:anywhere;
  text-wrap:balance;
}
.sp-immersive-root .board-member__summary{
  max-width:30ch;
  margin:10px 0 0;
  color:rgba(239,248,252,.68);
  font-size:13.5px;
  line-height:1.58;
  text-wrap:pretty;
}
.sp-immersive-root .board-member__area{
  display:flex;
  align-items:baseline;
  gap:8px;
  margin:12px 0 0;
  color:rgba(239,248,252,.76);
  font-size:11.5px;
  font-weight:700;
  line-height:1.45;
}
.sp-immersive-root .board-member__area span{
  color:var(--cyan);
  font-size:10px;
  font-weight:800;
}
.sp-immersive-root .board-note{
  display:flex;
  justify-content:space-between;
  gap:24px;
  margin-top:clamp(58px,8vw,92px);
  color:rgba(239,248,252,.54);
  font-size:12px;
  line-height:1.5;
}
@media(max-width:980px){
  .sp-immersive-root .board-roster{gap:28px}
}
@media(max-width:760px){
  .sp-immersive-root .board-showcase{padding:76px 0 94px}
  .sp-immersive-root .board-head{padding-bottom:42px}
  .sp-immersive-root .board-title{font-size:clamp(50px,14vw,62px);line-height:.92}
  .sp-immersive-root .board-summary{max-width:44ch;margin-top:22px;font-size:16px;line-height:1.65}
  .sp-immersive-root .board-context{margin-top:24px}
  .sp-immersive-root .board-context,
  .sp-immersive-root .board-lead__role,
  .sp-immersive-root .board-member__role,
  .sp-immersive-root .board-lead__focus,
  .sp-immersive-root .board-member__summary,
  .sp-immersive-root .board-note{font-size:14px}
  .sp-immersive-root .board-lead{grid-template-columns:1fr;gap:30px;padding:44px 0 52px}
  .sp-immersive-root .board-photo--lead{width:min(100%,420px)}
  .sp-immersive-root .board-lead__name{font-size:clamp(38px,11vw,52px)}
  .sp-immersive-root .board-lead__summary{margin-top:16px;font-size:16px}
  .sp-immersive-root .board-directory-head{grid-template-columns:1fr;gap:14px;padding:48px 0 40px}
  .sp-immersive-root .board-directory-head h3{font-size:clamp(30px,8vw,40px)}
  .sp-immersive-root .board-directory-head p{font-size:14px}
  .sp-immersive-root .board-roster{grid-template-columns:1fr;gap:64px}
  .sp-immersive-root .board-note{align-items:flex-start;flex-direction:column;gap:6px}
  .sp-immersive-root .board-motion-reveal--copy{transform:translate3d(0,26px,0)}
  .sp-immersive-root .board-group:nth-child(odd) .board-motion-reveal--photo,
  .sp-immersive-root .board-group:nth-child(even) .board-motion-reveal--photo{transform:translate3d(0,26px,0) scale(.92)}
}
@media(max-width:540px){
  .sp-immersive-root .board-directory-head{padding-top:40px}
  .sp-immersive-root .board-group__head{min-height:0}
  .sp-immersive-root .board-group__members{gap:44px}
  .sp-immersive-root .board-member{grid-template-columns:152px minmax(0,1fr);gap:20px}
  .sp-immersive-root .board-member .board-photo{padding:14px;border-radius:8px}
  .sp-immersive-root .board-member .board-photo__status{max-width:10ch;font-size:8px}
  .sp-immersive-root .board-member .board-photo__initials{font-size:48px}
  .sp-immersive-root .board-member__name{font-size:22px}
  .sp-immersive-root .board-member__summary{margin-top:8px;line-height:1.5}
  .sp-immersive-root .board-note{margin-top:36px}
}
@media(prefers-reduced-motion:reduce){
  .sp-immersive-root .board-motion-reveal{
    animation:none!important;
    opacity:1!important;
    transform:none!important;
    transition:none!important;
    will-change:auto!important;
  }
}
`;
