import type { Metadata } from "next";
import { MemberQrCard } from "@/components/dashboard/MemberQrCard";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { createMemberQr } from "@/lib/dashboard/member-qr";

export const metadata: Metadata = { title: "Codul meu QR", robots: { index: false, follow: false } };

export default async function MemberQrPage() {
  const viewer = await requirePagePermission("display_member_qr");
  // A generation failure keeps the page usable with the card's retry control.
  const initialQr = await createMemberQr(viewer.profile.member_ref).catch(() => null);
  return (
    <div className="dash-page dash-page--member dash-page--qr"><header className="dash-page-head"><div><span className="dash-eyebrow">Prezență la întâlniri</span><h1>Codul meu QR</h1><p>Ține ecranul drept și luminozitatea la un nivel normal. Un membru board autorizat trebuie să îl scaneze.</p></div></header><MemberQrCard key={viewer.profile.id} fullName={viewer.profile.full_name} membershipStatus={viewer.profile.membership_status} initialQr={initialQr} /></div>
  );
}
