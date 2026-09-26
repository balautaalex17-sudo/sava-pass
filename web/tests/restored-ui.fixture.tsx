import { createRoot } from "react-dom/client";
import { FormResultsWorkspace } from "../app/(dashboard)/board/inscrieri/FormResultsWorkspace";
import { MembersManager } from "../app/(dashboard)/board/membri/MembersManager";
import { PortalFilterForm } from "../components/dashboard/PortalFilterForm";
import { MemberDepartmentDialog } from "../components/dashboard/MemberDepartmentDialog";
import { DepartmentRequestReview } from "../components/dashboard/DepartmentRequestReview";
import type { SignupApplication } from "../components/dashboard/SignupsTable";

// This entry is bundled by the isolated browser check with inert action adapters.
const query = new URLSearchParams(location.search);
const applications = ["Ana Own", "Bianca Other", "Carla None"].map((name, index) => ({
  id: `candidate-${index}`, formId: "form", fullName: name, email: `candidate-${index}@example.com`,
  grade: "X", answers: {}, sourcePayload: {}, status: "submitted", completionPercentage: 100,
  isComplete: true, missingRequiredFields: [], reviewerId: null, reviewerName: null,
  updatedAt: "2026-09-26T10:00:00Z", submittedAt: "2026-09-26T10:00:00Z", source: "web",
})) as SignupApplication[];
const evaluations = ["viewer", "other"].map((reviewerId, index) => ({
  applicationId: `candidate-${index}`, reviewerId, reviewerName: "Evaluator", rating: "green" as const,
  comment: "", baseScore: 6, questionScores: {}, updatedAt: "2026-09-26T10:00:00Z",
}));
const members = [
  { name: "Ana HR", department: "hr", role: null },
  { name: "Bianca PR", department: "pr", role: null },
  { name: "Carla Neales", department: null, role: null },
  { name: "Daria Board", department: "hr", role: "board" as const },
].map((member, index) => ({
  id: `member-${index}`, fullName: member.name, email: `member-${index}@example.com`, phone: null,
  grade: "X", membershipStatus: "active", createdAt: "2026-09-26T10:00:00Z", ...member,
}));

const view = query.get("view");
createRoot(document.getElementById("root")!).render(
  <main className="dashboard-shell"><div className="dash-page">
    {view === "members" ? <MembersManager members={members} viewerRole="admin" />
      : view === "attendance" ? <PortalFilterForm action="/board/prezenta" autoSubmit submitLabel="Afișează">
        <input type="hidden" name="view" value="meeting" />
        <label htmlFor="meeting">Ședință</label>
        <select id="meeting" name="meeting"><option value="a">Ședința A</option><option value="b">Ședința B</option><option value="c">Ședința C</option></select>
      </PortalFilterForm>
      : view === "department" ? <MemberDepartmentDialog initialOptions={{ hr: 80, pr: 20, blockedDepartment: "hr" }} />
      : view === "review" ? <DepartmentRequestReview requestId="fixture" target="hr" balanceWarning={false} />
      : <FormResultsWorkspace applications={applications} fields={[]} evaluations={evaluations}
        selectedForInterviewIds={[]} interviewEmailIds={[]} viewerId="viewer" viewerName="Viewer"
        isBoardView={query.get("role") !== "evaluator"} canManage={query.get("role") !== "evaluator"}
        canSendToInterview={query.get("role") === "admin"} canEvaluate />}
  </div></main>,
);
