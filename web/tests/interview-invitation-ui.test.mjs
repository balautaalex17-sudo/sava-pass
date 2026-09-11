import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";

// Render the real component with inert action adapters. No database or email.
const root = process.cwd();
const bundle = await build({
  stdin: { contents: `
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { FormResultsWorkspace } from "./app/(dashboard)/board/inscrieri/FormResultsWorkspace";
    export function render(canSendToInterview, selected = false) {
      const application = {
        id: "candidate", formId: "form", fullName: "Candidate Fixture", email: "candidate@example.com",
        grade: "X", answers: {}, sourcePayload: {}, status: selected ? "selected_for_interview" : "submitted",
        completionPercentage: 100, isComplete: true, missingRequiredFields: [], reviewerId: null,
        reviewerName: null, updatedAt: "2026-09-09T10:00:00Z", submittedAt: "2026-09-09T10:00:00Z", source: "web",
      };
      return renderToStaticMarkup(createElement(FormResultsWorkspace, {
        applications: [application], fields: [], evaluations: [{applicationId: "candidate", reviewerId: "viewer",
          reviewerName: "Reviewer", rating: "green", comment: "", baseScore: 6, questionScores: {}, updatedAt: application.updatedAt}],
        selectedForInterviewIds: selected ? ["candidate"] : [], interviewEmailIds: [], viewerId: "viewer", viewerName: "Reviewer",
        isBoardView: true, canManage: true, canSendToInterview, canEvaluate: true,
      }));
    }
  `, loader: "tsx", resolveDir: root },
  bundle: true, write: false, platform: "node", format: "cjs", tsconfig: resolve(root, "tsconfig.json"),
  external: ["react", "react-dom/server"],
  plugins: [{ name: "inert-actions", setup(build) {
    build.onResolve({ filter: /actions$/ }, args => ({ path: args.path, namespace: "fixture" }));
    build.onResolve({ filter: /^@\/components\/dashboard\/PortalLink$/ }, () => ({ path: "link", namespace: "fixture" }));
    build.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
      contents: args.path === "link"
        ? 'export const PortalLink = "a"'
        : 'export async function runRecruitmentBatchAction(){throw Error("Unexpected action")}; export async function saveApplicationEvaluation(){throw Error("Unexpected action")}',
      loader: "js",
    }));
  } }],
});
const require = createRequire(resolve(root, "package.json"));
const fixture = new Module(resolve(root, "tests/interview-ui.fixture.cjs"));
fixture.filename = resolve(root, "tests/interview-ui.fixture.cjs");
fixture.paths = require.resolve.paths("react");
fixture._compile(bundle.outputFiles[0].text, fixture.filename);

test("Board sees evaluations but no individual, bulk, or resend invitation controls", () => {
  for (const selected of [false, true]) {
    const html = fixture.exports.render(false, selected);
    assert.doesNotMatch(html, /Trimite la interviu|Trimite individual la interviu|Retrimite emailul de interviu|interview-confirm-title/);
    assert.match(html, /Candidate Fixture/);
    assert.match(html, /Anunță candidații respinși/);
  }
});

test("Super Admin retains individual, bulk, and resend invitation controls", () => {
  const pending = fixture.exports.render(true, false);
  assert.match(pending, /Trimite la interviu \(0\)/);
  assert.match(pending, /Trimite individual la interviu candidatul Candidate Fixture/);
  assert.match(pending, /interview-confirm-title/);
  assert.match(fixture.exports.render(true, true), /Retrimite emailul de interviu/);
});
