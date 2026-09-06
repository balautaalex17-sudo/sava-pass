import "server-only";
import { ensureInvitedAuthUser, prepareMemberInvitation, sendMemberInvitation } from "@/lib/dashboard/member-auth";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function acceptRecruitAccount(
  application: { id: string; email: string; full_name: string; status: string },
  actorId: string,
  reviewerId: string | null,
) {
  const ensured = await ensureInvitedAuthUser({ email: application.email, fullName: application.full_name, deferActivation: true });
  let accepted = false;
  try {
    const { data: accountStatus, error } = await supabaseAdmin.rpc("accept_recruit_application", {
      p_application_id: application.id,
      p_user_id: ensured.user.id,
      p_expected_status: application.status,
      p_actor_id: actorId,
      p_reviewer_id: reviewerId ?? actorId,
    });
    if (error) throw error;
    if (!accountStatus) return { changed: false, invitationSent: false, emailFailed: false };
    accepted = true;

    // Delivery happens only after the profile and acceptance have been committed.
    // An email failure leaves a usable account and Board can resend its code.
    if (ensured.user.confirmed_at) return { changed: true, invitationSent: false, emailFailed: false };
    try {
      const invitation = await prepareMemberInvitation(ensured.user.id, application.email, application.full_name);
      const { data: profile, error: profileError } = await supabaseAdmin.from("profiles")
        .select("role, membership_status").eq("id", ensured.user.id).single();
      if (profileError) throw profileError;
      const delivery = await sendMemberInvitation(invitation, profile.role, profile.membership_status);
      return { changed: true, invitationSent: delivery.ok, emailFailed: !delivery.ok };
    } catch (error) {
      logServerError("recruit_invitation_delivery_failed", error);
      return { changed: true, invitationSent: false, emailFailed: true };
    }
  } finally {
    if (ensured.authUserCreated && !accepted) {
      // A timeout may hide a successful commit. Never delete an account that
      // now owns a profile, including one saved by another Board request.
      const { data: profile, error } = await supabaseAdmin.from("profiles")
        .select("id").eq("id", ensured.user.id).maybeSingle();
      if (!error && !profile) {
        const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(ensured.user.id);
        if (cleanupError) logServerError("recruit_auth_cleanup_failed", cleanupError);
      }
    }
  }
}
