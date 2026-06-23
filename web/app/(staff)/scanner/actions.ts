"use server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { verifyTicket } from "@/lib/qr-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SCANNER_ROLES, hasStaffRole } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

export interface ScanTicketInfo {
  holder_name: string;
  holder_email: string;
  code: string;
  event_title: string;
}

export interface ScanVerdict {
  result: Database["public"]["Enums"]["scan_result"] | "invalid" | "inactive_event" | "unauthorized";
  ticket?: ScanTicketInfo;
}

type TicketWithEvent = Database["public"]["Tables"]["tickets"]["Row"] & {
  events?: { title: string | null; status: Database["public"]["Enums"]["event_status"] | null } | null;
};

type ScannerAuth =
  | { ok: true; userId: string }
  | { ok: false; result: "invalid" | "unauthorized" };

const ticketSelect = "id, status, holder_name, holder_email, code, event_id, events(title, status)";

function normalizeTicketCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function getScannerAuth(): Promise<ScannerAuth> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, result: "invalid" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasStaffRole(profile?.role, SCANNER_ROLES)) {
    return { ok: false, result: "unauthorized" };
  }

  return { ok: true, userId: user.id };
}

async function getTicketById(ticketId: string) {
  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select(ticketSelect)
    .eq("id", ticketId)
    .maybeSingle();

  return ticket as TicketWithEvent | null;
}

async function getTicketByCode(code: string) {
  const normalized = normalizeTicketCode(code);
  if (!normalized) return null;

  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select(ticketSelect)
    .eq("code", normalized)
    .maybeSingle();

  return ticket as TicketWithEvent | null;
}

export async function scanTicket(token: string): Promise<ScanVerdict> {
  const auth = await getScannerAuth();
  if (!auth.ok) return { result: auth.result };

  const ticketId = verifyTicket(token);
  if (!ticketId) return { result: "invalid" };

  const ticket = await getTicketById(ticketId);
  if (!ticket) return { result: "invalid" };

  return checkInTicket(ticket, auth.userId);
}

export async function scanTicketByCode(code: string): Promise<ScanVerdict> {
  const auth = await getScannerAuth();
  if (!auth.ok) return { result: auth.result };

  const ticket = await getTicketByCode(code);
  if (!ticket) return { result: "invalid" };

  return checkInTicket(ticket, auth.userId);
}

async function checkInTicket(ticket: TicketWithEvent, userId: string): Promise<ScanVerdict> {
  const eventTitle = ticket.events?.title ?? "Eveniment";
  const eventStatus = ticket.events?.status ?? null;
  const info: ScanTicketInfo = {
    holder_name: ticket.holder_name,
    holder_email: ticket.holder_email,
    code: ticket.code,
    event_title: eventTitle,
  };

  if (eventStatus !== "active") {
    return { result: "inactive_event", ticket: info };
  }

  const scanResult = async (result: Database["public"]["Enums"]["scan_result"]) => {
    await logScan(ticket.event_id, ticket.id, userId, result);
    return { result, ticket: info } satisfies ScanVerdict;
  };

  if (ticket.status === "void") return await scanResult("void_ticket");
  if (ticket.status === "used") return await scanResult("already_used");
  if (ticket.status === "in") return await scanResult("already_in");

  const { data: updated } = await supabaseAdmin
    .from("tickets")
    .update({ status: "in", checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status", "valid")
    .select("id");

  if (!updated || updated.length === 0) {
    return await scanResult("already_in");
  }

  return await scanResult("ok");
}

async function logScan(
  eventId: string,
  ticketId: string,
  userId: string,
  result: Database["public"]["Enums"]["scan_result"]
) {
  await supabaseAdmin.from("scans").insert({
    event_id: eventId,
    ticket_id: ticketId,
    scanned_by: userId,
    result,
  });
}
