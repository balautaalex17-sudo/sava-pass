import assert from "node:assert/strict";
import test from "node:test";
import { applicationDisplayAnswers, applicationFieldValue } from "../lib/dashboard/recruitment";

const application = {
  full_name: "Candidat Test",
  email: "candidat@example.com",
  phone: "0700000000",
  grade: "10 A",
  submitted_at: "2026-09-08T09:00:00.000Z",
  created_at: "2026-09-08T09:00:01.000Z",
  source: "web",
  answers: {
    version: 2,
    about_you: "Prima linie.\nA doua linie.",
    mistake: "Am cerut ajutor.",
    team_priority: "Respect promisiunea.",
    club_exchange: "Ofer timp și energie.",
    promote_event: "Invitații pentru colegi.",
    team_organization: "Împărțim responsabilitățile.",
  },
};

test("website submissions display all 12 fields from separate contact columns and written answers", () => {
  const original = structuredClone(application);
  const answers = applicationDisplayAnswers(application);
  const expected = {
    timestamp: application.submitted_at,
    respondent_email: application.email,
    full_name: application.full_name,
    email: application.email,
    phone: application.phone,
    grade: application.grade,
    ...Object.fromEntries(Object.entries(application.answers).filter(([key]) => key !== "version")),
  };
  assert.equal(Object.keys(expected).length, 12);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(applicationFieldValue({ key, source_header: `Header: ${key}` }, answers, {}), value);
  }
  assert.deepEqual(application, original);
});

test("imports preserve their original answers, separate respondent email, and source headers", () => {
  const imported = {
    ...application,
    source: "google_sheets",
    answers: {
      full_name: "Nume din formular",
      email: "contact@example.com",
      respondent_email: "respondent@example.com",
      phone: "",
      timestamp: "08/09/2026 12:00:00",
      about_you: "  Răspuns original.\nContinuare.  ",
    },
  };
  const answers = applicationDisplayAnswers(imported);
  for (const [key, value] of Object.entries(imported.answers)) assert.equal(answers[key], value);
  const field = { key: "about_you", source_header: "Întrebarea 1 " };
  assert.equal(applicationFieldValue(field, answers, { "Întrebarea 1 ": "Text original din fișier" }), "Text original din fișier");
  assert.equal(applicationFieldValue(field, answers, { "Întrebarea 1 ": "" }), "");
});

test("missing details stay empty and website timestamp can use creation time", () => {
  const answers = applicationDisplayAnswers({ ...application, phone: "", grade: null, submitted_at: null, answers: null });
  assert.equal(answers.timestamp, application.created_at);
  assert.equal(answers.phone, "");
  assert.equal(answers.grade, "");
  assert.equal(applicationFieldValue({ key: "about_you", source_header: "Întrebarea 1" }, answers, {}), "");
  const imported = applicationDisplayAnswers({ ...application, source: "google_sheets", submitted_at: null, answers: {} });
  assert.equal(imported.timestamp, "");
  assert.equal(imported.respondent_email, undefined);
});
