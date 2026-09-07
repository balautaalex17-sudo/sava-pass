import "server-only";
import { cache } from "react";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSiteUrl } from "@/lib/site-url";
import { openGalleryValue, sealGalleryValue } from "@/lib/gallery-crypto";

export function galleryDriveConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
    && process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()
    && /^[A-Za-z0-9+/]{43}=$/.test(process.env.GOOGLE_DRIVE_TOKEN_KEY ?? ""));
}

export function galleryKey() {
  if (!galleryDriveConfigured()) throw new Error("Google Drive is not configured");
  return Buffer.from(process.env.GOOGLE_DRIVE_TOKEN_KEY!, "base64");
}

export function galleryCallbackUrl() {
  return `${resolveSiteUrl()}/api/gallery/drive/callback`;
}

export const getDriveConnection = cache(async () => {
  const { data, error } = await supabaseAdmin.from("gallery_drive_connection")
    .select("folder_id, account_email, encrypted_refresh_token, connected_at").eq("singleton", true).maybeSingle();
  if (error) throw error;
  return data;
});

export class DriveError extends Error {
  constructor(public readonly status: number) { super("Google Drive request failed"); this.name = "DriveError"; }
}

const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().optional() });

export async function exchangeGoogleToken(parameters: Record<string, string>) {
  galleryKey();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...parameters, client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!, client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET! }),
  });
  if (!response.ok) throw new DriveError(response.status);
  return tokenSchema.parse(await response.json());
}

export const getDriveAccess = cache(async () => {
  const connection = await getDriveConnection();
  if (!connection) throw new Error("Google Drive is not connected");
  const refreshToken = z.string().parse(openGalleryValue(connection.encrypted_refresh_token, "drive-refresh", galleryKey()));
  const { access_token } = await exchangeGoogleToken({ grant_type: "refresh_token", refresh_token: refreshToken });
  return { token: access_token, folderId: connection.folder_id };
});

export function encryptedDriveToken(token: string) {
  return sealGalleryValue(token, "drive-refresh", galleryKey());
}

export async function driveFetch(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init, headers, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(30000), redirect: "error",
  });
  if (!response.ok) throw new DriveError(response.status);
  return response;
}

export const driveFileSchema = z.object({
  id: z.string(), mimeType: z.string(), size: z.string().optional(), trashed: z.boolean().optional(),
  parents: z.array(z.string()).optional(), appProperties: z.record(z.string(), z.string()).optional(),
  thumbnailLink: z.string().optional(),
  imageMediaMetadata: z.object({ width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }).optional(),
});

export async function driveFile(fileId: string, token: string) {
  const fields = "id,mimeType,size,trashed,parents,appProperties,thumbnailLink,imageMediaMetadata(width,height)";
  const response = await driveFetch(`files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`, token);
  return driveFileSchema.parse(await response.json());
}

export async function createDriveUpload(input: {
  photoId: string; userId: string; fileName: string; mimeType: string; size: number;
}) {
  const { token, folderId } = await getDriveAccess();
  const ids = await driveFetch("files/generateIds?count=1&space=drive&type=files", token);
  const { ids: [fileId] } = z.object({ ids: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,200}$/)).min(1) }).parse(await ids.json());
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(30000), redirect: "error",
    headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      "X-Upload-Content-Type": input.mimeType, "X-Upload-Content-Length": String(input.size),
    },
    body: JSON.stringify({ id: fileId, name: input.fileName, mimeType: input.mimeType, parents: [folderId],
      appProperties: { savapassPhotoId: input.photoId, savapassUploaderId: input.userId } }),
  });
  if (!response.ok) throw new DriveError(response.status);
  const sessionUrl = response.headers.get("location");
  if (!sessionUrl || !isDriveUploadUrl(sessionUrl)) throw new Error("Invalid Drive upload session");
  return { fileId, folderId, sessionUrl };
}

export function isDriveUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin === "https://www.googleapis.com" && url.pathname === "/upload/drive/v3/files"
      && url.searchParams.get("uploadType") === "resumable" && Boolean(url.searchParams.get("upload_id"));
  } catch { return false; }
}

export function isGoogleThumbnailUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && (url.hostname.endsWith(".googleusercontent.com") || url.hostname === "lh3.google.com");
  } catch { return false; }
}
