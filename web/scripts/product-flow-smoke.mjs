import pkg from "file:///C:/Users/cycla/Documents/Bussines/projects/sava-pass/web/node_modules/playwright-core/index.js";
import { mkdirSync, writeFileSync } from "node:fs";

const { chromium } = pkg;
const baseUrl = process.argv[2] || "http://localhost:3000";
const outputDirectory = "active/review/loop3-final";
mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const results = [];
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));

function record(check, passed, detail) {
  results.push({ check, passed, detail });
  if (!passed) throw new Error(`${check}: ${detail}`);
}

let response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 60_000 });
record("landing_load", response?.status() === 200, `status ${response?.status()}`);
const showcaseCards = page.locator("#event .ev-showcase-grid .ev-past--managed");
record("landing_unified_showcase", await showcaseCards.count() === 3, "exactly three dashboard-selected cards render");
record("landing_no_separate_event_hero", await page.locator("#event .ev-feat, #event .ev-map").count() === 0, "legacy event hero and map are absent");
record("landing_ended_cards_hide_price", await page.locator("#event .ev-past:not(.ev-past--active) .ev-past-price").count() === 0, "ended cards contain no ticket price");

response = await page.goto(`${baseUrl}/echoes-unplugged`, { waitUntil: "networkidle", timeout: 60_000 });
record("past_event_detail", response?.status() === 200 && await page.getByText("Încheiat").isVisible(), `status ${response?.status()}`);
record("past_event_no_checkout_cta", await page.locator('a[href="/echoes-unplugged/checkout"]').count() === 0, "no purchase link rendered");

response = await page.goto(`${baseUrl}/echoes-unplugged/checkout`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByText("Pagina nu există").waitFor({ state: "visible" });
record("past_event_checkout_blocked", await page.locator("form").count() === 0, `not-found UI rendered; streamed status ${response?.status()}`);

response = await page.goto(`${baseUrl}/devino-membru`, { waitUntil: "networkidle", timeout: 60_000 });
record("recruitment_campaign_load", response?.status() === 200 && await page.getByText("Devino membru · Generația 2026–2027").isVisible(), `status ${response?.status()}`);
const continueButton = page.getByRole("button", { name: /Continuă/ });
record("application_step_validation", await continueButton.isDisabled(), "personal-data step blocks incomplete input");
await page.getByLabel("Nume complet").fill("Ana Review Browser");
await page.getByLabel("Clasa & liceul").fill("Sf. Sava · a X-a");
await page.getByLabel("Email").fill("ana.browser@example.invalid");
await page.getByLabel("Telefon").fill("0700000000");
record("application_personal_step", await continueButton.isEnabled(), "valid personal data unlocks the next step");
await continueButton.click();
record("application_track_validation", await continueButton.isDisabled(), "interest step requires a department");
await page.getByRole("button", { name: /Evenimente/ }).click();
await page.getByRole("button", { name: "Lun seara" }).click();
await continueButton.click();
const motivation = page.getByPlaceholder(/La concertul de toamnă/);
record("application_motivation_validation", await continueButton.isDisabled(), "short motivation is blocked");
await motivation.fill("Vreau să ajut echipa să organizeze evenimente clare, primitoare și bine coordonate.");
await continueButton.click();
const submitButton = page.getByRole("button", { name: /Trimite aplicația/ });
record("application_consent_guard", await submitButton.isDisabled(), "submission requires privacy consent");
await page.locator(".apply-consent input").check();
record("application_ready_without_submission", await submitButton.isEnabled(), "complete application reaches review state");
await page.screenshot({ path: `${outputDirectory}/recruitment-mobile-ready.png`, fullPage: true });

await page.waitForTimeout(350);
await page.reload({ waitUntil: "networkidle" });
record("application_draft_saved", await page.getByLabel("Nume complet").inputValue() === "Ana Review Browser", "local draft restored after reload");

for (const route of ["/admin", "/admin/media", "/admin/interviuri", "/admin/notificari", "/scanner"]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const authPath = new URL(page.url()).pathname;
  record(`unauthorized_${route.replaceAll("/", "_")}`, authPath === "/login" || authPath === "/conta", `redirected to ${authPath}`);
}

const cronResponse = await page.request.get(`${baseUrl}/api/notifications/due`);
record("notification_cron_secret", cronResponse.status() === 401, `status ${cronResponse.status()}`);

record("browser_console", errors.length === 0, errors.join(" | ") || "no console errors");
writeFileSync(`${outputDirectory}/browser-results.json`, JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results, errors }, null, 2));
await context.close();
await browser.close();
