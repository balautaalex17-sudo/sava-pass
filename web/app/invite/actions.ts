"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  hashMemberActivationCode,
  MEMBER_ACTIVATION_CODE_LENGTH,
  normalizeMemberActivationCode,
} from "@/lib/member-activation-code";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const activationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLocaleLowerCase("ro")),
  code: z.string().transform(normalizeMemberActivationCode).pipe(
    z.string().regex(new RegExp(`^\\d{${MEMBER_ACTIVATION_CODE_LENGTH}}$`)),
  ),
}).strict();

export async function activateMemberAccount(input: unknown) {
  const parsed = activationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Introdu emailul și codul complet din invitație." };
  }

  const allowed = await allowPublicAction({
    scope: "member-activation",
    subject: parsed.data.email,
    ipLimit: 20,
    subjectLimit: 8,
    windowSeconds: 60 * 60,
  });
  if (!allowed) {
    return {
      ok: false as const,
      message: "Prea multe încercări. Așteaptă o oră sau cere ajutor unui membru Board.",
    };
  }

  const claimId = randomUUID();
  let claimedUserId: string | null = null;

  try {
    const codeHash = hashMemberActivationCode(parsed.data.email, parsed.data.code);
    const { data: userId, error: claimError } = await supabaseAdmin.rpc(
      "claim_member_activation_code",
      {
        p_email: parsed.data.email,
        p_code_hash: codeHash,
        p_claim_id: claimId,
      },
    );
    if (claimError) throw claimError;
    if (!userId) {
      return {
        ok: false as const,
        message: "Emailul și codul nu se potrivesc sau codul a fost deja folosit.",
      };
    }
    claimedUserId = userId;

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: parsed.data.email,
    });
    if (linkError || !link.user || !link.properties?.email_otp) {
      throw linkError ?? new Error("member_activation_session_link_failed");
    }
    if (link.user.id !== claimedUserId) {
      throw new Error("member_activation_user_mismatch");
    }

    const supabase = await createClient();
    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: link.properties.email_otp,
      type: "magiclink",
    });
    if (verifyError || verified.user?.id !== claimedUserId || !verified.session) {
      throw verifyError ?? new Error("member_activation_session_failed");
    }

    const { data: finished, error: finishError } = await supabaseAdmin.rpc(
      "finish_member_activation_code",
      { p_user_id: claimedUserId, p_claim_id: claimId },
    );
    if (finishError || finished !== true) {
      await supabase.auth.signOut();
      throw finishError ?? new Error("member_activation_consumption_failed");
    }

    claimedUserId = null;
    return { ok: true as const };
  } catch (error) {
    if (claimedUserId) {
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_member_activation_code",
        { p_user_id: claimedUserId, p_claim_id: claimId },
      );
      if (releaseError) logServerError("member_activation_release_failed", releaseError);
    }
    logServerError("member_activation_failed", error);
    return {
      ok: false as const,
      message: "Activarea nu a putut fi finalizată. Reîncearcă; același cod rămâne valabil.",
    };
  }
}
