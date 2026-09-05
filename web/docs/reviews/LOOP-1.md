# Loop 1 - Art direction and anti-AI-slop review

Date: 2026-08-03

## Findings and severity

| Severity | Finding | Correction |
|---|---|---|
| High | The inherited immersive landing relied on synthetic clips, glow layers, telemetry decoration, and placeholder-style surfaces instead of authentic club photography. | Kept the original section order and markup, but replaced the active visual layer with curated real photographs and two source-preserving Higgsfield hero outpaints. Synthetic videos, decorative stage elements, telemetry, and the marquee are hidden from the active experience. |
| High | The only database event was dated 14 November 2025 but still marked active, so the landing and checkout could present a past event as purchasable. | Added a shared future-event availability rule. The landing now shows an honest empty state and event pages label past events as ended; checkout rejects them. The admin record was not silently mutated. |
| High | Provisional statistics and generic interview availability copy could be read as real claims. | Replaced unverified numbers and slots with qualitative, source-backed community storytelling and truthful product copy. |
| Medium | The navbar could lose contrast over photography and the mobile navigation needed a clear disclosure state. | Added an opaque-enough dark navigation surface, restrained primary action, keyboard-visible focus, and a clean mobile menu. |
| Medium | Photo overlays depended too much on hover, which hid meaning on touch devices. | Made card labels and descriptions persist on touch layouts and kept hover as optional enhancement. |
| Medium | Repeated archive cards had weak visual distinction. | Curated event, community, recruitment, and interview compositions with different subjects, proportions, and copy. |
| Low | Several calls to action inherited dead or provisional targets. | Reconnected actions to the existing event, recruitment, account, and project destinations. |

## Art-direction decisions

- Preserved the hero, manifesto, event spotlight, community proof, recruitment, archive, and final-call-to-action sequence.
- Used recognizable Interact photographs for membership, event, and community proof.
- Used Higgsfield only for the missing wide/mobile hero canvas and interview-specific editorial image.
- Rejected an interview generation that resembled a medical, legal, or forensic workshop.
- Kept sensitive beneficiary and medical photographs archived and excluded by default.

## Retest

- Captured full-page and section screenshots at 375x812, 430x932, 768x1024, 1366x768, 1440x900, and 1920x1080.
- Final screenshots: `active/review/loop1-final/`.
- Automated final result: no horizontal overflow, no broken images, four story cards, zero active synthetic videos, and zero console errors at all six sizes.
- Reduced-motion screenshot and computed-style check passed at 375x812.

## Remaining constraints after this loop

- The supplied external image-folder URL was still a placeholder, so the audit used all 29 locally supplied WhatsApp photographs.
- Publication consent must be confirmed before unarchiving images that show children, beneficiaries, or medical settings.

