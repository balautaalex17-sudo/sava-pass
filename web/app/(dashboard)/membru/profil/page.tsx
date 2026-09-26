import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { ProfileForm } from "./ProfileForm";
import { isDepartmentEligible, isMemberDepartment } from "@/lib/dashboard/member-departments";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MemberDepartmentRequest } from "@/components/dashboard/MemberDepartmentRequest";

export const metadata: Metadata = { title: "Profil membru", robots: { index: false, follow: false } };

export default async function MemberProfilePage() {
  const viewer = await requirePagePermission("update_own_profile");
  const department = isDepartmentEligible(viewer.profile, viewer.roles) && isMemberDepartment(viewer.profile.member_department)
    ? viewer.profile.member_department : null;
  const { data: request, error } = department
    ? await supabaseAdmin.from("member_department_requests").select("*").eq("member_id", viewer.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  if (error) throw error;
  return (
    <div className="dash-page dash-page--member">
      <header className="dash-page-head"><div><span className="dash-eyebrow">Date personale</span><h1>Profil</h1><p>Poți actualiza doar informațiile tale permise. Rolul și statutul de membru sunt administrate de board.</p></div></header>
      {department && <MemberDepartmentRequest key={`${department}:${request?.id}:${request?.status}`} department={department} request={request} />}
      <ProfileForm initial={{ fullName: viewer.profile.full_name, email: viewer.profile.email ?? viewer.user.email ?? "", phone: viewer.profile.phone ?? "", grade: viewer.profile.grade ?? "" }} />
    </div>
  );
}
