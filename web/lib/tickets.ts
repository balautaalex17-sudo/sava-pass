import "server-only";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signTicket } from "@/lib/qr-token";
import { generateCode } from "@/lib/ticket-code";

export interface IssueTicketArgs {
  eventId: string;
  orderId: string;
  ticketTypeId?: string | null;
  holderName: string;
  holderEmail: string;
}

export interface IssuedTicket {
  id: string;
  code: string;
  qrToken: string;
}

/**
 * Single source of truth for issuing a ticket. Used by the public reservation
 * flow and the admin comp/test-ticket tool, so both paths produce the same code
 * format, signed token, and cash-aware initial state. A paid/free order issues
 * a paid ticket; every other order issues a reservation. Returns null on error.
 */
export async function issueTicket({ eventId, orderId, ticketTypeId, holderName, holderEmail }: IssueTicketArgs): Promise<IssuedTicket | null> {
  const id = crypto.randomUUID();
  const code = generateCode(6);
  const qrToken = signTicket(id);

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const isPaid = order.status === "paid";

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      id,
      order_id: orderId,
      event_id: eventId,
      ticket_type_id: ticketTypeId ?? null,
      code,
      qr_token: qrToken,
      holder_name: holderName,
      holder_email: holderEmail.toLowerCase(),
      status: isPaid ? "paid" : "reserved",
      expires_at: isPaid
        ? null
        : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      payment_confirmed_at: isPaid ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("ticket_issue_failed", error);
    return null;
  }

  return { id, code, qrToken };
}
