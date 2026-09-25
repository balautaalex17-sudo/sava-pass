# Indefinite event reservations

Released to https://www.interactsfsava.com on 25 September 2026.

- Production deployment: `dpl_C3vw5vsDcawKnCoVsFSHiP5EGRs4` (`READY`).
- Previous production deployment: `dpl_czXE4jcni1PchNM6Ucb1Mnyv9jpu`.
- Code commit: `d08b76e` on `origin/codex/indefinite-reservations`.
- Frozen production source: `active/releases/indefinite-reservations-20260925/web`.

The public checkout clears the database function's legacy 48-hour deadline before delivering a ticket. The admin ticket issuer writes no deadline. Event ticket QR codes no longer expire on their own; member attendance QR codes retain their short expiry. Cancellation and event closure still determine whether a ticket can be used.

The five expired unpaid Treasure Hunt X tickets were restored to `reserved`, their orders to `pending`, and their deadlines cleared. Sixteen existing reservations and one created immediately before deployment also had their deadlines cleared. No payment was marked complete.

Verification: the focused QR tests, TypeScript, and local and Vercel production builds passed. The restored ticket page and event page returned HTTP 200. A final database read found zero reserved tickets with a deadline and zero expired tickets. Vercel returned no runtime error logs for the new deployment.
