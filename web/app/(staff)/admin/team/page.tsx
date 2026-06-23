import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole, type StaffRole } from "@/lib/roles";
import { TeamClient } from "./TeamClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Echipa - SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role")
    .order("created_at", { ascending: true });

  const members = await Promise.all((profiles ?? []).map(async (profile) => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    return {
      id: profile.id,
      email: profile.email ?? data.user?.email ?? "email necunoscut",
      full_name: profile.full_name,
      role: profile.role as StaffRole,
      pending: !!data.user?.invited_at && !data.user?.last_sign_in_at,
    };
  }));

  return (
    <>
      <StaffHeader
        left={
          <Link href="/admin" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--slate-600)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Admin
          </Link>
        }
      />

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--brand-navy)", margin: "0 0 4px" }}>
            Acces staff
          </h1>
          <p style={{ fontSize: 13, color: "var(--slate-500)", margin: 0 }}>
            Adminii pot invita, schimba roluri și scoate membri din staff fără să șteargă conturile lor de cumpărător.
          </p>
        </div>

        <TeamClient members={members} />
      </main>
    </>
  );
}
