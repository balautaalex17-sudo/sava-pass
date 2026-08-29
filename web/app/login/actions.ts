"use server";

import { z } from "zod";
import { sendAuthEmail } from "@/lib/auth-email";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { resolveSiteUrl } from "@/lib/site-url";
import { logServerError } from "@/lib/server-log";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLocaleLowerCase("ro"));
const genericMessage = "Dacă adresa aparține unui cont SavaPass, vei primi imediat linkul pentru parolă.";

export async function requestPasswordSetup(input: unknown) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Introdu o adresă de email validă." };
  }

  const allowed = await allowPublicAction({
    scope: "password-setup",
    subject: parsed.data,
    ipLimit: 5,
    subjectLimit: 3,
    windowSeconds: 60 * 60,
  });
  if (!allowed) return { ok: true as const, message: genericMessage };

  const callbackUrl = new URL("/auth/password/confirm", resolveSiteUrl());
  const result = await sendAuthEmail({
    kind: "recovery",
    email: parsed.data,
    redirectTo: callbackUrl.toString(),
  });

  if (!result.ok) {
    logServerError("password_setup_email_failed", new Error(result.error ?? "email_failed"));
  }

  // Keep the public response identical whether or not an account exists.
  return {
    ok: true as const,
    message: genericMessage,
  };
}
