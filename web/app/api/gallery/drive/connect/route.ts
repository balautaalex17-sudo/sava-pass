import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canConnectGalleryDrive } from "@/lib/gallery";
import { getGalleryViewer } from "@/lib/gallery-auth";
import { sealGalleryValue } from "@/lib/gallery-crypto";
import { galleryCallbackUrl, galleryDriveConfigured, galleryKey } from "@/lib/gallery-drive";

export async function GET() {
  const viewer = await getGalleryViewer();
  if (!viewer || !canConnectGalleryDrive(viewer.role, viewer.membershipStatus)) return new Response("Acces interzis", { status: 403 });
  if (!galleryDriveConfigured()) return NextResponse.redirect(new URL("/conta/galerie?drive=setup", galleryCallbackUrl()));
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const jar = await cookies();
  jar.set("gallery-drive-oauth", sealGalleryValue({ state, verifier, userId: viewer.userId, expiresAt: Date.now() + 600000 }, "drive-oauth", galleryKey()), {
    httpOnly: true, sameSite: "lax", secure: new URL(galleryCallbackUrl()).protocol === "https:", maxAge: 600, path: "/api/gallery/drive",
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!, redirect_uri: galleryCallbackUrl(),
    response_type: "code", scope: "https://www.googleapis.com/auth/drive.file", access_type: "offline", prompt: "consent select_account",
    state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
