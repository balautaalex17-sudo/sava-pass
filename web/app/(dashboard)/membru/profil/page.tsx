import type { Metadata } from "next";
import { requirePermission } from "@/lib/dashboard/auth";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profil membru", robots: { index: false, follow: false } };

export default async function MemberProfilePage() {
  const viewer = await requirePermission("update_own_profile");
  return (
    <div className="dash-page dash-page--member"><header className="dash-page-head"><div><span className="dash-eyebrow">Date personale</span><h1>Profil</h1><p>Poți actualiza doar informațiile tale permise. Rolul și statutul de membru sunt administrate de board.</p></div></header><ProfileForm initial={{ fullName: viewer.profile.full_name, email: viewer.profile.email ?? viewer.user.email ?? "", phone: viewer.profile.phone ?? "", grade: viewer.profile.grade ?? "" }} /></div>
  );
}
