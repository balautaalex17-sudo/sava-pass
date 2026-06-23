import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ status: "unknown" }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status, buyer_email")
    .eq("stripe_session_id", sessionId)
    .single();

  if (!order) return NextResponse.json({ status: "pending" });
  if (order.status !== "paid") return NextResponse.json({ status: order.status });

  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("qr_token")
    .eq("order_id", order.id)
    .eq("status", "valid")
    .single();

  return NextResponse.json({
    status: "paid",
    ticket_token: ticket?.qr_token ?? null,
    email: order.buyer_email,
  });
}
