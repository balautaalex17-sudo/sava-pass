"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { eventIsBookable, getEventBySlug } from "@/lib/events";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { signTicket } from "@/lib/qr-token";
import { logServerError } from "@/lib/server-log";
import { resolveSiteUrl } from "@/lib/site-url";
import { generateCode } from "@/lib/ticket-code";
import { notifyTicketIssued } from "@/lib/ticket-notifications";
import { normalizeRomanianPhone } from "@/lib/phone";

const schema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ticket_type_id: z.string().uuid("Alege un tip de bilet."),
  request_key: z.string().uuid(),
  name: z.string().trim().min(2, "Introdu numele complet").max(120, "Numele este prea lung"),
  email: z.string().trim().email("Email invalid").max(254, "Emailul este prea lung"),
  phone: z.string().trim().min(9, "Telefon invalid").max(24, "Telefon invalid")
    .refine((value) => normalizeRomanianPhone(value) !== null, "Introdu un număr românesc valid"),
  gdpr: z.literal("on", { error: "Trebuie să fii de acord" }),
});

const reservationResultSchema = z.discriminatedUnion("result", [
  z.object({
    result: z.literal("reserved"),
    created: z.boolean(),
    order_id: z.string().uuid(),
    ticket_id: z.string().uuid(),
    qr_token: z.string().min(80).max(2048),
    order_status: z.enum(["paid", "pending"]),
  }),
  z.object({
    result: z.enum([
      "invalid_input",
      "request_key_conflict",
      "event_unavailable",
      "ticket_type_unavailable",
      "event_sold_out",
      "ticket_type_sold_out",
    ]),
  }),
]);

export interface CheckoutState {
  errors?: { ticket_type_id?: string; name?: string; email?: string; phone?: string; gdpr?: string; general?: string };
}

export async function createCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = {
    slug: form.get("slug"),
    ticket_type_id: form.get("ticket_type_id"),
    request_key: form.get("request_key"),
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    gdpr: form.get("gdpr"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        name: flat.name?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0],
        gdpr: flat.gdpr?.[0],
        ticket_type_id: flat.ticket_type_id?.[0],
      },
    };
  }

  const {
    slug,
    ticket_type_id: ticketTypeId,
    request_key: requestKey,
    name,
  } = parsed.data;
  const email = parsed.data.email.toLocaleLowerCase("ro");
  const phone = normalizeRomanianPhone(parsed.data.phone)!;

  const allowed = await allowPublicAction({
    scope: "checkout",
    subject: email,
    ipLimit: 10,
    subjectLimit: 5,
    windowSeconds: 10 * 60,
  });
  if (!allowed) {
    return { errors: { general: "Prea multe încercări. Așteaptă câteva minute și încearcă din nou." } };
  }

  const event = await getEventBySlug(slug);
  if (!event || !eventIsBookable(event)) {
    return { errors: { general: "Evenimentul nu mai este activ." } };
  }

  const { data: ticketType } = await supabaseAdmin
    .from("event_ticket_types")
    .select("id, event_id, name, description, price_bani, capacity, status, sales_start_at, sales_end_at")
    .eq("id", ticketTypeId)
    .eq("event_id", event.id)
    .maybeSingle();
  const now = Date.now();
  if (
    !ticketType ||
    ticketType.status !== "active" ||
    (ticketType.sales_start_at && new Date(ticketType.sales_start_at).getTime() > now) ||
    (ticketType.sales_end_at && new Date(ticketType.sales_end_at).getTime() < now)
  ) {
    return { errors: { ticket_type_id: "Acest tip de bilet nu mai este disponibil." } };
  }

  const orderId = crypto.randomUUID();
  const ticketId = crypto.randomUUID();
  const qrToken = signTicket(ticketId);
  const { data, error } = await supabaseAdmin.rpc("reserve_public_ticket", {
    p_request_key: requestKey,
    p_event_id: event.id,
    p_ticket_type_id: ticketType.id,
    p_order_id: orderId,
    p_ticket_id: ticketId,
    p_ticket_code: generateCode(6),
    p_qr_token: qrToken,
    p_holder_name: name,
    p_holder_email: email,
  });

  if (error) {
    logServerError("checkout_reservation_failed", error);
    return { errors: { general: "Rezervarea nu a putut fi emisă. Încearcă din nou." } };
  }

  const reservation = reservationResultSchema.safeParse(data);
  if (!reservation.success) {
    logServerError("checkout_reservation_invalid_response", reservation.error);
    return { errors: { general: "Rezervarea nu a putut fi emisă. Încearcă din nou." } };
  }

  if (reservation.data.result === "event_sold_out") {
    return { errors: { general: "Ne pare rău, biletele s-au terminat." } };
  }
  if (reservation.data.result === "ticket_type_sold_out") {
    return { errors: { ticket_type_id: "Acest tip de bilet este epuizat." } };
  }
  if (reservation.data.result === "event_unavailable") {
    return { errors: { general: "Evenimentul nu mai este activ." } };
  }
  if (reservation.data.result === "ticket_type_unavailable") {
    return { errors: { ticket_type_id: "Acest tip de bilet nu mai este disponibil." } };
  }
  if (reservation.data.result !== "reserved") {
    return { errors: { general: "Datele rezervării s-au schimbat. Reîncarcă pagina și încearcă din nou." } };
  }

  const [orderContact, ticketContact] = await Promise.all([
    supabaseAdmin.from("orders")
      .update({ buyer_phone: phone })
      .eq("id", reservation.data.order_id),
    supabaseAdmin.from("tickets")
      .update({ holder_phone: phone })
      .eq("id", reservation.data.ticket_id),
  ]);
  if (orderContact.error || ticketContact.error) {
    logServerError("checkout_phone_link_failed", orderContact.error ?? ticketContact.error, {
      orderId: reservation.data.order_id,
      ticketId: reservation.data.ticket_id,
    });
  }

  const siteUrl = resolveSiteUrl();
  const ticketUrl = `${siteUrl}/bilet/${reservation.data.qr_token}`;
  await notifyTicketIssued({
    orderId: reservation.data.order_id,
    ticketId: reservation.data.ticket_id,
    recipientEmail: email,
    recipientName: name,
    eventTitle: event.title,
    eventStartsAt: event.starts_at,
    ticketUrl,
  });

  redirect(ticketUrl);
}
