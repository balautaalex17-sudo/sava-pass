import "server-only";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EventRegistration } from "./event-registration-model";

export { registrationStatusLabels } from "./event-registration-model";

export const registrationFiltersSchema = z.object({
  event: z.union([z.literal(""), z.uuid()]).default(""),
  status: z.enum(["all", "reserved", "paid", "checked_in", "cancelled", "expired"]).default("all"),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});

export type RegistrationFilters = z.infer<typeof registrationFiltersSchema>;

export const REGISTRATIONS_PER_PAGE = 50;

export async function getRegistrationEvents() {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, starts_at")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRegistrationPage(filters: RegistrationFilters, offset: number, limit: number) {
  let query = supabaseAdmin
    .from("tickets")
    .select(
      "id, event_id, code, holder_name, holder_email, holder_phone, status, issued_at, checked_in_at, events!tickets_event_id_fkey(title, price_bani), event_ticket_types(name, price_bani), orders(amount_bani, quantity)",
      { count: "exact" },
    );

  if (filters.event) query = query.eq("event_id", filters.event);
  if (filters.status !== "all") query = query.eq("status", filters.status);

  if (filters.sort === "name") query = query.order("holder_name", { ascending: true });
  else query = query.order("issued_at", { ascending: filters.sort === "oldest" });

  const { data, count, error } = await query.order("id", { ascending: true }).range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    count: count ?? 0,
    rows: (data ?? []).map((ticket): EventRegistration => ({
      id: ticket.id,
      eventId: ticket.event_id,
      eventTitle: ticket.events?.title ?? "Eveniment",
      holderName: ticket.holder_name,
      holderEmail: ticket.holder_email,
      holderPhone: ticket.holder_phone,
      code: ticket.code,
      ticketType: ticket.event_ticket_types?.name ?? "Bilet standard",
      priceBani: ticket.event_ticket_types?.price_bani
        ?? Math.round((ticket.orders?.amount_bani ?? ticket.events?.price_bani ?? 0) / Math.max(ticket.orders?.quantity ?? 1, 1)),
      status: ticket.status,
      issuedAt: ticket.issued_at,
      checkedInAt: ticket.checked_in_at,
    })),
  };
}

export async function getAllRegistrations(filters: RegistrationFilters) {
  const rows: EventRegistration[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const batch = await getRegistrationPage(filters, offset, batchSize);
    rows.push(...batch.rows);
    if (rows.length >= batch.count || batch.rows.length < batchSize) return rows;
  }
}
