import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { consumeDashboardRateLimit } from "@/lib/dashboard/rate-limit";
import { TICKET_MESSAGES } from "@/lib/dashboard/scan-results";
import {
  logTicketInspection,
  resolveTicketInput,
  ticketDto,
  ticketInputSchema,
} from "@/lib/dashboard/ticket-scanning";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const viewer = await requirePermission("scan_event_tickets");
    const parsed = ticketInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return privateJson(
        { result: "invalid_token", message: TICKET_MESSAGES.invalid_token },
        { status: 400 },
      );
    }
    if (
      !(await consumeDashboardRateLimit(
        viewer.profile.id,
        "ticket_inspect",
      ))
    ) {
      return privateJson(
        { result: "rate_limited", message: TICKET_MESSAGES.rate_limited },
        { status: 429 },
      );
    }

    const resolved = await resolveTicketInput(parsed.data);
    if (!resolved.ok) {
      return privateJson({
        result: resolved.code,
        message: TICKET_MESSAGES[resolved.code],
      });
    }

    const { ticket, fingerprint } = resolved;
    let result = "error";
    if (ticket.events?.status !== "active") result = "inactive_event";
    else if (ticket.status === "reserved") result = "reservation_found";
    else if (ticket.status === "paid") result = "valid_ticket";
    else if (ticket.status === "checked_in") result = "already_checked_in";
    else result = ticket.status;

    await logTicketInspection(ticket, viewer.profile.id, fingerprint, result, {
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });

    let duplicateDetails: { checked_in_at?: string | null; confirmed_by?: string | null } = {};
    if (ticket.status === "checked_in") {
      const { data: originalScan } = await supabaseAdmin
        .from("scans")
        .select("created_at, profiles!scans_scanned_by_fkey(full_name)")
        .eq("ticket_id", ticket.id)
        .in("action", ["check_in", "legacy_check_in"])
        .in("result", ["accepted", "ok"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const scanner = originalScan?.profiles as unknown as { full_name: string } | null | undefined;
      duplicateDetails = {
        checked_in_at: originalScan?.created_at ?? ticket.checked_in_at,
        confirmed_by: scanner?.full_name ?? null,
      };
    }

    return privateJson({
      result,
      message: TICKET_MESSAGES[result] ?? TICKET_MESSAGES.error,
      ticket: ticketDto(ticket),
      ...duplicateDetails,
      canConfirmPayment:
        ticket.status === "reserved" &&
        viewer.permissions.has("confirm_cash_payments"),
      canCheckIn: ticket.status === "paid",
    });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("ticket_inspection_failed");
    return privateJson(
      { result: "error", message: TICKET_MESSAGES.error },
      { status: 500 },
    );
  }
}
