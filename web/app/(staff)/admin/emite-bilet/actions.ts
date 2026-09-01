"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import { issueTicket } from "@/lib/tickets";
import { resolveSiteUrl } from "@/lib/site-url";
import { notifyTicketIssued } from "@/lib/ticket-notifications";
import { logAudit } from "@/lib/audit";
import { logServerError } from "@/lib/server-log";
import { isEventEnded } from "@/lib/event-lifecycle";

const schema = z.object({
  event_id: z.string().uuid("Alege un eveniment"),
  ticket_type_id: z.string().uuid("Alege un tip de bilet"),
  holder_name: z.string().trim().min(2, "Introdu numele").max(120),
  holder_email: z.string().trim().email("Email invalid").max(254),
});

export interface IssueState {
  ok?: boolean;
  ticketUrl?: string;
  code?: string;
  errors?: { event_id?: string; ticket_type_id?: string; holder_name?: string; holder_email?: string; general?: string };
}

/**
 * Admin-only: mint a complimentary/test ticket. Creates a zero-amount paid
 * order to satisfy the tickets.order_id FK, then issues the
 * ticket via the shared issueTicket() — so it's identical to a purchased one and
 * scans like the real thing. Returns the /bilet link + code to open on a phone.
 */
export async function issueCompTicket(_prev: IssueState, form: FormData): Promise<IssueState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { errors: { general: "Acces refuzat." } };

  const parsed = schema.safeParse({
    event_id: form.get("event_id"),
    ticket_type_id: form.get("ticket_type_id"),
    holder_name: form.get("holder_name"),
    holder_email: form.get("holder_email"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { errors: { event_id: f.event_id?.[0], ticket_type_id: f.ticket_type_id?.[0], holder_name: f.holder_name?.[0], holder_email: f.holder_email?.[0] } };
  }
  const { event_id, ticket_type_id, holder_name, holder_email } = parsed.data;

  const [{ data: event }, { data: ticketType }] = await Promise.all([
    supabaseAdmin.from("events").select("id, title, starts_at, ends_at, manually_ended_at, status, capacity").eq("id", event_id).maybeSingle(),
    supabaseAdmin.from("event_ticket_types").select("id, event_id, capacity").eq("id", ticket_type_id).maybeSingle(),
  ]);
  if (!event || !ticketType || ticketType.event_id !== event.id) return { errors: { ticket_type_id: "Tipul de bilet nu aparține evenimentului." } };
  if (event.status !== "active" || isEventEnded(event)) return { errors: { event_id: "Evenimentul este încheiat și nu mai poate primi bilete." } };
  const { count } = await supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).eq("ticket_type_id", ticketType.id).in("status", ["reserved", "paid", "checked_in"]);
  if ((count ?? 0) >= ticketType.capacity) return { errors: { ticket_type_id: "Capacitatea acestui tip de bilet este plină." } };

  // Comp order (amount 0, marked paid) — satisfies the required tickets.order_id FK.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      event_id,
      ticket_type_id,
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
    logServerError("comp_order_insert_failed", orderErr);
    return { errors: { general: "Nu am putut crea comanda comp." } };
  }

  const issued = await issueTicket({
    eventId: event_id,
    orderId: order.id,
    ticketTypeId: ticket_type_id,
    holderName: holder_name,
    holderEmail: holder_email,
  });
  if (!issued) {
    await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { errors: { general: "Nu am putut emite biletul. Verifică disponibilitatea." } };
  }

  const ticketUrl = `${resolveSiteUrl()}/bilet/${issued.qrToken}`;
  await notifyTicketIssued({ orderId: order.id, ticketId: issued.id, recipientEmail: holder_email, recipientName: holder_name, eventTitle: event.title, eventStartsAt: event.starts_at, ticketUrl });
  await logAudit({ actorId: current.user.id, action: "ticket.issue_comp", entityType: "ticket", entityId: issued.id, metadata: { event_id, ticket_type_id } });

  return { ok: true, ticketUrl, code: issued.code };
}
