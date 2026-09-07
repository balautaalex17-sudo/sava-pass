"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageGalleryPhoto, galleryTicketSchema, galleryUploadSchema, matchesPhotoSignature } from "@/lib/gallery";
import { getGalleryViewer } from "@/lib/gallery-auth";
import { openGalleryValue, sealGalleryValue } from "@/lib/gallery-crypto";
import { createDriveUpload, driveFetch, driveFile, galleryKey, getDriveAccess } from "@/lib/gallery-drive";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/server-log";

export type GalleryActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function prepareGalleryUpload(input: unknown): Promise<
  { ok: true; ticket: string; sessionUrl: string } | { ok: false; error: string }
> {
  try {
    const viewer = await getGalleryViewer();
    if (!viewer) return { ok: false, error: "Autentifică-te pentru a adăuga poze." };
    const parsed = galleryUploadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Alege o fotografie JPG, PNG, WebP, AVIF sau HEIC validă și o descriere de cel mult 300 de caractere." };
    if (!await allowPublicAction({ scope: "gallery-upload", subject: viewer.userId, subjectLimit: 200, ipLimit: 1000, windowSeconds: 3600 })) {
      return { ok: false, error: "Sunt prea multe încărcări momentan. Reîncearcă mai târziu." };
    }
    const photoId = randomUUID();
    const { fileId, folderId, sessionUrl } = await createDriveUpload({ ...parsed.data, photoId, userId: viewer.userId });
    const ticket = sealGalleryValue({ ...parsed.data, photoId, fileId, folderId, userId: viewer.userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }, "gallery-upload", galleryKey());
    return { ok: true, ticket, sessionUrl };
  } catch (error) {
    logServerError("gallery_upload_prepare_failed", error);
    return { ok: false, error: "Google Drive nu este disponibil. Roagă board-ul să verifice conexiunea galeriei." };
  }
}

export async function finalizeGalleryUpload(ticket: string): Promise<GalleryActionResult> {
  try {
    const viewer = await getGalleryViewer();
    if (!viewer) return { ok: false, error: "Sesiunea a expirat. Autentifică-te din nou." };
    const upload = galleryTicketSchema.parse(openGalleryValue(z.string().max(10000).parse(ticket), "gallery-upload", galleryKey()));
    if (upload.userId !== viewer.userId || upload.expiresAt < Date.now()) {
      return { ok: false, error: "Încărcarea a expirat sau aparține altui cont." };
    }
    const existing = await supabaseAdmin.from("gallery_photos").select("id, uploader_id").eq("id", upload.photoId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data.uploader_id === viewer.userId
      ? { ok: true, message: "Poza este în galerie." } : { ok: false, error: "Încărcare invalidă." };
    const { token, folderId } = await getDriveAccess();
    const file = await driveFile(upload.fileId, token);
    if (folderId !== upload.folderId || file.id !== upload.fileId || file.trashed || !file.parents?.includes(folderId)
      || file.appProperties?.savapassPhotoId !== upload.photoId || file.appProperties?.savapassUploaderId !== viewer.userId
      || file.mimeType !== upload.mimeType || file.size !== String(upload.size)) {
      return { ok: false, error: "Fișierul nu corespunde încărcării. Reîncearcă trimiterea pozei." };
    }
    // Inspect only a signature; never load or resize a large original in memory.
    const head = await driveFetch(`files/${encodeURIComponent(file.id)}?alt=media`, token, { headers: { Range: "bytes=0-63" } });
    if (head.status !== 206) { await head.body?.cancel(); throw new Error("Drive did not honor the range request"); }
    const signature = new Uint8Array(await head.arrayBuffer());
    if (!matchesPhotoSignature(signature, upload.mimeType)) return { ok: false, error: "Fișierul trimis nu este o fotografie în formatul ales." };
    const { error } = await supabaseAdmin.from("gallery_photos").insert({
      id: upload.photoId, uploader_id: viewer.userId, uploader_name: viewer.name, caption: upload.caption,
      original_name: upload.fileName, drive_file_id: file.id, mime_type: upload.mimeType, size_bytes: upload.size,
      width: file.imageMediaMetadata?.width ?? null, height: file.imageMediaMetadata?.height ?? null,
    });
    // The same encrypted ticket can be finalized concurrently or after a lost response.
    if (error && error.code !== "23505") throw error;
    if (error) {
      const saved = await supabaseAdmin.from("gallery_photos").select("id").eq("id", upload.photoId)
        .eq("uploader_id", viewer.userId).eq("drive_file_id", file.id).maybeSingle();
      if (saved.error || !saved.data) throw saved.error ?? error;
    }
    revalidatePath("/conta/galerie");
    revalidatePath("/membru/galerie");
    revalidatePath("/board/galerie");
    return { ok: true, message: "Poza a fost adăugată în galerie." };
  } catch (error) {
    logServerError("gallery_upload_finalize_failed", error);
    return { ok: false, error: "Poza nu a putut fi publicată. Poți reîncerca fără să o încarci din nou." };
  }
}

export async function deleteGalleryPhoto(photoId: string): Promise<GalleryActionResult> {
  try {
    const viewer = await getGalleryViewer();
    if (!viewer || !z.string().uuid().safeParse(photoId).success) return { ok: false, error: "Autentificare sau poză invalidă." };
    const { data: photo, error } = await supabaseAdmin.from("gallery_photos")
      .select("uploader_id, drive_file_id").eq("id", photoId).maybeSingle();
    if (error) throw error;
    if (!photo) return { ok: true, message: "Poza a fost eliminată." };
    if (!canManageGalleryPhoto(viewer.userId, photo.uploader_id, viewer.role, viewer.membershipStatus)) {
      return { ok: false, error: "Poți șterge doar pozele tale. Board-ul poate modera întreaga galerie." };
    }
    const { token } = await getDriveAccess();
    // Move the original to the owner's Drive trash instead of permanently deleting it.
    await driveFetch(`files/${encodeURIComponent(photo.drive_file_id)}`, token, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }),
    });
    const deleted = await supabaseAdmin.from("gallery_photos").delete().eq("id", photoId);
    if (deleted.error) throw deleted.error;
    revalidatePath("/conta/galerie");
    revalidatePath("/membru/galerie");
    revalidatePath("/board/galerie");
    return { ok: true, message: "Poza a fost eliminată." };
  } catch (error) {
    logServerError("gallery_photo_delete_failed", error);
    return { ok: false, error: "Poza nu a putut fi eliminată. Reîncearcă." };
  }
}
