import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, ClipboardPenLine } from "lucide-react";
import { requireAnyPagePermission } from "@/lib/dashboard/auth";
import {
  interviewScoreTotal,
  isValidInterviewCategoryScores,
  type InterviewCategoryScores,
} from "@/lib/recruitment-spec";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { FormResponsesView } from "./FormResponsesView";
import {
  InterviewWorkspace,
  type InterviewCandidate,
  type InterviewEvaluationView,
} from "./InterviewWorkspace";

export const metadata: Metadata = {
  title: "Recrutări",
  robots: { index: false, follow: false },
};

type InterviewRow = {
  id: string;
  application_id: string;
};

type InterviewEvaluationRow = {
  id: string;
  interview_id: string;
  category_scores: Json;
  comment: string;
  created_at: string;
  updated_at: string;
};

function stringRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    item == null ? "" : typeof item === "string" ? item : String(item),
  ]));
}

function phoneFromRecord(record: Record<string, string>): string {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = key
      .toLocaleLowerCase("ro")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[\s_-]/g, "");
    if ((normalizedKey === "phone" || normalizedKey === "telefon" || normalizedKey === "phonenumber" || normalizedKey === "numardetelefon") && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function applicationPhone(
  phone: string,
  answers: Record<string, string>,
  sourcePayload: Record<string, string>,
): string {
  return phone.trim() || phoneFromRecord(answers) || phoneFromRecord(sourcePayload);
}

function parseCategoryScores(value: Json): InterviewCategoryScores | null {
  return isValidInterviewCategoryScores(value) ? value : null;
}

export default async function InterviewsWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{
    application?: string | string[];
    view?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedApplicationId = typeof params.application === "string"
    ? params.application
    : undefined;
  const requestedView = typeof params.view === "string" ? params.view : undefined;
  const viewer = await requireAnyPagePermission([
    "evaluate_recruitment_forms",
    "evaluate_interview_candidates",
  ]);
  const isBoardView = viewer.isAdminEquivalent;
  const canViewForms = viewer.permissions.has("view_recruitment_signups")
    || viewer.permissions.has("evaluate_recruitment_forms");
  // Interview access is a Board capability, not an operational permission.
  const canViewInterviews = viewer.isAdminEquivalent;
  const wantsInterviews = requestedView === "interviuri" || Boolean(requestedApplicationId);
  const activeView = wantsInterviews && canViewInterviews ? "interviuri" : "raspunsuri";

  if (activeView === "raspunsuri") {
    return (
      <FormsPageShell
        activeView="raspunsuri"
        canViewForms={canViewForms}
        canViewInterviews={canViewInterviews}
        isBoardView={isBoardView}
      >
        {canViewForms ? (
          <FormResponsesView
            viewerId={viewer.profile.id}
            viewerName={viewer.profile.full_name}
            isBoardView={isBoardView}
            canManage={viewer.permissions.has("manage_recruitment_signups")}
            canImport={viewer.permissions.has("import_recruitment_signups")}
            canEvaluate={viewer.permissions.has("evaluate_recruitment_forms")}
          />
        ) : (
          <div className="dash-card dash-empty">
            <strong>Formularele nu sunt disponibile</strong>
            Ai nevoie de permisiunea de evaluare a formularelor pentru a vedea această etapă.
          </div>
        )}
      </FormsPageShell>
    );
  }

  // Only the Board branch reaches this query. A non-Board request for
  // ?view=interviuri has already fallen back to FormResponsesView above.
  const { data: interviewData, error: interviewError } = await supabaseAdmin
    .from("interviews")
    .select("id, application_id")
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });
  if (interviewError) throw interviewError;

  const interviews = (interviewData ?? []) as InterviewRow[];
  const commonProps = {
    activeView: "interviuri" as const,
    canViewForms,
    canViewInterviews,
    isBoardView,
  };
  if (!interviews.length) {
    return (
      <FormsPageShell {...commonProps}>
        <InterviewView candidates={[]} isBoardView />
      </FormsPageShell>
    );
  }

  const applicationIds = interviews.map((interview) => interview.application_id);
  const [applicationsResult, evaluationsResult] = await Promise.all([
    supabaseAdmin
      .from("membership_applications")
      .select("id, form_id, full_name, email, phone, grade, status, answers, source_payload")
      .in("id", applicationIds),
    supabaseAdmin
      .from("interview_evaluations")
      .select("id, interview_id, category_scores, comment, created_at, updated_at")
      .in("interview_id", interviews.map((interview) => interview.id)),
  ]);
  if (applicationsResult.error) throw applicationsResult.error;
  if (evaluationsResult.error) throw evaluationsResult.error;
  const applications = applicationsResult.data;

  const formIds = [...new Set((applications ?? []).map((application) => application.form_id))];
  const { data: fields, error: fieldsError } = formIds.length
    ? await supabaseAdmin
      .from("recruitment_fields")
      .select("form_id, key, label, source_header, position")
      .in("form_id", formIds)
      .order("position")
    : { data: [], error: null };
  if (fieldsError) throw fieldsError;

  const typedEvaluationRows = (evaluationsResult.data ?? []) as InterviewEvaluationRow[];
  const applicationMap = new Map((applications ?? []).map((application) => [application.id, application]));
  const candidates: InterviewCandidate[] = interviews.flatMap((interview) => {
    const application = applicationMap.get(interview.application_id);
    if (!application) return [];
    const answers = stringRecord(application.answers);
    const sourcePayload = stringRecord(application.source_payload);
    const applicationFields = (fields ?? []).filter((field) => field.form_id === application.form_id);
    const evaluations = typedEvaluationRows
      .filter((evaluation) => evaluation.interview_id === interview.id)
      .sort((left, right) => {
        const createdAtOrder = left.created_at.localeCompare(right.created_at);
        return createdAtOrder || left.id.localeCompare(right.id);
      })
      .map((evaluation): InterviewEvaluationView => {
        const categoryScores = parseCategoryScores(evaluation.category_scores);
        return {
          evaluationId: evaluation.id,
          categoryScores,
          score: categoryScores ? interviewScoreTotal(categoryScores) : null,
          needsUpdate: categoryScores === null,
          comment: evaluation.comment,
          createdAt: evaluation.created_at,
          updatedAt: evaluation.updated_at,
        };
      });
    return [{
      interviewId: interview.id,
      applicationId: application.id,
      fullName: application.full_name,
      email: application.email,
      phone: applicationPhone(application.phone, answers, sourcePayload),
      grade: application.grade,
      status: application.status,
      answers: applicationFields.map((field) => ({
        key: field.key,
        label: field.source_header || field.label,
        value: sourcePayload[field.source_header] ?? answers[field.key] ?? "",
      })),
      evaluations,
    }];
  });

  const initialInterviewId = requestedApplicationId
    ? candidates.find((candidate) => candidate.applicationId === requestedApplicationId)?.interviewId
    : undefined;

  return (
    <FormsPageShell {...commonProps}>
      <InterviewView
        candidates={candidates}
        isBoardView
        initialInterviewId={initialInterviewId}
      />
    </FormsPageShell>
  );
}

function InterviewView({
  candidates,
  isBoardView,
  initialInterviewId,
}: {
  candidates: InterviewCandidate[];
  isBoardView: boolean;
  initialInterviewId?: string;
}) {
  return (
    <section className="forms-view" aria-labelledby="interviews-view-title">
      <header className="forms-view-head interview-page-head">
        <div>
          <h2 id="interviews-view-title">Interviuri</h2>
          <p>Alege un candidat, adaugă punctajele intervievatorilor și salvează.</p>
        </div>
        <div className="interview-progress" aria-label={`${candidates.length} candidați promovați`}>
          <span>
            <strong>{candidates.length}</strong>
            <small>candidați promovați</small>
          </span>
        </div>
      </header>
      <InterviewWorkspace
        candidates={candidates}
        isBoardView={isBoardView}
        initialInterviewId={initialInterviewId}
      />
    </section>
  );
}

function FormsPageShell({
  activeView,
  canViewForms,
  canViewInterviews,
  isBoardView,
  children,
}: {
  activeView: "raspunsuri" | "interviuri";
  canViewForms: boolean;
  canViewInterviews: boolean;
  isBoardView: boolean;
  children: ReactNode;
}) {
  return (
    <div className="dash-page dash-page--wide">
      <header className="dash-page-head forms-page-title">
        <div>
          <span className="dash-eyebrow">Recrutare</span>
          <h1>Recrutări</h1>
          <p>
            {isBoardView
              ? "Compară evaluările formularelor, selectează candidații și consultă separat evaluările de interviu."
              : "Evaluează formularele disponibile pentru tine."}
          </p>
        </div>
      </header>

      <nav className="forms-tabs" aria-label="Sistemele de recrutare">
        {canViewForms && (
          <Link
            className="forms-tab"
            href="/board/interviuri?view=raspunsuri"
            prefetch
            aria-current={activeView === "raspunsuri" ? "page" : undefined}
          >
            <ClipboardList size={18} />
            <span><strong>Formulare</strong><small>Răspunsuri și evaluări</small></span>
          </Link>
        )}
        {canViewInterviews && (
          <Link
            className="forms-tab"
            href="/board/interviuri?view=interviuri"
            prefetch
            aria-current={activeView === "interviuri" ? "page" : undefined}
          >
            <ClipboardPenLine size={18} />
            <span><strong>Interviuri</strong><small>Candidați promovați</small></span>
          </Link>
        )}
      </nav>

      {children}
    </div>
  );
}
