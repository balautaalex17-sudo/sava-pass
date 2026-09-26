import assert from "node:assert/strict";
import test from "node:test";
import {
  departmentBlockedMessage, isDepartmentEligible, needsDepartmentSelection, parseDepartmentOptions,
} from "../lib/dashboard/member-departments";
import { departmentBalanceWarning } from "../lib/dashboard/department-requests";

test("only active non-Board, non-Super-Admin members must choose once", () => {
  const member = { membership_status: "active", role: null, member_department: null };
  assert.equal(needsDepartmentSelection(member), true);
  for (const department of ["hr", "pr"]) {
    assert.equal(needsDepartmentSelection({ ...member, member_department: department }), false);
  }
  for (const role of ["admin", "board"]) {
    assert.equal(isDepartmentEligible({ ...member, role }), false);
    assert.equal(needsDepartmentSelection(member, ["scanner", role]), false);
  }
  for (const membership_status of ["recruit", "inactive", "suspended", "alumni"]) {
    assert.equal(needsDepartmentSelection({ ...member, membership_status }), false);
  }
  for (const role of ["scanner", "interviewer", "statistici"]) {
    assert.equal(needsDepartmentSelection({ ...member, role }, [role]), true);
  }
});

test("availability accepts only valid server counts and departments", () => {
  const options = { hr: 8, pr: 2, blockedDepartment: "hr" };
  assert.deepEqual(parseDepartmentOptions({ ...options, result: "blocked" }), options);
  assert.deepEqual(parseDepartmentOptions({ hr: 0, pr: 0, blockedDepartment: null }), { hr: 0, pr: 0, blockedDepartment: null });
  for (const invalid of [null, {}, { ...options, hr: -1 }, { ...options, pr: 1.5 }, { ...options, blockedDepartment: "admin" }]) {
    assert.equal(parseDepartmentOptions(invalid), null);
  }
});

test("both blocked options explain the threshold and the other choice", () => {
  for (const department of ["hr", "pr"] as const) {
    const message = departmentBlockedMessage(department);
    assert.match(message, /peste 75%/);
    assert.match(message, new RegExp(`deja în ${department.toUpperCase()}`));
    assert.match(message, new RegExp(`Alege ${department === "hr" ? "PR" : "HR"}`));
    for (const explanation of [message, departmentBalanceWarning(department)]) {
      assert.match(explanation, /toți membrii activi/);
      assert.match(explanation, /include și membrii fără departament/);
      assert.match(explanation, /exclude Board și Super Admin/);
    }
  }
});
