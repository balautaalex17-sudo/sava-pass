"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { revalidateClub } from "@/lib/club";
import { requirePermission } from "@/lib/dashboard/auth";
import {
  BOARD_EVENT_OVERRIDE_PREFIX,
  getBoardEventOverrides,
  getManagedEventBySlug,
} from "@/lib/event-archive";
import type { EventOverride } from "@/lib/event-types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const categories = [
  "petrecere", "quiz", "atelier", "cultural", "educational", "sport",
  "fundraising", "recruitment", "club", "in_school", "recrut", "other",
] as const;

const dateValue = z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie în formatul AAAA-LL-ZZ.");
const timeValue = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Ora trebuie să fie în formatul HH:MM.");
const linkValue = z.string().trim().max(2048).refine(
  (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value),
  "Linkul trebuie să înceapă cu /, http:// sau https://.",
);

const archiveEventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Identificatorul evenimentului este invalid."),
  title: z.string().trim().min(2, "Titlul este obligatoriu.").max(120),
  subtitle: z.string().trim().max(180),
  short_description: z.string().trim().min(10, "Descrierea scurtă trebuie să aibă cel puțin 10 caractere.").max(320),
  full_description: z.string().trim().max(4000),
  start_date: dateValue,
  end_date: dateValue,
  start_time: timeValue,
  end_time: timeValue,
  venue_name: z.string().trim().max(180),
  address: z.string().trim().max(300),
  category: z.enum(categories),
  charitable_cause: z.string().trim().max(300),
  donation_text: z.string().trim().max(500),
  ticket_price: z.string().trim().max(80),
  registration_url: linkValue,
  internal_ticketing_url: linkValue,
  cover_image_src: linkValue,
  cover_image_alt: z.string().trim().min(3, "Descrie pe scurt imaginea.").max(220),
  image_position: z.enum(["center", "top", "bottom"]),
});

const archiveEventIdentitySchema = archiveEventSchema.pick({ slug: true });

export type ArchiveEventActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

async function persistArchiveEventOverride(slug: string, override: EventOverride) {
  const { error } = await supabaseAdmin.from("site_content").upsert({
    key: `${BOARD_EVENT_OVERRIDE_PREFIX}${slug}`,
    value: override as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  return error;
}

function revalidateArchiveEvent(slug: string) {
  revalidateClub();
  revalidatePath("/");
  revalidatePath("/evenimente");
  revalidatePath(`/evenimente/${slug}`);
  revalidatePath("/board/evenimente");
  revalidatePath("/board/evenimente/arhiva");
  revalidatePath(`/board/evenimente/arhiva/${slug}`);
}

export async function saveArchiveEvent(
  _previous: ArchiveEventActionState,
  form: FormData,
): Promise<ArchiveEventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) return { error: "Nu ai acces la această acțiune." };

  const parsed = archiveEventSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const source = await getManagedEventBySlug(parsed.data.slug, true);
  if (!source) return { error: "Evenimentul importat nu mai există." };

  if (parsed.data.start_date && parsed.data.end_date && parsed.data.end_date < parsed.data.start_date) {
    return { error: "Data de final nu poate fi înaintea datei de început." };
  }

  const currentOverrides = await getBoardEventOverrides();
  const override: EventOverride = {
    ...currentOverrides[parsed.data.slug],
    title: parsed.data.title,
    subtitle: parsed.data.subtitle,
    shortDescription: parsed.data.short_description,
    fullDescription: parsed.data.full_description,
    startDate: parsed.data.start_date,
    endDate: parsed.data.end_date,
    startTime: parsed.data.start_time,
    endTime: parsed.data.end_time,
    venueName: parsed.data.venue_name,
    address: parsed.data.address,
    category: parsed.data.category,
    charitableCause: parsed.data.charitable_cause,
    donationText: parsed.data.donation_text,
    ticketPrice: parsed.data.ticket_price,
    registrationUrl: parsed.data.registration_url,
    internalTicketingUrl: parsed.data.internal_ticketing_url,
    coverImage: {
      ...source.coverImage,
      src: parsed.data.cover_image_src,
      alt: parsed.data.cover_image_alt,
      position: parsed.data.image_position,
    },
    imagePosition: parsed.data.image_position,
    publish: form.get("published") === "on",
  };

  const error = await persistArchiveEventOverride(parsed.data.slug, override);

  if (error) return { error: "Modificările nu au putut fi salvate." };

  await logAudit({
    actorId: actor.user.id,
    action: "event.archive.update",
    entityType: "event_archive",
    entityId: parsed.data.slug,
    metadata: { published: override.publish, category: override.category },
  });

  revalidateArchiveEvent(parsed.data.slug);

  return { ok: true, message: "Evenimentul a fost actualizat pe site." };
}

export async function archiveImportedEvent(
  _previous: ArchiveEventActionState,
  form: FormData,
): Promise<ArchiveEventActionState> {
  const actor = await requirePermission("manage_public_events").catch(() => null);
  if (!actor) return { error: "Nu ai acces la această acțiune." };

  const parsed = archiveEventIdentitySchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const source = await getManagedEventBySlug(parsed.data.slug, true);
  if (!source) return { error: "Evenimentul importat nu mai există." };

  const currentOverrides = await getBoardEventOverrides();
  const override: EventOverride = {
    ...currentOverrides[parsed.data.slug],
    publish: false,
  };

  const error = await persistArchiveEventOverride(parsed.data.slug, override);
  if (error) return { error: "Evenimentul nu a putut fi arhivat." };

  await logAudit({
    actorId: actor.user.id,
    action: "event.archive.hide",
    entityType: "event_archive",
    entityId: parsed.data.slug,
    metadata: { published: false },
  });

  revalidateArchiveEvent(parsed.data.slug);
  redirect("/board/evenimente/arhiva");
}
