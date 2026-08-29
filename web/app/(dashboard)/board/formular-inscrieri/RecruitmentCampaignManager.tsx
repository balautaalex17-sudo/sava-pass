"use client";

import { useActionState, useMemo, useState } from "react";
import { ExternalLink, LockKeyhole, Radio, Save } from "lucide-react";
import Link from "next/link";
import {
  RECRUITMENT_QUESTIONS,
  type RecruitmentQuestion,
  type RecruitmentQuestionKey,
} from "@/lib/recruitment-spec";
import { saveRecruitmentCampaign, type RecruitmentCampaignState } from "./actions";

type Campaign = {
  id: string;
  title: string;
  intro: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  closed_message: string;
  updated_at: string;
};

type CampaignStatus = "draft" | "open" | "closed";

type CampaignPreview = {
  campaignKey: string;
  status: CampaignStatus;
  intro: string;
  closedMessage: string;
  opensAt: string;
  closesAt: string;
  questions: RecruitmentQuestion[];
};

function campaignStatus(value: string): CampaignStatus {
  return value === "open" || value === "draft" ? value : "closed";
}

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function campaignPreview(
  campaign: Campaign,
  questions: readonly RecruitmentQuestion[],
): CampaignPreview {
  return {
    campaignKey: `${campaign.id}:${campaign.updated_at}`,
    status: campaignStatus(campaign.status),
    intro: campaign.intro,
    closedMessage: campaign.closed_message,
    opensAt: localDate(campaign.opens_at),
    closesAt: localDate(campaign.closes_at),
    questions: questions.map((question) => ({ ...question })),
  };
}

export function RecruitmentCampaignManager({
  campaigns,
  questionsByCampaign,
  referenceNow,
}: {
  campaigns: Campaign[];
  questionsByCampaign: Record<string, RecruitmentQuestion[]>;
  referenceNow: string;
}) {
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? "");
  const campaign = useMemo(
    () => campaigns.find((item) => item.id === selectedId) ?? campaigns[0] ?? null,
    [campaigns, selectedId],
  );
  const [editedPreview, setEditedPreview] = useState<CampaignPreview | null>(null);
  const [state, action, pending] = useActionState(saveRecruitmentCampaign, {} as RecruitmentCampaignState);

  if (!campaign) {
    return <div className="dash-card dash-empty"><strong>Nicio campanie configurată</strong>Super administratorul trebuie să creeze prima schemă de recrutare.</div>;
  }

  const campaignKey = `${campaign.id}:${campaign.updated_at}`;
  const configuredQuestions = questionsByCampaign[campaign.id]
    ?? RECRUITMENT_QUESTIONS.map((question) => ({ ...question }));
  const preview = editedPreview?.campaignKey === campaignKey
    ? editedPreview
    : campaignPreview(campaign, configuredQuestions);
  const updatePreview = (changes: Partial<Omit<CampaignPreview, "campaignKey">>) => {
    setEditedPreview({ ...preview, ...changes, campaignKey });
  };
  const updateQuestion = (key: RecruitmentQuestionKey, label: string) => {
    updatePreview({
      questions: preview.questions.map((question) => (
        question.key === key ? { ...question, label } : question
      )),
    });
  };
  const now = new Date(referenceNow).getTime();
  const opensAt = preview.opensAt ? new Date(preview.opensAt).getTime() : null;
  const closesAt = preview.closesAt ? new Date(preview.closesAt).getTime() : null;
  const actuallyOpen = preview.status === "open"
    && (!opensAt || opensAt <= now)
    && (!closesAt || closesAt >= now);
  const isEnabled = preview.status === "open";
  const isScheduled = preview.status === "open" && Boolean(opensAt && opensAt > now);
  const previewHeading = actuallyOpen
    ? "Înscrierile sunt deschise"
    : isScheduled
      ? "Deschidere programată"
      : preview.status === "draft"
        ? "Campania este în ciornă"
        : "Înscrierile sunt închise";
  const previewState = actuallyOpen ? "Vizibil și activ acum" : isScheduled ? "Va deveni activ automat" : "Închis pentru candidați";

  return (
    <div className="recruitment-control-grid" key={campaign.id}>
      <form action={action} className="dash-card dash-form recruitment-control-form">
        <input type="hidden" name="id" value={campaign.id} />
        <div className="dash-section-head">
          <div><h2>Configurare</h2><p>Modificările apar pe site imediat după salvare.</p></div>
          {campaigns.length > 1 && (
            <label className="dash-field recruitment-campaign-picker">
              <span>Campanie</span>
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {campaigns.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="dash-field"><label htmlFor="campaign-title">Titlu public</label><input id="campaign-title" name="title" defaultValue={campaign.title} minLength={3} maxLength={120} required /></div>
        <div className="dash-field"><label htmlFor="campaign-intro">Introducere</label><textarea id="campaign-intro" name="intro" value={preview.intro} onChange={(event) => updatePreview({ intro: event.target.value })} minLength={10} maxLength={1000} required /></div>

        <div className="recruitment-status-control">
          <div>
            <span id="campaign-status-label">Formular public</span>
            <small>Pornește sau oprește formularul. Datele de mai jos controlează programarea automată.</small>
          </div>
          <button
            type="button"
            className={`recruitment-status-switch${isEnabled ? " is-on" : ""}`}
            role="switch"
            aria-checked={isEnabled}
            aria-labelledby="campaign-status-label"
            onClick={() => updatePreview({ status: isEnabled ? "closed" : "open" })}
          >
            <span aria-hidden="true"><span /></span>
            <strong>{isEnabled ? "Pornit" : "Oprit"}</strong>
          </button>
          <input type="hidden" name="status" value={preview.status} />
        </div>

        <div className="dash-form-grid">
          <div className="dash-field"><label htmlFor="campaign-opens">Se deschide</label><input id="campaign-opens" name="opensAt" type="datetime-local" value={preview.opensAt} onChange={(event) => updatePreview({ opensAt: event.target.value })} required /></div>
          <div className="dash-field"><label htmlFor="campaign-closes">Se închide</label><input id="campaign-closes" name="closesAt" type="datetime-local" value={preview.closesAt} onChange={(event) => updatePreview({ closesAt: event.target.value })} required /></div>
        </div>
        <div className="dash-field"><label htmlFor="campaign-closed-message">Mesaj când este închis</label><textarea id="campaign-closed-message" name="closedMessage" value={preview.closedMessage} onChange={(event) => updatePreview({ closedMessage: event.target.value })} minLength={8} maxLength={500} required /><small>Acest text este afișat public în locul formularului.</small></div>

        <fieldset className="recruitment-question-editor">
          <legend>Întrebările formularului</legend>
          <p>Editează formularea celor 6 întrebări. La salvare se creează automat o versiune nouă, iar aplicațiile vechi își păstrează întrebările originale.</p>
          <div>
            {preview.questions.map((question, index) => (
              <label className="dash-field" key={question.key}>
                <span>Întrebarea {index + 1}</span>
                <textarea
                  name={`question_${question.key}`}
                  value={question.label}
                  onChange={(event) => updateQuestion(question.key, event.target.value)}
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  required
                />
                <small>{question.label.length}/500 caractere</small>
              </label>
            ))}
          </div>
        </fieldset>

        {state.message && <p className={`dash-form-message dash-form-message--${state.ok ? "success" : "error"}`} role="status">{state.message}</p>}
        <div className="recruitment-control-actions">
          <button className="dash-button" type="submit" disabled={pending}><Save size={17} /> {pending ? "Se salvează…" : "Salvează și publică starea"}</button>
          <Link href="/devino-membru" target="_blank" className="dash-button dash-button--secondary">Vezi pagina <ExternalLink size={16} /></Link>
        </div>
      </form>

      <aside className={`dash-card recruitment-public-preview recruitment-public-preview--${actuallyOpen ? "open" : "closed"}`}>
        <div className="recruitment-public-preview__topline">
          <span className="recruitment-public-preview__icon">{actuallyOpen ? <Radio size={22} /> : <LockKeyhole size={22} />}</span>
          <span className="recruitment-public-preview__state"><span aria-hidden="true" />{previewState}</span>
        </div>
        <span className="dash-eyebrow">Previzualizare stare</span>
        <h2>{previewHeading}</h2>
        <p>{actuallyOpen ? preview.intro : preview.closedMessage}</p>
        <small>{actuallyOpen && closesAt ? `Închidere automată: ${new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(closesAt))}` : isScheduled && opensAt ? `Deschidere automată: ${new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(opensAt))}` : "Formularul nu acceptă răspunsuri."}</small>
      </aside>
    </div>
  );
}
