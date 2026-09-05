# Loop 2 - Motion, performance, and responsiveness review

Date: 2026-08-03

## Findings and severity

| Severity | Finding | Correction |
|---|---|---|
| High | Legacy ambient video and constant visual motion added transfer and continuity risk without helping a user task. | Removed those clips from the active landing treatment and used optimized WebP photography with subtle image movement only. |
| Medium | Full-size source photos were unsuitable for every breakpoint. | Generated explicit desktop/mobile hero variants and compressed 29 library images plus curated section crops to WebP. |
| Medium | Reveals and smooth scrolling needed a complete reduced-motion fallback. | Restored the global media-query behavior: reveal opacity stays visible, transforms and gear animation are removed, and scrolling returns to `auto`. |
| Medium | The performance script initially allowed programmatic full-page scrolling to replace the initial LCP candidate. | Fixed the measurement harness to freeze the initial LCP before scrolling. This corrected the test, not the page. |
| Low | Two mobile Next.js RSC prefetch requests to `/conta` were browser-cancelled during navigation sampling. | Verified they were `ERR_ABORTED` cancellations with no application or console error. No product correction was required. |

## Responsive test matrix

All required sizes passed in `active/review/loop2-final/responsive-results.json`:

| Viewport | Overflow | Broken images | Console errors | CLS |
|---|---:|---:|---:|---:|
| 375x812 | 0 | 0 | 0 | 0 |
| 430x932 | 0 | 0 | 0 | 0 |
| 768x1024 | 0 | 0 | 0 | 0 |
| 1366x768 | 0 | 0 | 0 | 0.0010 |
| 1440x900 | 0 | 0 | 0 | 0.0039 |
| 1920x1080 | 0 | 0 | 0 | 0.0027 |

## Motion and transfer results

- Desktop scroll: median frame 6 ms, p90 12 ms, maximum 49 ms, zero frames above 50 ms, TBT 0 ms.
- Mobile scroll: median 6 ms, p90 6 ms, maximum 12 ms, zero frames above 32 ms, TBT 0 ms.
- Smoothness verdict: `smooth`; evidence: `active/smoothness/2026-08-03T17-39-12-785Z.json`.
- Initial LCP: 256 ms in the corrected transfer run.
- Initial transfer: 0.92 MB across 28 requests.
- Full-page transfer after scroll: 2.02 MB across 38 requests; 1.57 MB images and 0.22 MB scripts.
- Performance gates passed: LCP below 1500 ms and full transfer below 6 MB.
- Reduced motion passed: media query matched; reveal transform `none`, gear animation `none`, scroll behavior `auto`.

## Regression checks

- Production build passed on Next.js 16.2.12.
- Built homepage returned HTTP 200.
- Next image optimizer returned HTTP 200 for the mobile hero through Sharp 0.35.3.
- Lint passed with zero errors; TypeScript passed with zero errors.

