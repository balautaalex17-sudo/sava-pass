"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/dashboard/auth";
import { revalidateEvents } from "@/lib/events";
import { bucharestDateTimeToIso, isEventEnded } from "@/lib/event-lifecycle";
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
  ends_at: z.string().min(1, "Alege ora de încheiere"),
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
  featured_assignment: z.string().default("none"),
});

const eventIdSchema = z.object({ id: z.string().uuid() });

const featuredSlotSchema = z.object({
  event_id: z.string().uuid(),
  target_slot: z.coerce.number().int().min(1).max(3),
  expected_occupant_id: z.string().uuid().optional().or(z.literal("")),
});

const removeFeaturedSchema = z.object({
  event_id: z.string().uuid(),
  expected_slot: z.coerce.number().int().min(1).max(3),
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

type FeaturedAssignment =
  | { kind: "none" }
  | { kind: "slot"; slot: 1 | 2 | 3; expectedOccupantId: string | null };

function parseFeaturedAssignment(value: string): FeaturedAssignment | null {
  if (value === "none") return { kind: "none" };
  const match = value.match(/^slot:([123]):(empty|self|[0-9a-f-]{36})$/i);
  if (!match) return null;
  return {
    kind: "slot",
    slot: Number(match[1]) as 1 | 2 | 3,
    expectedOccupantId: match[2] === "empty" || match[2] === "self" ? null : match[2],
  };
}

function featuredMutationError(message: string) {
  if (message.includes("featured_slot_changed") || message.includes("duplicate key")) {
    return "Poziția a fost schimbată între timp de alt administrator. Reîncarcă pagina și încearcă din nou.";
  }
  if (message.includes("featured_slot_contains_active_event")) {
    return "Poziția conține un eveniment activ. Încheie-l sau scoate-l separat înainte de înlocuire.";
  }
  if (message.includes("draft_event_cannot_be_featured")) {
    return "O ciornă nu poate apărea pe Despre. Publică mai întâi evenimentul.";
  }
  return "Poziția de pe Despre nu a putut fi actualizată.";
}

function revalidateEventSurfaces(slug?: string) {
  revalidateEvents();
  revalidatePath("/");
  revalidatePath("/despre");
  revalidatePath("/evenimente");
  revalidatePath("/admin/events");
  revalidatePath("/board/evenimente");
  revalidatePath("/board/evenimente/arhiva");
  if (slug) revalidatePath(`/${slug}`);
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

  let startsAt: string;
  let endsAt: string;
  try {
    startsAt = bucharestDateTimeToIso(parsed.data.starts_at);
    endsAt = bucharestDateTimeToIso(parsed.data.ends_at);
  } catch {
    return { errors: { general: "Data sau ora nu este validă pentru fusul orar Europe/Bucharest." } };
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { errors: { general: "Ora de încheiere trebuie să fie după ora începerii." } };
  }

  const featuredAssignment = parseFeaturedAssignment(parsed.data.featured_assignment);
  if (!featuredAssignment) {
    return { errors: { general: "Poziția aleasă pentru Despre nu este validă." } };
  }
  if (parsed.data.status === "draft" && featuredAssignment.kind === "slot") {
    return { errors: { general: "Publică evenimentul înainte să îl adaugi pe Despre." } };
  }

  const program = parseJsonList(parsed.data.program, programSchema);
  if (!program.success) return { errors: { general: program.error.issues[0]?.message ?? "Program invalid." } };

  const perks = parseJsonList(parsed.data.perks, z.array(z.string().min(1).max(80)).max(12));
  if (!perks.success) return { errors: { general: "Lista de beneficii este invalidă." } };

  const ticketTypes = parseJsonList(parsed.data.ticket_types, ticketTypeSchema);
  if (!ticketTypes.success) return { errors: { general: ticketTypes.error.issues[0]?.message ?? "Tipuri de bilet invalide." } };
  let ticketSaleWindows: { start: string | null; end: string | null }[];
  try {
    ticketSaleWindows = ticketTypes.data.map((type) => ({
      start: type.sales_start_at ? bucharestDateTimeToIso(type.sales_start_at) : null,
      end: type.sales_end_at ? bucharestDateTimeToIso(type.sales_end_at) : null,
    }));
  } catch {
    return { errors: { general: "Perioada de vânzare conține o dată invalidă pentru fusul orar Europe/Bucharest." } };
  }
  const normalizedTypeSlugs = ticketTypes.data.map((type) => slugify(type.slug || type.name));
  if (normalizedTypeSlugs.some((slug) => !slug) || new Set(normalizedTypeSlugs).size !== normalizedTypeSlugs.length) {
    return { errors: { general: "Tipurile de bilet trebuie să aibă slug-uri diferite." } };
  }
  const activeTypeCapacity = ticketTypes.data.filter((type) => type.status !== "hidden").reduce((sum, type) => sum + type.capacity, 0);
  if (activeTypeCapacity > parsed.data.capacity) {
    return { errors: { general: "Suma capacităților tipurilor de bilet nu poate depăși capacitatea evenimentului." } };
  }
  for (const [index, type] of ticketTypes.data.entries()) {
    const saleWindow = ticketSaleWindows[index];
    if (saleWindow.start && saleWindow.end && new Date(saleWindow.end) <= new Date(saleWindow.start)) {
      return { errors: { general: `Perioada de vânzare pentru „${type.name}” este invalidă.` } };
    }
  }

  const id = parsed.data.id || randomUUID();
  const isEdit = !!parsed.data.id;
  const current = isEdit
    ? await supabaseAdmin
        .from("events")
        .select("id, slug, photo_url, status, starts_at, ends_at, manually_ended_at, featured_slot")
        .eq("id", id)
        .single()
    : null;

  if (isEdit && !current?.data) return { errors: { general: "Evenimentul nu există." } };
  if (!isEdit && parsed.data.status === "past") {
    return { errors: { general: "Creează evenimentul ca activ sau ciornă. Încheierea se face separat, cu confirmare." } };
  }
  if (current?.data?.status === "past" && parsed.data.status !== "past") {
    return { errors: { general: "Un eveniment încheiat nu poate fi reactivat." } };
  }
  if (current?.data?.status === "active" && parsed.data.status !== "active") {
    return { errors: { general: "Folosește acțiunea «Încheie evenimentul» pentru o schimbare permanentă de status." } };
  }
  if (
    parsed.data.status === "active"
    && (!current?.data || current.data.status === "draft")
    && new Date(endsAt).getTime() <= Date.now()
  ) {
    return { errors: { general: "Un eveniment nou sau o ciornă publicată trebuie să aibă ora de încheiere în viitor." } };
  }

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
    starts_at: startsAt,
    ends_at: endsAt,
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
    status: parsed.data.status as EventStatus,
  };

  const { error } = isEdit
    ? await supabaseAdmin.from("events").update(payload).eq("id", id)
    : await supabaseAdmin.from("events").insert(payload);

  if (error?.code === "23505") return { errors: { general: "Există deja un eveniment cu acest slug." } };
  if (error?.message.includes("event_cannot_be_reactivated") || error?.message.includes("event_manual_end_is_permanent")) {
    return { errors: { general: "Un eveniment încheiat nu poate fi reactivat." } };
  }
  if (error?.message.includes("event_end_must_follow_start")) {
    return { errors: { general: "Ora de încheiere trebuie să fie după ora începerii." } };
  }
  if (error) return { errors: { general: "Evenimentul nu a putut fi salvat." } };

  const previousFeaturedSlot = current?.data?.featured_slot ?? null;
  let featuredError: string | null = null;
  if (featuredAssignment.kind === "none" && previousFeaturedSlot !== null) {
    const { error: placementError } = await supabaseAdmin.rpc("admin_remove_featured_slot", {
      target_id: id,
      expected_slot: previousFeaturedSlot,
    });
    if (placementError) featuredError = featuredMutationError(placementError.message);
  } else if (
    featuredAssignment.kind === "slot"
    && previousFeaturedSlot !== featuredAssignment.slot
  ) {
    const placementArgs: {
      target_id: string;
      target_slot: number;
      expected_occupant_id?: string;
    } = {
      target_id: id,
      target_slot: featuredAssignment.slot,
    };
    if (featuredAssignment.expectedOccupantId) {
      placementArgs.expected_occupant_id = featuredAssignment.expectedOccupantId;
    }
    const { error: placementError } = await supabaseAdmin.rpc(
      "admin_assign_featured_slot",
      placementArgs,
    );
    if (placementError) featuredError = featuredMutationError(placementError.message);
  }

  if (featuredError) {
    if (!isEdit) {
      await supabaseAdmin.from("events").delete().eq("id", id);
      const uploadedPath = previousPosterPath(photoUrl);
      if (uploadedPath) await supabaseAdmin.storage.from("posters").remove([uploadedPath]);
      return { errors: { general: `${featuredError} Evenimentul nou nu a fost creat.` } };
    }
    revalidateEventSurfaces(nextSlug);
    return { errors: { general: `Detaliile au fost salvate, dar ${featuredError.toLocaleLowerCase("ro")}` }, eventId: id };
  }

  const typePayload = ticketTypes.data.map((type, index) => ({
    id: type.id || randomUUID(),
    event_id: id,
    slug: normalizedTypeSlugs[index],
    name: type.name.trim(),
    description: type.description?.trim() || null,
    price_bani: type.price_ron * 100,
    capacity: type.capacity,
    sales_start_at: ticketSaleWindows[index].start,
    sales_end_at: ticketSaleWindows[index].end,
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

  revalidateEventSurfaces(nextSlug);
  return { ok: true, message: "Eveniment salvat.", eventId: id };
}

export async function endEvent(_prev: EventActionState, form: FormData): Promise<EventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) {
    return { errors: { general: "Nu ai acces la această acțiune." } };
  }

  const parsed = eventIdSchema.safeParse({ id: form.get("id") });
  if (!parsed.success) return { errors: { general: "Date invalide." } };

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, status, ends_at, manually_ended_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!event) return { errors: { general: "Evenimentul nu mai există." } };

  const { data: endedNow, error } = await supabaseAdmin.rpc("admin_end_event", {
    target_id: parsed.data.id,
  });

  if (error) {
    return { errors: { general: "Evenimentul nu a putut fi încheiat. Reîncarcă pagina și încearcă din nou." } };
  }

  await logAudit({
    actorId: actor.user.id,
    action: "event.ended",
    entityType: "event",
    entityId: parsed.data.id,
    metadata: { source: endedNow ? "manual" : "already_ended", featured_slot_retained: true },
  });
  revalidateEventSurfaces(event.slug);
  return {
    ok: true,
    message: endedNow
      ? "Eveniment încheiat. Poziția de pe Despre a fost păstrată."
      : "Evenimentul era deja încheiat. Pagina a fost actualizată.",
  };
}

export async function assignFeaturedSlot(
  _prev: EventActionState,
  form: FormData,
): Promise<EventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) return { errors: { general: "Nu ai acces la această acțiune." } };

  const parsed = featuredSlotSchema.safeParse({
    event_id: form.get("event_id"),
    target_slot: form.get("target_slot"),
    expected_occupant_id: form.get("expected_occupant_id") ?? "",
  });
  if (!parsed.success) return { errors: { general: "Alege un eveniment și o poziție validă." } };

  const args: {
    target_id: string;
    target_slot: number;
    expected_occupant_id?: string;
  } = {
    target_id: parsed.data.event_id,
    target_slot: parsed.data.target_slot,
  };
  if (parsed.data.expected_occupant_id) {
    args.expected_occupant_id = parsed.data.expected_occupant_id;
  }
  const { error } = await supabaseAdmin.rpc("admin_assign_featured_slot", args);
  if (error) return { errors: { general: featuredMutationError(error.message) } };

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("slug, status, ends_at, manually_ended_at")
    .eq("id", parsed.data.event_id)
    .maybeSingle();
  await logAudit({
    actorId: actor.user.id,
    action: "event.featured_slot_assigned",
    entityType: "event",
    entityId: parsed.data.event_id,
    metadata: {
      featured_slot: parsed.data.target_slot,
      lifecycle_status: event && isEventEnded(event) ? "ended" : "active",
    },
  });
  revalidateEventSurfaces(event?.slug);
  return { ok: true, message: `Evenimentul apare acum în Slotul ${parsed.data.target_slot}.` };
}

export async function removeFeaturedSlot(
  _prev: EventActionState,
  form: FormData,
): Promise<EventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) return { errors: { general: "Nu ai acces la această acțiune." } };

  const parsed = removeFeaturedSchema.safeParse({
    event_id: form.get("event_id"),
    expected_slot: form.get("expected_slot"),
  });
  if (!parsed.success) return { errors: { general: "Poziția aleasă nu este validă." } };

  const { error } = await supabaseAdmin.rpc("admin_remove_featured_slot", {
    target_id: parsed.data.event_id,
    expected_slot: parsed.data.expected_slot,
  });
  if (error) return { errors: { general: featuredMutationError(error.message) } };

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("slug")
    .eq("id", parsed.data.event_id)
    .maybeSingle();
  await logAudit({
    actorId: actor.user.id,
    action: "event.featured_slot_removed",
    entityType: "event",
    entityId: parsed.data.event_id,
    metadata: { previous_featured_slot: parsed.data.expected_slot },
  });
  revalidateEventSurfaces(event?.slug);
  return { ok: true, message: "Evenimentul a fost scos de pe Despre. Statusul lui nu s-a schimbat." };
}
