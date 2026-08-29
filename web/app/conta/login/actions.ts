"use server";

import { z } from "zod";

import { sendAuthEmail } from "@/lib/auth-email";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { safeLocalPath } from "@/lib/safe-local-path";
import { logServerError } from "@/lib/server-log";
import { resolveSiteUrl } from "@/lib/site-url";

const requestSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLocaleLowerCase("ro")),
  next: z.string().max(500).optional(),
}).strict();

export async function requestAccountMagicLink(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Introdu o adresă de email validă." };
  }

  const allowed = await allowPublicAction({
    scope: "account-magic-link",
    subject: parsed.data.email,
    ipLimit: 8,
    subjectLimit: 3,
    windowSeconds: 15 * 60,
  });
  if (!allowed) {
    return { ok: false as const, message: "Ai cerut prea multe linkuri. Așteaptă câteva minute." };
  }

  const callback = new URL("/conta/confirm", resolveSiteUrl());
  callback.searchParams.set("next", safeLocalPath(parsed.data.next, "/conta"));
  const result = await sendAuthEmail({
    kind: "magiclink",
    email: parsed.data.email,
    redirectTo: callback.toString(),
  });

  if (!result.ok) {
    logServerError("account_magic_link_email_failed", new Error(result.error ?? "email_failed"));
    return { ok: false as const, message: "Nu am putut trimite linkul. Încearcă din nou în câteva minute." };
  }

  return { ok: true as const };
}
