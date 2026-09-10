import assert from "node:assert/strict";
import test from "node:test";
import { attendanceResult, filterAttendanceRows, absenceRequestSchema, absenceReviewSchema, canReviewAbsences, type AttendanceTableRow } from "../lib/dashboard/attendance";

const now = Date.parse("2026-09-06T12:00:00Z");
const closed = { status: "finished", ends_at: "2026-09-05T13:00:00Z", attendance_closes_at: "2026-09-05T12:00:00Z" };
const open = { status: "attendance_open", ends_at: "2026-09-07T13:00:00Z", attendance_closes_at: "2026-09-07T12:00:00Z" };

test("closed confirmations and finished status cannot bypass the grace period; cancelled and draft meetings never create absence", () => {
  assert.equal(attendanceResult(open, null, null, now), "upcoming");
  assert.equal(attendanceResult({ ...open, attendance_closes_at: new Date(now).toISOString() }, null, null, now), "upcoming");
  assert.equal(attendanceResult({ ...open, attendance_closes_at: new Date(now - 1).toISOString() }, null, null, now), "upcoming");
  assert.equal(attendanceResult({ ...open, status: "finished" }, null, null, now), "upcoming");
  assert.equal(attendanceResult(closed, null, null, now), "absent");
  assert.equal(attendanceResult({ ...closed, status: "draft" }, null, null, now), "draft");
  assert.equal(attendanceResult({ ...closed, status: "cancelled" }, "present", "approved", now), "cancelled");
});

test("absence starts exactly three hours after the scheduled end, regardless of status or confirmation deadline", () => {
  const ended = { status: "attendance_open", ends_at: "2026-09-10T15:30:00+03:00", attendance_closes_at: "2026-09-13T16:30:00+03:00" };
  const end = Date.parse(ended.ends_at);
  const deadline = Date.parse("2026-09-10T18:30:00+03:00");
  for (const status of ["upcoming", "attendance_open", "finished"]) {
    for (const attendance_closes_at of [ended.attendance_closes_at, "2026-09-10T15:00:00+03:00"]) {
      const meeting = { ...ended, status, attendance_closes_at };
      for (const time of [end - 1, end, Date.parse("2026-09-10T18:17:00+03:00"), deadline - 1]) {
        assert.equal(attendanceResult(meeting, null, null, time), "upcoming");
        assert.equal(attendanceResult(meeting, null, "approved", time), "upcoming");
        assert.equal(attendanceResult(meeting, "present", null, time), "present");
      }
      for (const time of [deadline, deadline + 1, Date.parse("2026-09-11T12:00:00+03:00")]) {
        assert.equal(attendanceResult(meeting, null, null, time), "absent");
        assert.equal(attendanceResult(meeting, "reversed", null, time), "absent");
        assert.equal(attendanceResult(meeting, null, "pending", time), "absent");
        assert.equal(attendanceResult(meeting, null, "rejected", time), "absent");
        assert.equal(attendanceResult(meeting, null, "approved", time), "excused");
        assert.equal(attendanceResult(meeting, "present", "approved", time), "present");
        assert.equal(attendanceResult({ ...meeting, status: "draft" }, null, null, time), "draft");
        assert.equal(attendanceResult({ ...meeting, status: "cancelled" }, null, null, time), "cancelled");
      }
    }
  }
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
