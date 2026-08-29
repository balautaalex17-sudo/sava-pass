import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { StaffTestRole } from "@/lib/staff-test-roles";

type HeaderReader = {
  get(name: string): string | null;
};

type TestCredential = {
  email: string;
  password: string;
};

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function secureTextEqual(received: string, expected: string | undefined) {
  if (!expected || !received) return false;
  return timingSafeEqual(digest(received), digest(expected));
}

export function isLoopbackHost(rawHost: string | null) {
  if (!rawHost) return false;

  try {
    const hostname = new URL(`http://${rawHost.trim()}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function isStaffTestHostAllowed(rawHost: string | null) {
  if (process.env.NODE_ENV === "development") return isLoopbackHost(rawHost);
  if (process.env.VERCEL_ENV !== "preview" || !rawHost || !process.env.VERCEL_URL) return false;

  try {
    const hostname = new URL(`https://${rawHost.trim()}`).hostname.toLowerCase();
    const deploymentHostname = new URL(`https://${process.env.VERCEL_URL.trim()}`).hostname.toLowerCase();
    return hostname === deploymentHostname;
  } catch {
    return false;
  }
}

export function isStaffTestAccessAllowed(
  requestHeaders: HeaderReader,
  accessKey: string,
) {
  return (
    process.env.VERCEL_ENV !== "production" &&
    process.env.STAFF_TEST_LOGIN_ENABLED === "true" &&
    isStaffTestHostAllowed(requestHeaders.get("host")) &&
    secureTextEqual(accessKey, process.env.STAFF_TEST_LOGIN_ROUTE_KEY)
  );
}

export function isStaffTestCodeValid(code: string) {
  return secureTextEqual(code, process.env.STAFF_TEST_LOGIN_CODE);
}

export function getStaffTestCredential(role: StaffTestRole): TestCredential | null {
  const credentials: Record<StaffTestRole, [string | undefined, string | undefined]> = {
    admin: [process.env.STAFF_TEST_ADMIN_EMAIL, process.env.STAFF_TEST_ADMIN_PASSWORD],
    board: [process.env.STAFF_TEST_BOARD_EMAIL, process.env.STAFF_TEST_BOARD_PASSWORD],
    scanner: [process.env.STAFF_TEST_SCANNER_EMAIL, process.env.STAFF_TEST_SCANNER_PASSWORD],
    interviewer: [
      process.env.STAFF_TEST_INTERVIEWER_EMAIL,
      process.env.STAFF_TEST_INTERVIEWER_PASSWORD,
    ],
  };
  const [email, password] = credentials[role];
  return email && password ? { email, password } : null;
}
