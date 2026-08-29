import "server-only";

import type { User } from "@supabase/supabase-js";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import {
  generateMemberActivationCode,
  hashMemberActivationCode,
} from "@/lib/member-activation-code";
import { renderMemberInvitationEmail } from "@/lib/member-invitation-email";
import type { StaffRole } from "@/lib/roles";
import { resolveSiteUrl } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface EnsureInvitedAuthUserInput {
  email: string;
  fullName: string;
}

export interface EnsuredAuthUser {
  user: User;
  authUserCreated: boolean;
  invitation: MemberInvitation | null;
}

export interface MemberInvitation {
  email: string;
  fullName: string;
  code: string;
}

async function findAuthUser(email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLocaleLowerCase("ro") === email,
    );
    if (match) return match;
    if (data.users.length < 1000) break;
  }

  return null;
}

/**
 * Reuses an existing Auth account or creates a new invited account, then stores
 * an app-owned activation code with no time expiry. Confirmed accounts do not
 * receive a new activation credential because they can already sign in.
 */
export async function ensureInvitedAuthUser({
  email,
  fullName,
}: EnsureInvitedAuthUserInput): Promise<EnsuredAuthUser> {
  const normalizedEmail = email.trim().toLocaleLowerCase("ro");
  const existing = await findAuthUser(normalizedEmail);
  if (existing?.confirmed_at) {
    return { user: existing, authUserCreated: false, invitation: null };
  }

  let user = existing;
  let authUserCreated = false;

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: normalizedEmail,
        options: {
          data: { name: fullName },
        },
      });

    if (error || !data.user) {
      throw error ?? new Error("invite_user_generation_failed");
    }
    user = data.user;
    authUserCreated = true;
  }

  const code = generateMemberActivationCode();
  const { data: issued, error: issueError } = await supabaseAdmin.rpc(
    "issue_member_activation_code",
    {
      p_user_id: user.id,
      p_email: normalizedEmail,
      p_code_hash: hashMemberActivationCode(normalizedEmail, code),
    },
  );

  if (issueError || issued !== true) {
    if (authUserCreated) await supabaseAdmin.auth.admin.deleteUser(user.id);
    throw issueError ?? new Error("member_activation_code_generation_failed");
  }

  return {
    user,
    authUserCreated,
    invitation: {
      email: normalizedEmail,
      fullName,
      code,
    },
  };
}

/** Sends the prepared code only after the matching profile is ready. */
export async function sendMemberInvitation(
  invitation: MemberInvitation,
  role: StaffRole | null,
): Promise<SendEmailResult> {
  const activationUrl = new URL("/invite", resolveSiteUrl());
  activationUrl.searchParams.set("email", invitation.email);
  const content = renderMemberInvitationEmail({
    fullName: invitation.fullName,
    email: invitation.email,
    code: invitation.code,
    activationUrl: activationUrl.toString(),
    role,
  });

  return sendEmail({
    to: invitation.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
