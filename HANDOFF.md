# SavaPass — Handoff tehnic

> Pachet de predare pentru dezvoltatori. Descrie ce e construit, cum e organizat codul prototipului și ce ar trebui să devină în producție.
> Pentru viziunea de produs, vezi `PRODUCT.md`.

---

## 1. Ce e livrat

Un **prototip de mare fidelitate** în React (JSX + Babel în browser, fără build), care acoperă toate ecranele și fluxurile SavaPass. Nu e cod de producție — e specificația vizuală și de interacțiune, executabilă.

| Fișier | Ce e |
|---|---|
| `SavaPass Prototype.html` | Aplicația completă: telefon interactiv + design canvas cu toate ecranele |
| `Flow Video.html` | Walkthrough animat de 26s al căii critice (cumpărare → intrare) |
| `PRODUCT.md` | Viziunea de produs |
| `HANDOFF.md` | Acest document |
| `src/` | Tot codul componentelor |
| `assets/` | Imaginile evenimentelor |
| `export/` | Bundle-uri standalone + fundal extras |

---

## 2. Cum rulezi

Nu există pas de build. Toate fișierele HTML încarcă React, ReactDOM și Babel din CDN (versiuni fixate cu `integrity`), apoi transpilează JSX-ul în browser.

- Deschide `SavaPass Prototype.html` direct în browser (sau servește folderul cu orice server static).
- Fonturi: Manrope, Instrument Serif, JetBrains Mono (Google Fonts).
- Iconuri: Lucide (UMD din CDN).

---

## 3. Structura codului (`src/`)

### Ordinea de încărcare contează
`data.js` (JS simplu, primul) → componentele `*.jsx` (Babel) → `app.jsx` (compoziția principală, ultimul).

Fiecare `<script type="text/babel">` are propriul scope la transpilare. De aceea fiecare fișier de componente **expune** la `window` la final (`Object.assign(window, {...})`), iar consumatorii citesc de pe global. Asta e specific prototipului; în producție vor fi `import`-uri ESM.

### Fișiere

| Fișier | Conținut |
|---|---|
| `data.js` | Toate datele demo: evenimente, participanți, venit, scanări, aplicanți, sloturi interviu, șabloane email. **Singura sursă de adevăr pentru conținut.** |
| `tokens.css` | Culori și tipografie (design tokens). |
| `components.jsx` | Atomi partajați: `SP_C` (culori), `SP_FONT/SERIF/MONO`, `Icon`, `Button`, `Field`, `Chip`, `Eyebrow`, `QR`, `Logo`. |
| `screens-mobile.jsx` | Ecranele de telefon (390×844): `PhoneShell`, `HomeScreen`, `EventScreen`, `CheckoutScreen`, `SuccessScreen`, `TicketScreen` (`wallet`/`minimal`/`boarding`), `ScannerScreen`. |
| `admin.jsx` | Dashboard board (1200×820): `AdminDashboard`, `StatCard`, `RevenueChart`, `CheckInDial`, `AttendeesTable`, `ScanLog`. |
| `website.jsx` / `website-mobile.jsx` | Landing page (desktop + mobil). |
| `membership.jsx` | Recrutare: `MembershipForm`, `EmailPreview`, `ApplicantStatusMobile`, `InterviewSchedulerMobile`, `AdminPipeline`. |
| `browser-window.jsx` / `ios-frame.jsx` | Chrome-uri de prezentare (fereastră browser, ramă iOS). |
| `design-canvas.jsx` | Canvas pan/zoom care așază toate ecranele unul lângă altul. |
| `tweaks-panel.jsx` | Panoul de Tweaks (evenimentul curent, stilul biletului, accent). |
| `app.jsx` | Compoziția principală: telefonul interactiv + canvas-ul. |
| `animations.jsx` | Motorul de animație (`Stage`, `Sprite`, `Easing`) — folosit doar de `Flow Video.html`. |
| `flow-video.jsx` | Compoziția video a fluxului. |

---

## 4. Contractul de date (model)

Definit în `data.js`. Acestea sunt formele pe care un backend real ar trebui să le servească.

**Event**
```
id, slug, title, subtitle, dateLabel, dateLong, doors,
venue, venueLine, price, capacity, sold, checkedIn,
accent, photo, program[{t, l}], about, perks[]
```

**Attendee / Scan**
```
attendee: { n(ame), e(mail), id, status: 'valid'|'in'|'used', t(ime) }
scan:     { id, n(ame), t(ime), ok: boolean }
```

**Applicant (recrutare)**
```
id, name, school, email, appliedAt, track,
status: submitted | reviewing | interview-invited |
        interview-scheduled | accepted | rejected,
slot?  // după programare
```

**Email template** — `{ id, stage, subject, preheader, greeting, body[], cta, note }`

---

## 5. Stări de status (mașini de stare)

**Bilet:** `valid` (emis, neintrat) → `in` (scanat, înăuntru) → `used` (consumat / re-scanat).

**Aplicant:** `submitted → reviewing → interview-invited → interview-scheduled → accepted | rejected`. Fiecare tranziție declanșează un email (vezi `SP_EMAILS`).

---

## 6. Design tokens (rezumat)

| Token | Valoare |
|---|---|
| Brand cyan | `#009FE3` |
| Brand albastru | `#2563EB` |
| Navy (text) | `#0F172A` |
| Fundal cald | `#f0eee9` |
| Font UI | Manrope |
| Font display | Instrument Serif |
| Font mono | JetBrains Mono |
| Iconuri | Lucide |

Valorile complete (scale de gri, semantice danger/success, gradiente) sunt în `src/tokens.css` și expuse ca `SP_C` în `components.jsx`. **Folosiți tokenii, nu hexuri hardcodate.**

---

## 7. De la prototip la producție — recomandări

1. **Migrare la build real** (Vite + React + TypeScript). Înlocuiți pattern-ul `window.*` cu module ESM și tipuri din contractul de la §4.
2. **Plăți reale** — integrare Stripe / Netopia; ecranul `CheckoutScreen` e mock (are deja stările loading/succes).
3. **Backend** — evenimente, bilete (cu semnătură pe QR pentru anti-fraudă), participanți, recrutare. Codul QR trebuie să fie un token semnat, nu doar ID-ul.
4. **Auth** — operatorul (scanner) și boardul (dashboard) au nevoie de login; cumpărarea rămâne fără cont.
5. **Realtime** — dashboard-ul (check-in, scanări) ar trebui alimentat prin websocket/SSE.
6. **Emailuri tranzacționale** — șabloanele din `SP_EMAILS` se mapează 1:1 pe un provider (Resend/Postmark).
7. **Accesibilitate** — verificați contrast, focus states, target-uri ≥44px (deja respectate în mobil), `prefers-reduced-motion` (deja respectat în video).
8. **i18n** — tot copywriting-ul e în română, centralizat. Ușor de externalizat dacă va fi nevoie.

---

## 8. Probleme cunoscute / limite

- Tot e mock client-side; nu există persistență reală în afară de tweaks și poziția de playback a video-ului.
- QR-urile sunt decorative (nu codifică date reale).
- Plata nu procesează nimic.
- Datele sunt seed fix pentru un singur eveniment activ (`echoes`).

---

*Întrebări despre intenția de design → vezi `PRODUCT.md`. Pentru a vedea fluxul în mișcare → deschide `Flow Video.html`.*
