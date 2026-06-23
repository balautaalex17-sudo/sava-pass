import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signTicket } from "@/lib/qr-token";
import { generateCode } from "@/lib/ticket-code";
import { Resend } from "resend";
import type Stripe from "stripe";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    await handleRefund(charge);
  }

  return NextResponse.json({ ok: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  // idempotency: skip if already paid
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id, status, event_id, buyer_name, buyer_email")
    .eq("id", orderId)
    .single();

  if (!existing || existing.status === "paid") return;

  // check capacity one more time
  const { data: stats } = await supabaseAdmin
    .from("event_stats")
    .select("sold, event_id")
    .eq("event_id", existing.event_id)
    .single();

  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("capacity, title, date_label, venue, price_bani")
    .eq("id", existing.event_id)
    .single();

  if (stats && ev && (stats.sold ?? 0) >= ev.capacity) {
    // mark failed — over capacity (edge case)
    await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", orderId);
    return;
  }

  // mark order paid
  await supabaseAdmin.from("orders").update({
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent as string,
    paid_at: new Date().toISOString(),
  }).eq("id", orderId);

  // issue ticket
  const ticketId = crypto.randomUUID();
  const code = generateCode(6);
  const qrToken = signTicket(ticketId);

  const { data: ticket } = await supabaseAdmin.from("tickets").insert({
    id: ticketId,
    order_id: orderId,
    event_id: existing.event_id,
    code,
    qr_token: qrToken,
    holder_name: existing.buyer_name,
    holder_email: existing.buyer_email,
    status: "valid",
  }).select().single();

  if (!ticket) return;

  // send email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ticketUrl = `${siteUrl}/bilet/${qrToken}`;
  const qrUrl = `${siteUrl}/api/qr/${qrToken}`;

  await resend.emails.send({
    from: "SavaPass <noreply@savapass.ro>",
    to: existing.buyer_email,
    subject: `Biletul tău pentru ${ev?.title ?? "eveniment"} — ${code}`,
    html: buildEmailHtml({
      name: existing.buyer_name,
      eventTitle: ev?.title ?? "Eveniment",
      dateLabel: ev?.date_label ?? "",
      venue: ev?.venue ?? "",
      code,
      ticketUrl,
      qrUrl,
    }),
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const pi = charge.payment_intent as string;
  if (!pi) return;
  const { data: order } = await supabaseAdmin.from("orders").select("id").eq("stripe_payment_intent", pi).single();
  if (!order) return;
  await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", order.id);
  await supabaseAdmin.from("tickets").update({ status: "void" }).eq("order_id", order.id);
}

function buildEmailHtml({ name, eventTitle, dateLabel, venue, code, ticketUrl, qrUrl }: {
  name: string; eventTitle: string; dateLabel: string; venue: string;
  code: string; ticketUrl: string; qrUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"><title>Biletul tău</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
  <div style="background:linear-gradient(135deg,#009FE3 0%,#2563EB 100%);padding:32px 32px 24px;">
    <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px;">BILETUL TĂU</div>
    <div style="color:white;font-size:24px;font-weight:800;letter-spacing:-0.02em;">${eventTitle}</div>
    <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:6px;">${dateLabel} · ${venue}</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Salut, <strong>${name}</strong>! Biletul tău este gata. Arată codul QR la intrare sau introdu codul de 6 caractere.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${qrUrl}" alt="QR bilet" width="180" height="180" style="border-radius:16px;border:2px solid #E2E8F0;" />
      <div style="margin-top:12px;font-family:monospace;font-size:22px;font-weight:700;letter-spacing:0.15em;color:#0F172A;">${code}</div>
    </div>
    <a href="${ticketUrl}" style="display:block;background:linear-gradient(135deg,#009FE3 0%,#2563EB 100%);color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
      Deschide biletul
    </a>
    <p style="color:#94A3B8;font-size:12px;text-align:center;margin:20px 0 0;">
      Ne vedem la ${venue}. — Interact Sf. Sava
    </p>
  </div>
</div>
</body></html>`;
}
