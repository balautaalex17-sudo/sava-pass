import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip";
const baseUrl = (process.argv[2] || "https://sava-pass-staging.vercel.app").replace(/\/$/, "");
const outputDirectory = path.resolve("..", "active", "staging-browser", "live-flows");
const runId = crypto.randomUUID();
const runShort = runId.slice(0, 8);

function required(name, minimumLength = 1) {
  const value = process.env[name]?.trim();
  if (!value || value === "[SENSITIVE]" || value.length < minimumLength) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const supabaseUrl = new URL(required("NEXT_PUBLIC_SUPABASE_URL"));
const projectRef = supabaseUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1]?.toLowerCase();
const expectedRef = required("SUPABASE_TEST_PROJECT_REF").toLowerCase();
if (!projectRef || projectRef === PRODUCTION_PROJECT_REF || projectRef !== expectedRef) {
  throw new Error("Refusing a non-staging Supabase project");
}
if (!new URL(baseUrl).hostname.includes("staging")) throw new Error("Refusing a non-staging site URL");
if (required("LIVE_FLOW_CONFIRM") !== "STAGING_ONLY") throw new Error("Set LIVE_FLOW_CONFIRM=STAGING_ONLY");
if (Object.keys(process.env).some((name) => name.startsWith("STRIPE_"))) {
  throw new Error("Stripe variables are forbidden in cash-only staging");
}

const supabase = createClient(supabaseUrl.toString(), required("SUPABASE_SERVICE_ROLE_KEY", 32), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const boardEmail = required("STAFF_TEST_BOARD_EMAIL");
const boardPassword = required("STAFF_TEST_BOARD_PASSWORD", 12);
const resumeCheckoutEmail = process.env.LIVE_FLOW_RESUME_EMAIL?.trim().toLowerCase() || "";
const resumeApplicationEmail = process.env.LIVE_FLOW_RESUME_APPLICATION_EMAIL?.trim().toLowerCase() || "";
const resumeContactEmail = process.env.LIVE_FLOW_RESUME_CONTACT_EMAIL?.trim().toLowerCase() || "";
const checkoutEmail = resumeCheckoutEmail || `e2e.cash.${runShort}@example.invalid`;
const applicationEmail = resumeApplicationEmail || `e2e.application.${runShort}@example.invalid`;
const contactEmail = resumeContactEmail || `e2e.contact.${runShort}@example.invalid`;
const browserErrors = [];
const failedRequests = [];
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
}

function attachDiagnostics(page) {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("net::ERR_ABORTED")) {
      browserErrors.push(`${new URL(page.url()).pathname}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => browserErrors.push(`${new URL(page.url()).pathname}: ${String(error)}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    if (!failure.includes("ERR_ABORTED")) failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
  });
}

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
let ticketToken = "";
let ticketId = "";
let orderId = "";
let applicationId = "";
let contactId = "";
let runFailure = null;

try {
  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ro-RO",
  });
  const page = await publicContext.newPage();
  attachDiagnostics(page);

  if (resumeCheckoutEmail) {
    const { data: resumableTicket, error: resumeError } = await supabase
      .from("tickets")
      .select("qr_token, status")
      .eq("holder_email", resumeCheckoutEmail)
      .eq("status", "reserved")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resumeError || !resumableTicket) throw resumeError ?? new Error("Reserved E2E ticket cannot be resumed");
    ticketToken = resumableTicket.qr_token;
    await page.goto(`${baseUrl}/bilet/${encodeURIComponent(ticketToken)}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } else {
    await page.goto(`${baseUrl}/eveniment-staging/checkout`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const availableRadio = page.getByRole("radio").first();
    if (await availableRadio.count() && !(await availableRadio.isChecked())) await availableRadio.check();
    await page.getByLabel("Prenume și nume", { exact: true }).fill(`[E2E ${runShort}] Rezervare Cash`);
    await page.getByLabel(/Adresa de email/).fill(checkoutEmail);
    await page.getByRole("checkbox").check();
    await Promise.all([
      page.waitForURL((url) => url.pathname.startsWith("/bilet/"), { timeout: 60_000 }),
      page.getByRole("button", { name: "Rezervă biletul", exact: true }).click(),
    ]);
    const ticketPath = new URL(page.url()).pathname;
    ticketToken = decodeURIComponent(ticketPath.slice("/bilet/".length));
  }
  check("cash_reservation_redirect", ticketToken.startsWith("SPT2."), "ticket page uses a signed SPT2 token");
  await page.getByText(/Plata cash nu este încă confirmată/i).first().waitFor({ state: "visible", timeout: 30_000 });
  check(
    "cash_reservation_pending_ui",
    await page.getByText(/Plata cash nu este încă confirmată/i).first().isVisible(),
    "pending cash warning is visible",
  );
  await page.screenshot({ path: path.join(outputDirectory, `${runShort}-cash-reserved.png`), fullPage: true });

  const { data: reservedTicket, error: reservedError } = await supabase
    .from("tickets")
    .select("id, order_id, status, code, holder_email, orders(status)")
    .eq("qr_token", ticketToken)
    .single();
  if (reservedError || !reservedTicket) throw reservedError ?? new Error("Reserved ticket not found");
  ticketId = reservedTicket.id;
  orderId = reservedTicket.order_id;
  check("cash_reservation_database", reservedTicket.status === "reserved", `ticket status ${reservedTicket.status}`);

  let application;
  if (resumeApplicationEmail) {
    const { data, error } = await supabase
      .from("membership_applications")
      .select("id, status, source, is_complete")
      .eq("email", applicationEmail)
      .single();
    if (error || !data) throw error ?? new Error("Submitted E2E application cannot be resumed");
    application = data;
    check("application_success_ui", true, "previous successful UI submission resumed");
  } else {
    await page.goto(`${baseUrl}/devino-membru`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByRole("link", { name: "Completează formularul", exact: true }).click();
    await page.locator("#aplica").waitFor({ state: "visible", timeout: 30_000 });
    const applicantName = page.getByPlaceholder("Ex. Mara Popescu");
    await applicantName.waitFor({ state: "visible", timeout: 30_000 });
    await applicantName.fill(`[E2E ${runShort}] Candidat Test`);
    await page.getByPlaceholder("mara@email.ro").fill(applicationEmail);
    await page.getByPlaceholder("07xx xxx xxx").fill("0700000000");
    await page.getByPlaceholder("Ex. a X-a B, științe ale naturii").fill("a X-a T, staging");
    await page.getByRole("button", { name: /Continuă/ }).click();
    const answer = "Acesta este un răspuns fictiv pentru verificarea stagingului. Are două fraze complete și descrie un exemplu clar de colaborare.";
    for (const textarea of await page.locator("textarea:visible").all()) await textarea.fill(answer);
    await page.getByRole("button", { name: /Continuă/ }).click();
    for (const textarea of await page.locator("textarea:visible").all()) await textarea.fill(answer);
    await page.getByRole("button", { name: /Continuă/ }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Trimite aplicația/ }).click();
    await page.getByText("Aplicația ta a ajuns.", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    check("application_success_ui", true, "success state rendered");
    await page.screenshot({ path: path.join(outputDirectory, `${runShort}-application-success.png`), fullPage: true });

    const { data, error } = await supabase
      .from("membership_applications")
      .select("id, status, source, is_complete")
      .eq("email", applicationEmail)
      .single();
    if (error || !data) throw error ?? new Error("Application not found");
    application = data;
    check("application_tracking_link_removed", await page.getByRole("link", { name: /Urmărește candidatura/ }).count() === 0, "success state has no tracking link");
  }
  applicationId = application.id;
  check(
    "application_database",
    application.status === "submitted" && application.source === "web" && application.is_complete === true,
    `status ${application.status}, source ${application.source}, complete ${application.is_complete}`,
  );
  const removedStatusResponse = await page.goto(`${baseUrl}/candidatura/${crypto.randomUUID()}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("application_status_page_removed", removedStatusResponse?.status() === 404, `candidate status route returned ${removedStatusResponse?.status()}`);

  if (resumeContactEmail) {
    check("contact_success_ui", true, "previous successful UI submission resumed");
  } else {
    await page.goto(`${baseUrl}/contact`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("#c-name").fill(`[E2E ${runShort}] Contact Test`);
    await page.locator("#c-email").fill(contactEmail);
    await page.locator("#c-msg").fill(`Mesaj fictiv E2E ${runId}. Verificăm salvarea și confirmarea formularului de contact.`);
    await page.getByRole("button", { name: "Trimite mesajul", exact: true }).click();
    await page.getByText("Mulțumim.", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    check("contact_success_ui", true, "success state rendered");
    await page.screenshot({ path: path.join(outputDirectory, `${runShort}-contact-success.png`), fullPage: true });
  }

  const { data: contact, error: contactError } = await supabase
    .from("contact_messages")
    .select("id, handled")
    .eq("email", contactEmail)
    .single();
  if (contactError || !contact) throw contactError ?? new Error("Contact message not found");
  contactId = contact.id;
  check("contact_database", contact.handled === false, "new contact message is stored as unhandled");
  await publicContext.close();

  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 820 }, locale: "ro-RO" });
  const staffPage = await staffContext.newPage();
  attachDiagnostics(staffPage);
  await staffPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await staffPage.getByLabel("Email", { exact: true }).fill(boardEmail);
  await staffPage.getByLabel("Parolă", { exact: true }).fill(boardPassword);
  await staffPage.getByRole("button", { name: "Intră", exact: true }).click();
  await staffPage.waitForURL((url) => url.pathname === "/board", { timeout: 30_000 });
  await staffPage.goto(`${baseUrl}/board/scaneaza-bilete`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const manualInput = staffPage.getByLabel("Introducere manuală", { exact: true });
  await manualInput.fill(ticketToken);
  await staffPage.getByRole("button", { name: "Verifică", exact: true }).click();
  await staffPage.getByRole("heading", { name: "Rezervare găsită. Plata cash nu este confirmată.", exact: true }).waitFor({ timeout: 30_000 });
  check("qr_before_payment", await staffPage.getByRole("button", { name: "Confirmă plata cash", exact: true }).isVisible(), "scanner requires explicit cash confirmation");
  await staffPage.screenshot({ path: path.join(outputDirectory, `${runShort}-qr-before-payment.png`), fullPage: true });

  await staffPage.getByRole("button", { name: "Confirmă plata cash", exact: true }).click();
  await staffPage.getByRole("heading", { name: "Plata cash a fost confirmată", exact: true }).waitFor({ timeout: 30_000 });
  check("cash_confirmation_ui", await staffPage.getByRole("button", { name: "Confirmă acum intrarea", exact: true }).isVisible(), "payment confirmation unlocks check-in");
  await staffPage.getByRole("button", { name: "Confirmă acum intrarea", exact: true }).click();
  await staffPage.getByRole("heading", { name: "Intrare confirmată", exact: true }).waitFor({ timeout: 30_000 });
  check("qr_after_payment", true, "paid ticket was checked in");
  await staffPage.screenshot({ path: path.join(outputDirectory, `${runShort}-qr-accepted.png`), fullPage: true });

  await staffPage.getByRole("button", { name: /Scanează următorul/ }).click();
  await staffPage.waitForTimeout(2_600);
  await manualInput.fill(ticketToken);
  await staffPage.getByRole("button", { name: "Verifică", exact: true }).click();
  await staffPage.getByRole("heading", { name: "Biletul a fost deja folosit", exact: true }).waitFor({ timeout: 30_000 });
  check("qr_duplicate_guard", true, "second scan was rejected as already checked in");
  await staffPage.screenshot({ path: path.join(outputDirectory, `${runShort}-qr-duplicate.png`), fullPage: true });
  await staffContext.close();

  const [{ data: finalTicket, error: finalTicketError }, { count: acceptedScans, error: scansError }, { count: cashConfirmations, error: cashError }] = await Promise.all([
    supabase.from("tickets").select("status, payment_confirmed_at, checked_in_at, orders(status, paid_at)").eq("id", ticketId).single(),
    supabase.from("scans").select("id", { count: "exact", head: true }).eq("ticket_id", ticketId).eq("action", "check_in").eq("result", "accepted"),
    supabase.from("cash_payment_confirmations").select("id", { count: "exact", head: true }).eq("ticket_id", ticketId),
  ]);
  if (finalTicketError || !finalTicket) throw finalTicketError ?? new Error("Final ticket state missing");
  if (scansError) throw scansError;
  if (cashError) throw cashError;
  check(
    "cash_qr_database",
    finalTicket.status === "checked_in" && Boolean(finalTicket.payment_confirmed_at) && Boolean(finalTicket.checked_in_at) && acceptedScans === 1 && cashConfirmations === 1,
    `status ${finalTicket.status}, accepted scans ${acceptedScans}, confirmations ${cashConfirmations}`,
  );
  check("browser_console", browserErrors.length === 0, browserErrors.join(" | ") || "no browser errors");
  check("failed_requests", failedRequests.length === 0, failedRequests.join(" | ") || "no failed requests");
} catch (error) {
  runFailure = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
}

const report = {
  run_id: runId,
  base_url: baseUrl,
  captured_at: new Date().toISOString(),
  checks,
  run_failure: runFailure,
  browser_errors: browserErrors,
  failed_requests: failedRequests,
  retained_records: {
    order_id: orderId || null,
    ticket_id: ticketId || null,
    application_id: applicationId || null,
    contact_message_id: contactId || null,
    emails: { checkout: checkoutEmail, application: applicationEmail, contact: contactEmail },
  },
};
const reportPath = path.join(outputDirectory, `${runShort}-report.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ run_id: runId, checks: checks.length, failures: checks.filter((item) => !item.ok), report: reportPath }, null, 2));
if (runFailure) {
  console.error(runFailure);
  process.exitCode = 1;
}
