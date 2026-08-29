import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import { listApplications } from "@/lib/membership";
import type { MembershipApplication } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aplicații — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type ColumnId = "submitted" | "under_review" | "interview" | "decision";

const COLUMNS: { id: ColumnId; label: string; desc: string; tone: string }[] = [
  { id: "submitted", label: "Aplicații noi", desc: "De citit", tone: "#00A7E8" },
  { id: "under_review", label: "În evaluare", desc: "Citire în curs", tone: "#F59E0B" },
  { id: "interview", label: "Interviu", desc: "Invitați / programați", tone: "#A78BFA" },
  { id: "decision", label: "Decizie", desc: "Acceptat / respins", tone: "#16A34A" },
];

export default async function ApplicationsPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const applications = await listApplications();

  const inColumn = (id: ColumnId) => {
    if (id === "decision") return applications.filter((a) => ["accepted", "waiting_list", "rejected"].includes(a.status));
    if (id === "interview") return applications.filter((a) => ["selected_for_interview", "interview_scheduled", "interview_completed"].includes(a.status));
    return applications.filter((a) => a.status === id);
  };

  const total = applications.length;
  const accepted = applications.filter((a) => a.status === "accepted").length;
  const inProgress = applications.filter((a) => !["accepted", "waiting_list", "rejected"].includes(a.status)).length;
  const rate = total ? Math.round((accepted / total) * 100) : 0;

  return (
    <>
      <PipelineStyles />
      <StaffHeader
        left={
          <Link href="/admin" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--im-fg-2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Admin
          </Link>
        }
      />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--im-cyan-light)" }}>
            Recrutare membri
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--im-fg)", margin: "6px 0 4px", letterSpacing: "-0.02em" }}>
            Pipeline aplicații
          </h1>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0 }}>
            {total} aplicați{total === 1 ? "e" : "i"} de la „Devino membru” · termen 30 nov
          </p>
        </div>

        {/* Stat strip */}
        <div className="pipe-stats">
          <PipeStat label="Aplicații totale" value={total} icon={<Users size={18} strokeWidth={1.75} />} tone="#00A7E8" />
          <PipeStat label="În proces" value={inProgress} icon={<Clock size={18} strokeWidth={1.75} />} tone="#F59E0B" />
          <PipeStat label="Acceptați" value={accepted} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} tone="#16A34A" />
          <PipeStat label="Rată conversie" value={`${rate}%`} icon={<TrendingUp size={18} strokeWidth={1.75} />} tone="#A78BFA" />
        </div>

        {applications.length === 0 ? (
          <div style={{ position: "relative", minHeight: 220, background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, display: "grid", placeItems: "center", overflow: "hidden" }}>
            <GearWatermark />
            <p style={{ position: "relative", color: "var(--im-fg-2)", fontSize: 14, margin: 0 }}>Nicio aplicație încă.</p>
          </div>
        ) : (
          <div className="pipe-board">
            {COLUMNS.map((col) => {
              const items = inColumn(col.id);
              return (
                <section key={col.id} className="pipe-col">
                  <header className="pipe-col__head">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.tone }} />
                        <strong style={{ fontSize: 13, fontWeight: 800, color: "var(--im-fg)" }}>{col.label}</strong>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--im-fg-3)", marginTop: 3 }}>{col.desc}</div>
                    </div>
                    <span className="pipe-col__count">{items.length}</span>
                  </header>
                  <div className="pipe-col__body">
                    {items.map((app) => <ApplicantCard key={app.id} app={app} columnId={col.id} />)}
                    {items.length === 0 && <div className="pipe-empty">Niciun aplicant</div>}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function ApplicantCard({ app, columnId }: { app: MembershipApplication; columnId: ColumnId }) {
  const initials = app.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const accepted = app.status === "accepted";
  const isDecision = columnId === "decision";
  return (
    <Link href={`/admin/aplicatii/${app.id}`} className="pipe-card" style={{ textDecoration: "none", display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="pipe-card__avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--im-fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.full_name}</div>
          <div style={{ fontSize: 11, color: "var(--im-fg-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.grade ?? app.email}</div>
        </div>
        {isDecision && (
          <span className="pipe-card__decision" style={{ background: accepted ? "rgba(22,163,74,0.16)" : "rgba(220,38,38,0.16)", color: accepted ? "#86efac" : "#fca5a5" }}>
            {accepted ? "✓" : "✕"}
          </span>
        )}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--im-fg-2)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {app.motivation}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
        {app.strength && <span className="pipe-tag pipe-tag--brand">{app.strength}</span>}
        {app.availability && <span className="pipe-tag">{app.availability}</span>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 10, color: "var(--im-fg-3)" }}>
        <span>{app.email}</span>
        <span>{new Date(app.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}</span>
      </div>
    </Link>
  );
}

function PipeStat({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="pipe-stat">
      <span className="pipe-stat__icon" style={{ background: `${tone}22`, color: tone }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--im-fg-3)", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--im-fg)", letterSpacing: "-0.02em", marginTop: 2, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function PipelineStyles() {
  return (
    <style>{`
      .pipe-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
      .pipe-stat { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--im-ink-2); border: 1px solid var(--im-line); border-radius: 14px; }
      .pipe-stat__icon { width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; display: grid; place-items: center; }

      .pipe-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-items: start; }
      .pipe-col { background: var(--im-ink-2); border: 1px solid var(--im-line); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
      .pipe-col__head { display: flex; align-items: center; justify-content: space-between; padding: 14px; border-bottom: 1px solid var(--im-line-soft); }
      .pipe-col__count { font-size: 11px; font-weight: 700; color: var(--im-fg-2); background: var(--im-ink-3); padding: 3px 9px; border-radius: 999px; }
      .pipe-col__body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
      .pipe-empty { padding: 22px 12px; text-align: center; font-size: 11.5px; color: var(--im-fg-3); border: 1px dashed var(--im-line); border-radius: 10px; }

      .pipe-card { padding: 12px; border-radius: 12px; background: var(--im-ink-3); border: 1px solid var(--im-line-soft); }
      .pipe-card__avatar { width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: var(--im-grad); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 800; }
      .pipe-card__decision { width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 800; }
      .pipe-tag { font-size: 10px; font-weight: 600; color: var(--im-fg-2); padding: 2px 8px; border-radius: 999px; background: var(--im-ink-2); border: 1px solid var(--im-line-soft); }
      .pipe-tag--brand { color: var(--im-cyan-light); background: rgba(0,167,232,0.10); border-color: var(--im-line); }

      @media (max-width: 1000px) {
        .pipe-stats { grid-template-columns: 1fr 1fr; }
        .pipe-board { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 8px; scroll-snap-type: x mandatory; }
        .pipe-col { flex: 0 0 78%; max-width: 320px; scroll-snap-align: start; }
      }
      @media (max-width: 520px) {
        .pipe-col { flex-basis: 86%; }
      }
    `}</style>
  );
}
