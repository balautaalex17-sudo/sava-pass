import { RecruitmentImport } from "@/components/dashboard/RecruitmentImport";
import {
  SignupsTable,
  type ReviewerOption,
  type SignupApplication,
  type SignupField,
} from "@/components/dashboard/SignupsTable";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  FormResultsWorkspace,
  type ApplicationFormEvaluation,
} from "../inscrieri/FormResultsWorkspace";

type ApplicationRow = {
  id: string;
  form_id: string | null;
  full_name: string;
  email: string;
  grade: string | null;
  answers: Json;
  source_payload: Json;
  status: string;
  completion_percentage: number;
  is_complete: boolean;
  missing_required_fields: string[];
  reviewer_id: string | null;
  updated_at: string;
  submitted_at: string | null;
  source: string;
  profiles: { full_name: string } | null;
};

type EvaluationRow = {
  application_id: string;
  reviewer_id: string;
  rating: string;
  comment: string;
  base_score: number | null;
  question_scores: Json;
  updated_at: string;
};

export async function FormResponsesView({
  viewerId,
  viewerName,
  isBoardView,
  canManage,
  canImport,
  canEvaluate,
}: {
  viewerId: string;
  viewerName: string;
  isBoardView: boolean;
  canManage: boolean;
  canImport: boolean;
  canEvaluate: boolean;
}) {
  const { data: form, error: formError } = await supabaseAdmin
    .from("recruitment_forms")
    .select("id, campaign_id, title, version")
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (formError) throw formError;

  if (!form) {
    return (
      <div className="dash-card dash-empty">
        <strong>Nicio schemă activă</strong>
        Un administrator trebuie să activeze o schemă de recrutare.
      </div>
    );
  }

  const { data: campaignForms, error: campaignFormsError } = form.campaign_id
    ? await supabaseAdmin
      .from("recruitment_forms")
      .select("id")
      .eq("campaign_id", form.campaign_id)
    : { data: [{ id: form.id }], error: null };
  if (campaignFormsError) throw campaignFormsError;
  const formIds = (campaignForms ?? []).map((item) => item.id);

  const [fieldsResult, applicationsResult, reviewersResult] = await Promise.all([
    supabaseAdmin
      .from("recruitment_fields")
      .select("form_id, key, label, source_header, position, type, required")
      .in("form_id", formIds)
      .order("position"),
    supabaseAdmin
      .from("membership_applications")
      .select("id, form_id, full_name, email, grade, answers, source_payload, status, completion_percentage, is_complete, missing_required_fields, reviewer_id, updated_at, submitted_at, source, profiles!membership_applications_reviewer_id_fkey(full_name)")
      .in("form_id", formIds)
      .order("updated_at", { ascending: false }),
    canManage
      ? supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "board", "interviewer"])
        .eq("membership_status", "active")
        .order("full_name")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (fieldsResult.error) throw fieldsResult.error;
  if (applicationsResult.error) throw applicationsResult.error;
  if (reviewersResult.error) throw reviewersResult.error;

  const fieldRows = fieldsResult.data ?? [];
  const toSignupField = (field: (typeof fieldRows)[number]): SignupField => ({
    key: field.key,
    label: field.label,
    sourceHeader: field.source_header,
    position: field.position,
    type: field.type,
    required: field.required,
  });
  const fields: SignupField[] = fieldRows
    .filter((field) => field.form_id === form.id)
    .map(toSignupField);
  const fieldsByFormId = new Map<string, SignupField[]>();
  for (const field of fieldRows) {
    const current = fieldsByFormId.get(field.form_id) ?? [];
    current.push(toSignupField(field));
    fieldsByFormId.set(field.form_id, current);
  }
  const applications: SignupApplication[] = (
    (applicationsResult.data ?? []) as unknown as ApplicationRow[]
  ).map((application) => ({
    id: application.id,
    formId: application.form_id,
    formFields: application.form_id ? fieldsByFormId.get(application.form_id) ?? fields : fields,
    fullName: application.full_name,
    email: application.email,
    grade: application.grade,
    answers: stringRecord(application.answers),
    sourcePayload: stringRecord(application.source_payload),
    status: application.status,
    completionPercentage: application.completion_percentage,
    isComplete: application.is_complete,
    missingRequiredFields: application.missing_required_fields,
    reviewerId: application.reviewer_id,
    reviewerName: application.profiles?.full_name ?? null,
    updatedAt: application.updated_at,
    submittedAt: application.submitted_at,
    source: application.source,
  }));
  const reviewers: ReviewerOption[] = (reviewersResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name,
  }));
  const applicationIds = applications.map((application) => application.id);
  const supabase = await createClient();
  const [evaluationsResult, interviewsResult, invitationNotificationsResult] = applicationIds.length
    ? await Promise.all([
      supabase
        .from("application_evaluations")
        .select("application_id, reviewer_id, rating, comment, base_score, question_scores, updated_at")
        .in("application_id", applicationIds)
        .order("updated_at", { ascending: false }),
      supabaseAdmin
        .from("interviews")
        .select("application_id")
        .in("application_id", applicationIds)
        .neq("status", "cancelled"),
      supabaseAdmin
        .from("notifications")
        .select("application_id, status")
        .in("application_id", applicationIds)
        .eq("template_key", "interview_invitation")
        .eq("channel", "email"),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
  if (evaluationsResult.error) throw evaluationsResult.error;
  if (interviewsResult.error) throw interviewsResult.error;
  if (invitationNotificationsResult.error) throw invitationNotificationsResult.error;

  const evaluationRows = (evaluationsResult.data ?? []) as EvaluationRow[];
  const evaluatorIds = [...new Set(evaluationRows.map((evaluation) => evaluation.reviewer_id))];
  const { data: evaluatorProfiles, error: evaluatorProfilesError } = evaluatorIds.length
    ? await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", evaluatorIds)
    : { data: [], error: null };
  if (evaluatorProfilesError) throw evaluatorProfilesError;
  const evaluatorNameMap = new Map(
    (evaluatorProfiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const evaluations: ApplicationFormEvaluation[] = evaluationRows.map((evaluation) => ({
    applicationId: evaluation.application_id,
    reviewerId: evaluation.reviewer_id,
    reviewerName: evaluatorNameMap.get(evaluation.reviewer_id) ?? "Membru echipă",
    rating: evaluation.rating as ApplicationFormEvaluation["rating"],
    comment: evaluation.comment,
    baseScore: evaluation.base_score,
    questionScores: stringNumberRecord(evaluation.question_scores),
    updatedAt: evaluation.updated_at,
  }));
  const selectedForInterviewIds = [...new Set(
    (interviewsResult.data ?? []).map((interview) => interview.application_id),
  )];
  const interviewEmailIds = [...new Set(
    (invitationNotificationsResult.data ?? [])
      .filter((notification) => (
        notification.application_id
        && ["queued", "sending", "sent"].includes(notification.status)
      ))
      .map((notification) => notification.application_id as string),
  )];
  const completeCount = applications.filter((application) => application.isComplete).length;

  return (
    <section className="forms-view" aria-labelledby="form-responses-title">
      <header className="forms-view-head interview-page-head">
        <div>
          <h2 id="form-responses-title">Formulare</h2>
          <p>
            {isBoardView
              ? "Alege un candidat din clasament pentru a-i vedea fișa completă."
              : "Alege un candidat, citește răspunsurile și salvează evaluarea."}
          </p>
        </div>
        <div className="interview-progress" aria-label={`${completeCount} din ${applications.length} formulare complete`}>
          <span>
            <strong>{completeCount}/{applications.length}</strong>
            <small>formulare complete</small>
          </span>
        </div>
      </header>

      <FormResultsWorkspace
        applications={applications}
        fields={fields}
        evaluations={evaluations}
        selectedForInterviewIds={selectedForInterviewIds}
        interviewEmailIds={interviewEmailIds}
        viewerId={viewerId}
        viewerName={viewerName}
        isBoardView={isBoardView}
        canManage={canManage}
        canEvaluate={canEvaluate}
      />

      {isBoardView && <details className="signup-advanced-details">
        <summary>Tabel avansat, filtre și export</summary>
        <div className="signup-advanced-content">
          {canImport && (
            <details className="signup-import-details">
              <summary>Importă CSV / XLSX</summary>
              <RecruitmentImport />
            </details>
          )}
          <SignupsTable
            fields={fields}
            applications={applications}
            reviewers={reviewers}
            canManage={canManage}
          />
        </div>
      </details>}
    </section>
  );
}

function stringRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    item == null ? "" : typeof item === "string" ? item : String(item),
  ]));
}

function stringNumberRecord(value: Json): Record<string, number> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const number = typeof item === "number" ? item : Number(item);
    return Number.isFinite(number) ? [[key, number]] : [];
  }));
}
