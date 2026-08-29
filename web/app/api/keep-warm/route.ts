import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Keep-warm endpoint (perf U4). A scheduled GET runs one trivial indexed query so
// the free-tier Supabase project never reaches the inactivity threshold that
// causes the ~5s cold-hang. Exposes no data. Always hits the DB (never cached).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization === "unconfigured") {
    return NextResponse.json({ ok: false, error: "Cron is not configured." }, { status: 503 });
  }
  if (authorization === "unauthorized") return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { error: maintenanceError } = await supabaseAdmin.rpc("run_security_maintenance");
    if (maintenanceError) throw maintenanceError;
    const { error } = await supabaseAdmin.from("events").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("keep_warm_failed", error);
    // DB unreachable/paused — report the miss so the cron log shows it.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
