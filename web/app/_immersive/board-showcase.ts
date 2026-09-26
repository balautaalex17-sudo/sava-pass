import { escapeHtml } from "@/lib/escape-html";
import { BOARD_PORTRAITS } from "./board-assets";
import { renderBoardGallery } from "./board-gallery";
import { clubImage } from "./board-images";

type BoardMember = { name: string; showName?: boolean; role: string; area: string; summary: string };
const ROLE_LABELS: Readonly<Record<string, string>> = {
  President: "Președinte",
  "Past President": "Fost președinte",
  "Vice President": "Vicepreședinte",
  Secretary: "Secretar",
  Treasurer: "Trezorier",
  "Director PR": "Director relații publice",
  "Director HR": "Director resurse umane",
  "Project Manager": "Manager de proiect",
  "I&E Relations Director": "Director relații interne și externe",
};
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function renderEditorialBoard(members: readonly BoardMember[]) {
  if (!members.length) return "";
  // Always start with the president, including before React mounts and on refresh.
  const start = Math.max(0, members.findIndex(member => member.role === "President"));
  const ordered = [...members.slice(start), ...members.slice(0, start)];
  const portraits = ordered.map((member, index) => {
    const portrait = BOARD_PORTRAITS[member.name];
    const label = member.showName === false ? roleLabel(member.role) : member.name;
    return { ...portrait, id: index, alt: portrait.src ? label : `Fotografie lipsă pentru ${label}` };
  });
  const profiles = ordered.map((member, index) => {
    const split = member.name.lastIndexOf(" ");
    const surname = split < 0 ? member.name : member.name.slice(0, split);
    const firstName = split < 0 ? "" : member.name.slice(split + 1);
    return `<div class="bdr-profile" data-board-profile="${index}" data-board-role="${escapeHtml(roleLabel(member.role))}"${index ? " hidden" : ""}>
      ${member.showName === false ? "" : `<h3 class="bdr-member-name${surname.length > 13 ? " bdr-long-name" : ""}"><span>${escapeHtml(surname)}</span> <span>${escapeHtml(firstName)}</span></h3>`}
      <p class="bdr-member-summary">${escapeHtml(member.summary)}</p>
    </div>`;
  }).join("");
  const cards = portraits.map((portrait, index) => {
    return `<figure class="bdr-portrait-card" data-board-card="${index}" data-slot="${Math.min(index, 4)}" data-portrait-rotate="${portrait.rotate ?? ""}" aria-hidden="${index !== 0}">
      ${portrait.src ? clubImage({ ...portrait, src: portrait.src },
        portrait.rotate ? "(max-width: 820px) 340px, 360px" : "(max-width: 820px) 245px, 290px", { position: portrait.position }) : `<span class="bdr-empty-portrait" role="img" aria-label="${escapeHtml(portrait.alt)}"></span>`}
    </figure>`;
  }).join("");

  return `<!-- ═══ BOARD ITC ═══ -->
<section class="board-editorial" id="board" data-screen-label="Board Interact" aria-labelledby="board-title">
  <div class="bdr-ambient" aria-hidden="true">
    <video data-board-ambient data-ambient-src="/imersiv/savapass-hero-loop.mp4" poster="/imersiv/savapass-hero-poster.webp" width="1280" height="720" muted loop playsinline preload="none" disablepictureinpicture tabindex="-1"></video>
    <svg class="bdr-orbits" viewBox="0 0 1345 1170" preserveAspectRatio="none" fill="none"><path d="M1138-20C1120 135 849 10 768 221S505 432 387 439M1420 341C1274 612 1105 682 1172 875S793 1160 422 1230M-44 1090C130 995 305 1110 385 1004S700 982 886 1170"/><circle cx="59" cy="359" r="2"/><circle cx="745" cy="1120" r="2.5"/></svg>
  </div>
  <div class="bdr-team">
    <div class="bdr-layout bdr-inset">
      <header class="bdr-heading">
        <p class="bdr-eyebrow bdr-brand-eyebrow">Interact Sf. Sava</p>
        <h2 id="board-title">Board <span>Interact</span></h2>
        <p class="bdr-team-intro">Nouă membri coordonează proiectele, bugetul, echipa, comunicarea și parteneriatele clubului. Mai jos găsești rolul fiecăruia.</p>
      </header>
      <div class="bdr-member-copy" id="board-member-details">
        <div class="bdr-profiles">${profiles}</div>
      </div>
      <div class="bdr-showcase" role="region" aria-roledescription="carusel" aria-label="Membrii echipei">
        <div class="bdr-portrait-stack" id="board-portraits" tabindex="0" aria-label="Portretele echipei. Folosește săgețile pentru a schimba membrul.">${cards}<div data-board-portrait-mount data-portraits="${escapeHtml(JSON.stringify(portraits))}"></div></div>
        <div class="bdr-carousel-controls">
          <button type="button" class="bdr-arrow bdr-arrow-prev" data-board-step="-1" aria-label="Membrul anterior" aria-controls="board-portraits board-member-details board-current-role">${arrow}</button>
          <div class="bdr-carousel-details">
            <span class="bdr-current-role" id="board-current-role" data-board-role-label>${escapeHtml(roleLabel(ordered[0].role))}</span>
            <span class="bdr-member-position" data-board-position>1 din ${ordered.length}</span>
          </div>
          <button type="button" class="bdr-arrow" data-board-step="1" aria-label="Membrul următor" aria-controls="board-portraits board-member-details board-current-role">${arrow}</button>
        </div>
        <p class="bdr-sr-only" data-board-announcement aria-live="polite" aria-atomic="true"></p>
      </div>
    </div>
  </div>
  ${renderBoardGallery()}
</section>`;
}
