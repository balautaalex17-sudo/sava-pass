"use server";

import { requirePermission } from "@/lib/dashboard/auth";
import { isEventEnded } from "@/lib/event-lifecycle";
import { qrTokenFingerprint, verifyTicket } from "@/lib/qr-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type LegacyResult =
  | "ok"
  | "already_in"
  | "already_used"
  | "void_ticket"
  | "invalid"
  | "inactive_event"
  | "payment_pending"
  | "unauthorized";

export interface ScanTicketInfo {
  holder_name: string;
  holder_email: string;
  code: string;
  event_title: string;
}

export interface ScanVerdict {
  result: LegacyResult;
  ticket?: ScanTicketInfo;
}

type TicketWithEvent = Database["public"]["Tables"]["tickets"]["Row"] & {
  events?: {
    title: string | null;
    status: Database["public"]["Enums"]["event_status"] | null;
    ends_at: string | null;
    manually_ended_at: string | null;
  } | null;
  orders?: {
    status: Database["public"]["Enums"]["order_status"];
    amount_bani: number;
  } | null;
};

const ticketSelect =
  "id, status, holder_name, holder_email, code, event_id, events(title, status, ends_at, manually_ended_at), orders(status, amount_bani)";

function normalizeTicketCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function getTicketById(ticketId: string) {
  const { data } = await supabaseAdmin
    .from("tickets")
    .select(ticketSelect)
    .eq("id", ticketId)
    .maybeSingle();
  return data as TicketWithEvent | null;
}

async function getTicketByCode(code: string) {
  const normalized = normalizeTicketCode(code);
  if (!normalized) return null;
  const { data } = await supabaseAdmin
    .from("tickets")
    .select(ticketSelect)
    .eq("code", normalized)
    .maybeSingle();
  return data as TicketWithEvent | null;
}

export async function scanTicket(token: string): Promise<ScanVerdict> {
  try {
    const viewer = await requirePermission("scan_event_tickets");
    const ticketId = verifyTicket(token);
    if (!ticketId) return { result: "invalid" };
    const ticket = await getTicketById(ticketId);
    if (!ticket) return { result: "invalid" };
    return checkInTicket(ticket, viewer.profile.id, qrTokenFingerprint(token));
  } catch {
    return { result: "unauthorized" };
  }
}

export async function scanTicketByCode(code: string): Promise<ScanVerdict> {
  try {
    const viewer = await requirePermission("scan_event_tickets");
    const ticket = await getTicketByCode(code);
    if (!ticket) return { result: "invalid" };
    return checkInTicket(
      ticket,
      viewer.profile.id,
      qrTokenFingerprint(`manual:${normalizeTicketCode(code)}`),
    );
  } catch {
    return { result: "unauthorized" };
  }
}

async function checkInTicket(
  ticket: TicketWithEvent,
  userId: string,
  fingerprint: string,
): Promise<ScanVerdict> {
  const info: ScanTicketInfo = {
    holder_name: ticket.holder_name,
    holder_email: ticket.holder_email,
    code: ticket.code,
    event_title: ticket.events?.title ?? "Eveniment",
  };

  if (
    !ticket.events
    || ticket.events.status !== "active"
    || !ticket.events.ends_at
    || isEventEnded({
      status: ticket.events.status,
      ends_at: ticket.events.ends_at,
      manually_ended_at: ticket.events.manually_ended_at,
    })
  ) {
    return { result: "inactive_event", ticket: info };
  }

  const { data } = await supabaseAdmin.rpc("check_in_ticket", {
    p_ticket_id: ticket.id,
    p_actor_id: userId,
    p_token_fingerprint: fingerprint,
    p_device_metadata: { surface: "legacy_scanner" },
  });
  const result =
    data && typeof data === "object" && !Array.isArray(data) && "result" in data
      ? String(data.result)
      : "error";

  const mapped: LegacyResult =
    result === "accepted"
      ? "ok"
      : result === "already_checked_in"
        ? "already_in"
        : result === "payment_required"
          ? "payment_pending"
          : result === "cancelled" || result === "expired"
            ? "void_ticket"
            : result === "inactive_event"
              ? "inactive_event"
              : result === "unauthorized"
                ? "unauthorized"
                : "invalid";

  return { result: mapped, ticket: info };
}
