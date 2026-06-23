"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

type EventStatus = Database["public"]["Enums"]["event_status"];

const programSchema = z.array(z.object({
  t: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ora trebuie să fie HH:MM"),
  l: z.string().min(1).max(120),
})).max(12);

const eventSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(2, "Titlul e obligatoriu"),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  date_label: z.string().min(2, "Data scurtă e obligatorie"),
  date_long: z.string().min(2, "Data lungă e obligatorie"),
  starts_at: z.string().min(1, "Alege data exactă"),
  doors: z.string().min(1, "Ora porților e obligatorie"),
  venue: z.string().min(2, "Locația e obligatorie"),
  venue_line: z.string().optional(),
  price_ron: z.coerce.number().int().min(1, "Preț invalid").max(10000),
  capacity: z.coerce.number().int().min(1, "Capacitate invalidă").max(100000),
  about: z.string().optional(),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Culoare hex invalidă").default("#009FE3"),
  program: z.string().default("[]"),
  perks: z.string().default("[]"),
  photo_url: z.string().optional(),
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "past"]),
  confirm_swap: z.literal("on").optional(),
});

export interface EventActionState {
  ok?: boolean;
  message?: string;
  eventId?: string;
  errors?: { general?: string };
}

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

export async function uploadPoster(eventId: string, file: File, previousUrl?: string | null) {
  if (!(await requireStaffRole(["admin"]))) {
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
  if (!(await requireStaffRole(["admin"]))) {
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

  const id = parsed.data.id || randomUUID();
  const isEdit = !!parsed.data.id;
  const current = isEdit
    ? await supabaseAdmin.from("events").select("id, slug, photo_url").eq("id", id).single()
    : null;

  if (isEdit && !current?.data) return { errors: { general: "Evenimentul nu există." } };

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

  revalidatePath("/");
  revalidatePath(`/${nextSlug}`);
  revalidatePath("/admin/events");
  return { ok: true, message: "Eveniment salvat.", eventId: id };
}

export async function setEventStatus(_prev: EventActionState, form: FormData): Promise<EventActionState> {
  if (!(await requireStaffRole(["admin"]))) {
    return { errors: { general: "Nu ai acces la această acțiune." } };
  }

  const parsed = statusSchema.safeParse({
    id: form.get("id"),
    status: form.get("status"),
    confirm_swap: form.get("confirm_swap") || undefined,
  });
  if (!parsed.success) return { errors: { general: "Date invalide." } };

  if (parsed.data.status === "active") {
    const { data: currentActive } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("status", "active")
      .neq("id", parsed.data.id)
      .maybeSingle();

    if (currentActive && parsed.data.confirm_swap !== "on") {
      return { errors: { general: "Confirmă înlocuirea evenimentului activ." } };
    }
  }

  const { error } = await supabaseAdmin.rpc("admin_set_event_status", {
    target_id: parsed.data.id,
    target_status: parsed.data.status,
  });

  if (error) return { errors: { general: "Statusul nu a putut fi schimbat." } };
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  return { ok: true, message: "Status actualizat." };
}

export async function setEventStatusForm(form: FormData) {
  await setEventStatus({}, form);
}
