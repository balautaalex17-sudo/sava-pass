import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { consumeDashboardRateLimit } from "@/lib/dashboard/rate-limit";
import { isEventEnded } from "@/lib/event-lifecycle";
import { resultObject, TICKET_MESSAGES } from "@/lib/dashboard/scan-results";
import {
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
        "ticket_check_in",
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
    if (!resolved.ticket.events || resolved.ticket.events.status !== "active" || isEventEnded(resolved.ticket.events)) {
      return privateJson({ result: "inactive_event", message: TICKET_MESSAGES.inactive_event, ticket: ticketDto(resolved.ticket) });
    }

    const { data, error } = await supabaseAdmin.rpc("check_in_ticket", {
      p_ticket_id: resolved.ticket.id,
      p_actor_id: viewer.profile.id,
      p_token_fingerprint: resolved.fingerprint,
      p_device_metadata: {
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
    if (error) throw error;
    const result = resultObject(data);
    const resultCode = String(result.result ?? "error");
    if (resultCode === "accepted") {
      const checkedInAt = String(
        result.checked_in_at ?? new Date().toISOString(),
      );
      resolved.ticket.status = "checked_in";
      resolved.ticket.checked_in_at = checkedInAt;
      if (result.payment_confirmed === true) {
        resolved.ticket.payment_confirmed_at = checkedInAt;
      }
    }
    return privateJson({
      ...result,
      result: resultCode,
      message: TICKET_MESSAGES[resultCode] ?? TICKET_MESSAGES.error,
      ticket: ticketDto(resolved.ticket),
    });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("ticket_check_in_failed");
    return privateJson(
      { result: "error", message: TICKET_MESSAGES.error },
      { status: 500 },
    );
  }
}
