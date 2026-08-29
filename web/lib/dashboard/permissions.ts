export const PERMISSIONS = [
  "view_member_dashboard",
  "view_own_attendance",
  "display_member_qr",
  "update_own_profile",
  "view_board_dashboard",
  "scan_meeting_attendance",
  "view_attendance_roster",
  "manage_meetings",
  "correct_attendance",
  "scan_event_tickets",
  "confirm_cash_payments",
  "view_recruitment_signups",
  "manage_recruitment_signups",
  "import_recruitment_signups",
  "evaluate_recruitment_forms",
  "evaluate_interview_candidates",
  "view_scan_audit_log",
  "manage_members",
  "manage_permissions",
  "manage_staff_assignments",
  "manage_recruitment_campaigns",
  "manage_public_events",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const MEMBER_BASELINE_PERMISSIONS = [
  "view_member_dashboard",
  "view_own_attendance",
  "display_member_qr",
  "update_own_profile",
] as const satisfies readonly PermissionKey[];

export const BOARD_PERMISSIONS = [
  "view_board_dashboard",
  "scan_meeting_attendance",
  "view_attendance_roster",
  "manage_meetings",
  "correct_attendance",
  "scan_event_tickets",
  "confirm_cash_payments",
  "view_recruitment_signups",
  "manage_recruitment_signups",
  "import_recruitment_signups",
  "evaluate_recruitment_forms",
  "evaluate_interview_candidates",
  "view_scan_audit_log",
  "manage_members",
  "manage_staff_assignments",
  "manage_recruitment_campaigns",
  "manage_public_events",
] as const satisfies readonly PermissionKey[];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export const BOARD_NAV_PERMISSIONS: Partial<Record<PermissionKey, string>> = {
  view_board_dashboard: "/board",
  scan_meeting_attendance: "/board/scaneaza-prezenta",
  scan_event_tickets: "/board/scaneaza-bilete",
  view_attendance_roster: "/board/prezenta",
  view_recruitment_signups: "/board/interviuri?view=raspunsuri",
  evaluate_recruitment_forms: "/board/interviuri",
  evaluate_interview_candidates: "/board/interviuri",
  view_scan_audit_log: "/board/istoric-scanari",
  manage_staff_assignments: "/board/echipa",
  manage_recruitment_campaigns: "/board/formular-inscrieri",
  manage_public_events: "/board/evenimente",
};
