"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type {
  SignupApplication,
  SignupField,
} from "@/components/dashboard/SignupsTable";
import { formatDateTime } from "@/lib/dashboard/format";
import {
  arithmeticMean,
  classifyFormDecision,
  compareByDescendingMean,
  compareByDescendingScore,
  type ApplicationRating,
  type FormDecision,
} from "@/lib/dashboard/recruitment-evaluations";
import { formRatingForScore, isRecruitmentQuestionKey } from "@/lib/recruitment-spec";
import { saveApplicationEvaluation } from "../interviuri/actions";
import { runRecruitmentBatchAction } from "./actions";

export type { ApplicationRating } from "@/lib/dashboard/recruitment-evaluations";

export interface ApplicationFormEvaluation {
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  rating: ApplicationRating;
  comment: string;
  baseScore: number | null;
  questionScores: Record<string, number>;
  updatedAt: string;
}

type FormFilter = "all" | "unrated" | ApplicationRating;

const reviewStatuses = new Set(["submitted", "under_review"]);
const interviewStatuses = new Set([
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
]);

const ratingOptions: Array<{
  value: ApplicationRating;
  label: string;
  hint: string;
}> = [
  { value: "green", label: "Recomandat", hint: "Formular potrivit pentru etapa următoare" },
  { value: "yellow", label: "De discutat", hint: "Mai sunt răspunsuri de clarificat" },
  { value: "red", label: "Nerecomandat", hint: "Formularul nu susține selecția momentan" },
];

const formScoreOptions = [
  { value: 0, label: "0", hint: "Nepotrivit" },
  { value: 0.5, label: "0,5", hint: "Acceptabil" },
  { value: 1, label: "1", hint: "Bun" },
] as const;

export function FormResultsWorkspace({
  applications,
  fields,
  evaluations,
  selectedForInterviewIds,
  interviewEmailIds,
  viewerId,
  viewerName,
  isBoardView,
  canManage,
  canEvaluate,
}: {
  applications: SignupApplication[];
  fields: SignupField[];
  evaluations: ApplicationFormEvaluation[];
  selectedForInterviewIds: string[];
  interviewEmailIds: string[];
  viewerId: string;
  viewerName: string;
  isBoardView: boolean;
  canManage: boolean;
  canEvaluate: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FormFilter>("all");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [bulkMessage, setBulkMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [newlySelectedIds, setNewlySelectedIds] = useState<string[]>([]);
  const [newlyEmailedIds, setNewlyEmailedIds] = useState<string[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [interviewConfirmation, setInterviewConfirmation] = useState(false);
  const [rejectConfirmation, setRejectConfirmation] = useState(false);
  const [pending, startTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();
  const [localEvaluations, setLocalEvaluations] = useState(evaluations);
  const deferredSearch = useDeferredValue(search);

  const selectedForInterview = useMemo(
    () => new Set([...selectedForInterviewIds, ...newlySelectedIds]),
    [newlySelectedIds, selectedForInterviewIds],
  );
  const interviewEmailSent = useMemo(
    () => new Set([...interviewEmailIds, ...newlyEmailedIds]),
    [interviewEmailIds, newlyEmailedIds],
  );

  function statusFor(application: SignupApplication) {
    return localStatuses[application.id] ?? application.status;
  }

  const evaluationsByApplication = useMemo(() => {
    const grouped = new Map<string, ApplicationFormEvaluation[]>();
    for (const evaluation of localEvaluations) {
      const current = grouped.get(evaluation.applicationId) ?? [];
      current.push(evaluation);
      grouped.set(evaluation.applicationId, current);
    }
    return grouped;
  }, [localEvaluations]);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase("ro");
    return applications.filter((application) => {
      const applicationEvaluations = evaluationsByApplication.get(application.id) ?? [];
      const ownEvaluation = applicationEvaluations.find((item) => item.reviewerId === viewerId);
      const ratings = isBoardView
        ? applicationEvaluations.map((item) => item.rating)
        : ownEvaluation ? [ownEvaluation.rating] : [];
      if (filter === "unrated" && ratings.length > 0) return false;
      if (filter !== "all" && filter !== "unrated" && !ratings.includes(filter)) return false;

      if (!query) return true;
      const searchable = [
        application.fullName,
        application.email,
        application.grade ?? "",
        ...fieldsForApplication(application, fields).map((field) => answerValue(application, field)),
      ].join(" ").toLocaleLowerCase("ro");
      return searchable.includes(query);
    });
  }, [applications, deferredSearch, evaluationsByApplication, fields, filter, isBoardView, viewerId]);

  const boardRows = useMemo(() => applications.map((application) => {
    const evaluationsForApplication = (evaluationsByApplication.get(application.id) ?? [])
      .slice()
      .sort((left, right) => compareByDescendingScore(left.baseScore, right.baseScore));
    const ratings = evaluationsForApplication.map((evaluation) => evaluation.rating);
    return {
      application,
      evaluations: evaluationsForApplication,
      mean: arithmeticMean(evaluationsForApplication.map((evaluation) => evaluation.baseScore)),
      decision: classifyFormDecision(ratings),
    };
  }).sort((left, right) => compareByDescendingMean(
    { fullName: left.application.fullName, mean: left.mean },
    { fullName: right.application.fullName, mean: right.mean },
  )), [applications, evaluationsByApplication]);

  const visibleBoardRows = useMemo(() => {
    const visibleIds = new Set(filtered.map((application) => application.id));
    return boardRows.filter((row) => visibleIds.has(row.application.id));
  }, [boardRows, filtered]);

  const checkedRows = useMemo(
    () => boardRows.filter((row) => checkedIds.has(row.application.id)),
    [boardRows, checkedIds],
  );

  const selectionEligible = useMemo(() => checkedRows.filter((row) => (
    reviewStatuses.has(localStatuses[row.application.id] ?? row.application.status)
    && row.evaluations.length > 0
    && !selectedForInterview.has(row.application.id)
  )), [checkedRows, localStatuses, selectedForInterview]);

  const emailEligible = useMemo(() => checkedRows.filter((row) => (
    interviewStatuses.has(localStatuses[row.application.id] ?? row.application.status)
    && selectedForInterview.has(row.application.id)
    && !interviewEmailSent.has(row.application.id)
  )), [checkedRows, interviewEmailSent, localStatuses, selectedForInterview]);

  const interviewEligible = useMemo(() => {
    const rowsById = new Map(
      [...selectionEligible, ...emailEligible].map((row) => [row.application.id, row]),
    );
    return [...rowsById.values()];
  }, [emailEligible, selectionEligible]);

  const rejectEligible = useMemo(() => checkedRows.filter((row) => (
    reviewStatuses.has(localStatuses[row.application.id] ?? row.application.status)
    && row.decision === "not_selected"
    && row.evaluations.length > 0
    && !selectedForInterview.has(row.application.id)
  )), [checkedRows, localStatuses, selectedForInterview]);

  const boardSelected = visibleBoardRows.find((row) => row.application.id === selectedId)?.application
    ?? visibleBoardRows[0]?.application
    ?? null;

  const selected = isBoardView
    ? boardSelected
    : filtered.find((application) => application.id === selectedId)
      ?? filtered[0]
      ?? null;
  const selectedEvaluations = selected
    ? evaluationsByApplication.get(selected.id) ?? []
    : [];
  const selectedDecision: FormDecision = selected
    ? isBoardView
      ? boardRows.find((row) => row.application.id === selected.id)?.decision ?? "unrated"
      : classifyFormDecision(selectedEvaluations.map((evaluation) => evaluation.rating))
    : "unrated";

  function selectCandidate(id: string) {
    setSelectedId(id);
    setMessage(null);
  }

  async function advanceCandidatesToInterview(
    applicationIds: string[],
    applicationIdsToSelect: string[],
  ) {
    let selectedIds: string[] = [];
    let selectionMessage = "";

    if (applicationIdsToSelect.length) {
      const selectionResult = await runRecruitmentBatchAction({
        action: "select_for_interview",
        applicationIds: applicationIdsToSelect,
      });
      selectedIds = selectionResult.processedIds;
      selectionMessage = selectionResult.message;
    }

    const emailResult = await runRecruitmentBatchAction({
      action: "send_interview_email",
      applicationIds,
    });
    const complete = emailResult.processedIds.length === applicationIds.length;

    return {
      ok: complete,
      message: complete
        ? `${emailResult.processedIds.length} candidați au fost trimiși la interviu și au primit emailul.`
        : [selectionMessage, emailResult.message].filter(Boolean).join(" "),
      selectedIds,
      emailedIds: emailResult.processedIds,
    };
  }

  function sendToInterview(application: SignupApplication) {
    setSelectedId(application.id);
    setMessage(null);
    startTransition(async () => {
      const result = await advanceCandidatesToInterview(
        [application.id],
        selectedForInterview.has(application.id) ? [] : [application.id],
      );
      setMessage({ text: result.message, ok: result.ok });
      applyProcessedStatuses(result.selectedIds, "selected_for_interview");
      applyProcessedEmails(result.emailedIds);
      router.refresh();
    });
  }

  function applyProcessedStatuses(ids: string[], status: string) {
    if (!ids.length) return;
    setLocalStatuses((current) => ({
      ...current,
      ...Object.fromEntries(ids.map((id) => [id, status])),
    }));
    if (status === "selected_for_interview") {
      setNewlySelectedIds((current) => [...new Set([...current, ...ids])]);
    }
  }

  function applyProcessedEmails(ids: string[]) {
    if (!ids.length) return;
    setNewlyEmailedIds((current) => [...new Set([...current, ...ids])]);
    setCheckedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function toggleChecked(applicationId: string) {
    setBulkMessage(null);
    setInterviewConfirmation(false);
    setRejectConfirmation(false);
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  function isActionable(row: (typeof boardRows)[number]) {
    const status = localStatuses[row.application.id] ?? row.application.status;
    const canChooseDecision = reviewStatuses.has(status) && row.evaluations.length > 0;
    const canSendEmail = interviewStatuses.has(status)
      && selectedForInterview.has(row.application.id)
      && !interviewEmailSent.has(row.application.id);
    return canChooseDecision || canSendEmail;
  }

  const visibleNonRedActionableRows = visibleBoardRows.filter((row) => (
    isActionable(row)
    && row.evaluations.length > 0
    && row.evaluations.every((evaluation) => evaluation.rating !== "red")
  ));
  const allVisibleNonRedSelected = visibleNonRedActionableRows.length > 0
    && visibleNonRedActionableRows.every((row) => checkedIds.has(row.application.id));

  function toggleVisibleNonRed() {
    setCheckedIds((current) => {
      const next = new Set(current);
      for (const row of visibleNonRedActionableRows) {
        if (allVisibleNonRedSelected) next.delete(row.application.id);
        else next.add(row.application.id);
      }
      return next;
    });
  }

  function requestSendToInterview() {
    if (!interviewEligible.length || bulkPending) return;
    setBulkMessage(null);
    setInterviewConfirmation(true);
    setRejectConfirmation(false);
  }

  function cancelSendToInterview() {
    if (bulkPending) return;
    setInterviewConfirmation(false);
  }

  function sendCheckedToInterview() {
    const applicationIds = interviewEligible.map((row) => row.application.id);
    const applicationIdsToSelect = selectionEligible.map((row) => row.application.id);
    if (!applicationIds.length) {
      setInterviewConfirmation(false);
      return;
    }

    setInterviewConfirmation(false);
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await advanceCandidatesToInterview(applicationIds, applicationIdsToSelect);
      setBulkMessage({ text: result.message, ok: result.ok });
      applyProcessedStatuses(result.selectedIds, "selected_for_interview");
      applyProcessedEmails(result.emailedIds);
      router.refresh();
    });
  }

  function requestBulkReject() {
    if (!rejectEligible.length || bulkPending) return;
    setBulkMessage(null);
    setInterviewConfirmation(false);
    setRejectConfirmation(true);
  }

  function cancelBulkReject() {
    if (bulkPending) return;
    setRejectConfirmation(false);
  }

  function rejectEvaluatedCandidates() {
    const applicationIds = rejectEligible.map((row) => row.application.id);
    if (!applicationIds.length) {
      setRejectConfirmation(false);
      return;
    }

    setRejectConfirmation(false);
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await runRecruitmentBatchAction({
        action: "reject",
        applicationIds,
      });
      setBulkMessage({ text: result.message, ok: result.ok });
      applyProcessedStatuses(result.processedIds, "rejected");
      setCheckedIds((current) => {
        const next = new Set(current);
        for (const id of result.processedIds) next.delete(id);
        return next;
      });
      router.refresh();
    });
  }

  function updateOwnEvaluation(evaluation: ApplicationFormEvaluation) {
    setLocalEvaluations((current) => [
      evaluation,
      ...current.filter((item) => !(
        item.applicationId === evaluation.applicationId
        && item.reviewerId === evaluation.reviewerId
      )),
    ]);
  }

  if (!applications.length) {
    return (
      <div className="dash-card dash-empty interview-empty">
        <strong>Niciun formular trimis</strong>
        Răspunsurile candidaților vor apărea aici după trimiterea formularului.
      </div>
    );
  }

  return (
    <div className={`form-results-layout${isBoardView ? " form-results-layout--board" : ""}`}>
      {isBoardView && (
        <div className="form-results-toolbar" aria-label="Caută și filtrează formularele">
          <label className="interview-search form-results-search">
            <Search size={16} />
            <span className="sr-only">Caută un candidat</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută după nume, email sau clasă"
            />
          </label>
          <div className="interview-filters form-results-filters" aria-label="Filtrează evaluările formularelor">
            {(["all", "unrated", "green", "yellow", "red"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                aria-label={filterLabel(value)}
              >
                {value !== "all" && value !== "unrated" && (
                  <span className={`interview-filter-dot interview-filter-dot--${value}`} />
                )}
                {filterShortLabel(value)}
              </button>
            ))}
          </div>
          <span className="form-results-toolbar__count">{visibleBoardRows.length} din {applications.length}</span>
        </div>
      )}

      {isBoardView && canManage && (
        <section className="form-results-actions" aria-label="Decizii în lot">
          <div className="form-results-actions__copy">
            <strong>{checkedIds.size ? `${checkedIds.size} candidați bifați` : "Selecție manuală Board"}</strong>
            <span>Bifează candidații, apoi trimite-i la interviu sau anunță-i că nu au avansat.</span>
          </div>
          <div className="form-results-actions__controls">
            <button
              type="button"
              className="dash-button"
              disabled={bulkPending || interviewEligible.length === 0}
              onClick={requestSendToInterview}
            >
              {bulkPending ? "Se procesează…" : `Trimite la interviu (${interviewEligible.length})`}
            </button>
            <button
              type="button"
              className="dash-button dash-button--secondary"
              disabled={bulkPending || rejectEligible.length === 0}
              onClick={requestBulkReject}
            >
              {`Anunță candidații respinși (${rejectEligible.length})`}
            </button>
          </div>
          {interviewConfirmation && (
            <div className="form-results-actions__confirm" role="group" aria-label="Confirmă trimiterea la interviu">
              <span>Vei muta exact {interviewEligible.length} candidați în etapa de interviu și le vei trimite emailul.</span>
              <button type="button" className="dash-button" disabled={bulkPending} onClick={sendCheckedToInterview}>
                Confirmă și trimite la interviu
              </button>
              <button type="button" className="form-results-actions__cancel" disabled={bulkPending} onClick={cancelSendToInterview}>
                Anulează
              </button>
            </div>
          )}
          {rejectConfirmation && (
            <div className="form-results-actions__confirm" role="group" aria-label="Confirmă notificarea candidaților respinși">
              <span>Vei anunța exact {rejectEligible.length} candidați că nu au avansat.</span>
              <button type="button" className="dash-button" disabled={bulkPending} onClick={rejectEvaluatedCandidates}>
                Confirmă și anunță
              </button>
              <button type="button" className="form-results-actions__cancel" disabled={bulkPending} onClick={cancelBulkReject}>
                Anulează
              </button>
            </div>
          )}
          {bulkMessage && (
            <p
              className={bulkMessage.ok ? "dash-form-message dash-form-message--success" : "dash-form-message dash-form-message--error"}
              role="status"
              aria-live="polite"
            >
              {bulkMessage.text}
            </p>
          )}
        </section>
      )}

      {isBoardView && (
        <section className="dash-card form-results-centralizer" aria-labelledby="form-results-centralizer-title">
          <header className="form-results-centralizer__head">
            <div>
              <h3 id="form-results-centralizer-title">Clasament</h3>
              <p>Punctaj descrescător; egalitățile sunt ordonate după numele de familie.</p>
            </div>
            <div className="form-results-centralizer__head-actions">
              {canManage && (
                <label className="form-results-select-visible">
                  <input
                    type="checkbox"
                    checked={allVisibleNonRedSelected}
                    onChange={toggleVisibleNonRed}
                    disabled={!visibleNonRedActionableRows.length || bulkPending}
                  />
                  <span>Bifează toți candidații fără roșu</span>
                </label>
              )}
              <strong>{visibleBoardRows.length}</strong>
            </div>
          </header>
          <div className="form-results-centralizer__table-wrap">
            <table className="form-results-centralizer__table">
              <thead>
                <tr>
                  <th scope="col">Selectează</th>
                  <th scope="col">Loc</th>
                  <th scope="col">Candidat</th>
                  <th scope="col">Evaluatori · punctaj /6</th>
                  <th scope="col">Medie /6</th>
                  <th scope="col">Decizie / status</th>
                </tr>
              </thead>
              <tbody>
                {visibleBoardRows.map((row, index) => {
                  const status = statusFor(row.application);
                  const canSelectIndividually = canManage
                    && reviewStatuses.has(status)
                    && row.evaluations.length > 0
                    && !selectedForInterview.has(row.application.id);
                  const isSelectingThisCandidate = pending && selectedId === row.application.id;
                  return (
                    <tr
                      key={row.application.id}
                      className={[
                        selected?.id === row.application.id ? "is-selected" : "",
                        checkedIds.has(row.application.id) ? "is-checked" : "",
                      ].filter(Boolean).join(" ") || undefined}
                      role="button"
                      tabIndex={0}
                      aria-label={`Deschide fișa candidatului ${row.application.fullName}`}
                      onClick={() => selectCandidate(row.application.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectCandidate(row.application.id);
                        }
                      }}
                    >
                      <td
                        className="form-results-centralizer__select"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={checkedIds.has(row.application.id)}
                          disabled={!canManage || !isActionable(row) || bulkPending}
                          onChange={() => toggleChecked(row.application.id)}
                          aria-label={`Selectează candidatul ${row.application.fullName}`}
                        />
                      </td>
                      <td className="form-results-centralizer__rank">{index + 1}</td>
                      <th scope="row">
                        <strong>{row.application.fullName}</strong>
                        <small>{row.application.grade || "Clasa neprecizată"}</small>
                      </th>
                      <td className="form-results-centralizer__scores-cell">
                        {row.evaluations.length > 0 ? (
                          <div className="form-results-centralizer__scores">
                            {row.evaluations.map((evaluation) => (
                              <span
                                key={evaluation.reviewerId}
                                className={`form-results-score form-results-score--${evaluation.rating}`}
                                title={`${evaluation.reviewerName}: ${formatScore(evaluation.baseScore)}/6 · ${ratingLabel(evaluation.rating)}`}
                                aria-label={`${evaluation.reviewerName}: ${formatScore(evaluation.baseScore)} din 6, ${ratingLabel(evaluation.rating)}`}
                              >
                                {formatScore(evaluation.baseScore)}/6
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="form-results-centralizer__empty-score">Neevaluat</span>
                        )}
                      </td>
                      <td className="form-results-centralizer__mean">
                        {row.mean === null ? "—" : `${formatScore(row.mean)}/6`}
                      </td>
                      <td className="form-results-centralizer__decision-cell">
                        <span className={`form-results-decision form-results-decision--${statusDecision(status, row.decision)}`}>
                          {statusDecisionLabel(status, row.decision)}
                        </span>
                        {canSelectIndividually && (
                          <button
                            type="button"
                            className="form-results-row-select"
                            disabled={pending || bulkPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              sendToInterview(row.application);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            aria-label={`Trimite individual la interviu candidatul ${row.application.fullName}`}
                          >
                            {isSelectingThisCandidate ? "Se trimite…" : "Trimite la interviu"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visibleBoardRows.length && (
              <div className="form-results-centralizer__empty">Niciun candidat pentru filtrul ales.</div>
            )}
          </div>
        </section>
      )}

      {!isBoardView && <div className="interview-workspace form-results-workspace">
      <aside className="dash-card interview-candidates" aria-label="Formulare trimise de candidați">
        <div className="interview-candidate-tools">
          <label className="interview-search">
            <Search size={16} />
            <span className="sr-only">Caută un candidat</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută un candidat"
            />
          </label>
          <div className="interview-filters" aria-label="Filtrează evaluările formularelor">
            {(["all", "unrated", "green", "yellow", "red"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                aria-label={filterLabel(value)}
              >
                {value === "all"
                  ? "Toți"
                  : value === "unrated"
                    ? "Neevaluați"
                    : <span className={`interview-filter-dot interview-filter-dot--${value}`} />}
              </button>
            ))}
          </div>
        </div>

        <div className="interview-candidate-count">
          {filtered.length} din {applications.length} candidați
        </div>
        <div className="interview-candidate-list">
          {filtered.map((application) => {
            const applicationEvaluations = evaluationsByApplication.get(application.id) ?? [];
            const ownEvaluation = applicationEvaluations.find((item) => item.reviewerId === viewerId);
            return (
              <button
                type="button"
                key={application.id}
                className="interview-candidate"
                aria-current={selected?.id === application.id ? "true" : undefined}
                onClick={() => selectCandidate(application.id)}
              >
                <span className="dash-initials" aria-hidden="true">{initials(application.fullName)}</span>
                <span>
                  <strong>{application.fullName}</strong>
                  <small>{application.grade || "Clasa neprecizată"}</small>
                </span>
                {ownEvaluation
                    ? <span className={`interview-rating-dot interview-rating-dot--${ownEvaluation.rating}`} title={ratingLabel(ownEvaluation.rating)} />
                    : <span className="interview-unrated">Neevaluat</span>}
              </button>
            );
          })}
          {!filtered.length && (
            <div className="interview-list-empty">Niciun candidat pentru filtrul ales.</div>
          )}
        </div>
      </aside>

      {selected && (
        <CandidateFormResult
          key={selected.id}
          application={{ ...selected, status: statusFor(selected) }}
          fields={fieldsForApplication(selected, fields)}
          evaluations={selectedEvaluations}
          ownEvaluation={selectedEvaluations.find((item) => item.reviewerId === viewerId) ?? null}
          viewerId={viewerId}
          viewerName={viewerName}
          isBoardView={isBoardView}
          canManage={canManage}
          canEvaluate={canEvaluate}
          formDecision={selectedDecision}
          selectedForInterview={selectedForInterview.has(selected.id)}
          interviewEmailSent={interviewEmailSent.has(selected.id)}
          pending={pending}
          message={message}
          onEvaluationSaved={updateOwnEvaluation}
          onSelectForInterview={() => sendToInterview(selected)}
          onSendInterviewEmail={() => sendToInterview(selected)}
        />
      )}
      </div>
      }

      {isBoardView && selected && (
        <div className="form-results-board-detail">
          <CandidateFormResult
            key={selected.id}
            application={{ ...selected, status: statusFor(selected) }}
            fields={fieldsForApplication(selected, fields)}
            evaluations={selectedEvaluations}
            ownEvaluation={selectedEvaluations.find((item) => item.reviewerId === viewerId) ?? null}
            viewerId={viewerId}
            viewerName={viewerName}
            isBoardView={isBoardView}
            canManage={canManage}
            canEvaluate={canEvaluate}
            formDecision={selectedDecision}
            selectedForInterview={selectedForInterview.has(selected.id)}
            interviewEmailSent={interviewEmailSent.has(selected.id)}
            pending={pending}
            message={message}
            onEvaluationSaved={updateOwnEvaluation}
            onSelectForInterview={() => sendToInterview(selected)}
            onSendInterviewEmail={() => sendToInterview(selected)}
          />
        </div>
      )}

      {isBoardView && !selected && (
        <div className="dash-card dash-empty form-results-board-detail interview-empty">
          <strong>Niciun formular găsit</strong>
          Schimbă filtrul sau termenul de căutare.
        </div>
      )}
    </div>
  );
}

function CandidateFormResult({
  application,
  fields,
  evaluations,
  ownEvaluation,
  viewerId,
  viewerName,
  isBoardView,
  canManage,
  canEvaluate,
  formDecision,
  selectedForInterview,
  interviewEmailSent,
  pending,
  message,
  onEvaluationSaved,
  onSelectForInterview,
  onSendInterviewEmail,
}: {
  application: SignupApplication;
  fields: SignupField[];
  evaluations: ApplicationFormEvaluation[];
  ownEvaluation: ApplicationFormEvaluation | null;
  viewerId: string;
  viewerName: string;
  isBoardView: boolean;
  canManage: boolean;
  canEvaluate: boolean;
  formDecision: FormDecision;
  selectedForInterview: boolean;
  interviewEmailSent: boolean;
  pending: boolean;
  message: { text: string; ok: boolean } | null;
  onEvaluationSaved: (evaluation: ApplicationFormEvaluation) => void;
  onSelectForInterview: () => void;
  onSendInterviewEmail: () => void;
}) {
  const canSelect = !selectedForInterview
    && reviewStatuses.has(application.status)
    && evaluations.length > 0;
  const pendingDecisionTitle = formDecision === "not_selected"
    ? "Fără majoritate verde"
    : formDecision === "unrated"
      ? "Așteaptă evaluările"
      : "Etapa formularului este încheiată";
  const pendingDecisionDescription = formDecision === "not_selected"
    ? "Evaluările complete nu au dat majoritate verde. Candidatul nu intră în lotul de interviu."
    : formDecision === "unrated"
      ? "Așteaptă cel puțin o evaluare înainte de orice decizie Board."
      : "Candidatura nu mai este în etapa de selecție pentru interviu.";

  return (
    <section className="interview-review" aria-labelledby="form-candidate-title">
      <header className="dash-card interview-candidate-head form-candidate-head">
        <div className="dash-initials" aria-hidden="true">{initials(application.fullName)}</div>
        <div>
          <h2 id="form-candidate-title">{application.fullName}</h2>
          <p>{application.email}{application.grade ? ` · ${application.grade}` : ""}</p>
        </div>
        <span className={`form-result-status form-result-stage--${selectedForInterview ? "interview" : application.status === "rejected" ? "rejected" : "review"}`}>
          {selectedForInterview
            ? interviewEmailSent ? "Selectat · email trimis" : "Selectat · email netrimis"
            : application.status === "rejected" ? "Respins" : "Neselectat"}
        </span>
      </header>

      <div className="form-result-facts" aria-label="Rezumat formular">
        <span><strong>{application.completionPercentage}%</strong> completat</span>
        <span><strong>{application.missingRequiredFields.length}</strong> câmpuri obligatorii lipsă</span>
        <span>Trimis {formatDateTime(application.submittedAt ?? application.updatedAt)}</span>
      </div>

      <div className="form-results-private-note">
        <ShieldCheck size={17} />
        <span>{isBoardView ? "Doar Board-ul vede toate evaluările." : "Evaluarea ta este vizibilă doar pentru tine și Board."}</span>
      </div>

      <details className="dash-card interview-answers" open>
        <summary>
          Răspunsurile candidatului
          <span>{fields.length} câmpuri</span>
        </summary>
        <dl>
          {fields.map((field) => {
            const value = answerValue(application, field);
            return (
              <div key={field.key}>
                <dt>{field.label || field.sourceHeader}</dt>
                <dd>{value || <span>Fără răspuns</span>}</dd>
              </div>
            );
          })}
        </dl>
      </details>

      {isBoardView && <FormTeamResults evaluations={evaluations} />}

      {canEvaluate && (
        <FormEvaluation
          applicationId={application.id}
          evaluation={ownEvaluation}
          viewerId={viewerId}
          viewerName={viewerName}
          questions={fields
            .filter((field) => isRecruitmentQuestionKey(field.key))
            .map((field) => ({ key: field.key, label: field.label }))}
          onSaved={onEvaluationSaved}
        />
      )}

      {isBoardView && (
        <section className="dash-card form-result-next-step" aria-labelledby="form-next-step-title">
          <div className="form-result-next-copy">
            {selectedForInterview ? <CheckCircle2 size={20} /> : <UserRoundCheck size={20} />}
            <div>
              <span className="dash-eyebrow">Decizia Board-ului</span>
              <h3 id="form-next-step-title">
                {selectedForInterview
                  ? "Candidatul este selectat pentru interviu"
                  : canSelect
                    ? "Selectează candidatul pentru interviu"
                    : pendingDecisionTitle}
              </h3>
              <p>
                {selectedForInterview
                  ? interviewEmailSent
                    ? "Invitația a fost trimisă. Candidatul apare și în tabul Interviuri."
                    : "Candidatul este în etapa de interviu, dar emailul trebuie retrimis."
                  : canSelect
                    ? "Decizia este manuală. Butonul mută candidatul în etapa de interviu și îi trimite emailul."
                    : pendingDecisionDescription}
              </p>
            </div>
          </div>

          <div className="form-result-next-actions">
            {selectedForInterview && !interviewEmailSent && canManage && (
              <button type="button" className="dash-button" disabled={pending} onClick={onSendInterviewEmail}>
                {pending ? "Se trimite…" : "Retrimite emailul de interviu"}
              </button>
            )}
            {selectedForInterview ? (
              <Link className="dash-button dash-button--secondary" href={`/board/interviuri?view=interviuri&application=${application.id}`}>
                Deschide tabul Interviuri <ArrowRight size={16} />
              </Link>
            ) : canSelect && canManage ? (
              <button type="button" className="dash-button" disabled={pending} onClick={onSelectForInterview}>
                {pending ? "Se trimite…" : "Trimite la interviu"} <ArrowRight size={16} />
              </button>
            ) : null}
          </div>

          <div className="form-result-action-message" aria-live="polite">
            {message && (
              <p className={message.ok ? "dash-form-message dash-form-message--success" : "dash-form-message dash-form-message--error"}>
                {message.text}
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

function FormEvaluation({
  applicationId,
  evaluation,
  viewerId,
  viewerName,
  questions,
  onSaved,
}: {
  applicationId: string;
  evaluation: ApplicationFormEvaluation | null;
  viewerId: string;
  viewerName: string;
  questions: readonly { key: string; label: string }[];
  onSaved: (evaluation: ApplicationFormEvaluation) => void;
}) {
  const questionKeys = questions.map((question) => question.key);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>(
    evaluation?.questionScores ?? {},
  );
  const [comment, setComment] = useState(evaluation?.comment ?? "");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const baseScore = questionKeys.reduce((sum, key) => sum + (questionScores[key] ?? 0), 0);
  const rating = formRatingForScore(baseScore);

  function save() {
    if (questionKeys.some((key) => questionScores[key] === undefined)) {
      setMessage({ text: "Acordă punctaj fiecărei întrebări.", ok: false });
      return;
    }
    startTransition(async () => {
      const result = await saveApplicationEvaluation({
        applicationId,
        questionScores,
        baseScore,
        comment,
      });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) {
        onSaved({
          applicationId,
          reviewerId: viewerId,
          reviewerName: viewerName,
          rating: result.evaluation.rating as ApplicationRating,
          comment: result.evaluation.comment,
          baseScore: result.evaluation.base_score,
          questionScores: (result.evaluation.question_scores ?? {}) as Record<string, number>,
          updatedAt: result.evaluation.updated_at,
        });
      }
    });
  }

  return (
    <section className="dash-card interview-evaluation-form form-evaluation" aria-label="Evaluarea formularului">
      <header className="form-evaluation__head">
        <div>
          <h3>Evaluarea ta</h3>
          <p>Notează fiecare răspuns cu 0, 0,5 sau 1 punct.</p>
        </div>
        <strong>{baseScore.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/6</strong>
      </header>

      <fieldset>
        <legend>Punctaj pe răspuns</legend>
        <div className="form-rubric-scale" aria-label="Scara de punctaj">
          {formScoreOptions.map((option) => (
            <span key={option.value}>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </span>
          ))}
        </div>
        <div className="form-rubric-list">
          {questions.map((question, index) => (
            <div key={question.key} className="form-rubric-row">
              <strong>{index + 1}. {question.label}</strong>
              <div className="form-rubric-options" role="radiogroup" aria-label={`Punctaj întrebarea ${index + 1}`}>
                {formScoreOptions.map((option) => (
                  <label key={option.value} className="form-rubric-option">
                    <input
                      type="radio"
                      name={`form-score-${applicationId}-${question.key}`}
                      value={option.value}
                      checked={questionScores[question.key] === option.value}
                      onChange={() => setQuestionScores((current) => ({ ...current, [question.key]: option.value }))}
                      aria-label={`${option.label} puncte · ${option.hint}`}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className={`form-score-summary form-score-summary--${rating}`}>
        <strong>{ratingOptions.find((option) => option.value === rating)?.label}</strong>
        <span>Departajare: 0–2 roșu · 2,5–&lt;4 galben · 4–6 verde. Trece mai departe doar majoritatea verde.</span>
      </div>

      <label className="interview-comment">
        <span><MessageSquareText size={15} /> Comentariul tău despre formular (opțional)</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Notează ce ți-a atras atenția în răspunsuri și ce ar trebui să verifice Board-ul."
        />
        <small>{comment.length}/5000 caractere</small>
      </label>

      <div className="interview-save-row">
        <div aria-live="polite">
          {message && <p className={message.ok ? "dash-form-message dash-form-message--success" : "dash-form-message dash-form-message--error"}>{message.text}</p>}
          {!message && evaluation && <p>Salvat ultima dată la {formatDateTime(evaluation.updatedAt)}</p>}
        </div>
        <button type="button" className="dash-button" onClick={save} disabled={pending}>
          {pending ? "Se salvează..." : evaluation ? "Actualizează evaluarea" : "Salvează evaluarea"}
        </button>
      </div>
    </section>
  );
}

function FormTeamResults({
  evaluations,
}: {
  evaluations: ApplicationFormEvaluation[];
}) {
  return (
    <details className="dash-card interview-team-results form-team-results">
      <summary>
        <div>
          <strong>Evaluările formularului</strong>
          <span>Vezi punctajele și comentariile membrilor</span>
        </div>
        <strong>{evaluations.length}</strong>
      </summary>

      {evaluations.length > 0 ? (
        <div className="interview-team-result-list">
          {evaluations.map((item) => (
            <article key={item.reviewerId}>
              <div className="interview-team-result-head">
                <span className="dash-initials" aria-hidden="true">{initials(item.reviewerName)}</span>
                <div>
                  <strong>{item.reviewerName}</strong>
                  <small>Actualizat {formatDateTime(item.updatedAt)} · {item.baseScore ?? "—"}/6</small>
                </div>
                <span className={`interview-verdict interview-verdict--${item.rating}`}>
                  {ratingLabel(item.rating)}
                </span>
              </div>
              <p>{item.comment}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="interview-team-empty">
          Niciun membru nu a evaluat încă acest formular.
        </div>
      )}
    </details>
  );
}

function answerValue(application: SignupApplication, field: SignupField) {
  const importedValue = field.sourceHeader
    ? application.sourcePayload[field.sourceHeader]
    : undefined;
  return String(importedValue ?? application.answers[field.key] ?? "");
}

function fieldsForApplication(
  application: SignupApplication,
  fallback: SignupField[],
): SignupField[] {
  return application.formFields?.length ? application.formFields : fallback;
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

function ratingLabel(rating: ApplicationRating) {
  return ratingOptions.find((option) => option.value === rating)?.label ?? rating;
}

function filterLabel(filter: FormFilter) {
  if (filter === "all") return "Arată toate formularele";
  if (filter === "unrated") return "Arată formularele neevaluate";
  return `Filtrează formularele: ${ratingLabel(filter)}`;
}

function filterShortLabel(filter: FormFilter) {
  if (filter === "all") return "Toate";
  if (filter === "unrated") return "Neevaluate";
  if (filter === "green") return "Verde";
  if (filter === "yellow") return "Galben";
  return "Roșu";
}

function formatScore(score: number | null | undefined) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "—";
  return score.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function statusDecision(status: string, decision: "interview" | "not_selected" | "unrated") {
  if (interviewStatuses.has(status)) return "interview";
  if (status === "rejected") return "rejected";
  if (status === "accepted") return "accepted";
  if (status === "waiting_list") return "waiting";
  if (decision === "interview") return "review-interview";
  if (decision === "not_selected") return "review-rejected";
  return "review";
}

function statusDecisionLabel(status: string, decision: "interview" | "not_selected" | "unrated") {
  if (interviewStatuses.has(status)) return "Trimis la interviu";
  if (status === "rejected") return "Respins";
  if (status === "accepted") return "Acceptat";
  if (status === "waiting_list") return "Listă de așteptare";
  if (decision === "interview") return "Propus pentru interviu";
  if (decision === "not_selected") return "Nu avansează";
  return "Neevaluat";
}
