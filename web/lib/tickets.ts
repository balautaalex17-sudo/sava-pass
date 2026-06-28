import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signTicket } from "@/lib/qr-token";
import { generateCode } from "@/lib/ticket-code";

export interface IssueTicketArgs {
  eventId: string;
  orderId: string;
  holderName: string;
  holderEmail: string;
}

export interface IssuedTicket {
  id: string;
  code: string;
  qrToken: string;
}

/**
 * Single source of truth for issuing a ticket. Used by the Stripe webhook (paid
 * orders) and the admin comp/test-ticket tool — so a manually issued ticket is
 * byte-for-byte identical to a purchased one (same code format, HMAC token, and
 * `valid` status). Returns null on insert failure (caller decides what to do).
 */
export async function issueTicket({ eventId, orderId, holderName, holderEmail }: IssueTicketArgs): Promise<IssuedTicket | null> {
  const id = crypto.randomUUID();
  const code = generateCode(6);
  const qrToken = signTicket(id);

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      id,
      order_id: orderId,
      event_id: eventId,
      code,
      qr_token: qrToken,
      holder_name: holderName,
      holder_email: holderEmail.toLowerCase(),
      status: "valid",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("issueTicket failed:", error);
    return null;
  }

  return { id, code, qrToken };
}
