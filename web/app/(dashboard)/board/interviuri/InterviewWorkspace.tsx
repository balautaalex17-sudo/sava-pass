"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, Search, Trash2, UserRoundCheck, X } from "lucide-react";
import {
  isValidInterviewCategoryScores,
  interviewScoreTotal,
  type InterviewCategoryScores,
} from "@/lib/recruitment-spec";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  arithmeticMean,
  compareByAscendingMean,
} from "@/lib/dashboard/recruitment-evaluations";
import { runRecruitmentBatchAction } from "../inscrieri/actions";
import {
  addInterviewEvaluation,
  deleteInterviewEvaluation,
  saveInterviewEvaluation,
} from "./actions";

export interface InterviewEvaluationView {
  evaluationId: string;
  categoryScores: InterviewCategoryScores | null;
  score: number | null;
  needsUpdate: boolean;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCandidate {
  interviewId: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  grade: string | null;
  status: string;
  answers: Array<{ key: string; label: string; value: string }>;
  evaluations: InterviewEvaluationView[];
}

const SCORE_FIELDS = [
  { key: "situations", label: "Situații ×2" },
  { key: "personality", label: "Personalitate" },
  { key: "creativity", label: "Creativitate" },
] as const satisfies ReadonlyArray<{ key: keyof InterviewCategoryScores; label: string }>;

const ACCEPTABLE_STATUSES = new Set([
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
  "waiting_list",
]);

const STATUS_LABELS: Record<string, string> = {
  selected_for_interview: "Selectat(ă) pentru interviu",
  interview_scheduled: "Selectat(ă) pentru interviu (status vechi)",
  interview_completed: "Interviu finalizat",
  waiting_list: "Lista de așteptare",
  accepted: "Acceptat(ă)",
  rejected: "Respins(ă)",
};

export function InterviewWorkspace({
  candidates,
  isBoardView,
  initialInterviewId,
}: {
  candidates: InterviewCandidate[];
  isBoardView: boolean;
  initialInterviewId?: string;
}) {
  const orderedCandidates = useMemo(() => candidates.slice().sort((left, right) => compareByAscendingMean(
    { fullName: left.fullName, mean: arithmeticMean(validInterviewScores(left)) },
    { fullName: right.fullName, mean: arithmeticMean(validInterviewScores(right)) },
  )), [candidates]);
  const [selectedId, setSelectedId] = useState(
    orderedCandidates.some((candidate) => candidate.interviewId === initialInterviewId)
      ? initialInterviewId ?? ""
      : orderedCandidates[0]?.interviewId ?? "",
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("ro");
    if (!query) return orderedCandidates;
    return orderedCandidates.filter((candidate) => (
      `${candidate.fullName} ${candidate.email} ${candidate.phone} ${candidate.grade ?? ""}`
        .toLocaleLowerCase("ro")
        .includes(query)
    ));
  }, [deferredSearch, orderedCandidates]);
  const selected = filtered.find((candidate) => candidate.interviewId === selectedId)
    ?? filtered[0]
    ?? null;
  const visibleCandidateIds = useMemo(
    () => filtered.map((candidate) => candidate.interviewId),
    [filtered],
  );

  if (!candidates.length) {
    return (
      <div className="dash-card dash-empty interview-empty">
        <strong>{isBoardView ? "Niciun candidat promovat" : "Niciun candidat disponibil"}</strong>
        Candidații promovați din tabul Formulare vor apărea aici.
      </div>
    );
  }

  return (
    <div className="interview-results-layout">
      <div className="form-results-toolbar interview-results-toolbar" aria-label="Caută în interviuri">
        <label className="interview-search form-results-search">
          <Search size={16} />
          <span className="sr-only">Caută un candidat</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută după nume, email sau clasă"
          />
        </label>
        <span className="form-results-toolbar__count">{filtered.length} din {candidates.length}</span>
      </div>

      <div className="interview-workspace interview-workspace--results">
        {isBoardView ? (
          <InterviewCentralizer
            candidates={candidates}
            visibleCandidateIds={visibleCandidateIds}
            selectedInterviewId={selected?.interviewId ?? ""}
            onSelect={setSelectedId}
          />
        ) : (
          <aside className="dash-card interview-candidates" aria-label="Candidați promovați">
            <div className="interview-candidate-count">{filtered.length} din {candidates.length} candidați</div>
            <div className="interview-candidate-list">
              {filtered.map((candidate) => (
                <button
                  type="button"
                  key={candidate.interviewId}
                  className="interview-candidate"
                  aria-current={selected?.interviewId === candidate.interviewId ? "true" : undefined}
                  onClick={() => setSelectedId(candidate.interviewId)}
                >
                  <span className="dash-initials" aria-hidden="true">{initials(candidate.fullName)}</span>
                  <span>
                    <strong>{candidate.fullName}</strong>
                    <small>{candidate.grade || "Clasa neprecizată"}</small>
                  </span>
                  <span className="interview-result-count">{candidateState(candidate)}</span>
                </button>
              ))}
              {!filtered.length && <div className="interview-list-empty">Niciun candidat pentru căutarea curentă.</div>}
            </div>
          </aside>
        )}
        {selected ? (
          <CandidateInterview
            key={selected.interviewId}
            candidate={selected}
            isBoardView={isBoardView}
          />
        ) : (
          <div className="dash-card dash-empty interview-empty">
            <strong>Niciun candidat găsit</strong>
            Schimbă termenul de căutare.
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewCentralizer({
  candidates,
  visibleCandidateIds,
  selectedInterviewId,
  onSelect,
}: {
  candidates: InterviewCandidate[];
  visibleCandidateIds: string[];
  selectedInterviewId: string;
  onSelect: (interviewId: string) => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [acceptanceIds, setAcceptanceIds] = useState<string[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const acceptanceDialogRef = useRef<HTMLDialogElement>(null);
  const processed = useMemo(() => new Set(processedIds), [processedIds]);
  const rows = useMemo(() => candidates.map((candidate) => {
    const validScores = validInterviewScores(candidate);
    const isProcessed = processed.has(candidate.applicationId);
    const status = isProcessed ? "accepted" : candidate.status;
    const eligible = ACCEPTABLE_STATUSES.has(status) && validScores.length > 0;
    return {
      candidate,
      count: validScores.length,
      mean: arithmeticMean(validScores),
      status,
      eligible,
      disabledReason: disabledReason(status, validScores.length),
    };
  }).sort((left, right) => compareByAscendingMean(
    { fullName: left.candidate.fullName, mean: left.mean },
    { fullName: right.candidate.fullName, mean: right.mean },
  )), [candidates, processed]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSet = useMemo(() => new Set(visibleCandidateIds), [visibleCandidateIds]);
  const visibleRows = rows.filter((row) => visibleSet.has(row.candidate.interviewId));
  const selectedEligibleCount = visibleRows.filter((row) => row.eligible && selectedSet.has(row.candidate.applicationId)).length;

  function toggle(applicationId: string, checked: boolean) {
    setSelectedIds((current) => checked
      ? [...new Set([...current, applicationId])]
      : current.filter((id) => id !== applicationId));
  }

  function acceptSelected() {
    const applicationIds = visibleRows
      .filter((row) => row.eligible && selectedSet.has(row.candidate.applicationId))
      .map((row) => row.candidate.applicationId);
    if (!applicationIds.length || pending) return;
    setAcceptanceIds(applicationIds);
    acceptanceDialogRef.current?.showModal();
  }

  function closeAcceptanceDialog() {
    if (acceptanceDialogRef.current?.open) acceptanceDialogRef.current.close();
    setAcceptanceIds([]);
  }

  function confirmAcceptance() {
    if (!acceptanceIds.length || pending) return;
    const applicationIds = acceptanceIds;
    closeAcceptanceDialog();

    startTransition(async () => {
      const result = await runRecruitmentBatchAction({ action: "accept", applicationIds });
      setMessage({ text: result.message, ok: result.ok });
      if (result.processedIds.length) {
        setProcessedIds((current) => [...new Set([...current, ...result.processedIds])]);
        setSelectedIds((current) => current.filter((id) => !result.processedIds.includes(id)));
      }
      router.refresh();
    });
  }

  return (
    <aside className="dash-card interview-centralizer" aria-labelledby="interview-centralizer-title">
      <header className="interview-centralizer__head">
        <div>
          <h3 id="interview-centralizer-title">Centralizator final</h3>
          <p>Media include numai punctajele complete.</p>
        </div>
      </header>
      <div className="interview-centralizer__actions">
        <button
          type="button"
          className="dash-button"
          disabled={pending || selectedEligibleCount === 0}
          onClick={acceptSelected}
        >
          {pending ? "Se procesează…" : `Acceptă selecția (${selectedEligibleCount})`}
        </button>
        <small>Se trimite codul de activare la emailul din formular.</small>
        <div aria-live="polite">
          {message && <p className={message.ok ? "dash-form-message dash-form-message--success" : "dash-form-message dash-form-message--error"}>{message.text}</p>}
        </div>
      </div>
      <div className="interview-centralizer__list" role="list" aria-label="Candidați și medii finale">
        {visibleRows.map(({ candidate, count, mean, status, eligible, disabledReason }) => {
          const checked = selectedSet.has(candidate.applicationId);
          return (
            <div
              key={candidate.interviewId}
              className="interview-centralizer__row"
              role="listitem"
              aria-current={selectedInterviewId === candidate.interviewId ? "true" : undefined}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!eligible || pending}
                onChange={(event) => toggle(candidate.applicationId, event.target.checked)}
                aria-label={`Selectează ${candidate.fullName} pentru acceptare`}
              />
              <button type="button" className="interview-centralizer__candidate" onClick={() => onSelect(candidate.interviewId)}>
                <strong>{candidate.fullName}</strong>
                <small>{candidate.grade || "Clasa neprecizată"} · {candidate.email}</small>
              </button>
              <span className="interview-centralizer__score">
                <strong>{mean === null ? "—" : `${mean.toFixed(1)}/20`}</strong>
                <small>{count} {count === 1 ? "punctaj" : "punctaje"}</small>
              </span>
              <span className="interview-centralizer__status">{STATUS_LABELS[status] ?? status}</span>
              {!eligible && <small className="interview-centralizer__disabled">{disabledReason}</small>}
            </div>
          );
        })}
        {!visibleRows.length && (
          <div className="interview-list-empty">Niciun candidat pentru căutarea curentă.</div>
        )}
      </div>
      <dialog
        ref={acceptanceDialogRef}
        className="signup-confirm-dialog"
        aria-labelledby="interview-confirm-title"
        aria-describedby="interview-confirm-description"
        onCancel={closeAcceptanceDialog}
        onClose={() => setAcceptanceIds([])}
      >
        <div className="signup-confirm-content">
          <div className="signup-confirm-icon" aria-hidden="true">
            <UserRoundCheck size={21} />
          </div>
          <div>
            <h2 id="interview-confirm-title">
              Accepți {acceptanceIds.length} {acceptanceIds.length === 1 ? "candidat" : "candidați"}?
            </h2>
            <p id="interview-confirm-description">
              Folosim emailul original din formular și trimitem un cod de activare care nu expiră,
              valabil până la prima folosire.
            </p>
          </div>
          <button
            type="button"
            className="signup-confirm-close"
            onClick={closeAcceptanceDialog}
            aria-label="Închide confirmarea"
          >
            <X size={18} />
          </button>
        </div>
        <div className="signup-confirm-actions">
          <button
            type="button"
            className="dash-button dash-button--secondary"
            onClick={closeAcceptanceDialog}
            autoFocus
          >
            Renunță
          </button>
          <button type="button" className="dash-button" onClick={confirmAcceptance}>
            Acceptă și creează conturile
          </button>
        </div>
      </dialog>
    </aside>
  );
}

function disabledReason(status: string, validScoreCount: number): string {
  if (status === "accepted") return "Deja acceptat(ă)";
  if (status === "rejected") return "Respins(ă)";
  if (!ACCEPTABLE_STATUSES.has(status)) return "Statusul nu permite acceptarea";
  if (validScoreCount === 0) return "Necesită o evaluare validă";
  return "";
}

function CandidateInterview({
  candidate,
  isBoardView,
}: {
  candidate: InterviewCandidate;
  isBoardView: boolean;
}) {
  return (
    <section className="interview-review" aria-labelledby="candidate-title">
      <header className="dash-card interview-candidate-head form-candidate-head">
        <div className="dash-initials" aria-hidden="true">{initials(candidate.fullName)}</div>
        <div>
          <h2 id="candidate-title">{candidate.fullName}</h2>
          <p>{candidate.grade || "Clasa neprecizată"}</p>
          <div className="interview-contact">
            <a href={`mailto:${candidate.email}`}><Mail size={13} />{candidate.email}</a>
            {candidate.phone && <a href={`tel:${candidate.phone}`}><Phone size={13} />{candidate.phone}</a>}
          </div>
        </div>
        <span className="interview-result-badge">{candidateState(candidate)}</span>
      </header>

      {isBoardView && <InterviewEvaluationsBoard candidate={candidate} />}

      <details className="dash-card interview-answers">
        <summary>Răspunsuri din formular (context) <span>{candidate.answers.length} câmpuri</span></summary>
        <dl>{candidate.answers.map((answer) => <div key={answer.key}><dt>{answer.label}</dt><dd>{answer.value || <span>Fără răspuns</span>}</dd></div>)}</dl>
      </details>
    </section>
  );
}

function InterviewEvaluationsBoard({ candidate }: { candidate: InterviewCandidate }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function addRow() {
    if (pending) return;
    startTransition(async () => {
      const result = await addInterviewEvaluation({ interviewId: candidate.interviewId });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="dash-card interview-evaluations-board" aria-labelledby="interview-evaluations-title">
      <header className="interview-evaluations-board__head">
        <div>
          <h3 id="interview-evaluations-title">Punctaje interviu</h3>
          <p>Fiecare rând reprezintă un intervievator, fără nume. Rândurile noi nu sunt legate de conturi. Total: 2 × Situații + Personalitate + Creativitate.</p>
        </div>
        <button type="button" className="dash-button" onClick={addRow} disabled={pending}>
          <Plus size={16} />
          {pending ? "Se adaugă…" : "Adaugă intervievator"}
        </button>
      </header>
      {message && (
        <p className={message.ok ? "dash-form-message dash-form-message--success interview-evaluations-board__message" : "dash-form-message dash-form-message--error interview-evaluations-board__message"} aria-live="polite">
          {message.text}
        </p>
      )}
      {!candidate.evaluations.length ? (
        <p className="interview-evaluations-board__empty">Nu există încă rânduri. Adaugă primul intervievator pentru a începe.</p>
      ) : (
        <div className="interview-score-rows">
          {candidate.evaluations.map((evaluation, index) => (
            <InterviewEvaluationEditor
              key={evaluation.evaluationId}
              evaluation={evaluation}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InterviewEvaluationEditor({
  evaluation,
  index,
}: {
  evaluation: InterviewEvaluationView;
  index: number;
}) {
  const router = useRouter();
  const isPrefilled = !evaluation.needsUpdate && evaluation.categoryScores !== null;
  const initialComment = evaluation.comment.trim() === "Fără observații." ? "" : evaluation.comment;
  const [categoryScores, setCategoryScores] = useState<Partial<InterviewCategoryScores>>(() => (
    isPrefilled ? evaluation.categoryScores ?? {} : {}
  ));
  const [comment, setComment] = useState(initialComment);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const completeScores = completeCategoryScores(categoryScores);
  const scoreLabel = completeScores === null ? "—/20" : `${interviewScoreTotal(completeScores)}/20`;

  function setScore(field: keyof InterviewCategoryScores, value: string) {
    setCategoryScores((current) => {
      const next = { ...current };
      if (value === "") delete next[field];
      else next[field] = Number(value);
      return next;
    });
  }

  function save() {
    if (completeScores === null) {
      setMessage({ text: "Alege o notă între 1 și 5 pentru fiecare criteriu.", ok: false });
      return;
    }
    startTransition(async () => {
      const result = await saveInterviewEvaluation({
        evaluationId: evaluation.evaluationId,
        categoryScores: completeScores,
        comment,
      });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    if (pending) return;
    const confirmed = window.confirm(`Ștergi rândul Intervievator ${index + 1}? Această acțiune nu poate fi anulată.`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteInterviewEvaluation({ evaluationId: evaluation.evaluationId });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="interview-score-card">
      <header className="interview-score-card__head">
        <div>
          <span className="interview-score-card__number">Intervievator {index + 1}</span>
          {evaluation.needsUpdate && <small>Rând vechi sau incomplet · completează pentru a-l include în medie</small>}
        </div>
        <strong className="interview-score-total">{scoreLabel}</strong>
      </header>
      <div className="interview-score-grid interview-score-grid--categories">
        {SCORE_FIELDS.map((field) => (
          <label key={field.key} className="interview-score-row">
            <span>{field.label}</span>
            <select
              aria-label={`Intervievator ${index + 1} · ${field.label}`}
              value={categoryScores[field.key] ?? ""}
              onChange={(event) => setScore(field.key, event.target.value)}
            >
              <option value="">Alege</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label className="interview-comment">
        <span>Observații (opțional)</span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={5000} placeholder="Adaugă context pentru Board…" />
      </label>
      <div className="interview-evaluation-foot">
        <div aria-live="polite">
          {message && <p className={message.ok ? "dash-form-message dash-form-message--success" : "dash-form-message dash-form-message--error"}>{message.text}</p>}
          {!message && isPrefilled && <p>Ultima salvare: {formatDateTime(evaluation.updatedAt)}</p>}
        </div>
        <div className="interview-score-card__actions">
          <button type="button" className="dash-button dash-button--secondary interview-delete-button" onClick={remove} disabled={pending}>
            <Trash2 size={14} />
            Șterge
          </button>
          <button type="button" className="dash-button" onClick={save} disabled={pending || completeScores === null}>
            {pending ? "Se salvează…" : isPrefilled ? "Actualizează" : "Salvează"}
          </button>
        </div>
      </div>
    </article>
  );
}

function completeCategoryScores(
  scores: Partial<InterviewCategoryScores>,
): InterviewCategoryScores | null {
  if (scores.situations === undefined || scores.personality === undefined || scores.creativity === undefined) {
    return null;
  }
  const complete = {
    situations: scores.situations,
    personality: scores.personality,
    creativity: scores.creativity,
  };
  return isValidInterviewCategoryScores(complete) ? complete : null;
}

function candidateState(candidate: InterviewCandidate): string {
  const scores = validInterviewScores(candidate);
  const mean = arithmeticMean(scores);
  if (mean === null) return "Fără evaluare validă";
  return `${mean.toFixed(1)}/20 · ${scores.length}`;
}

function validInterviewScores(candidate: InterviewCandidate): number[] {
  return candidate.evaluations
    .filter((evaluation) => !evaluation.needsUpdate)
    .map((evaluation) => evaluation.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
}

function initials(name: string) {
  return name
    .replace(/^\[EXEMPLU\]\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
