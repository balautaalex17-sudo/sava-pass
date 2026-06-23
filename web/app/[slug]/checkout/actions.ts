"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEventBySlug, getEventStats } from "@/lib/events";

const schema = z.object({
  slug: z.string(),
  name: z.string().min(2, "Introdu numele complet"),
  email: z.string().email("Email invalid"),
  gdpr: z.literal("on", { error: "Trebuie să fii de acord" }),
});

export interface CheckoutState {
  errors?: { name?: string; email?: string; gdpr?: string; general?: string };
}

export async function createCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = {
    slug: form.get("slug"),
    name: form.get("name"),
    email: form.get("email"),
    gdpr: form.get("gdpr"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        name: flat.name?.[0],
        email: flat.email?.[0],
        gdpr: flat.gdpr?.[0],
      },
    };
  }

  const { slug, name, email } = parsed.data;

  const event = await getEventBySlug(slug);
  if (!event || event.status !== "active") {
    return { errors: { general: "Evenimentul nu mai este activ." } };
  }

  const stats = await getEventStats(event.id);
  const sold = stats?.sold ?? 0;
  if (sold >= event.capacity) {
    return { errors: { general: "Ne pare rău, biletele s-au terminat." } };
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      event_id: event.id,
      buyer_name: name,
      buyer_email: email.toLowerCase(),
      quantity: 1,
      amount_bani: event.price_bani,
      currency: "ron",
      status: "pending",
    })
    .select()
    .single();

  if (orderErr || !order) {
    return { errors: { general: "Eroare internă. Încearcă din nou." } };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "ron",
      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: event.price_bani,
            product_data: {
              name: event.title,
              description: event.subtitle ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email.toLowerCase(),
      success_url: `${siteUrl}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${slug}/checkout`,
      metadata: { order_id: order.id },
    });
  } catch (err) {
    console.error("Stripe checkout session failed:", err);
    await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { errors: { general: "Plata nu a putut fi inițiată. Încearcă din nou." } };
  }

  await supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  redirect(session.url!);
}
