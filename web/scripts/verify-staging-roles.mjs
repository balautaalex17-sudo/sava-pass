import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = (process.argv[2] || "https://sava-pass-staging.vercel.app").replace(/\/$/, "");
const outputDirectory = path.resolve("..", "active", "staging-browser", "roles");
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value || value === "[SENSITIVE]") throw new Error(`Missing ${name}`);
  return value;
};

const roles = [
  { key: "ADMIN", expectedPath: "/admin", blockedPath: null },
  { key: "BOARD", expectedPath: "/board", blockedPath: "/conta" },
  { key: "SCANNER", expectedPath: "/board/scaneaza-bilete", blockedPath: "/scanner" },
  { key: "INTERVIEWER", expectedPath: "/board/interviuri", blockedPath: "/conta" },
];

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
const failures = [];

for (const role of roles) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, locale: "ro-RO" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("Email", { exact: true }).fill(required(`STAFF_TEST_${role.key}_EMAIL`));
  await page.getByLabel("Parolă", { exact: true }).fill(required(`STAFF_TEST_${role.key}_PASSWORD`));
  await page.getByRole("button", { name: "Intră", exact: true }).click();
  await page.waitForURL((url) => url.pathname === role.expectedPath, { timeout: 20_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 20_000 });

  const landingPath = new URL(page.url()).pathname;
  const heading = await page.locator("h1").first().innerText();
  const loginError = await page.getByText("Email sau parolă incorectă.", { exact: true }).count();
  if (landingPath !== role.expectedPath) failures.push({ role: role.key, check: "landing", detail: landingPath });
  if (loginError) failures.push({ role: role.key, check: "credentials", detail: "login rejected" });

  let blockedResult = null;
  if (role.blockedPath) {
    await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(350);
    blockedResult = new URL(page.url()).pathname;
    if (blockedResult !== role.blockedPath) failures.push({ role: role.key, check: "admin-boundary", detail: blockedResult });
  }

  if (errors.length) failures.push({ role: role.key, check: "browser-errors", detail: errors.join(" | ") });
  await page.screenshot({ path: path.join(outputDirectory, `${role.key.toLowerCase()}.png`), fullPage: true });
  results.push({ role: role.key, landingPath, heading, blockedResult, errors });
  await context.close();
}

await browser.close();
const report = { baseUrl, capturedAt: new Date().toISOString(), results, failures };
writeFileSync(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
