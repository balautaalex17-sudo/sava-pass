# Landing Page Redesign

_Started 2026-05-25 19:37 UTC_

---

## User

I want the landing page to be more ladning not focused on specific event

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

Got it — I'll reorient the desktop landing around the SavaPass / Interact Sf. Sava brand story, with the current event present as the highlight of an events strip rather than the sole hero. The mobile-web view stays event-focused for now (it's used as the deep link from a shared ticket).

Let me also update the URL/tab.Now let me update the URL in app.jsx to match the brand-led nature (no event slug):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Landing page reframed around the SavaPass / Interact brand instead of leading with a single event:

- **Hero** — brand pitch ("Biletul tău pentru fiecare seară Interact"), stat strip (editions / tickets / RON donated), and a fanned poster stack with the current event on top
- **How it works** — 3 steps (choose → pay → enter with QR)
- **Events** — featured upcoming event card + past events grid below
- **About Interact** — short narrative + cyan club lockup card with member/year stats
- URL/tab swapped to plain `savapass.ro`

The current event still appears prominently (as the "Următorul eveniment" featured card and inside the hero stack), but the page now reads as a landing for the product, not a single-event page.

## User

Verifier agent check completed

## Assistant

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: done]_

Fixed — bumped the inner `<ChromeWindow>` height to 3100 to match the artboard so the full landing renders inside the browser chrome.

