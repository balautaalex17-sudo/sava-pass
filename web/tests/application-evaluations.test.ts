import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "./safe-test-database";
import {
  arithmeticMean,
  compareByAscendingMean,
  compareByDescendingMean,
  compareByLastName,
  compareInterviewMeans,
  classifyFormDecision,
  matchesBulkInterviewFilter,
} from "../lib/dashboard/recruitment-evaluations";
import type { Database } from "../lib/supabase/types";

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Supabase test environment is missing");

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const reviewers: Array<{ id: string; client: SupabaseClient<Database> }> = [];
let boardUser: { id: string; client: SupabaseClient<Database> } | null = null;
let applicationId = "";
let firstEvaluationId = "";
let secondEvaluationId = "";

async function createStaffUser(label: string, role: "interviewer" | "board") {
  const password = `Test-${randomUUID()}-A1!`;
  const email = `private-form-${role}-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: label },
  });
  if (error || !data.user) throw error ?? new Error("Could not create test user");
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: label,
    email,
    role,
    membership_status: "active",
  });
  if (profileError) throw profileError;
  const client = createClient<Database>(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

before(async () => {
  const { data: application, error: applicationError } = await admin
    .from("membership_applications")
    .select("id")
    .eq("source", "staff_test_example")
    .eq("source_row_identifier", "radu-enache")
    .single();
  if (applicationError) throw applicationError;
  applicationId = application.id;

  reviewers.push(
    await createStaffUser("Evaluator formular A", "interviewer"),
    await createStaffUser("Evaluator formular B", "interviewer"),
  );
  boardUser = await createStaffUser("Board test formulare", "board");

  const [first, second] = await Promise.all([
    reviewers[0].client.from("application_evaluations").insert({
      application_id: applicationId,
      reviewer_id: reviewers[0].id,
      rating: "green",
      comment: "Comentariul privat al evaluatorului A.",
    }).select("id").single(),
    reviewers[1].client.from("application_evaluations").insert({
      application_id: applicationId,
      reviewer_id: reviewers[1].id,
      rating: "red",
      comment: "Comentariul privat al evaluatorului B.",
    }).select("id").single(),
  ]);
  if (first.error || second.error) throw first.error ?? second.error;
  firstEvaluationId = first.data.id;
  secondEvaluationId = second.data.id;
});

after(async () => {
  const ids = [...reviewers.map((user) => user.id), ...(boardUser ? [boardUser.id] : [])];
  if (ids.length) {
    await admin.from("application_evaluations").delete().in("reviewer_id", ids);
    await admin.from("profiles").delete().in("id", ids);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

test("form evaluation action is permission-gated and forces the current owner", () => {
  const action = projectFile("app/(dashboard)/board/interviuri/actions.ts");
  assert.match(action, /requirePermission\("evaluate_recruitment_forms"\)/);
  assert.match(action, /reviewer_id: viewer\.profile\.id/);
  assert.match(action, /application_id: parsed\.data\.applicationId/);
  const auditBlock = action.match(/await logAudit\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
  assert.match(auditBlock, /metadata: \{ rating: formRatingForScore\(baseScore\)/);
  assert.doesNotMatch(auditBlock, /comment/);
});

test("form evaluation comments are optional in the UI, action, and database", () => {
  const form = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");
  const action = projectFile("app/(dashboard)/board/interviuri/actions.ts");
  const migration = projectFile("supabase/migrations/20260827120151_optional_application_evaluation_comments.sql");

  assert.match(form, /Comentariul tău despre formular \(opțional\)/);
  assert.doesNotMatch(form, /comment\.trim\(\)\.length/);
  assert.match(action, /comment: z\.string\(\)\.trim\(\)\.max\(5000\)\.default\(""\)/);
  assert.doesNotMatch(action, /comentariu de cel puțin 3 caractere/);
  assert.match(migration, /drop constraint if exists application_evaluations_comment_check/);
  assert.match(migration, /check \(char_length\(comment\) <= 5000\)/);
});

test("form rubric and interview scoring controls stay in their workspaces", () => {
  const forms = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");
  const interviews = projectFile("app/(dashboard)/board/interviuri/InterviewWorkspace.tsx");
  assert.match(forms, /green[\s\S]*yellow[\s\S]*red/);
  assert.match(forms, /saveApplicationEvaluation/);
  assert.match(interviews, /saveInterviewEvaluation/);
  assert.match(interviews, /Punctaje interviu/);
  assert.match(interviews, /Situații ×2/);
  assert.match(interviews, /Personalitate/);
  assert.match(interviews, /Creativitate/);
  assert.match(interviews, /Total: 2 × Situații/);
  assert.match(interviews, /value=\{categoryScores\[field\.key\] \?\? ""\}/);
  assert.match(interviews, /<option value="">Alege<\/option>/);
  assert.match(interviews, /scoreLabel = completeScores === null \? "—\/20"/);
  assert.match(interviews, /disabled=\{pending \|\| completeScores === null\}/);
  assert.doesNotMatch(interviews, /8 întrebări|\/40|selectedSets|questionScores|redFlag/);
});

test("active form review no longer uses legacy bonus scoring", () => {
  const activeSource = [
    projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx"),
    projectFile("app/(dashboard)/board/interviuri/FormResponsesView.tsx"),
    projectFile("app/(dashboard)/board/interviuri/actions.ts"),
    projectFile("app/(dashboard)/dashboard.css"),
  ].join("\n");
  for (const marker of ["bonusPoints", "bonus_points", "puncte bonus", "/2 bonus", "form-rubric-bonus"]) {
    assert.equal(activeSource.includes(marker), false, `active form review still contains ${marker}`);
  }
});

test("candidate form result exposes only the binary interview decision", () => {
  const forms = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");
  const loader = projectFile("app/(dashboard)/board/interviuri/FormResponsesView.tsx");
  assert.match(forms, /Trimis la interviu/);
  assert.match(forms, /Nu a fost trimis/);
  assert.doesNotMatch(forms, /Interviu programat/);
  assert.match(loader, /\.from\("interviews"\)[\s\S]*?\.neq\("status", "cancelled"\)/);
});

test("bulk interview filters exclude unrated and red results", () => {
  assert.equal(matchesBulkInterviewFilter([], "green"), false);
  assert.equal(matchesBulkInterviewFilter([], "green_yellow"), false);
  assert.equal(matchesBulkInterviewFilter(["green"], "green"), true);
  assert.equal(matchesBulkInterviewFilter(["yellow"], "green"), false);
  assert.equal(matchesBulkInterviewFilter(["green", "yellow"], "green_yellow"), false);
  assert.equal(matchesBulkInterviewFilter(["green", "green", "yellow"], "green_yellow"), true);
  assert.equal(matchesBulkInterviewFilter(["green", "red"], "green_yellow"), false);
});

test("interview means use completed scores and sort null values last", () => {
  assert.equal(arithmeticMean([]), null);
  assert.equal(arithmeticMean([null, undefined, 30, 34]), 32);
  assert.equal(arithmeticMean([0, 40]), 20);

  const rows = [
    { fullName: "Zoe", mean: null },
    { fullName: "Ana", mean: 28 },
    { fullName: "Mihai", mean: 28 },
    { fullName: "Bianca", mean: 22 },
  ].sort(compareByAscendingMean);
  assert.deepEqual(rows.map((row) => row.fullName), ["Bianca", "Ana", "Mihai", "Zoe"]);

  const legacyRows = [
    { fullName: "Zoe", mean: null },
    { fullName: "Ana", mean: 28 },
    { fullName: "Mihai", mean: 28 },
    { fullName: "Bianca", mean: 22 },
  ].sort(compareInterviewMeans);
  assert.deepEqual(legacyRows.map((row) => row.fullName), ["Bianca", "Ana", "Mihai", "Zoe"]);

  const descendingRows = [
    { fullName: "Zoe", mean: null },
    { fullName: "Ana Popescu", mean: 28 },
    { fullName: "Mihai Ionescu", mean: 28 },
    { fullName: "Bianca", mean: 22 },
  ].sort(compareByDescendingMean);
  assert.deepEqual(descendingRows.map((row) => row.fullName), ["Mihai Ionescu", "Ana Popescu", "Bianca", "Zoe"]);
  assert.equal(compareByLastName("Ana Dumitru", "Mara Șerban") < 0, true);
});

test("form decisions keep unrated candidates out of both batches", () => {
  assert.equal(classifyFormDecision([]), "unrated");
  assert.equal(classifyFormDecision(["green"]), "interview");
  assert.equal(classifyFormDecision(["green", "yellow", "red"]), "not_selected");
  assert.equal(classifyFormDecision(["green", "green", "yellow"]), "interview");
});

test("Board form results rank by score and keep selection separate from email delivery", () => {
  const forms = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");
  const loader = projectFile("app/(dashboard)/board/interviuri/FormResponsesView.tsx");
  const action = projectFile("app/(dashboard)/board/inscrieri/actions.ts");
  const legacyAction = projectFile("app/(staff)/admin/aplicatii/actions.ts");
  const helpers = projectFile("lib/dashboard/recruitment-evaluations.ts");

  assert.match(forms, /form-results-centralizer/);
  assert.match(forms, /compareByDescendingMean/);
  assert.match(forms, /form-results-score--\$\{evaluation\.rating\}/);
  assert.match(forms, /Medie \/6/);
  assert.match(forms, /Selectează pentru interviu \(\$\{selectionEligible\.length\}\)/);
  assert.match(forms, /Trimite emailurile \(\$\{emailEligible\.length\}\)/);
  assert.match(forms, /Confirmă și trimite emailurile/);
  assert.match(forms, /action: "select_for_interview"/);
  assert.match(forms, /action: "send_interview_email"/);
  assert.match(forms, /Anunță candidații respinși/);
  assert.match(forms, /rejectConfirmation|rejectEvaluatedCandidates/);
  assert.match(forms, /Fără majoritate verde/);
  assert.match(forms, /Așteaptă evaluările/);
  assert.doesNotMatch(forms, /form-bulk-invite|bulkFilter|green_yellow/);
  assert.doesNotMatch(loader, /RecruitmentFlow/);
  assert.match(loader, /\.from\("notifications"\)[\s\S]*\.eq\("template_key", "interview_invitation"\)/);

  assert.match(action, /z\.enum\(\["select_for_interview", "send_interview_email", "reject", "accept"\]\)/);
  assert.match(action, /processedIds/);
  assert.match(action, /classifyFormDecision/);
  assert.match(action, /action === "reject"[\s\S]*decision !== "not_selected"/);
  assert.match(action, /sendInterviewInvitation/);
  assert.match(action, /metadata: \{ manually_sent: true \}/);
  assert.doesNotMatch(action, /selected_for_interview:\s*"interview_invitation"/);
  assert.doesNotMatch(legacyAction, /selected_for_interview:\s*"interview_invitation"/);
  assert.match(action, /result_message: nextStatus === "rejected"[\s\S]*De această dată nu ai fost selectat/);
  assert.match(action, /nextStatus === "rejected"[\s\S]*Candidatul a fost anunțat că nu a avansat/);
  assert.match(action, /recruitment\.application_rejected/);
  assert.match(helpers, /compareByLastName/);
  assert.match(helpers, /compareInterviewMeans = compareByAscendingMean/);
});

test("interview access is Board-only and avoids assignment or scheduling data", () => {
  const page = projectFile("app/(dashboard)/board/interviuri/page.tsx");
  const workspace = projectFile("app/(dashboard)/board/interviuri/InterviewWorkspace.tsx");
  assert.match(page, /\.from\("interviews"\)[\s\S]*?\.select\("id, application_id"\)[\s\S]*?\.neq\("status", "cancelled"\)/);
  assert.match(page, /const canViewInterviews = viewer\.isAdminEquivalent/);
  assert.match(page, /const activeView = wantsInterviews && canViewInterviews/);
  assert.match(page, /if \(activeView === "raspunsuri"\)/);
  assert.doesNotMatch(page, /interview_slots|interview_interviewers/);
  assert.doesNotMatch(workspace, /Programat|De programat|scheduledAt|arrivalStatus|committee|interview_interviewers/);
});

test("recruitment tabs preload and independent interview data loads in parallel", () => {
  const page = projectFile("app/(dashboard)/board/interviuri/page.tsx");
  assert.equal(page.match(/\bprefetch\b/g)?.length, 2);
  assert.match(page, /const \[applicationsResult, evaluationsResult\] = await Promise\.all\(\[/);
  assert.match(page, /Promise\.all\(\[[\s\S]*?\.from\("membership_applications"\)[\s\S]*?\.from\("interview_evaluations"\)/);
});

test("Board centralizer exposes candidate contact and sorted interview state", () => {
  const page = projectFile("app/(dashboard)/board/interviuri/page.tsx");
  const workspace = projectFile("app/(dashboard)/board/interviuri/InterviewWorkspace.tsx");
  assert.match(page, /full_name, email, phone, grade/);
  assert.match(page, /title: "Recrutări"/);
  assert.match(page, /<h1>Recrutări<\/h1>/);
  assert.match(page, /aria-label="Sistemele de recrutare"/);
  assert.match(page, /applicationPhone\(application\.phone/);
  assert.match(workspace, /Centralizator final/);
  assert.match(workspace, /interview-centralizer__list/);
  assert.match(workspace, /interview-centralizer__row/);
  assert.match(workspace, /interview-workspace--results/);
  assert.doesNotMatch(workspace, /interview-centralizer__table/);
  assert.match(workspace, /mailto:/);
  assert.match(workspace, /tel:/);
  assert.match(workspace, /mean === null \? "—"/);
  assert.match(workspace, /type="checkbox"/);
  assert.match(workspace, /runRecruitmentBatchAction\(\{ action: "accept", applicationIds \}\)/);
  assert.match(workspace, /interview_scheduled: "Selectat\(ă\) pentru interviu \(status vechi\)"/);
  assert.doesNotMatch(workspace, /Interviu stabilit/);
});

test("legacy shared interview review remains admin-only", () => {
  const page = projectFile("app/(staff)/admin/interviuri/page.tsx");
  const action = projectFile("app/(staff)/admin/interviuri/actions.ts");
  assert.match(page, /requireStaffRole\(\["admin", "board"\] as const\)/);
  assert.match(page, /redirect\("\/board\/interviuri\?view=interviuri"\)/);
  assert.doesNotMatch(page, /interview_slots|interview_interviewers|ScheduleForm|BulkScheduleForm/);
  assert.match(action, /completeInterview[\s\S]*?requireStaffRole\(\["admin"\]\)/);
});

test("interview evaluation action and data are Board-only", () => {
  const page = projectFile("app/(dashboard)/board/interviuri/page.tsx");
  const workspace = projectFile("app/(dashboard)/board/interviuri/InterviewWorkspace.tsx");
  const action = projectFile("app/(dashboard)/board/interviuri/actions.ts");
  assert.match(page, /const canViewInterviews = viewer\.isAdminEquivalent/);
  assert.match(page, /\.select\("id, interview_id, category_scores, comment, created_at, updated_at"\)/);
  assert.doesNotMatch(page, /interviewer_id|profileRows|profileMap|viewerEvaluation/);
  assert.match(action, /export async function addInterviewEvaluation/);
  assert.match(action, /export async function saveInterviewEvaluation/);
  assert.match(action, /export async function deleteInterviewEvaluation/);
  assert.match(action, /interviewer_id: null/);
  assert.match(action, /\.insert\(/);
  assert.match(action, /\.update\(/);
  assert.match(action, /\.delete\(\)/);
  assert.match(action, /evaluationId/);
  assert.match(action, /interviewScoreTotal\(parsed\.data\.categoryScores\)/);
  assert.match(action, /question_scores: \{\}/);
  assert.match(action, /selected_sets: \{\}/);
  assert.match(action, /red_flag: false/);
  assert.match(action, /\.delete\(\)[\s\S]*?\.select\("id"\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(action, /if \(!deletedEvaluation\)/);
  assert.doesNotMatch(action.slice(action.indexOf("const interviewIdSchema")), /upsert|onConflict|interviewer_id: viewer\.profile\.id/);
  assert.doesNotMatch(workspace, /interviewerName|viewerEvaluation|Evaluarea ta/);
  assert.match(workspace, /Adaugă intervievator/);
  assert.match(workspace, /Intervievator \{index \+ 1\}/);
  assert.match(workspace, /window\.confirm\(`Ștergi rândul Intervievator/);
  assert.match(workspace, /const initialComment = evaluation\.comment\.trim\(\) === "Fără observații\." \? "" : evaluation\.comment/);
  assert.match(workspace, /Rândurile noi nu sunt legate de conturi/);
});

test("anonymous interview migration only relaxes legacy linkage nullability", () => {
  const migration = projectFile("supabase/migrations/20260818171804_anonymous_interview_score_rows.sql");
  assert.match(migration, /alter table public\.interview_evaluations[\s\S]*alter column interviewer_id drop not null/);
  assert.match(migration, /Legacy evaluator linkage retained/);
  assert.doesNotMatch(migration, /drop constraint|drop foreign key|create table|insert into|delete from/);
});

test("interview migration removes interviewer writes and keeps Board/admin access", () => {
  const migration = projectFile("supabase/migrations/20260818170253_board_only_interview_scoring.sql");
  assert.match(migration, /label = .*Board/);
  assert.match(migration, /delete from public\.role_permissions[\s\S]*role_key = 'interviewer'[\s\S]*evaluate_interview_candidates/);
  assert.match(migration, /\('admin', 'evaluate_interview_candidates'\)/);
  assert.match(migration, /\('board', 'evaluate_interview_candidates'\)/);
  assert.match(migration, /revoke insert, update on public\.interview_evaluations from authenticated/);
  assert.match(migration, /drop policy if exists interview_evaluations_private_insert/);
  assert.match(migration, /drop policy if exists interview_evaluations_private_update/);
});

test("active candidate surfaces remove scheduling and public status tracking", () => {
  const detail = projectFile("app/(staff)/admin/aplicatii/[id]/page.tsx");
  const review = projectFile("app/(staff)/admin/aplicatii/[id]/ApplicationReviewForm.tsx");
  const action = projectFile("app/(staff)/admin/aplicatii/actions.ts");
  const publicApplicationAction = projectFile("app/devino-membru/actions.ts");
  const membershipForm = projectFile("app/devino-membru/MembershipForm.tsx");
  const signups = projectFile("components/dashboard/SignupsTable.tsx");
  const notifications = projectFile("app/(staff)/admin/notificari/NotificationForms.tsx");

  assert.match(detail, /\.from\("interviews"\)\.select\("id"\)/);
  assert.match(detail, /Deschide fișa de interviu/);
  assert.doesNotMatch(detail, /CalendarPlus|Programat|programare|Programează|Reprogramează|\/admin\/interviuri|slot_id|scheduled_at|location|meeting_url/);
  assert.match(review, /displayStatus = application\.status === "interview_scheduled"/);
  assert.doesNotMatch(review, /name="score"|Interviu programat/);
  assert.doesNotMatch(action, /interview_scheduled|score|score:/);

  assert.equal(existsSync(join(process.cwd(), "app/candidatura/[token]/page.tsx")), false);
  assert.doesNotMatch(publicApplicationAction, /statusToken|status_url|\/candidatura\/|channel: "in_app"/);
  assert.doesNotMatch(membershipForm, /Urmărește candidatura|\/candidatura\//);
  assert.match(signups, /interview_scheduled: "Invitat la interviu/);
  assert.match(signups, /"interview_scheduled"/);
  assert.doesNotMatch(signups, /Interviu programat/);
  assert.match(notifications, /value="interview_scheduled">Selectați anterior pentru interviu/);
  assert.doesNotMatch(notifications, /Interviu programat/);
});

test("RLS lets each evaluator read only their own form evaluation", async () => {
  const [firstRows, secondRows] = await Promise.all([
    reviewers[0].client.from("application_evaluations").select("id, reviewer_id, comment").eq("application_id", applicationId),
    reviewers[1].client.from("application_evaluations").select("id, reviewer_id, comment").eq("application_id", applicationId),
  ]);
  assert.ifError(firstRows.error);
  assert.ifError(secondRows.error);
  assert.deepEqual(firstRows.data?.map((row) => row.id), [firstEvaluationId]);
  assert.deepEqual(secondRows.data?.map((row) => row.id), [secondEvaluationId]);
  assert.equal(firstRows.data?.[0].reviewer_id, reviewers[0].id);
  assert.equal(secondRows.data?.[0].reviewer_id, reviewers[1].id);
});

test("RLS lets an evaluator save an evaluation without a comment", async () => {
  const result = await reviewers[0].client
    .from("application_evaluations")
    .update({ comment: "" })
    .eq("id", firstEvaluationId)
    .select("comment")
    .single();
  assert.ifError(result.error);
  assert.equal(result.data?.comment, "");
});

test("RLS lets Board see every evaluator result", async () => {
  assert.ok(boardUser);
  const result = await boardUser.client
    .from("application_evaluations")
    .select("id")
    .eq("application_id", applicationId)
    .in("id", [firstEvaluationId, secondEvaluationId]);
  assert.ifError(result.error);
  assert.deepEqual(new Set(result.data?.map((row) => row.id)), new Set([firstEvaluationId, secondEvaluationId]));
});

test("RLS prevents one evaluator from overwriting another comment", async () => {
  const attempt = await reviewers[0].client
    .from("application_evaluations")
    .update({ comment: "Încercare de suprascriere." })
    .eq("id", secondEvaluationId)
    .select("id");
  assert.ifError(attempt.error);
  assert.deepEqual(attempt.data, []);

  const ownerRead = await reviewers[1].client
    .from("application_evaluations")
    .select("comment")
    .eq("id", secondEvaluationId)
    .single();
  assert.ifError(ownerRead.error);
  assert.equal(ownerRead.data?.comment, "Comentariul privat al evaluatorului B.");
});
