import type { PrimaryRole } from "./role-hierarchy";

/** Interview invitations cannot be delegated through Board permissions. */
export function canSendToInterview(role: PrimaryRole): boolean {
  return role === "admin";
}

export function canSetRecruitmentStatus(
  role: PrimaryRole,
  previousStatus: string,
  nextStatus: string,
): boolean {
  if (previousStatus === nextStatus || canSendToInterview(role)) return true;
  if (["selected_for_interview", "interview_scheduled"].includes(nextStatus)) return false;
  // Board can finish an existing interview, but cannot skip selection to enter it.
  if (nextStatus === "interview_completed") {
    return ["selected_for_interview", "interview_scheduled"].includes(previousStatus);
  }
  return true;
}
