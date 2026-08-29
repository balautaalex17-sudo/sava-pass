import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardPenLine, Mail, Phone, School } from "lucide-react";

import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MembershipApplication } from "@/lib/supabase/types";
import { RECRUITMENT_QUESTIONS } from "@/lib/recruitment-spec";
import { ApplicationReviewForm } from "./ApplicationReviewForm";

export const metadata: Metadata = { title: "Evaluare candidat — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type RecruitmentAnswerKey = (typeof RECRUITMENT_QUESTIONS)[number]["key"];

function parseRecruitmentAnswers(value: MembershipApplication["answers"]) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {} as Partial<Record<RecruitmentAnswerKey, string>>;
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    RECRUITMENT_QUESTIONS.flatMap(({ key }) =>
      typeof record[key] === "string" && record[key].trim()
        ? [[key, record[key].trim()]]
        : [],
    ),
  ) as Partial<Record<RecruitmentAnswerKey, string>>;
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");
  const { id } = await params;

  const [{ data: application }, { data: history }, { data: interview }] = await Promise.all([
    supabaseAdmin.from("membership_applications").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("application_status_events").select("id, to_status, note, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("interviews").select("id").eq("application_id", id).neq("status", "cancelled").maybeSingle(),
  ]);
  if (!application) notFound();
  const answers = parseRecruitmentAnswers(application.answers);
  const hasStructuredAnswers = Object.keys(answers).length > 0;

  return (
    <>
      <ApplicationDetailStyles />
      <StaffHeader left={<Link href="/admin/aplicatii" className="staff-back"><ArrowLeft size={16} /> Aplicații</Link>} />
      <main className="review-shell">
        <header className="review-head">
          <div><span>Candidat</span><h1>{application.full_name}</h1><p>Aplicat {new Date(application.created_at).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" })}</p></div>
          {interview && <Link href={`/board/interviuri?view=interviuri&application=${application.id}`} className="review-interview-link pressable"><ClipboardPenLine size={16} /> Deschide fișa de interviu</Link>}
        </header>

        <div className="review-grid">
          <div className="review-main">
            <section className="review-card review-contact">
              <div><Mail size={16} /><span><small>Email</small><a href={`mailto:${application.email}`}>{application.email}</a></span></div>
              <div><Phone size={16} /><span><small>Telefon</small><a href={`tel:${application.phone}`}>{application.phone}</a></span></div>
              <div><School size={16} /><span><small>Clasa & liceul</small><strong>{application.grade || "Nespecificat"}</strong></span></div>
            </section>
            {hasStructuredAnswers ? (
              <section className="review-card">
                <span className="review-label">Răspunsuri din formular</span>
                <div className="review-answers">
                  {RECRUITMENT_QUESTIONS.map(({ key, label }) =>
                    answers[key] ? (
                      <article key={key}>
                        <h2>{label}</h2>
                        <p>{answers[key]}</p>
                      </article>
                    ) : null,
                  )}
                </div>
              </section>
            ) : (
              <>
                <section className="review-card"><span className="review-label">Motivație</span><p className="review-quote">„{application.motivation}”</p></section>
                <section className="review-card review-two"><div><span className="review-label">Direcții</span><p>{application.strength || "—"}</p></div><div><span className="review-label">Disponibilitate</span><p>{application.availability || "—"}</p></div></section>
              </>
            )}
            <section className="review-card"><span className="review-label">Istoric</span><ol className="review-history">{(history ?? []).map((item) => <li key={item.id}><span /><div><strong>{item.to_status.replaceAll("_", " ")}</strong>{item.note && <p>{item.note}</p>}<small>{new Date(item.created_at).toLocaleString("ro-RO")}</small></div></li>)}</ol></section>
          </div>
          <aside className="review-card review-aside"><h2>Evaluare internă</h2><ApplicationReviewForm application={application as MembershipApplication} /></aside>
        </div>
      </main>
    </>
  );
}

function ApplicationDetailStyles() {
  return <style>{`
    .staff-back{display:inline-flex;align-items:center;gap:7px;color:var(--im-fg-2);text-decoration:none;font-size:13px;font-weight:700}.review-shell{max-width:1120px;margin:0 auto;padding:28px 20px 64px}.review-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.review-head>div>span,.review-label{font:700 10px/1 var(--font-mono);text-transform:uppercase;letter-spacing:.13em;color:var(--im-cyan-light)}.review-head h1{color:var(--im-fg);font-size:30px;margin:7px 0 3px;letter-spacing:-.03em}.review-head p{color:var(--im-fg-3);font-size:12px;margin:0}.review-interview-link{display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:10px;background:var(--im-cyan);color:#fff;text-decoration:none;font-size:13px;font-weight:800}.review-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}.review-main{display:grid;gap:16px}.review-card{background:var(--im-ink-2);border:1px solid var(--im-line);border-radius:18px;padding:18px;color:var(--im-fg)}.review-contact{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.review-contact>div{display:flex;align-items:center;gap:10px;color:var(--im-cyan-light)}.review-contact span{display:grid;min-width:0}.review-contact small{font-size:9px;color:var(--im-fg-3);text-transform:uppercase;letter-spacing:.08em}.review-contact a,.review-contact strong{font-size:12px;color:var(--im-fg);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.review-quote{font:400 22px/1.55 var(--font-display);margin:13px 0 0;color:var(--im-fg)}.review-two{display:grid;grid-template-columns:1fr 1fr;gap:24px}.review-two p{color:var(--im-fg-2);font-size:13px;margin:8px 0 0}.review-answers{display:grid;margin-top:12px}.review-answers article{padding:16px 0;border-bottom:1px solid var(--im-line-soft)}.review-answers article:last-child{padding-bottom:0;border-bottom:0}.review-answers h2{margin:0;color:var(--im-fg-3);font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.review-answers p{margin:7px 0 0;color:var(--im-fg);font-size:13px;line-height:1.65;white-space:pre-wrap}.review-aside{position:sticky;top:78px}.review-aside h2{font-size:17px;margin:0 0 16px}.review-form{display:grid;gap:14px}.review-form label{display:grid;gap:6px}.review-form label>span{font-size:10px;font-weight:700;color:var(--im-fg-3);text-transform:uppercase;letter-spacing:.08em}.review-form input,.review-form select,.review-form textarea{width:100%;border:1px solid var(--im-line);border-radius:10px;padding:10px 11px;background:var(--im-ink-3);color:var(--im-fg);font:inherit;resize:vertical}.review-form__foot{display:grid;gap:10px}.review-form__foot p{min-height:18px;margin:0;color:var(--success);font-size:12px}.review-form__foot p.is-error{color:var(--danger)}.review-form__foot button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:10px;padding:12px;background:var(--im-grad);color:#fff;font-weight:800}.review-history{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:14px}.review-history li{display:grid;grid-template-columns:9px 1fr;gap:11px}.review-history li>span{width:8px;height:8px;border-radius:50%;background:var(--im-cyan);margin-top:5px}.review-history strong{font-size:12px;text-transform:capitalize}.review-history p{font-size:12px;color:var(--im-fg-2);margin:3px 0}.review-history small{font-size:10px;color:var(--im-fg-3)}@media(max-width:860px){.review-grid{grid-template-columns:1fr}.review-aside{position:static}.review-contact{grid-template-columns:1fr}.review-head{align-items:flex-start;flex-direction:column}.review-two{grid-template-columns:1fr}}
  `}</style>;
}
