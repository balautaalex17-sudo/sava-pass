import assert from "node:assert/strict";
import { test } from "node:test";
import { canSendToInterview, canSetRecruitmentStatus } from "../lib/dashboard/recruitment-permissions";

test("only the primary Super Admin role can send interview invitations", () => {
  assert.equal(canSendToInterview("admin"), true);
  for (const role of ["board", "scanner", "interviewer", "statistici", null] as const) {
    assert.equal(canSendToInterview(role), false);
    for (const next of ["selected_for_interview", "interview_scheduled", "interview_completed"]) {
      assert.equal(canSetRecruitmentStatus(role, "submitted", next), false);
    }
  }
});

test("Board keeps reviewer changes and decisions after Super Admin selected a candidate", () => {
  for (const status of ["submitted", "under_review", "selected_for_interview", "interview_scheduled", "interview_completed"]) {
    assert.equal(canSetRecruitmentStatus("board", status, status), true);
    assert.equal(canSetRecruitmentStatus("board", status, "rejected"), true);
  }
  assert.equal(canSetRecruitmentStatus("board", "selected_for_interview", "interview_completed"), true);
  assert.equal(canSetRecruitmentStatus("board", "interview_completed", "accepted"), true);
  assert.equal(canSetRecruitmentStatus("admin", "submitted", "selected_for_interview"), true);
});
