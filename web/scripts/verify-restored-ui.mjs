// Actual React components, disposable data, inert actions and no external traffic.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root = process.cwd();
const output = fs.mkdtempSync(path.join(os.tmpdir(), "savapass-restored-ui-"));
const adapters = {
  navigation: `const router={push(url){window.fixtureNavigation=url},refresh(){window.fixtureRefreshed=true}};export function useRouter(){return router}`,
  link: 'export const defaultLink="a"; export {defaultLink as default,defaultLink as PortalLink}',
  form: 'export default "form"',
  actions: `export async function runRecruitmentBatchAction(){throw Error("Unexpected candidate action")}
    export async function saveApplicationEvaluation(){throw Error("Unexpected evaluation action")}
    export async function saveMember(){throw Error("Unexpected member edit")}
    export async function resendMemberInvitation(){throw Error("Unexpected invitation")}
    export async function chooseMemberDepartment(_state,data){return {message:"Salvat",department:data.get("department")}}
    export async function reviewDepartmentRequest(input){window.fixtureReview=input;return input.acceptImbalance?{ok:true,message:"Aprobat"}:{ok:false,balanceWarning:true,message:"Confirmă excepția"}}`,
};
await build({
  entryPoints: [path.join(root, "tests/restored-ui.fixture.tsx")],
  bundle: true, outdir: output, entryNames: "fixture", platform: "browser", format: "iife",
  tsconfig: path.join(root, "tsconfig.json"), define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "inert-adapters", setup(builder) {
    builder.onResolve({ filter: /actions$/ }, () => ({ path: "actions", namespace: "fixture" }));
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
    builder.onResolve({ filter: /^(next\/link|@\/components\/dashboard\/PortalLink)$/ }, () => ({ path: "link", namespace: "fixture" }));
    builder.onResolve({ filter: /^next\/form$/ }, () => ({ path: "form", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => ({ contents: adapters[name], loader: "js" }));
  } }],
});
const baseCss = fs.readFileSync(path.join(root, "app/(dashboard)/dashboard.css"), "utf8");
const server = http.createServer((req, res) => {
  if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); res.end(fs.readFileSync(path.join(output, "fixture.js"))); }
  else if (req.url === "/fixture.css") { res.setHeader("Content-Type", "text/css"); res.end(baseCss + fs.readFileSync(path.join(output, "fixture.css"), "utf8")); }
  else { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/fixture.css"><style>body{font-family:Arial;margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/fixture.js"></script>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const address = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.BROWSER_EXECUTABLE ?? [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find(p => fs.existsSync(p));
assert.ok(executablePath, "Set BROWSER_EXECUTABLE to an installed Chromium browser");
const browser = await chromium.launch({ headless: true, executablePath });
const checks = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/*", route => route.request().url().startsWith(address) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(address);
    const rows = page.locator(".form-results-centralizer__table tbody tr");
    await rows.first().waitFor();
    assert.equal(await rows.count(), 3);
    await page.getByRole("button", { name: "Arată formularele neevaluate de mine", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll(".form-results-centralizer__table tbody tr").length === 2);
    assert.match(await rows.allTextContents().then(x => x.join(" ")), /Bianca Other.*Carla None/);
    assert.doesNotMatch(await rows.allTextContents().then(x => x.join(" ")), /Ana Own/);
    await page.getByRole("textbox", { name: "Caută un candidat" }).fill("Bianca");
    await page.waitForFunction(() => document.querySelectorAll(".form-results-centralizer__table tbody tr").length === 1);
    await page.getByRole("textbox", { name: "Caută un candidat" }).fill("");
    await page.getByRole("button", { name: "Arată formularele neevaluate", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll(".form-results-centralizer__table tbody tr").length === 1);
    assert.match(await rows.innerText(), /Carla None/);
    assert.equal(await page.getByRole("button", { name: /Trimite la interviu/ }).count(), 0);
    assert.equal(await page.locator(".form-results-decision").count(), 0);
    await page.goto(address + "?role=evaluator");
    assert.equal(await page.getByRole("button", { name: "Arată formularele neevaluate de mine", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Arată formularele neevaluate", exact: true }).click();
    await page.waitForFunction(() => !document.body.innerText.includes("Ana Own"));
    assert.match(await page.locator("body").innerText(), /Bianca Other/);
    await page.goto(address + "?view=members");
    await page.getByLabel("Departament", { exact: true }).selectOption("hr");
    assert.match(await page.locator("tbody").innerText(), /Ana HR/);
    assert.doesNotMatch(await page.locator("tbody").innerText(), /Bianca PR|Daria Board/);
    await page.getByLabel("Departament", { exact: true }).selectOption("unassigned");
    assert.match(await page.locator("tbody").innerText(), /Carla Neales/);
    assert.doesNotMatch(await page.locator("tbody").innerText(), /Daria Board/);
    await page.getByLabel("Departament", { exact: true }).selectOption("all");
    await page.getByLabel("Ordonează", { exact: true }).selectOption("pr");
    assert.match(await page.locator("tbody tr").first().innerText(), /Bianca PR/);
    await page.screenshot({ path: path.join(output, `members-${width}.png`), fullPage: true });
    await page.goto(address + "?view=attendance");
    assert.equal(await page.getByRole("button", { name: "Afișează" }).count(), 0);
    await page.getByLabel("Ședință", { exact: true }).selectOption("b");
    await page.waitForFunction(() => window.fixtureNavigation?.endsWith("meeting=b"));
    await page.getByLabel("Ședință", { exact: true }).selectOption("c");
    await page.waitForFunction(() => window.fixtureNavigation?.endsWith("meeting=c"));
    await page.goto(address + "?view=department");
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("button", { name: "Aleg HR", exact: true }).isDisabled(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").isVisible(), true);
    await page.getByRole("button", { name: "Aleg PR", exact: true }).click();
    await page.waitForFunction(() => window.fixtureRefreshed === true);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.goto(address + "?view=review");
    await page.getByRole("button", { name: "Aprobă cererea", exact: true }).click();
    await page.getByRole("button", { name: "Aprobă totuși", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.fixtureReview.acceptImbalance), false);
    await page.getByRole("button", { name: "Aprobă totuși", exact: true }).click();
    await page.getByText("Aprobat", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.fixtureReview.acceptImbalance), true);
    assert.deepEqual(errors, []);
    checks.push({ width, result: "passed", checks: ["personal/global unrated and search", "evaluator scope", "compact rows", "department filters/sort", "attendance auto-submit", "department popup", "fresh review warning"] });
    await context.close();
  }
  console.log(JSON.stringify({ checks, artifacts: output }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
