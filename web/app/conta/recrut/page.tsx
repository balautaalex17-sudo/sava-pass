import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import { RecruitHome } from "./RecruitHome";
import { getDashboardEntry } from "@/lib/dashboard/permissions";

export const metadata: Metadata = {
  title: "Cont de recrut | SavaPass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RecruitPage() {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect("/conta/login?next=/conta/recrut");
  if (viewer.profile.membership_status !== "recruit") {
    redirect(viewer.profile.membership_status === "active" ? "/membru" : "/conta");
  }
  return <RecruitHome fullName={viewer.profile.full_name} email={viewer.profile.email ?? ""} dashboardHref={getDashboardEntry(viewer.permissions)} />;
}
