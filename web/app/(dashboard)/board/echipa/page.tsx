import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StaffAssignments } from "./StaffAssignments";

export const metadata: Metadata = {
  title: "Roluri și Board",
  robots: { index: false, follow: false },
};

export default async function OperationalTeamPage() {
  const viewer = await requirePagePermission("manage_staff_assignments");

  const [profilesResult, rolesResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, grade, membership_status, role")
      .eq("membership_status", "active")
      .order("full_name"),
    supabaseAdmin.from("profile_roles").select("profile_id, role"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;

  const roleMap = new Map<string, Array<"scanner" | "interviewer">>();
  for (const assignment of rolesResult.data ?? []) {
    if (assignment.role !== "scanner" && assignment.role !== "interviewer") continue;
    const assigned = roleMap.get(assignment.profile_id) ?? [];
    assigned.push(assignment.role);
    roleMap.set(assignment.profile_id, assigned);
  }

  const members = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    grade: profile.grade,
    primaryRole: profile.role,
    operationalRoles: roleMap.get(profile.id) ?? [],
  }));

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Echipă operațională</span>
          <h1>Cine face ce</h1>
          <p>
            Bifează „Membru Board” pentru acces administrativ complet. Rolurile
            Scanner bilete și Intervievator se pot combina pentru membrii care nu
            fac parte din Board.
          </p>
        </div>
      </header>
      <StaffAssignments
        members={members}
        viewerId={viewer.profile.id}
        viewerRole={viewer.profile.role}
      />
    </div>
  );
}
