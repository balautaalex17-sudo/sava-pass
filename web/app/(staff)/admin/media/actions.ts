"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { rankMedia } from "@/lib/media-selection";
import { requireStaffRole } from "@/lib/roles";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MediaAsset } from "@/lib/supabase/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const SOURCE_KINDS = ["real_photo", "edited_photo", "higgsfield", "video", "fallback"] as const;
const CATEGORIES = ["Hero", "Events", "Recruitment", "Interviews", "Members", "Venues", "Backgrounds", "Motion", "Generated", "Archived", "General"] as const;
const ORIENTATIONS = ["landscape", "portrait", "square"] as const;

const uploadDescriptorSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});

const finalizeUploadSchema = uploadDescriptorSchema.extend({
  stagingPath: z.string().min(1).max(300),
  sourceKind: z.enum(SOURCE_KINDS),
  category: z.enum(CATEGORIES),
  orientation: z.enum(ORIENTATIONS),
  tags: z.string().max(500),
  subjects: z.string().max(300),
  mood: z.string().max(160),
  altText: z.string().max(300),
  cropSafe: z.boolean(),
  facesVisible: z.boolean(),
  multiple: z.boolean(),
});

export interface MediaActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export interface PreparedMediaUpload {
  ok: true;
  path: string;
  token: string;
}

export interface MediaUploadError {
  ok: false;
  error: string;
}

const metadataSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(CATEGORIES),
  source_kind: z.enum(SOURCE_KINDS),
  orientation: z.enum(ORIENTATIONS),
  subjects: z.string().max(300).optional(),
  mood: z.string().max(160).optional(),
  tags: z.string().max(500).optional(),
  alt_text: z.string().trim().min(3, "Textul alternativ este obligatoriu.").max(300),
  quality_score: z.coerce.number().min(0).max(1),
  sharpness_score: z.coerce.number().min(0).max(1),
  focal_x: z.coerce.number().min(0).max(1),
  focal_y: z.coerce.number().min(0).max(1),
});

const placementSchema = z.object({
  page_type: z.string().trim().min(2).max(80),
  slot: z.string().trim().min(2).max(80),
  target_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(CATEGORIES),
  orientation: z.enum(ORIENTATIONS),
  tags: z.string().max(300).optional(),
  mood: z.string().max(120).optional(),
});

function splitTags(value: string | undefined) {
  return [...new Set((value ?? "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 24);
}

function safeStem(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "asset";
}

function orientationFor(width: number | null, height: number | null, fallback: string) {
  if (!width || !height) return fallback;
  if (Math.abs(width - height) / Math.max(width, height) < 0.08) return "square";
  return width > height ? "landscape" : "portrait";
}

function hasExpectedVideoSignature(bytes: Buffer, mimeType: "video/mp4" | "video/webm") {
  if (mimeType === "video/webm") {
    return bytes.length >= 4
      && bytes[0] === 0x1a
      && bytes[1] === 0x45
      && bytes[2] === 0xdf
      && bytes[3] === 0xa3;
  }

  return bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp";
}

async function findPlacement(pageType: string, slot: string, targetId?: string | null) {
  let query = supabaseAdmin
    .from("media_placements")
    .select("id, excluded_asset_ids")
    .eq("page_type", pageType)
    .eq("slot", slot);
  query = targetId ? query.eq("target_id", targetId) : query.is("target_id", null);
  return query.maybeSingle();
}

async function savePlacementRow(input: {
  pageType: string;
  slot: string;
  targetId?: string | null;
  selectedAssetId: string;
  pinnedAssetId?: string | null;
  autoSelect: boolean;
  reason: string;
  actorId: string;
}) {
  const existing = await findPlacement(input.pageType, input.slot, input.targetId);
  const payload = {
    page_type: input.pageType,
    slot: input.slot,
    target_id: input.targetId || null,
    selected_asset_id: input.selectedAssetId,
    pinned_asset_id: input.pinnedAssetId || null,
    auto_select: input.autoSelect,
    selection_reason: input.reason,
    updated_by: input.actorId,
  };
  return existing.data
    ? supabaseAdmin.from("media_placements").update(payload).eq("id", existing.data.id)
    : supabaseAdmin.from("media_placements").insert(payload);
}

/** Issue a two-hour upload token for one admin-selected file. */
export async function prepareMediaUpload(input: unknown): Promise<PreparedMediaUpload | MediaUploadError> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { ok: false, error: "Nu ai acces la biblioteca media." };

  const parsed = uploadDescriptorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fișierul nu respectă limita de 25 MB sau formatul permis." };

  const extension = parsed.data.mimeType.split("/")[1].replace("jpeg", "jpg");
  const path = `incoming/${current.user.id}/${randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin.storage
    .from("media-staging")
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    logServerError("media_signed_upload_create_failed", error);
    return { ok: false, error: "Încărcarea securizată nu a putut fi pregătită." };
  }

  return { ok: true, path, token: data.token };
}

/** Validate a staged file, normalize it, then publish it in the media library. */
export async function finalizeMediaUpload(input: unknown): Promise<MediaActionState & { duplicate?: boolean }> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la biblioteca media." };

  const parsed = finalizeUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Metadatele încărcării sunt invalide." };

  const values = parsed.data;
  const expectedPrefix = `incoming/${current.user.id}/`;
  if (!values.stagingPath.startsWith(expectedPrefix) || values.stagingPath.includes("..")) {
    return { error: "Calea temporară nu este validă." };
  }

  const staging = supabaseAdmin.storage.from("media-staging");
  const { data: stagedFile, error: downloadError } = await staging.download(values.stagingPath);
  if (downloadError || !stagedFile) {
    logServerError("media_staging_download_failed", downloadError);
    return { error: "Fișierul temporar nu a putut fi citit." };
  }

  let finalPath: string | null = null;
  try {
    if (stagedFile.size !== values.size || stagedFile.size > MAX_FILE_BYTES) {
      return { error: "Dimensiunea fișierului nu corespunde încărcării aprobate." };
    }

    const original = Buffer.from(await stagedFile.arrayBuffer());
    const sha256 = createHash("sha256").update(original).digest("hex");
    const { data: duplicate } = await supabaseAdmin
      .from("media_assets")
      .select("id")
      .eq("sha256", sha256)
      .maybeSingle();
    if (duplicate) return { ok: true, duplicate: true, message: "Fișier duplicat ignorat." };

    const isImage = IMAGE_TYPES.has(values.mimeType);
    let body: Buffer = original;
    let mimeType = values.mimeType;
    let width: number | null = null;
    let height: number | null = null;
    let extension = values.mimeType === "video/webm" ? "webm" : "mp4";

    if (isImage) {
      const result = await sharp(original, { failOn: "warning" })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      body = result.data;
      width = result.info.width;
      height = result.info.height;
      mimeType = "image/webp";
      extension = "webp";
    } else if (!hasExpectedVideoSignature(original, values.mimeType as "video/mp4" | "video/webm")) {
      return { error: "Conținutul video nu corespunde formatului declarat." };
    }

    const stem = safeStem(values.fileName);
    finalPath = `library/${new Date().getUTCFullYear()}/${stem}-${randomUUID()}.${extension}`;
    const { error: storageError } = await supabaseAdmin.storage.from("media").upload(finalPath, body, {
      cacheControl: "31536000",
      contentType: mimeType,
      upsert: false,
    });
    if (storageError) {
      logServerError("media_publish_failed", storageError);
      return { error: "Fișierul validat nu a putut fi publicat." };
    }

    const { data: publicData } = supabaseAdmin.storage.from("media").getPublicUrl(finalPath);
    const assetSource = isImage ? values.sourceKind : "video";
    const assetCategory = isImage ? values.category : "Motion";
    const { data: asset, error: insertError } = await supabaseAdmin.from("media_assets").insert({
      file_name: `${stem}.${extension}`,
      storage_path: finalPath,
      public_url: publicData.publicUrl,
      mime_type: mimeType,
      width,
      height,
      size_bytes: body.byteLength,
      orientation: orientationFor(width, height, values.orientation),
      source_kind: assetSource,
      category: assetCategory,
      subjects: values.subjects.trim() || null,
      mood: values.mood.trim() || null,
      tags: splitTags(values.tags),
      quality_score: isImage ? 0.72 : 0.65,
      sharpness_score: isImage ? 0.7 : null,
      crop_safe: values.cropSafe,
      faces_visible: values.facesVisible,
      alt_text: values.altText.trim()
        ? `${values.altText.trim()}${values.multiple ? ` · ${stem}` : ""}`
        : stem.replace(/-/g, " "),
      sha256,
      generation_tool: assetSource === "higgsfield" ? "Higgsfield" : null,
      created_by: current.user.id,
    }).select("id").single();

    if (insertError || !asset) {
      logServerError("media_metadata_insert_failed", insertError);
      await supabaseAdmin.storage.from("media").remove([finalPath]);
      finalPath = null;
      return { error: "Metadatele fișierului nu au putut fi salvate." };
    }

    await logAudit({
      actorId: current.user.id,
      action: "media.upload",
      entityType: "media_asset",
      entityId: asset.id,
      metadata: { file_name: values.fileName, source_kind: assetSource, category: assetCategory },
    });
    revalidatePath("/admin/media");
    return { ok: true, message: "Fișier adăugat în bibliotecă." };
  } catch (error) {
    logServerError("media_processing_failed", error);
    if (finalPath) await supabaseAdmin.storage.from("media").remove([finalPath]);
    return { error: "Fișierul nu a putut fi procesat în siguranță." };
  } finally {
    await staging.remove([values.stagingPath]);
  }
}

/** Disabled compatibility endpoint for stale browser bundles. */
export async function uploadMediaAssets(_previous: MediaActionState, _form: FormData): Promise<MediaActionState> {
  void _previous;
  void _form;
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la biblioteca media." };

  return { error: "Reîncarcă pagina pentru a folosi încărcarea securizată." };
  /* Historical implementation retained temporarily for stale-action review.

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return { error: "Alege cel puțin un fișier." };
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return { error: "Fiecare fișier poate avea maximum 25 MB." };
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) return { error: "Un import poate avea maximum 60 MB." };

  const sourceValue = String(form.get("source_kind") ?? "real_photo");
  const categoryValue = String(form.get("category") ?? "General");
  const fallbackOrientation = String(form.get("orientation") ?? "landscape");
  const sourceKind = SOURCE_KINDS.includes(sourceValue as (typeof SOURCE_KINDS)[number]) ? sourceValue : "real_photo";
  const category = CATEGORIES.includes(categoryValue as (typeof CATEGORIES)[number]) ? categoryValue : "General";
  const tags = splitTags(String(form.get("tags") ?? ""));
  const suppliedAlt = String(form.get("alt_text") ?? "").trim();
  const subjects = String(form.get("subjects") ?? "").trim() || null;
  const mood = String(form.get("mood") ?? "").trim() || null;

  let uploaded = 0;
  let duplicates = 0;
  const failures: string[] = [];

  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) {
      failures.push(`${file.name}: format neacceptat`);
      continue;
    }

    try {
      const original = Buffer.from(await file.arrayBuffer());
      const sha256 = createHash("sha256").update(original).digest("hex");
      const { data: duplicate } = await supabaseAdmin.from("media_assets").select("id").eq("sha256", sha256).maybeSingle();
      if (duplicate) {
        duplicates += 1;
        continue;
      }

      const isImage = IMAGE_TYPES.has(file.type);
      let body: Buffer = original;
      let mimeType = file.type;
      let width: number | null = null;
      let height: number | null = null;
      let extension = file.type === "video/webm" ? "webm" : "mp4";

      if (isImage) {
        const result = await sharp(original, { failOn: "warning" })
          .rotate()
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer({ resolveWithObject: true });
        body = result.data;
        width = result.info.width;
        height = result.info.height;
        mimeType = "image/webp";
        extension = "webp";
      }

      const stem = safeStem(file.name);
      const storagePath = `library/${new Date().getUTCFullYear()}/${stem}-${randomUUID()}.${extension}`;
      const { error: storageError } = await supabaseAdmin.storage.from("media").upload(storagePath, body, {
        cacheControl: "31536000",
        contentType: mimeType,
        upsert: false,
      });
      if (storageError) {
        failures.push(`${file.name}: încărcarea a eșuat`);
        continue;
      }

      const { data: publicData } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);
      const assetSource = isImage ? sourceKind : "video";
      const assetCategory = isImage ? category : "Motion";
      const { data: asset, error: insertError } = await supabaseAdmin.from("media_assets").insert({
        file_name: `${stem}.${extension}`,
        storage_path: storagePath,
        public_url: publicData.publicUrl,
        mime_type: mimeType,
        width,
        height,
        size_bytes: body.byteLength,
        orientation: orientationFor(width, height, fallbackOrientation),
        source_kind: assetSource,
        category: assetCategory,
        subjects,
        mood,
        tags,
        quality_score: isImage ? 0.72 : 0.65,
        sharpness_score: isImage ? 0.7 : null,
        crop_safe: form.get("crop_safe") === "on",
        faces_visible: form.get("faces_visible") === "on",
        alt_text: suppliedAlt ? `${suppliedAlt}${files.length > 1 ? ` · ${stem}` : ""}` : stem.replace(/-/g, " "),
        sha256,
        generation_tool: assetSource === "higgsfield" ? "Higgsfield" : null,
        created_by: current.user.id,
      }).select("id").single();

      if (insertError || !asset) {
        await supabaseAdmin.storage.from("media").remove([storagePath]);
        failures.push(`${file.name}: metadatele nu au putut fi salvate`);
        continue;
      }

      uploaded += 1;
      await logAudit({
        actorId: current.user.id,
        action: "media.upload",
        entityType: "media_asset",
        entityId: asset.id,
        metadata: { file_name: file.name, source_kind: assetSource, category: assetCategory },
      });
    } catch (error) {
      logServerError("legacy_media_processing_failed", error);
      failures.push(`${file.name}: fișierul nu a putut fi procesat`);
    }
  }

  revalidatePath("/admin/media");
  if (!uploaded && failures.length) return { error: failures.slice(0, 3).join("; ") };
  return {
    ok: true,
    message: `${uploaded} fișier${uploaded === 1 ? "" : "e"} adăugat${uploaded === 1 ? "" : "e"}${duplicates ? `, ${duplicates} duplicate ignorate` : ""}${failures.length ? `, ${failures.length} erori` : ""}.`,
  };
  */
}

export async function updateMediaAsset(_previous: MediaActionState, form: FormData): Promise<MediaActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la biblioteca media." };

  const parsed = metadataSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Metadate invalide." };

  const { id, tags, subjects, mood, ...values } = parsed.data;
  const { error } = await supabaseAdmin.from("media_assets").update({
    ...values,
    tags: splitTags(tags),
    subjects: subjects?.trim() || null,
    mood: mood?.trim() || null,
    crop_safe: form.get("crop_safe") === "on",
    faces_visible: form.get("faces_visible") === "on",
    excluded: form.get("excluded") === "on",
  }).eq("id", id);

  if (error) return { error: "Metadatele nu au putut fi salvate." };
  await logAudit({ actorId: current.user.id, action: "media.update", entityType: "media_asset", entityId: id });
  revalidatePath("/admin/media");
  return { ok: true, message: "Metadate salvate." };
}

export async function archiveMediaAsset(_previous: MediaActionState, form: FormData): Promise<MediaActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la biblioteca media." };
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Asset invalid." };
  const archived = form.get("archived") !== "false";
  const { error } = await supabaseAdmin.from("media_assets").update({ archived, category: archived ? "Archived" : "General" }).eq("id", id.data);
  if (error) return { error: "Assetul nu a putut fi actualizat." };
  await logAudit({ actorId: current.user.id, action: archived ? "media.archive" : "media.restore", entityType: "media_asset", entityId: id.data });
  revalidatePath("/admin/media");
  return { ok: true, message: archived ? "Asset arhivat." : "Asset restaurat." };
}

export async function recommendMediaPlacement(_previous: MediaActionState, form: FormData): Promise<MediaActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la recomandări." };
  const parsed = placementSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Context invalid." };

  const { data: assets } = await supabaseAdmin.from("media_assets").select("*");
  const { data: placements } = await supabaseAdmin.from("media_placements").select("selected_asset_id");
  const existing = await findPlacement(parsed.data.page_type, parsed.data.slot, parsed.data.target_id || null);
  const blocked = new Set(existing.data?.excluded_asset_ids ?? []);
  const usageCount: Record<string, number> = {};
  for (const placement of placements ?? []) {
    if (placement.selected_asset_id) usageCount[placement.selected_asset_id] = (usageCount[placement.selected_asset_id] ?? 0) + 1;
  }

  const recommendations = rankMedia(
    ((assets ?? []) as MediaAsset[]).filter((asset) => !blocked.has(asset.id)),
    {
      category: parsed.data.category,
      orientation: parsed.data.orientation,
      tags: splitTags(parsed.data.tags),
      mood: parsed.data.mood,
      preferFaces: form.get("prefer_faces") === "on",
      needsSafeCrop: form.get("needs_safe_crop") === "on",
    },
    usageCount,
  );
  const winner = recommendations[0];
  if (!winner) return { error: "Nu există un asset eligibil pentru acest context." };

  const reason = `Scor ${winner.score}: ${winner.reasons.slice(0, 4).join(", ")}.`;
  const { error } = await savePlacementRow({
    pageType: parsed.data.page_type,
    slot: parsed.data.slot,
    targetId: parsed.data.target_id || null,
    selectedAssetId: winner.asset.id,
    autoSelect: true,
    reason,
    actorId: current.user.id,
  });
  if (error) return { error: "Recomandarea nu a putut fi salvată." };
  await logAudit({ actorId: current.user.id, action: "media.auto_select", entityType: "media_placement", entityId: `${parsed.data.page_type}:${parsed.data.slot}`, metadata: { asset_id: winner.asset.id, score: winner.score } });
  revalidatePath("/admin/media");
  return { ok: true, message: `Selectat automat: ${winner.asset.file_name}.` };
}

export async function saveManualMediaPlacement(_previous: MediaActionState, form: FormData): Promise<MediaActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la recomandări." };
  const parsed = placementSchema.safeParse(Object.fromEntries(form.entries()));
  const assetId = z.string().uuid().safeParse(form.get("selected_asset_id"));
  if (!parsed.success || !assetId.success) return { error: "Selecție invalidă." };
  const pin = form.get("pin") === "on";
  const automatic = form.get("auto_select") === "on";
  const { error } = await savePlacementRow({
    pageType: parsed.data.page_type,
    slot: parsed.data.slot,
    targetId: parsed.data.target_id || null,
    selectedAssetId: assetId.data,
    pinnedAssetId: pin ? assetId.data : null,
    autoSelect: automatic,
    reason: pin ? "Asset ales și fixat manual de administrator." : "Asset ales manual de administrator.",
    actorId: current.user.id,
  });
  if (error) return { error: "Selecția manuală nu a putut fi salvată." };
  await logAudit({ actorId: current.user.id, action: pin ? "media.pin" : "media.select", entityType: "media_placement", entityId: `${parsed.data.page_type}:${parsed.data.slot}`, metadata: { asset_id: assetId.data } });
  revalidatePath("/admin/media");
  return { ok: true, message: pin ? "Asset selectat și fixat." : "Asset selectat manual." };
}
