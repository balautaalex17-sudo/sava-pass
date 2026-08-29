import "server-only";

import { z } from "zod";
import { qrTokenFingerprint, verifyTicketToken } from "@/lib/qr-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export const ticketInputSchema = z.union([
  z.object({ token: z.string().trim().min(8).max(4096) }).strict(),
  z.object({ code: z.string().trim().min(4).max(64) }).strict(),
]);

export type TicketInput = z.infer<typeof ticketInputSchema>;

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

interface TicketRecord {
  id: string;
  status: TicketStatus;
  holder_name: string;
  holder_email: string;
  code: string;
  event_id: string;
  ticket_type_id: string | null;
  issued_at: string;
  expires_at: string | null;
  checked_in_at: string | null;
  payment_confirmed_at: string | null;
  events: {
    id: string;
    title: string;
    status: Database["public"]["Enums"]["event_status"];
    starts_at: string;
  } | null;
  event_ticket_types: { name: string; price_bani: number } | null;
  orders: {
    status: Database["public"]["Enums"]["order_status"];
    amount_bani: number;
    created_at: string;
  } | null;
}

export type ResolvedTicket =
  | { ok: false; code: "invalid" | "invalid_token" | "expired_token" | "wrong_qr_type" }
  | { ok: true; ticket: TicketRecord; fingerprint: string };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function resolveTicketInput(
  input: TicketInput,
): Promise<ResolvedTicket> {
  let ticketId: string | null = null;
  let code: string | null = null;
  let fingerprint: string;

  if ("token" in input) {
    const validation = verifyTicketToken(input.token);
    if (!validation.ok) return { ok: false, code: validation.code };
    ticketId = validation.reference;
    fingerprint = qrTokenFingerprint(input.token);
  } else {
    code = normalizeCode(input.code);
    if (code.length < 4) return { ok: false, code: "invalid" };
    fingerprint = qrTokenFingerprint(`manual:${code}`);
  }

  let query = supabaseAdmin
    .from("tickets")
    .select(
      "id, status, holder_name, holder_email, code, event_id, ticket_type_id, issued_at, expires_at, checked_in_at, payment_confirmed_at, events(id, title, status, starts_at), event_ticket_types(name, price_bani), orders(status, amount_bani, created_at)",
    );
  query = ticketId ? query.eq("id", ticketId) : query.eq("code", code!);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return { ok: false, code: "invalid" };

  const ticket = data as unknown as TicketRecord;
  if (
    ticket.status === "reserved" &&
    ticket.expires_at &&
    new Date(ticket.expires_at).getTime() <= Date.now()
  ) {
    await supabaseAdmin
      .from("tickets")
      .update({ status: "expired" })
      .eq("id", ticket.id)
      .eq("status", "reserved");
    ticket.status = "expired";
  }

  return { ok: true, ticket, fingerprint };
}

export function ticketDto(ticket: TicketRecord) {
  return {
    id: ticket.id,
    status: ticket.status,
    holderName: ticket.holder_name,
    holderEmail: ticket.holder_email,
    code: ticket.code,
    eventName: ticket.events?.title ?? "Eveniment",
    eventStartsAt: ticket.events?.starts_at ?? null,
    ticketType: ticket.event_ticket_types?.name ?? "Bilet standard",
    priceBani:
      ticket.event_ticket_types?.price_bani ?? ticket.orders?.amount_bani ?? 0,
    reservationCreatedAt: ticket.orders?.created_at ?? ticket.issued_at,
    paymentConfirmedAt: ticket.payment_confirmed_at,
    checkedInAt: ticket.checked_in_at,
  };
}

export async function logTicketInspection(
  ticket: TicketRecord,
  actorId: string,
  fingerprint: string,
  result: string,
  deviceMetadata: Record<string, string | boolean | null>,
) {
  const { error } = await supabaseAdmin.from("scans").insert({
    event_id: ticket.event_id,
    ticket_id: ticket.id,
    scanned_by: actorId,
    action: "inspect",
    result,
    token_fingerprint: fingerprint,
    previous_status: ticket.status,
    new_status: ticket.status,
    device_metadata: deviceMetadata,
  });
  if (error) console.error("ticket_inspection_log_failed");
}
