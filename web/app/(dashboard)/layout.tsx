import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import "./dashboard.css";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect("/conta/login?next=/membru");
  if (
    viewer.profile.membership_status !== "active" ||
    !viewer.permissions.has("view_member_dashboard")
  ) {
    redirect("/conta?acces=membru-inactiv");
  }

  return (
    <div className="dashboard-shell sp-light">
      <DashboardNav
        fullName={viewer.profile.full_name}
        role={viewer.profile.role}
        roles={viewer.roles}
        permissionKeys={viewer.permissionKeys}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
