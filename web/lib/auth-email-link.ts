import type { AuthEmailKind } from "@/lib/auth-email-template";

/** Keep Auth links on the public SavaPass domain, then verify the hash server-side. */
export function buildAuthActionUrl(
  redirectTo: string,
  hashedToken: string,
  kind: AuthEmailKind,
) {
  const actionUrl = new URL(redirectTo);
  actionUrl.searchParams.set("token_hash", hashedToken);
  actionUrl.searchParams.set("type", kind === "magiclink" ? "email" : kind);
  return actionUrl.toString();
}
