import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import { listApplications } from "@/lib/membership";
import type { MembershipApplication } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aplicații — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "brand" | "success" | "used" | "warning" | "danger"> = {
  new: "brand",
  reviewing: "warning",
  interview: "warning",
  accepted: "success",
  declined: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nouă",
  reviewing: "În analiză",
  interview: "Interviu",
  accepted: "Acceptat",
  declined: "Respins",
};

export default async function ApplicationsPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const applications = await listApplications();

  return (
    <>
      <StaffHeader
        left={
          <Link href="/admin" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--im-fg-2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Admin
          </Link>
        }
      />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--im-fg)", margin: "0 0 4px" }}>Aplicații membri</h1>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0 }}>
            {applications.length} aplicați{applications.length === 1 ? "e" : "i"} de la „Devino membru”.
          </p>
        </div>

        {applications.length === 0 ? (
          <div style={{ position: "relative", minHeight: 220, background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, display: "grid", placeItems: "center", overflow: "hidden" }}>
            <GearWatermark />
            <p style={{ position: "relative", color: "var(--im-fg-2)", fontSize: 14, margin: 0 }}>Nicio aplicație încă.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {applications.map((app, i) => (
              <ApplicationCard key={app.id} app={app} i={i} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ApplicationCard({ app, i }: { app: MembershipApplication; i: number }) {
  return (
    <article
      className="anim-rise-fast"
      style={{
        "--i": Math.min(i, 6),
        background: "var(--im-ink-2)",
        border: "1px solid var(--im-line)",
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: "var(--im-shadow)",
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--im-fg)" }}>{app.full_name}</div>
          <div style={{ fontSize: 13, color: "var(--im-fg-2)", marginTop: 2 }}>
            {app.email} · {app.phone}{app.grade ? ` · ${app.grade}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Chip size="sm" tone={STATUS_TONE[app.status] ?? "used"} dot>{STATUS_LABEL[app.status] ?? app.status}</Chip>
        </div>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--im-fg-2)" }}>
        {app.motivation}
      </p>

      {(app.strength || app.availability) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 12 }}>
          {app.strength && <Detail label="Aduce" value={app.strength} />}
          {app.availability && <Detail label="Disponibilitate" value={app.availability} />}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--im-fg-3)", fontVariantNumeric: "tabular-nums" }}>
        {new Date(app.created_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--im-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--im-fg)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
