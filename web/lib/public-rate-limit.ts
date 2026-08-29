import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

import { serverEnv } from "@/lib/env";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface PublicRateLimitOptions {
  scope: string;
  subject?: string;
  ipLimit: number;
  subjectLimit?: number;
  windowSeconds: number;
}

function fingerprint(scope: string, kind: "ip" | "subject", value: string) {
  return createHmac("sha256", serverEnv.QR_SIGNING_SECRET)
    .update(`public-rate-limit-v1\0${scope}\0${kind}\0${value}`)
    .digest("hex");
}

function requestIp(headerStore: { get(name: string): string | null }) {
  // Vercel overwrites this header at the edge. Generic X-Forwarded-For is not
  // trusted because a direct client can spoof it on other deployments.
  const raw = headerStore.get("x-vercel-forwarded-for") ?? "";
  const candidate = raw.split(",", 1)[0]?.trim() ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

async function consume(scope: string, kind: "ip" | "subject", value: string, limit: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin.rpc("consume_public_rate_limit", {
    p_key_hash: fingerprint(scope, kind, value),
    p_scope: `${scope}:${kind}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    logServerError("public_rate_limit_failed", error, { scope, kind });
    return false;
  }
  return data === true;
}

/** PostgreSQL-backed limiter. Any database/configuration error fails closed. */
export async function allowPublicAction(options: PublicRateLimitOptions) {
  const headerStore = await headers();
  const checks = [
    consume(options.scope, "ip", requestIp(headerStore), options.ipLimit, options.windowSeconds),
  ];

  if (options.subject && options.subjectLimit) {
    checks.push(consume(
      options.scope,
      "subject",
      options.subject.trim().toLocaleLowerCase("ro"),
      options.subjectLimit,
      options.windowSeconds,
    ));
  }

  return (await Promise.all(checks)).every(Boolean);
}
