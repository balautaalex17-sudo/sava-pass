import assert from "node:assert/strict";
import test from "node:test";
import { attendanceResult, filterAttendanceRows, absenceRequestSchema, absenceReviewSchema, canReviewAbsences, type AttendanceTableRow } from "../lib/dashboard/attendance";

const now = Date.parse("2026-09-06T12:00:00Z");
const closed = { status: "finished", attendance_closes_at: "2026-09-05T12:00:00Z" };
const open = { status: "attendance_open", attendance_closes_at: "2026-09-07T12:00:00Z" };

test("only a closed attendance window creates an absence; cancelled and draft meetings never do", () => {
  assert.equal(attendanceResult(open, null, null, now), "upcoming");
  assert.equal(attendanceResult({ ...open, attendance_closes_at: new Date(now).toISOString() }, null, null, now), "upcoming");
  assert.equal(attendanceResult({ ...open, attendance_closes_at: new Date(now - 1).toISOString() }, null, null, now), "absent");
  assert.equal(attendanceResult(closed, null, null, now), "absent");
  assert.equal(attendanceResult({ ...closed, status: "draft" }, null, null, now), "draft");
  assert.equal(attendanceResult({ ...closed, status: "cancelled" }, "present", "approved", now), "cancelled");
});

test("an approved request excuses absence without counting as presence; corrections take precedence", () => {
  assert.equal(attendanceResult(closed, null, "approved", now), "excused");
  assert.equal(attendanceResult(closed, "reversed", "approved", now), "excused");
  assert.equal(attendanceResult(closed, null, "pending", now), "absent");
  assert.equal(attendanceResult(closed, null, "rejected", now), "absent");
  assert.equal(attendanceResult(closed, "present", "approved", now), "present");
  assert.equal(attendanceResult(open, null, "approved", now), "upcoming");
});

function row(name: string, meetingStartsAt: string, overrides: Partial<AttendanceTableRow> = {}): AttendanceTableRow {
  return { memberId: name, name, email: null, grade: null, meetingId: meetingStartsAt, meetingTitle: "Ședință board",
    meetingStartsAt, result: "absent", attendanceStatus: null, checkedInAt: null, confirmedBy: null, request: null, ...overrides };
}

test("table sorts by person and by meeting date in both directions without mutating source rows", () => {
  const rows = [row("Ștefan", "2026-09-05"), row("Ana", "2026-09-06"), row("Ana", "2026-09-01")];
  assert.deepEqual(filterAttendanceRows(rows, "", "all", "person-asc").map((item) => item.name), ["Ana", "Ana", "Ștefan"]);
  assert.deepEqual(filterAttendanceRows(rows, "", "all", "person-desc").map((item) => item.name), ["Ștefan", "Ana", "Ana"]);
  assert.deepEqual(filterAttendanceRows(rows, "", "all", "meeting-asc").map((item) => item.meetingStartsAt), ["2026-09-01", "2026-09-05", "2026-09-06"]);
  assert.deepEqual(filterAttendanceRows(rows, "", "all", "meeting-desc").map((item) => item.meetingStartsAt), ["2026-09-06", "2026-09-05", "2026-09-01"]);
  assert.equal(rows[0].name, "Ștefan");
});

test("search ignores Romanian diacritics and request filters exclude presence and cancelled meetings", () => {
  const pending = { id: "request", status: "pending", reason: "Un motiv de test", member_id: "Ștefan", meeting_id: "meeting", created_at: "2026-09-06", reviewed_at: null, reviewed_by: null, review_note: null };
  const rows = [row("Ștefan", "2026-09-01", { request: pending }), row("Ana", "2026-09-02", { result: "excused" }), row("Mihai", "2026-09-03", { result: "present", request: pending })];
  assert.equal(filterAttendanceRows(rows, "stefan", "absent", "person-asc").length, 1);
  assert.equal(filterAttendanceRows(rows, "sedinta", "all", "person-asc").length, 3);
  assert.equal(filterAttendanceRows(rows, "", "pending", "person-asc").length, 1);
  assert.equal(filterAttendanceRows(rows, "", "excused", "person-asc")[0].name, "Ana");
});

test("requests validate reason and reject spoofed identity or approval fields", () => {
  const meetingId = "00000000-0000-4000-8000-000000000001";
  assert.ok(absenceRequestSchema.safeParse({ meetingId, reason: "  Motiv suficient de lung  " }).success);
  for (const input of [
    { meetingId, reason: "     " }, { meetingId, reason: "x".repeat(2001) },
    { meetingId, reason: "Motiv suficient", memberId: meetingId },
    { meetingId, reason: "Motiv suficient", status: "approved" },
  ]) assert.equal(absenceRequestSchema.safeParse(input).success, false);
  assert.equal(absenceReviewSchema.safeParse({ requestId: meetingId, decision: "pending", note: "" }).success, false);
  assert.equal(absenceReviewSchema.safeParse({ requestId: meetingId, decision: "approved", note: "x".repeat(1001) }).success, false);
  assert.equal(canReviewAbsences("board"), true);
  assert.equal(canReviewAbsences("admin"), true);
  for (const role of [null, "scanner", "interviewer", "statistici"]) assert.equal(canReviewAbsences(role), false);
});
