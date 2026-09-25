# Instagram event location fallback

Released 26 September 2026 to https://interactsfsava.com and https://www.interactsfsava.com.

- Deployment: `dpl_HVVut4SQ4DgeB2PNykjcY5ibRtVe` (`READY`, promoted).
- Immutable URL: https://sava-pass-llgm15jsp-nexuswork.vercel.app.
- Previous production deployment: `dpl_CGvj1m1goBAusp7EhgVh48AkBHp6`.
- Frozen source: `active/releases/instagram-map-20260926/web`.
- Source commit: `47344cf545058a1cb8b47ee9d87e6e6c22edbdef` on `origin/codex/instagram-map-fix`.

Instagram's browser on Android can block the embedded Google Maps request with `ERR_BLOCKED_BY_RESPONSE`. The location section now uses a normal Maps link and a copyable address in Instagram. Other browsers keep the map, with only one deferred-loading mechanism and a persistent external link if the embed fails. Map queries fall back to the venue when the street address is empty.

The release starts from the prior personal-ticket production snapshot and changes only the event page, map component, its new stylesheet, and the existing browser-check selector. Baseline and changed-file manifests are stored next to the frozen source. Existing live releases and unrelated workspace edits were preserved. No database change or ticket purchase was made.

Verification: isolated Git source and release source passed TypeScript and focused ESLint. The Vercel production build passed. Candidate and live Treasure Hunt X checks passed for simulated S23 Instagram, iPhone Instagram, Android Chrome, and desktop Chrome. Instagram made no embedded Maps request; same-tab Maps links and both clipboard-success and clipboard-denied behavior passed. Regular browsers deferred the map until scrolling and retained their Maps link when its request was deliberately blocked. Both public domains resolved to the expected deployment. A physical S23 Instagram check remains useful because browser emulation cannot reproduce the native app's full behavior.
