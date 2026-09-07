# Portal latency changes

Updated 7 September 2026. Applies to the member and board portal in `web/`.

## What changed

- Portal navigation uses a shared `PortalLink` with visible progress. The indicator mounts outside the mobile menu, so closing the menu cannot hide it.
- Member and board sections have loading boundaries at their page segments. Next can prepare these small placeholders ahead of navigation while keeping permission-sensitive page data fresh.
- Attendance filters, scan-history filters, and meeting selection update the route without reloading the document or sidebar. Submission shows a pending state and blocks duplicate submits.
- Removed redundant client refreshes after attendance, recruitment, interview, and event Server Actions that already revalidate their pages. API-based imports and authentication still retain their required refreshes.
- Attendance badge and table retrieval run concurrently, using the existing queries and permission checks.
- The member QR page generates its initial image with its page response. Refreshes share one in-flight request, show progress, have a timeout, and schedule renewal against the token's actual expiry.
- Permission switches update immediately and revert on failure. Staff role controls recover after network errors. Scanner verification and sign-out buttons show pending feedback.
- Loading placeholders stay within narrow phone layouts.

The existing gallery and recruitment work was preserved. No database migration, permission relaxation, shared cache of private data, or deployment was made.

## Verification

- Production build and TypeScript: passed.
- Lint: zero errors; three existing warnings in unrelated immersive-page files.
- 54 relevant automated tests: passed, including attendance, recruitment, role hierarchy, security boundaries, gallery actions, and recruit permissions.
- Real production-build guest checks: all 20 member/board destinations redirect unauthenticated visitors to login, with no browser exceptions.
- Isolated component browser tests at 390px and 1440px: passed. External traffic was blocked and save operations used disposable adapters.
- With a simulated 450ms response, visible navigation feedback appeared in 32ms on the phone layout and 22ms on desktop in the final run. These are interface feedback timings, not production route-load timings.
- Browser checks confirmed zero filter document reloads, a preserved sidebar, zero initial QR API requests, one request during overlapping QR refresh attempts, permission rollback, staff error recovery, no extra interview refresh, scanner pending feedback, and sign-out error recovery.

Detailed local results are in `active/portal-latency/component-browser.json` and `active/portal-latency/production-build-guest-check.json` at the repository root.

## Remaining live verification

Authenticated production and staging timing could not be measured because the saved test credentials were rejected. Database type generation was also denied by the connected management services; query shapes and schema were left unchanged. The local component tests do not establish live database, email, Google Drive, camera-device, or end-to-end save latency.

With a working test account, test first and repeat navigation, saving an interview evaluation, changing an attendance filter, QR renewal, and gallery pagination on a phone connection. Record response time separately from visible feedback. These changes are local and still need the normal release process before they affect the deployed portal.

## Framework behavior

The implementation follows Next's documented [loading boundaries and navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating), [form navigation](https://nextjs.org/docs/app/api-reference/components/form), and [Server Action revalidation](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).

## Production release scope

The latency release is isolated from unrelated gallery routing and recruitment preview edits in the working directory. Existing gallery pagination receives the shared navigation feedback without including the unfinished gallery frame changes.
