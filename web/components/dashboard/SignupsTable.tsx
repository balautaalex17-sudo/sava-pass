"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronDown,
  Columns3,
  Download,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  runRecruitmentBatchAction,
  updateApplicationOperations,
} from "@/app/(dashboard)/board/inscrieri/actions";
import { formatDateTime } from "@/lib/dashboard/format";

export interface SignupField {
  key: string;
  label: string;
  sourceHeader: string;
  position: number;
  type: string;
  required: boolean;
}

export interface SignupApplication {
  id: string;
  formId: string | null;
  formFields?: SignupField[];
  fullName: string;
  email: string;
  grade: string | null;
  answers: Record<string, string>;
  sourcePayload: Record<string, string>;
  status: string;
  completionPercentage: number;
  isComplete: boolean;
  missingRequiredFields: string[];
  reviewerId: string | null;
  reviewerName: string | null;
  updatedAt: string;
  submittedAt: string | null;
  source: string;
}

export interface ReviewerOption {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  submitted: "Trimisă",
  under_review: "În evaluare",
  selected_for_interview: "Invitat la interviu",
  interview_scheduled: "Invitat la interviu (status vechi)",
  interview_completed: "Interviu încheiat",
  accepted: "Acceptat",
  waiting_list: "Listă de așteptare",
  rejected: "Respins",
};

const interviewEligibleStatuses = new Set(["submitted", "under_review"]);
const acceptanceEligibleStatuses = new Set([
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
  "waiting_list",
]);

const systemColumns = [
  "Completare",
  "Status aplicație",
  "Responsabil aplicație",
  "Ultima actualizare",
  "Acțiuni",
];

function valueFor(application: SignupApplication, field: SignupField) {
  return String(
    application.sourcePayload[field.sourceHeader]
      ?? application.answers[field.key]
      ?? "",
  );
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function SignupsTable({
  fields,
  applications,
  reviewers,
  canManage,
}: {
  fields: SignupField[];
  applications: SignupApplication[];
  reviewers: ReviewerOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [completion, setCompletion] = useState<"all" | "complete" | "incomplete">("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "__updated",
    direction: "desc",
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState(
    () => new Set(fields.map((field) => field.key)),
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SignupApplication | null>(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [workflowMessage, setWorkflowMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [workflowPending, startWorkflow] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const acceptanceDialogRef = useRef<HTMLDialogElement>(null);
  const pageSize = 25;
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => applications.filter((application) => {
    if (completion === "complete" && !application.isComplete) return false;
    if (completion === "incomplete" && application.isComplete) return false;
    if (status !== "all" && application.status !== status) return false;

    const query = deferredSearch.trim().toLocaleLowerCase("ro");
    if (
      query
      && !fields.some((field) => valueFor(application, field)
        .toLocaleLowerCase("ro")
        .includes(query))
    ) return false;

    return fields.every((field) => {
      const fieldFilter = filters[field.key]?.trim();
      return !fieldFilter || valueFor(application, field)
        .toLocaleLowerCase("ro")
        .includes(fieldFilter.toLocaleLowerCase("ro"));
    });
  }).sort((left, right) => {
    function getValue(application: SignupApplication) {
      if (sort.key === "__completion") return application.completionPercentage;
      if (sort.key === "__status") return statusLabels[application.status] ?? application.status;
      if (sort.key === "__reviewer") return application.reviewerName ?? "";
      if (sort.key === "__updated") return application.updatedAt;
      const field = fields.find((item) => item.key === sort.key);
      return field ? valueFor(application, field) : "";
    }

    return String(getValue(left)).localeCompare(String(getValue(right)), "ro", {
      numeric: true,
      sensitivity: "base",
    }) * (sort.direction === "asc" ? 1 : -1);
  }), [applications, completion, deferredSearch, fields, filters, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleFields = fields.filter((field) => visibleKeys.has(field.key));
  const selectedApplications = applications.filter((application) => selectedIds.has(application.id));
  const interviewEligible = selectedApplications.filter((application) => (
    interviewEligibleStatuses.has(application.status)
  ));
  const acceptanceEligible = selectedApplications.filter((application) => (
    acceptanceEligibleStatuses.has(application.status)
  ));
  const allPageSelected = pageRows.length > 0
    && pageRows.every((application) => selectedIds.has(application.id));

  function changeSort(key: string) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  }

  function open(application: SignupApplication) {
    setSelected(application);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setSelected(null);
  }

  function toggleSelected(applicationId: string) {
    setWorkflowMessage(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  function togglePage() {
    setWorkflowMessage(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const application of pageRows) {
        if (allPageSelected) next.delete(application.id);
        else next.add(application.id);
      }
      return next;
    });
  }

  function runWorkflowAction(action: "select_for_interview" | "accept") {
    const eligible = action === "select_for_interview"
      ? interviewEligible
      : acceptanceEligible;
    if (!eligible.length) return;

    if (action === "accept") {
      acceptanceDialogRef.current?.showModal();
      return;
    }

    submitWorkflowAction(action, eligible);
  }

  function submitWorkflowAction(
    action: "select_for_interview" | "accept",
    eligible: SignupApplication[],
  ) {
    startWorkflow(async () => {
      const result = await runRecruitmentBatchAction({
        action,
        applicationIds: eligible.map((application) => application.id),
      });
      setWorkflowMessage({ text: result.message, ok: result.ok });
      if (result.ok) setSelectedIds(new Set());
      router.refresh();
    });
  }

  function closeAcceptanceDialog() {
    acceptanceDialogRef.current?.close();
  }

  function confirmAcceptance() {
    if (!acceptanceEligible.length) {
      closeAcceptanceDialog();
      return;
    }

    closeAcceptanceDialog();
    submitWorkflowAction("accept", acceptanceEligible);
  }

  function exportCsv() {
    const header = [...fields.map((field) => field.sourceHeader), ...systemColumns.slice(0, 4)];
    const rows = filtered.map((application) => [
      ...fields.map((field) => valueFor(application, field)),
      `${application.completionPercentage}%`,
      statusLabels[application.status] ?? application.status,
      application.reviewerName ?? "",
      application.updatedAt,
    ]);
    const blob = new Blob(
      [`\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "inscrieri-filtrate.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="signup-toolbar">
        <label className="signup-search">
          <Search size={16} />
          <span className="sr-only">Caută în înscrieri</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Caută în toate răspunsurile"
          />
        </label>
        <select
          aria-label="Filtru completare"
          value={completion}
          onChange={(event) => {
            setCompletion(event.target.value as typeof completion);
            setPage(1);
          }}
        >
          <option value="all">Toate completările</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <select
          aria-label="Filtru status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Toate statusurile</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <details className="signup-columns">
          <summary><Columns3 size={16} /> Coloane</summary>
          <div>
            {fields.map((field) => (
              <label key={field.key}>
                <input
                  type="checkbox"
                  checked={visibleKeys.has(field.key)}
                  onChange={(event) => setVisibleKeys((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(field.key);
                    else next.delete(field.key);
                    return next;
                  })}
                />
                {field.sourceHeader}
              </label>
            ))}
          </div>
        </details>
        <button
          type="button"
          className="dash-button dash-button--secondary"
          onClick={exportCsv}
        >
          <Download size={16} /> Exportă
        </button>
      </div>

      {canManage && (
        <section className="signup-workflow dash-card" aria-label="Selecție candidați">
          <div className="signup-workflow-copy">
            <strong>
              {selectedIds.size
                ? `${selectedIds.size} ${selectedIds.size === 1 ? "selectat" : "selectați"}`
                : "Selecție Board"}
            </strong>
            <span>
              {selectedIds.size
                ? "Orice membru Board poate selecta candidații pentru interviu. Emailul se trimite separat din clasament."
                : "Bifează manual candidații. Schimbarea etapei nu trimite niciun email."}
            </span>
          </div>
          <div className="signup-workflow-actions">
            <button
              type="button"
              className="dash-button dash-button--secondary"
              disabled={workflowPending || interviewEligible.length === 0}
              onClick={() => runWorkflowAction("select_for_interview")}
            >
              <CalendarCheck size={16} />
              Selectează pentru interviu{interviewEligible.length ? ` (${interviewEligible.length})` : ""}
            </button>
            <button
              type="button"
              className="dash-button"
              disabled={workflowPending || acceptanceEligible.length === 0}
              onClick={() => runWorkflowAction("accept")}
            >
              <UserRoundCheck size={16} />
              Acceptă și creează cont{acceptanceEligible.length ? ` (${acceptanceEligible.length})` : ""}
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                className="signup-clear-selection"
                onClick={() => setSelectedIds(new Set())}
                disabled={workflowPending}
              >
                Șterge selecția
              </button>
            )}
          </div>
          {workflowMessage && (
            <p
              className={workflowMessage.ok
                ? "dash-form-message dash-form-message--success"
                : "dash-form-message dash-form-message--error"}
              role="status"
            >
              {workflowMessage.text}
            </p>
          )}
        </section>
      )}

      <div className="signup-count">
        <SlidersHorizontal size={14} /> {filtered.length} din {applications.length} aplicații
      </div>
      <div className="signup-grid-wrap dash-card">
        <table className={`signup-grid${canManage ? " signup-grid--selectable" : ""}`}>
          <thead>
            <tr>
              {canManage && (
                <th className="signup-select-column">
                  <label>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      aria-label="Selectează candidații de pe pagina curentă"
                    />
                  </label>
                </th>
              )}
              {visibleFields.map((field) => (
                <th
                  key={field.key}
                  className={field.position < 3 ? `signup-pin signup-pin-${field.position}` : undefined}
                >
                  <button type="button" onClick={() => changeSort(field.key)}>
                    {field.sourceHeader}<ChevronDown size={13} />
                  </button>
                </th>
              ))}
              <th className="signup-system"><button type="button" onClick={() => changeSort("__completion")}>Completare<ChevronDown size={13} /></button></th>
              <th className="signup-system"><button type="button" onClick={() => changeSort("__status")}>Status aplicație<ChevronDown size={13} /></button></th>
              <th className="signup-system"><button type="button" onClick={() => changeSort("__reviewer")}>Responsabil aplicație<ChevronDown size={13} /></button></th>
              <th className="signup-system"><button type="button" onClick={() => changeSort("__updated")}>Ultima actualizare<ChevronDown size={13} /></button></th>
              <th className="signup-system">Acțiuni</th>
            </tr>
            <tr className="signup-filter-row">
              {canManage && <th className="signup-select-column" />}
              {visibleFields.map((field) => (
                <th
                  key={field.key}
                  className={field.position < 3 ? `signup-pin signup-pin-${field.position}` : undefined}
                >
                  <input
                    aria-label={`Filtrează ${field.sourceHeader}`}
                    value={filters[field.key] ?? ""}
                    onChange={(event) => {
                      setFilters((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }));
                      setPage(1);
                    }}
                    placeholder="Filtru"
                  />
                </th>
              ))}
              <th colSpan={5} className="signup-system" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((application) => (
              <tr
                key={application.id}
                className={selectedIds.has(application.id) ? "is-selected" : undefined}
              >
                {canManage && (
                  <td className="signup-select-column">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(application.id)}
                        onChange={() => toggleSelected(application.id)}
                        aria-label={`Selectează aplicația ${application.id}`}
                      />
                    </label>
                  </td>
                )}
                {visibleFields.map((field) => {
                  const value = valueFor(application, field);
                  const long = field.type === "long_text"
                    || value.length > 90
                    || value.includes("\n");
                  return (
                    <td
                      key={field.key}
                      className={field.position < 3 ? `signup-pin signup-pin-${field.position}` : undefined}
                    >
                      {long ? (
                        <button
                          type="button"
                          className="signup-long-answer"
                          onClick={() => open(application)}
                          aria-label={`Deschide răspunsul complet pentru ${field.sourceHeader}`}
                        >
                          {value || "—"}
                        </button>
                      ) : value || "—"}
                    </td>
                  );
                })}
                <td className="signup-system"><span className={application.isComplete ? "dash-status dash-status--success" : "dash-status dash-status--warning"}>{application.completionPercentage}%</span></td>
                <td className="signup-system">{statusLabels[application.status] ?? application.status}</td>
                <td className="signup-system">{application.reviewerName ?? "Nealocat"}</td>
                <td className="signup-system">{formatDateTime(application.updatedAt)}</td>
                <td className="signup-system"><button type="button" className="signup-open" onClick={() => open(application)}>Deschide</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pageRows.length && (
          <div className="dash-empty">
            <strong>Nicio aplicație</strong>
            Nu există rânduri care să corespundă filtrelor.
          </div>
        )}
      </div>
      <div className="signup-pagination">
        <span>Pagina {currentPage} din {totalPages}</span>
        <div>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Următor</button>
        </div>
      </div>

      <dialog
        ref={acceptanceDialogRef}
        className="signup-confirm-dialog"
        aria-labelledby="signup-confirm-title"
        aria-describedby="signup-confirm-description"
        onCancel={closeAcceptanceDialog}
      >
        <div className="signup-confirm-content">
          <div className="signup-confirm-icon" aria-hidden="true">
            <UserRoundCheck size={21} />
          </div>
          <div>
            <h2 id="signup-confirm-title">
              Accepți {acceptanceEligible.length}{" "}
              {acceptanceEligible.length === 1 ? "candidat" : "candidați"}?
            </h2>
            <p id="signup-confirm-description">
              {acceptanceEligible.length === 1
                ? "Se folosește emailul original din formular și se trimite un cod de activare care nu expiră până la prima folosire."
                : "Se folosesc emailurile originale din formulare și se trimit coduri de activare care nu expiră până la prima folosire."}
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
          <button
            type="button"
            className="dash-button"
            onClick={confirmAcceptance}
          >
            Acceptă și creează conturile
          </button>
        </div>
      </dialog>

      <dialog ref={dialogRef} className="signup-drawer" onCancel={close}>
        {selected && (
          <>
            <div className="signup-drawer-head">
              <div>
                <span className="dash-eyebrow">Aplicație completă</span>
                <h2>{valueFor(selected, fields.find((field) => field.key === "full_name") ?? fields[0]) || "Candidat"}</h2>
                <p>{selected.completionPercentage}% completă · {statusLabels[selected.status] ?? selected.status}</p>
              </div>
              <button type="button" onClick={close} aria-label="Închide"><X size={20} /></button>
            </div>
            {!selected.isComplete && (
              <div className="signup-missing">
                <strong>Câmpuri obligatorii lipsă</strong>
                <ul>{selected.missingRequiredFields.map((field) => <li key={field}>{field}</li>)}</ul>
              </div>
            )}
            <dl className="signup-detail-list">
              {fields.map((field) => (
                <div key={field.key}>
                  <dt>{field.sourceHeader}</dt>
                  <dd>{valueFor(selected, field) || <span>Fără răspuns</span>}</dd>
                </div>
              ))}
            </dl>
            {canManage && (
              <ApplicationManagement
                key={selected.id}
                application={selected}
                reviewers={reviewers}
              />
            )}
          </>
        )}
      </dialog>
    </>
  );
}

function ApplicationManagement({
  application,
  reviewers,
}: {
  application: SignupApplication;
  reviewers: ReviewerOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(application.status);
  const [reviewer, setReviewer] = useState(application.reviewerId ?? "");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateApplicationOperations({
        applicationId: application.id,
        status,
        reviewerId: reviewer || null,
      });
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="signup-management">
      <h3>Decizie Board</h3>
      <p className="signup-management-note">
        Orice membru Board poate schimba etapa. Selectarea pentru interviu nu trimite email; invitația se trimite separat din clasament.
      </p>
      <div className="dash-form-grid">
        <div className="dash-field">
          <label htmlFor="application-status">Status</label>
          <select
            id="application-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="dash-field">
          <label htmlFor="application-reviewer">Responsabil aplicație</label>
          <select
            id="application-reviewer"
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
          >
            <option value="">Nealocat</option>
            {reviewers.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className={message.ok
            ? "dash-form-message dash-form-message--success"
            : "dash-form-message dash-form-message--error"}
        >
          {message.text}
        </p>
      )}
      <button type="button" className="dash-button" disabled={pending} onClick={save}>
        {pending ? "Se salvează..." : "Salvează modificările"}
      </button>
    </section>
  );
}
