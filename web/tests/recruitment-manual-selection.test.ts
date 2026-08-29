import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  compareByDescendingMean,
  compareByLastName,
} from "../lib/dashboard/recruitment-evaluations";

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("ranking sorts by descending score and then Romanian last name", () => {
  const rows = [
    { fullName: "Ana Popescu", mean: 5.5 },
    { fullName: "Mara Dumitru", mean: 4.5 },
    { fullName: "Radu Ionescu", mean: 5.5 },
    { fullName: "Teodor", mean: null },
  ].sort(compareByDescendingMean);

  assert.deepEqual(rows.map((row) => row.fullName), [
    "Radu Ionescu",
    "Ana Popescu",
    "Mara Dumitru",
    "Teodor",
  ]);
  assert.ok(compareByLastName("Mara Dumitru", "Radu Ionescu") < 0);
});

test("sending candidates to interviews updates the stage and sends the email from one UI action", () => {
  const workspace = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");
  const actions = projectFile("app/(dashboard)/board/inscrieri/actions.ts");
  const legacyActions = projectFile("app/(staff)/admin/aplicatii/actions.ts");

  assert.match(workspace, /type="checkbox"/);
  assert.match(workspace, /advanceCandidatesToInterview/);
  assert.match(workspace, /action: "select_for_interview"/);
  assert.match(workspace, /action: "send_interview_email"/);
  assert.match(workspace, /className="form-results-row-select"/);
  assert.match(workspace, /Trimite individual la interviu candidatul/);
  assert.match(workspace, /Confirmă și trimite la interviu/);
  assert.match(workspace, /Anunță candidații respinși/);
  assert.doesNotMatch(workspace, /Selectează candidații bifați/);
  assert.doesNotMatch(workspace, /Trimite emailurile/);

  assert.match(actions, /action: z\.enum\(\["select_for_interview", "send_interview_email", "reject", "accept"\]\)/);
  assert.match(actions, /metadata: \{ manually_sent: true \}/);
  assert.doesNotMatch(actions, /selected_for_interview:\s*"interview_invitation"/);
  assert.doesNotMatch(legacyActions, /selected_for_interview:\s*"interview_invitation"/);
});

test("bulk selection excludes every candidate with a red evaluation", () => {
  const workspace = projectFile("app/(dashboard)/board/inscrieri/FormResultsWorkspace.tsx");

  assert.match(workspace, /evaluation\.rating !== "red"/);
  assert.match(workspace, /Bifează toți candidații fără roșu/);
});

test("member acceptance uses an in-app confirmation dialog", () => {
  const signupsTable = projectFile("components/dashboard/SignupsTable.tsx");
  const interviewWorkspace = projectFile("app/(dashboard)/board/interviuri/InterviewWorkspace.tsx");
  const dashboardCss = projectFile("app/(dashboard)/dashboard.css");

  assert.doesNotMatch(signupsTable, /window\.confirm/);
  assert.match(signupsTable, /className="signup-confirm-dialog"/);
  assert.match(signupsTable, /aria-labelledby="signup-confirm-title"/);
  assert.match(signupsTable, /Se folosește emailul original din formular/);
  assert.doesNotMatch(interviewWorkspace.slice(0, interviewWorkspace.indexOf("function CandidateInterview")), /window\.confirm/);
  assert.match(interviewWorkspace, /aria-labelledby="interview-confirm-title"/);
  assert.match(interviewWorkspace, /cod de activare care nu expiră/);
  assert.match(dashboardCss, /\.signup-confirm-dialog::backdrop/);
});
