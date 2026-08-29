import "server-only";

import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";

export type CronAuthorization = "ok" | "unconfigured" | "unauthorized";

/** Constant-time comparison prevents tiny timing differences from leaking a secret. */
export function authorizeCronRequest(request: Request): CronAuthorization {
  const expected = serverEnv.CRON_SECRET;
  if (!expected) return "unconfigured";

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!supplied) return "unauthorized";

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length) return "unauthorized";

  return timingSafeEqual(expectedBytes, suppliedBytes) ? "ok" : "unauthorized";
}
