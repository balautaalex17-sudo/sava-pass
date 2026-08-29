import "server-only";

import { createHash } from "node:crypto";
import { renderAuthLinkEmail, type AuthEmailKind } from "@/lib/auth-email-template";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface PrepareAuthEmailInput {
  kind: AuthEmailKind;
  email: string;
  redirectTo: string;
  data?: Record<string, unknown>;
}

export type PreparedAuthEmail = {
  kind: AuthEmailKind;
  email: string;
  userId: string;
  actionUrl: string;
};

export type PrepareAuthEmailResult =
  | { ok: true; email: PreparedAuthEmail }
  | { ok: false; error: string };

/** Generate the secret Auth link without asking Supabase to send its own email. */
export async function prepareAuthEmail(input: PrepareAuthEmailInput): Promise<PrepareAuthEmailResult> {
  const email = input.email.trim().toLocaleLowerCase("ro");
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: input.kind,
    email,
    options: {
      redirectTo: input.redirectTo,
      ...(input.data ? { data: input.data } : {}),
    },
  });

  if (error || !data.user || !data.properties) {
    logServerError("auth_email_link_generation_failed", error, { kind: input.kind });
    return { ok: false, error: "Linkul securizat nu a putut fi generat." };
  }

  let actionUrl = data.properties.action_link;
  if (input.kind === "invite") {
    const inviteUrl = new URL(input.redirectTo);
    inviteUrl.searchParams.set("token_hash", data.properties.hashed_token);
    actionUrl = inviteUrl.toString();
  }

  if (!actionUrl) {
    logServerError("auth_email_link_missing", new Error("missing_action_url"), { kind: input.kind });
    return { ok: false, error: "Linkul securizat nu a putut fi generat." };
  }

  return {
    ok: true,
    email: { kind: input.kind, email, userId: data.user.id, actionUrl },
  };
}

/** Send a prepared Auth link through the same verified Resend sender as all other messages. */
export async function sendPreparedAuthEmail(prepared: PreparedAuthEmail): Promise<SendEmailResult> {
  const content = renderAuthLinkEmail({
    kind: prepared.kind,
    email: prepared.email,
    actionUrl: prepared.actionUrl,
  });

  const linkFingerprint = createHash("sha256")
    .update(prepared.actionUrl)
    .digest("hex")
    .slice(0, 32);

  return sendEmail({
    to: prepared.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    idempotencyKey: `auth-${prepared.kind}-${prepared.userId}-${linkFingerprint}`,
  });
}

export async function sendAuthEmail(input: PrepareAuthEmailInput): Promise<SendEmailResult> {
  const prepared = await prepareAuthEmail(input);
  if (!prepared.ok) return prepared;
  return sendPreparedAuthEmail(prepared.email);
}
