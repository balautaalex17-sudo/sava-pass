import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Mail, MessageSquareText, TriangleAlert } from "lucide-react";

import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BulkForm, ResendButton, TemplateForm, TestForm } from "./NotificationForms";

export const metadata: Metadata = { title: "Notificări — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");
  const [{ data: templates }, { data: notifications }] = await Promise.all([
    supabaseAdmin.from("notification_templates").select("key, category, channel, label, subject_template, body_template, active, updated_at").order("category").order("label"),
    supabaseAdmin.from("notifications").select("id, recipient_email, channel, template_key, subject, status, attempts, last_error, scheduled_for, sent_at, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const items = notifications ?? [];
  const sent = items.filter((item) => item.status === "sent").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const queued = items.filter((item) => item.status === "queued" || item.status === "sending").length;
  const options = (templates ?? []).filter((item) => item.active && item.channel === "email").map((item) => ({ key: item.key, label: item.label }));

  return <>
    <NotificationStyles />
    <StaffHeader left={<Link href="/admin" className="nf-back"><ArrowLeft size={16} /> Admin</Link>} center={<strong className="nf-title">Notificări</strong>} />
    <main className="nf-shell">
      <header className="nf-head"><div><span>Mesagerie</span><h1>Șabloane și livrare</h1><p>Email acum, notificări în aplicație, structură pregătită pentru SMS.</p></div></header>
      <div className="nf-stats"><Stat label="Trimise" value={sent} icon={<CheckCircle2 />} tone="#16a34a" /><Stat label="În așteptare" value={queued} icon={<Clock3 />} tone="#f59e0b" /><Stat label="Eșuate" value={failed} icon={<TriangleAlert />} tone="#dc2626" /><Stat label="Ultimele 100" value={items.length} icon={<Mail />} tone="#00a7e8" /></div>

      <section className="nf-tools"><article><div className="nf-card-head"><TestTubeIcon /><div><span>Previzualizare reală</span><h2>Trimite un test</h2></div></div><TestForm templates={options} defaultEmail={current.user.email ?? ""} /></article><article><div className="nf-card-head"><MessageSquareText /><div><span>Maximum 100 / lot</span><h2>Mesaj în grup</h2></div></div><BulkForm templates={options} /></article></section>

      <section className="nf-section"><div className="nf-section-head"><div><span>Conținut</span><h2>Șabloane editabile</h2></div><small>Variabilele păstrează forma {"{{first_name}}"}</small></div><div className="nf-template-grid">{(templates ?? []).map((template) => <details key={template.key}><summary><span><b>{template.label}</b><small>{template.category} · {template.channel}</small></span><em className={template.active ? "is-active" : ""}>{template.active ? "Activ" : "Oprit"}</em></summary><TemplateForm template={template} /></details>)}</div></section>

      <section className="nf-section"><div className="nf-section-head"><div><span>Livrare</span><h2>Istoric mesaje</h2></div></div><div className="nf-table-wrap"><table className="nf-table"><thead><tr><th>Destinatar</th><th>Mesaj</th><th>Canal</th><th>Status</th><th>Încercări</th><th>Moment</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.recipient_email}</td><td>{item.subject ?? item.template_key ?? "Mesaj direct"}{item.last_error && <small>{item.last_error}</small>}</td><td>{item.channel}</td><td><span className={`nf-status nf-status--${item.status}`}>{item.status}</span></td><td>{item.attempts}</td><td>{new Date(item.sent_at ?? item.scheduled_for).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}</td><td>{item.status === "failed" && <ResendButton id={item.id} />}</td></tr>)}</tbody></table></div></section>
    </main>
  </>;
}

function TestTubeIcon(){return <span className="nf-icon"><Mail size={18} /></span>}
function Stat({label,value,icon,tone}:{label:string;value:number;icon:React.ReactNode;tone:string}){return <article><span style={{color:tone,background:`${tone}1f`}}>{icon}</span><div><small>{label}</small><b>{value}</b></div></article>}
function NotificationStyles(){return <style>{`
  .nf-back{display:inline-flex;align-items:center;gap:7px;color:var(--im-fg-2);text-decoration:none;font-size:13px;font-weight:700}.nf-title{color:var(--im-fg);font-size:13px}.nf-shell{max-width:1180px;margin:0 auto;padding:28px 20px 72px}.nf-head>div>span,.nf-section-head span,.nf-card-head>div>span{font:700 10px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--im-cyan-light)}.nf-head h1{font-size:30px;color:var(--im-fg);letter-spacing:-.03em;margin:7px 0 3px}.nf-head p{font-size:12px;color:var(--im-fg-3);margin:0}.nf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.nf-stats article{display:flex;align-items:center;gap:11px;background:var(--im-ink-2);border:1px solid var(--im-line);border-radius:13px;padding:13px}.nf-stats article>span{width:34px;height:34px;border-radius:9px;display:grid;place-items:center}.nf-stats svg{width:16px}.nf-stats article>div{display:grid}.nf-stats small{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--im-fg-3)}.nf-stats b{font-size:20px;color:var(--im-fg)}.nf-tools{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}.nf-tools>article,.nf-section{background:var(--im-ink-2);border:1px solid var(--im-line);border-radius:18px;padding:17px}.nf-card-head{display:flex;align-items:center;gap:10px;margin-bottom:13px}.nf-card-head>svg,.nf-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;background:rgba(0,167,232,.12);color:var(--im-cyan-light)}.nf-card-head h2{font-size:15px;color:var(--im-fg);margin:4px 0 0}.nf-tool-form,.nf-template{display:grid;gap:10px}.nf-tool-form label,.nf-template label{display:grid;gap:5px}.nf-tool-form label>span,.nf-template label>span{font-size:9px;font-weight:700;color:var(--im-fg-3);text-transform:uppercase;letter-spacing:.07em}.nf-tool-form input,.nf-tool-form select,.nf-template input,.nf-template textarea{width:100%;border:1px solid var(--im-line);border-radius:9px;padding:9px 10px;background:var(--im-ink-3);color:var(--im-fg);font:inherit}.nf-check{display:flex!important;grid-template-columns:16px 1fr!important;align-items:center!important;gap:7px!important}.nf-check input{width:15px;height:15px}.nf-check span{text-transform:none!important;letter-spacing:0!important}.nf-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}.nf-foot p{font-size:10px;color:var(--success);margin:0}.nf-foot p.is-error{color:var(--danger)}.nf-foot button,.nf-resend button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:8px;padding:9px 11px;background:var(--im-grad);color:#fff;font-size:10px;font-weight:800}.nf-section{margin-bottom:18px}.nf-section-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:14px}.nf-section-head h2{font-size:19px;color:var(--im-fg);margin:5px 0 0}.nf-section-head>small{font-size:10px;color:var(--im-fg-3)}.nf-template-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.nf-template-grid details{border:1px solid var(--im-line-soft);border-radius:11px;background:var(--im-ink-3)}.nf-template-grid summary{padding:11px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}.nf-template-grid summary>span{display:grid}.nf-template-grid summary b{font-size:11px;color:var(--im-fg)}.nf-template-grid summary small{font-size:9px;color:var(--im-fg-3)}.nf-template-grid summary em{font-style:normal;font-size:8px;padding:3px 6px;border-radius:5px;background:rgba(220,38,38,.1);color:#fca5a5}.nf-template-grid summary em.is-active{background:rgba(22,163,74,.1);color:#86efac}.nf-template{padding:11px;border-top:1px solid var(--im-line)}.nf-table-wrap{overflow-x:auto}.nf-table{width:100%;min-width:900px;border-collapse:collapse}.nf-table th{text-align:left;padding:8px;border-bottom:1px solid var(--im-line);font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:var(--im-fg-3)}.nf-table td{padding:9px 8px;border-bottom:1px solid var(--im-line-soft);font-size:10px;color:var(--im-fg-2)}.nf-table td small{display:block;max-width:260px;color:#fca5a5;margin-top:3px}.nf-status{padding:3px 6px;border-radius:5px;background:rgba(245,158,11,.12);color:#fcd34d}.nf-status--sent{background:rgba(22,163,74,.12);color:#86efac}.nf-status--failed{background:rgba(220,38,38,.12);color:#fca5a5}.nf-resend{display:flex;align-items:center;gap:5px}.nf-resend span{color:#fca5a5}@media(max-width:850px){.nf-stats,.nf-tools,.nf-template-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.nf-stats,.nf-tools,.nf-template-grid{grid-template-columns:1fr}.nf-section-head{align-items:flex-start;flex-direction:column}}
`}</style>}
