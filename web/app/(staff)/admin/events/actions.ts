"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/dashboard/auth";
import { revalidateEvents } from "@/lib/events";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/lib/supabase/types";

type EventStatus = Database["public"]["Enums"]["event_status"];

const programSchema = z.array(z.object({
  t: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ora trebuie să fie HH:MM"),
  l: z.string().min(1).max(120),
})).max(12);

const ticketTypeSchema = z.array(z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().max(80).optional(),
  name: z.string().trim().min(2, "Fiecare tip de bilet are nevoie de nume.").max(100),
  description: z.string().max(240).optional(),
  price_ron: z.coerce.number().int().min(0).max(10000),
  capacity: z.coerce.number().int().min(1).max(100000),
  sales_start_at: z.string().optional(),
  sales_end_at: z.string().optional(),
  status: z.enum(["active", "hidden", "sold_out"]),
})).min(1, "Adaugă cel puțin un tip de bilet.").max(12);

const eventSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(2, "Titlul e obligatoriu"),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(["draft", "active", "past"]),
  date_label: z.string().min(2, "Data scurtă e obligatorie"),
  date_long: z.string().min(2, "Data lungă e obligatorie"),
  starts_at: z.string().min(1, "Alege data exactă"),
  doors: z.string().min(1, "Ora porților e obligatorie"),
  venue: z.string().min(2, "Locația e obligatorie"),
  venue_line: z.string().optional(),
  price_ron: z.coerce.number().int().min(0, "Preț invalid").max(10000),
  capacity: z.coerce.number().int().min(1, "Capacitate invalidă").max(100000),
  about: z.string().optional(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Culoare hex invalidă").default("#009FE3"),
  program: z.string().default("[]"),
  perks: z.string().default("[]"),
  ticket_types: z.string().default("[]"),
  photo_url: z.string().optional(),
  media_asset_id: z.string().uuid().optional().or(z.literal("")),
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "past"]),
});

const posterUploadSchema = z.object({
  eventId: z.string().uuid().optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

export interface EventActionState {
  ok?: boolean;
  message?: string;
  eventId?: string;
  errors?: { general?: string };
}

export type PreparedPosterUpload =
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function parseJsonList<T>(value: string, schema: z.ZodType<T>) {
  try {
    return schema.safeParse(JSON.parse(value));
  } catch {
    return schema.safeParse(null);
  }
}

async function countOrders(eventId: string) {
  const { count } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  return count ?? 0;
}

async function getSold(eventId: string) {
  const { data } = await supabaseAdmin
    .from("event_stats")
    .select("sold")
    .eq("event_id", eventId)
    .maybeSingle();
  return data?.sold ?? 0;
}

function previousPosterPath(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/posters/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

/** Give one authorized editor a short-lived URL for one validated poster file. */
export async function preparePosterUpload(input: unknown): Promise<PreparedPosterUpload> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) return { ok: false, error: "Nu ai acces la această acțiune." };

  const parsed = posterUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Imaginea trebuie să fie JPG, PNG sau WebP și să aibă maximum 5 MB." };
  }

  const extension = parsed.data.mimeType === "image/png"
    ? "png"
    : parsed.data.mimeType === "image/webp"
      ? "webp"
      : "jpg";
  const folder = parsed.data.eventId ?? `drafts/${actor.user.id}`;
  const path = `${folder}/${randomUUID()}.${extension}`;
  const bucket = supabaseAdmin.storage.from("posters");
  const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    return { ok: false, error: "Încărcarea imaginii nu a putut fi pregătită." };
  }

  return {
    ok: true,
    path,
    token: data.token,
    publicUrl: bucket.getPublicUrl(path).data.publicUrl,
  };
}

export async function uploadPoster(eventId: string, file: File, previousUrl?: string | null) {
  try {
    await requirePermission("manage_public_events");
  } catch {
    return { error: "Nu ai acces la această acțiune." };
  }

  if (!file || file.size === 0) return { url: previousUrl ?? null };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Posterul trebuie să fie JPG, PNG sau WebP." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Posterul trebuie să aibă maximum 5MB." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${eventId}/${randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from("posters").upload(path, file, { contentType: file.type });
  if (error) return { error: "Posterul nu a putut fi încărcat." };

  const { data } = supabaseAdmin.storage.from("posters").getPublicUrl(path);
  const oldPath = previousPosterPath(previousUrl);
  if (oldPath) await supabaseAdmin.storage.from("posters").remove([oldPath]);
  return { url: data.publicUrl };
}

export async function upsertEvent(_prev: EventActionState, form: FormData): Promise<EventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) {
    return { errors: { general: "Nu ai acces la această acțiune." } };
  }

  const parsed = eventSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    return { errors: { general: parsed.error.issues[0]?.message ?? "Date invalide." } };
  }

  const program = parseJsonList(parsed.data.program, programSchema);
  if (!program.success) return { errors: { general: program.error.issues[0]?.message ?? "Program invalid." } };

  const perks = parseJsonList(parsed.data.perks, z.array(z.string().min(1).max(80)).max(12));
  if (!perks.success) return { errors: { general: "Lista de beneficii este invalidă." } };

  const ticketTypes = parseJsonList(parsed.data.ticket_types, ticketTypeSchema);
  if (!ticketTypes.success) return { errors: { general: ticketTypes.error.issues[0]?.message ?? "Tipuri de bilet invalide." } };
  const normalizedTypeSlugs = ticketTypes.data.map((type) => slugify(type.slug || type.name));
  if (normalizedTypeSlugs.some((slug) => !slug) || new Set(normalizedTypeSlugs).size !== normalizedTypeSlugs.length) {
    return { errors: { general: "Tipurile de bilet trebuie să aibă slug-uri diferite." } };
  }
  const activeTypeCapacity = ticketTypes.data.filter((type) => type.status !== "hidden").reduce((sum, type) => sum + type.capacity, 0);
  if (activeTypeCapacity > parsed.data.capacity) {
    return { errors: { general: "Suma capacităților tipurilor de bilet nu poate depăși capacitatea evenimentului." } };
  }
  for (const type of ticketTypes.data) {
    if (type.sales_start_at && type.sales_end_at && new Date(type.sales_end_at) <= new Date(type.sales_start_at)) {
      return { errors: { general: `Perioada de vânzare pentru „${type.name}” este invalidă.` } };
    }
  }

  const id = parsed.data.id || randomUUID();
  const isEdit = !!parsed.data.id;
  const current = isEdit
    ? await supabaseAdmin.from("events").select("id, slug, photo_url, status").eq("id", id).single()
    : null;

  if (isEdit && !current?.data) return { errors: { general: "Evenimentul nu există." } };

  const { data: existingTypes } = isEdit
    ? await supabaseAdmin.from("event_ticket_types").select("id").eq("event_id", id)
    : { data: [] };
  const existingTypeIds = new Set((existingTypes ?? []).map((type) => type.id));
  if (ticketTypes.data.some((type) => type.id && !existingTypeIds.has(type.id))) {
    return { errors: { general: "Un tip de bilet nu aparține acestui eveniment." } };
  }
  if (isEdit) {
    const { data: issuedByType } = await supabaseAdmin.from("tickets").select("ticket_type_id").eq("event_id", id).in("status", ["reserved", "paid", "checked_in"]);
    const soldByType: Record<string, number> = {};
    for (const ticket of issuedByType ?? []) if (ticket.ticket_type_id) soldByType[ticket.ticket_type_id] = (soldByType[ticket.ticket_type_id] ?? 0) + 1;
    const belowSold = ticketTypes.data.find((type) => type.id && type.capacity < (soldByType[type.id] ?? 0));
    if (belowSold) return { errors: { general: `Capacitatea pentru „${belowSold.name}” este sub numărul de bilete emise.` } };
  }

  const sold = isEdit ? await getSold(id) : 0;
  if (parsed.data.capacity < sold) {
    return { errors: { general: `Capacitatea nu poate fi sub ${sold}, deja vândute.` } };
  }

  const orderCount = isEdit ? await countOrders(id) : 0;
  const nextSlug = isEdit && orderCount > 0
    ? current!.data!.slug
    : slugify(parsed.data.slug || parsed.data.title);

  const file = form.get("poster");
  let photoUrl = parsed.data.photo_url || current?.data?.photo_url || null;
  if (parsed.data.media_asset_id) {
    const { data: chosenAsset } = await supabaseAdmin
      .from("media_assets")
      .select("public_url")
      .eq("id", parsed.data.media_asset_id)
      .eq("archived", false)
      .eq("excluded", false)
      .maybeSingle();
    if (!chosenAsset) return { errors: { general: "Imaginea aleasă nu mai este disponibilă în bibliotecă." } };
    photoUrl = chosenAsset.public_url;
  }
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadPoster(id, file, current?.data?.photo_url ?? null);
    if (uploaded.error) return { errors: { general: uploaded.error } };
    photoUrl = uploaded.url ?? null;
  }

  const payload = {
    id,
    title: parsed.data.title,
    subtitle: parsed.data.subtitle || null,
    slug: nextSlug,
    date_label: parsed.data.date_label,
    date_long: parsed.data.date_long,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    doors: parsed.data.doors,
    venue: parsed.data.venue,
    venue_line: parsed.data.venue_line || null,
    price_bani: parsed.data.price_ron * 100,
    capacity: parsed.data.capacity,
    about: parsed.data.about || null,
    accent: parsed.data.accent || "#009FE3",
    program: program.data,
    perks: perks.data,
    photo_url: photoUrl,
    status: isEdit ? undefined : "draft" as EventStatus,
  };

  const { error } = isEdit
    ? await supabaseAdmin.from("events").update(payload).eq("id", id)
    : await supabaseAdmin.from("events").insert(payload);

  if (error?.code === "23505") return { errors: { general: "Există deja un eveniment cu acest slug." } };
  if (error) return { errors: { general: "Evenimentul nu a putut fi salvat." } };

  const typePayload = ticketTypes.data.map((type, index) => ({
    id: type.id || randomUUID(),
    event_id: id,
    slug: normalizedTypeSlugs[index],
    name: type.name.trim(),
    description: type.description?.trim() || null,
    price_bani: type.price_ron * 100,
    capacity: type.capacity,
    sales_start_at: type.sales_start_at ? new Date(type.sales_start_at).toISOString() : null,
    sales_end_at: type.sales_end_at ? new Date(type.sales_end_at).toISOString() : null,
    status: type.status,
    sort: index * 10,
  }));
  const { error: ticketTypeError } = await supabaseAdmin.from("event_ticket_types").upsert(typePayload, { onConflict: "id" });
  if (ticketTypeError) return { errors: { general: "Evenimentul a fost salvat, dar tipurile de bilet nu au putut fi actualizate." } };
  const keptIds = new Set(typePayload.map((type) => type.id));
  const removedIds = [...existingTypeIds].filter((typeId) => !keptIds.has(typeId));
  if (removedIds.length) await supabaseAdmin.from("event_ticket_types").update({ status: "hidden" }).in("id", removedIds);

  if (parsed.data.media_asset_id) {
    const { data: placement } = await supabaseAdmin.from("media_placements").select("id").eq("page_type", "event").eq("target_id", id).eq("slot", "hero").maybeSingle();
    const mediaPayload = { selected_asset_id: parsed.data.media_asset_id, pinned_asset_id: parsed.data.media_asset_id, auto_select: false, selection_reason: "Imagine aleasă manual în editorul evenimentului.", updated_by: actor.user.id };
    if (placement) await supabaseAdmin.from("media_placements").update(mediaPayload).eq("id", placement.id);
    else await supabaseAdmin.from("media_placements").insert({ page_type: "event", target_id: id, slot: "hero", ...mediaPayload });
  }

  const previousStatus = current?.data?.status ?? "draft";
  if (parsed.data.status !== previousStatus) {
    const { error: statusError } = await supabaseAdmin.rpc("admin_set_event_status", {
      target_id: id,
      target_status: parsed.data.status,
    });
    if (statusError) {
      const limitReached = statusError.message.includes("active_event_limit_reached");
      return {
        errors: {
          general: limitReached
            ? "Evenimentul a fost salvat, dar sunt deja 3 evenimente active. Statusul a rămas neschimbat; arhivează unul înainte să-l activezi."
            : "Evenimentul a fost salvat, dar statusul nu a putut fi schimbat.",
        },
      };
    }
  }

  if (current?.data?.photo_url && current.data.photo_url !== photoUrl) {
    const oldPath = previousPosterPath(current.data.photo_url);
    if (oldPath) await supabaseAdmin.storage.from("posters").remove([oldPath]);
  }

  await logAudit({
    actorId: actor.user.id,
    action: isEdit ? "event.update" : "event.create",
    entityType: "event",
    entityId: id,
    metadata: { ticket_type_count: typePayload.length, slug: nextSlug, status: parsed.data.status },
  });

  revalidateEvents();
  revalidatePath("/");
  revalidatePath(`/${nextSlug}`);
  revalidatePath("/evenimente");
  revalidatePath("/despre");
  revalidatePath("/admin/events");
  revalidatePath("/board/evenimente");
  return { ok: true, message: "Eveniment salvat.", eventId: id };
}

export async function setEventStatus(_prev: EventActionState, form: FormData): Promise<EventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) {
    return { errors: { general: "Nu ai acces la această acțiune." } };
  }

  const parsed = statusSchema.safeParse({
    id: form.get("id"),
    status: form.get("status"),
  });
  if (!parsed.success) return { errors: { general: "Date invalide." } };

  if (parsed.data.status === "active") {
    const { count: activeCount } = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("id", parsed.data.id);

    if ((activeCount ?? 0) >= 3) {
      return { errors: { general: "Sunt deja 3 evenimente active. Arhivează unul înainte să activezi altul." } };
    }
  }

  const { error } = await supabaseAdmin.rpc("admin_set_event_status", {
    target_id: parsed.data.id,
    target_status: parsed.data.status,
  });

  if (error) {
    const limitReached = error.message.includes("active_event_limit_reached");
    return { errors: { general: limitReached ? "Sunt deja 3 evenimente active. Arhivează unul înainte să activezi altul." : "Statusul nu a putut fi schimbat." } };
  }
  await logAudit({ actorId: actor.user.id, action: "event.status_changed", entityType: "event", entityId: parsed.data.id, metadata: { status: parsed.data.status } });
  revalidateEvents();
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/board/evenimente");
  revalidatePath("/evenimente");
  revalidatePath("/despre");
  return { ok: true, message: "Status actualizat." };
}

export async function setEventStatusForm(form: FormData) {
  await setEventStatus({}, form);
}
