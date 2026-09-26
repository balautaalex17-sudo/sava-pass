export const MEMBER_DEPARTMENTS = ["hr", "pr"] as const;
export const MEMBER_DEPARTMENT_THRESHOLD = 75;
export type MemberDepartment = (typeof MEMBER_DEPARTMENTS)[number];

export function isMemberDepartment(value: unknown): value is MemberDepartment {
  return value === "hr" || value === "pr";
}

export function isDepartmentEligible(
  profile: { membership_status: string; role: string | null },
  roles: readonly string[] = [],
) {
  return profile.membership_status === "active"
    && profile.role !== "board" && profile.role !== "admin"
    && !roles.includes("board") && !roles.includes("admin");
}

export function needsDepartmentSelection(
  profile: { membership_status: string; role: string | null; member_department: string | null },
  roles: readonly string[] = [],
) {
  return isDepartmentEligible(profile, roles) && !isMemberDepartment(profile.member_department);
}

export interface DepartmentOptions {
  hr: number;
  pr: number;
  blockedDepartment: MemberDepartment | null;
}

export function parseDepartmentOptions(value: unknown): DepartmentOptions | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.hr !== "number" || typeof row.pr !== "number"
    || !Number.isSafeInteger(row.hr) || !Number.isSafeInteger(row.pr)
    || row.hr < 0 || row.pr < 0
    || (row.blockedDepartment !== null && !isMemberDepartment(row.blockedDepartment))) return null;
  return { hr: row.hr, pr: row.pr, blockedDepartment: row.blockedDepartment };
}

export function departmentBlockedMessage(department: MemberDepartment) {
  return `${department.toUpperCase()} este momentan indisponibil: peste ${MEMBER_DEPARTMENT_THRESHOLD}% dintre toți membrii activi sunt deja în ${department.toUpperCase()}. Calculul include și membrii fără departament, dar exclude Board și Super Admin. Alege ${department === "hr" ? "PR" : "HR"} pentru a păstra echilibrul echipelor.`;
}
