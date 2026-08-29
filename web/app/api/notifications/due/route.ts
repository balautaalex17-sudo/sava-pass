import { NextRequest, NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";
import { deliverDueNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

/** Protected endpoint for a cron service. It sends only messages whose time is due. */
export async function GET(request: NextRequest) {
  const authorization = authorizeCronRequest(request);
  if (authorization === "unconfigured") {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (authorization === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await deliverDueNotifications(50);
  return NextResponse.json({ processed: results.length, results });
}

export const POST = GET;
