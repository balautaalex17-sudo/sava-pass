import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Keep-warm endpoint (perf U4). A scheduled GET runs one trivial indexed query so
// the free-tier Supabase project never reaches the inactivity threshold that
// causes the ~5s cold-hang. Exposes no data. Always hits the DB (never cached).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional lock-down: if CRON_SECRET is set, require Vercel Cron's bearer header.
  // Left open by default so it works without extra setup (it leaks nothing).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const { error } = await supabaseAdmin.from("events").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch {
    // DB unreachable/paused — report the miss so the cron log shows it.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
