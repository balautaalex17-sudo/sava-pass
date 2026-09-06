import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canConnectGalleryDrive } from "@/lib/gallery";
import { getGalleryViewer } from "@/lib/gallery-auth";
import { openGalleryValue } from "@/lib/gallery-crypto";
import { driveFetch, encryptedDriveToken, exchangeGoogleToken, galleryCallbackUrl, galleryKey, getDriveConnection } from "@/lib/gallery-drive";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

const oauthSchema = z.object({ state: z.string(), verifier: z.string(), userId: z.string().uuid(), expiresAt: z.number() });

export async function GET(request: Request) {
  let outcome = "error";
  const jar = await cookies();
  const cookie = jar.get("gallery-drive-oauth")?.value;
  jar.set("gallery-drive-oauth", "", { maxAge: 0, path: "/api/gallery/drive" });
  try {
    const viewer = await getGalleryViewer();
    if (!viewer || !canConnectGalleryDrive(viewer.role, viewer.membershipStatus) || !cookie) throw new Error("Invalid OAuth session");
    const state = oauthSchema.parse(openGalleryValue(cookie, "drive-oauth", galleryKey()));
    const params = new URL(request.url).searchParams;
    if (state.state !== params.get("state") || state.userId !== viewer.userId || state.expiresAt < Date.now()) throw new Error("Invalid OAuth state");
    if (params.has("error")) outcome = "cancelled";
    else {
      const code = z.string().min(1).max(4096).parse(params.get("code"));
      const tokens = await exchangeGoogleToken({ grant_type: "authorization_code", code, code_verifier: state.verifier, redirect_uri: galleryCallbackUrl() });
      if (!tokens.refresh_token) throw new Error("Missing offline access");
      const about = await driveFetch("about?fields=user(emailAddress)", tokens.access_token);
      const { user: { emailAddress } } = z.object({ user: z.object({ emailAddress: z.string().email() }) }).parse(await about.json());
      const existing = await getDriveConnection();
      if (existing && existing.account_email.toLowerCase() !== emailAddress.toLowerCase()) outcome = "account";
      else {
        let folderId = existing?.folder_id;
        if (folderId) {
          const folder = await driveFetch(`files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed,capabilities(canAddChildren)`, tokens.access_token);
          const verified = z.object({ id: z.string(), mimeType: z.literal("application/vnd.google-apps.folder"), trashed: z.literal(false).optional(),
            capabilities: z.object({ canAddChildren: z.literal(true) }) }).parse(await folder.json());
          folderId = verified.id;
        } else {
          const created = await driveFetch("files?fields=id", tokens.access_token, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "SavaPass - Galerie", mimeType: "application/vnd.google-apps.folder", appProperties: { savapassGallery: "true" } }),
          });
          folderId = z.object({ id: z.string() }).parse(await created.json()).id;
        }
        const values = { singleton: true, folder_id: folderId, account_email: emailAddress,
          encrypted_refresh_token: encryptedDriveToken(tokens.refresh_token), connected_by: viewer.userId, connected_at: new Date().toISOString() };
        const saved = existing
          ? await supabaseAdmin.from("gallery_drive_connection").update(values).eq("singleton", true).eq("folder_id", existing.folder_id).select("singleton").single()
          : await supabaseAdmin.from("gallery_drive_connection").insert(values).select("singleton").single();
        if (saved.error) throw saved.error;
        outcome = "connected";
      }
    }
  } catch (error) { logServerError("gallery_drive_connect_failed", error); }
  return NextResponse.redirect(new URL(`/conta/galerie?drive=${outcome}`, galleryCallbackUrl()), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
