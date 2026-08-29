import "server-only";

import { createHmac, randomInt } from "node:crypto";
import { serverEnv } from "@/lib/env";

export const MEMBER_ACTIVATION_CODE_LENGTH = 12;

export function normalizeMemberActivationCode(value: string) {
  return value.replace(/\D/g, "").slice(0, MEMBER_ACTIVATION_CODE_LENGTH);
}

export function generateMemberActivationCode() {
  return randomInt(0, 10 ** MEMBER_ACTIVATION_CODE_LENGTH)
    .toString()
    .padStart(MEMBER_ACTIVATION_CODE_LENGTH, "0");
}

export function hashMemberActivationCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase("ro");
  const normalizedCode = normalizeMemberActivationCode(code);

  return createHmac("sha256", serverEnv.QR_SIGNING_SECRET)
    .update(`member-activation-v1\0${normalizedEmail}\0${normalizedCode}`)
    .digest("hex");
}
