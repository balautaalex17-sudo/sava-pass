"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import { issueTicket } from "@/lib/tickets";
import { resolveSiteUrl } from "@/lib/site-url";

const schema = z.object({
  event_id: z.string().min(1, "Alege un eveniment"),
  holder_name: z.string().min(2, "Introdu numele"),
  holder_email: z.string().email("Email invalid"),
});

export interface IssueState {
  ok?: boolean;
  ticketUrl?: string;
  code?: string;
  errors?: { event_id?: string; holder_name?: string; holder_email?: string; general?: string };
}

/**
 * Admin-only: mint a valid comp/test ticket without a payment. Creates a
 * zero-amount "paid" order to satisfy the tickets.order_id FK, then issues the
 * ticket via the shared issueTicket() — so it's identical to a purchased one and
 * scans like the real thing. Returns the /bilet link + code to open on a phone.
 */
export async function issueCompTicket(_prev: IssueState, form: FormData): Promise<IssueState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { errors: { general: "Acces refuzat." } };

  const parsed = schema.safeParse({
    event_id: form.get("event_id"),
    holder_name: form.get("holder_name"),
    holder_email: form.get("holder_email"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { errors: { event_id: f.event_id?.[0], holder_name: f.holder_name?.[0], holder_email: f.holder_email?.[0] } };
  }
  const { event_id, holder_name, holder_email } = parsed.data;

  // Comp order (amount 0, marked paid) — satisfies the required tickets.order_id FK.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      event_id,
      buyer_name: holder_name,
      buyer_email: holder_email.toLowerCase(),
      quantity: 1,
      amount_bani: 0,
      currency: "ron",
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("Comp order insert failed:", orderErr);
    return { errors: { general: "Nu am putut crea comanda comp." } };
  }

  const issued = await issueTicket({
    eventId: event_id,
    orderId: order.id,
    holderName: holder_name,
    holderEmail: holder_email,
  });
  if (!issued) return { errors: { general: "Nu am putut emite biletul." } };

  return { ok: true, ticketUrl: `${resolveSiteUrl()}/bilet/${issued.qrToken}`, code: issued.code };
}
