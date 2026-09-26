import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import { isDepartmentEligible, needsDepartmentSelection } from "@/lib/dashboard/member-departments";
import { MemberDepartmentPrompt } from "@/components/dashboard/MemberDepartmentPrompt";
import "./dashboard.css";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect("/conta/login?next=/membru");
  const isRecruit = viewer.profile.membership_status === "recruit";
  if (isRecruit && viewer.permissions.size === 0) redirect("/conta/recrut");
  if (
    !isRecruit && (viewer.profile.membership_status !== "active" ||
    !viewer.permissions.has("view_member_dashboard"))
  ) {
    redirect("/conta?acces=membru-inactiv");
  }

  return (
    <div className="dashboard-shell sp-light">
      <DashboardNav
        fullName={viewer.profile.full_name}
        role={viewer.profile.role}
        roles={viewer.roles}
        membershipStatus={viewer.profile.membership_status}
        department={isDepartmentEligible(viewer.profile, viewer.roles) ? viewer.profile.member_department : null}
        permissionKeys={viewer.permissionKeys}
      />
      <main className="dashboard-main">{children}</main>
      {needsDepartmentSelection(viewer.profile, viewer.roles) && (
        <MemberDepartmentPrompt profileId={viewer.user.id} />
      )}
    </div>
  );
}
