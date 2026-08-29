import "server-only";

/**
 * Canonical public base URL (no trailing slash), resolved robustly so a missing
 * or stale `NEXT_PUBLIC_SITE_URL` can never silently fall back to localhost in
 * production. Used for emailed ticket + QR links, invite links, and OG
 * `metadataBase`.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` — honored UNLESS it's a localhost value while
 *     running on Vercel (that's a misconfigured/stale var, not a real prod URL).
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — the stable production domain on Vercel.
 *  3. `VERCEL_URL` — the per-deployment URL (preview deploys).
 *  4. `http://localhost:3000` — local dev only.
 */
export function resolveSiteUrl(opts?: { fallback?: string }): string {
  const onVercel = Boolean(process.env.VERCEL);
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (explicit && !(onVercel && /localhost|127\.0\.0\.1/.test(explicit))) {
    return explicit.replace(/\/+$/, "");
  }

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/\/+$/, "")}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment.replace(/\/+$/, "")}`;

  return opts?.fallback ?? "http://localhost:3000";
}
