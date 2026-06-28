import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Public Storage bucket for all club media (team photos, project galleries,
 * sponsor logos). Public read; writes go through the service-role admin client
 * below, so only staff-gated server actions can upload (RLS also restricts
 * direct uploads to staff). */
export const MEDIA_BUCKET = "media";

const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/${MEDIA_BUCKET}`;

/** Public URL for a stored media path. Returns null for a missing path so
 * callers can fall back to a placeholder. Pure string build — no network. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${PUBLIC_BASE}/${path.replace(/^\/+/, "")}`;
}

/** Upload a file to the media bucket. Call only from staff-gated server actions.
 * The object is namespaced under `folder` and given a random name to avoid
 * collisions; returns the stored path (persist it in the row's *_path column). */
export async function uploadMedia(
  folder: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "misc";
  const path = `${safeFolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { error: error.message };
  return { path };
}

/** Best-effort removal of a media object (e.g. when replacing a photo or deleting
 * a row). Staff-gated callers; never throws. */
export async function deleteMedia(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([path.replace(/^\/+/, "")]);
}
