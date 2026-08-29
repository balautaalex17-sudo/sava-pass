"use client";

import { useActionState } from "react";
import { RefreshCw, Save, Send, TestTube2 } from "lucide-react";

import {
  resendNotification,
  sendBulkNotifications,
  sendTestNotification,
  updateTemplate,
  type NotificationActionState,
} from "./actions";

const initial: NotificationActionState = {};

export function TemplateForm({ template }: { template: { key: string; subject_template: string | null; body_template: string; active: boolean } }) {
  const [state, action, pending] = useActionState(updateTemplate, initial);
  return <form action={action} className="nf-template"><input type="hidden" name="key" value={template.key} /><label><span>Subiect</span><input name="subject_template" defaultValue={template.subject_template ?? ""} /></label><label><span>Mesaj</span><textarea name="body_template" rows={6} defaultValue={template.body_template} /></label><label className="nf-check"><input type="checkbox" name="active" defaultChecked={template.active} /><span>Șablon activ</span></label><FormFoot state={state} pending={pending} label="Salvează" icon={<Save size={14} />} /></form>;
}

export function TestForm({ templates, defaultEmail }: { templates: { key: string; label: string }[]; defaultEmail: string }) {
  const [state, action, pending] = useActionState(sendTestNotification, initial);
  return <form action={action} className="nf-tool-form"><label><span>Șablon</span><select name="template_key">{templates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>Email de test</span><input type="email" name="email" defaultValue={defaultEmail} required /></label><FormFoot state={state} pending={pending} label="Trimite test" icon={<TestTube2 size={14} />} /></form>;
}

export function BulkForm({ templates }: { templates: { key: string; label: string }[] }) {
  const [state, action, pending] = useActionState(sendBulkNotifications, initial);
  return <form action={action} className="nf-tool-form"><label><span>Șablon</span><select name="template_key">{templates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>Grup de candidați</span><select name="application_status"><option value="submitted">Aplicații trimise</option><option value="under_review">În evaluare</option><option value="selected_for_interview">Selectați pentru interviu</option><option value="interview_scheduled">Selectați anterior pentru interviu</option><option value="interview_completed">Interviuri încheiate</option><option value="accepted">Acceptați</option><option value="waiting_list">Listă de așteptare</option><option value="rejected">Respinși</option></select></label><FormFoot state={state} pending={pending} label="Trimite grupului" icon={<Send size={14} />} /></form>;
}

export function ResendButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resendNotification, initial);
  return <form action={action} className="nf-resend"><input type="hidden" name="id" value={id} /><button type="submit" disabled={pending} className="pressable"><RefreshCw size={12} /> {pending ? "…" : "Retrimite"}</button>{state.error && <span>{state.error}</span>}</form>;
}

function FormFoot({ state, pending, label, icon }: { state: NotificationActionState; pending: boolean; label: string; icon: React.ReactNode }) {
  return <div className="nf-foot"><p className={state.error ? "is-error" : ""} role="status" aria-live="polite">{state.error ?? state.message}</p><button type="submit" disabled={pending} className="pressable">{icon}{pending ? "Se trimite…" : label}</button></div>;
}
