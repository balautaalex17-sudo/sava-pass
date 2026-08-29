import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = (process.argv[2] || "https://sava-pass-staging.vercel.app").replace(/\/$/, "");
const outputDirectory = path.resolve("..", "active", "staging-browser");
const viewports = [
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
];
const publicRoutes = [
  "/",
  "/evenimente",
  "/eveniment-staging",
  "/eveniment-staging/checkout",
  "/devino-membru",
  "/contact",
  "/despre",
  "/echipa",
  "/proiecte",
  "/sponsori",
  "/district",
  "/confidentialitate",
  "/termeni",
  "/conta/login",
];
const protectedRoutes = ["/admin", "/board", "/scanner", "/membru"];
const screenshotRoutes = new Set([
  "mobile-390:/",
  "mobile-390:/eveniment-staging/checkout",
  "mobile-390:/devino-membru",
  "desktop-1440:/",
]);

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
const failures = [];

function fail(check, detail) {
  failures.push({ check, detail });
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    locale: "ro-RO",
    reducedMotion: viewport.name === "mobile-390" ? "reduce" : "no-preference",
  });
  const page = await context.newPage();

  for (const route of publicRoutes) {
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    const onConsole = (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    const onPageError = (error) => pageErrors.push(String(error));
    const onRequestFailed = (request) => {
      const errorText = request.failure()?.errorText || "failed";
      if (errorText === "net::ERR_ABORTED") return;
      failedRequests.push(`${request.method()} ${request.url()} · ${errorText}`);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("requestfailed", onRequestFailed);

    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(650);
    await page.evaluate(async () => {
      const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(150);
    const audit = await page.evaluate(() => ({
      finalPath: location.pathname,
      title: document.title,
      heading: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyText: document.body.innerText,
      stripeLinks: [...document.querySelectorAll("a[href]")].map((link) => link.href).filter((href) => /stripe/i.test(href)),
      brokenImages: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0 && (image.currentSrc || image.src))
        .map((image) => image.currentSrc || image.src),
    }));
    const status = response?.status() ?? 0;
    const forbiddenPaymentCopy = route.startsWith("/eveniment-staging")
      ? /stripe|plată\s+online|card\s+bancar/i.test(audit.bodyText)
      : false;

    if (status >= 400 || status === 0) fail(`${viewport.name}${route}:status`, `HTTP ${status}`);
    if (!audit.heading) fail(`${viewport.name}${route}:heading`, "lipsește H1");
    if (audit.scrollWidth > audit.clientWidth + 2) fail(`${viewport.name}${route}:overflow`, `${audit.scrollWidth}px > ${audit.clientWidth}px`);
    if (audit.brokenImages.length) fail(`${viewport.name}${route}:images`, audit.brokenImages.join(" | "));
    if (audit.stripeLinks.length || forbiddenPaymentCopy) fail(`${viewport.name}${route}:cash-only`, "a apărut Stripe, plata online sau card bancar");
    if (consoleErrors.length || pageErrors.length || failedRequests.length) {
      fail(`${viewport.name}${route}:browser`, [...consoleErrors, ...pageErrors, ...failedRequests].join(" | "));
    }

    const screenshotKey = `${viewport.name}:${route}`;
    if (screenshotRoutes.has(screenshotKey)) {
      const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      await page.screenshot({
        path: path.join(outputDirectory, `${viewport.name}-${name}.png`),
        fullPage: route !== "/" || !viewport.isMobile,
      });
    }

    if (route === "/") {
      const sectionAudits = [];
      for (const sectionId of ["intro", "hero", "event", "board", "join", "foot"]) {
        const section = page.locator(`#${sectionId}`);
        if (await section.count() !== 1) {
          fail(`${viewport.name}:home-${sectionId}`, "secțiunea lipsește");
          continue;
        }
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(220);
        const sectionAudit = await section.evaluate((element) => {
          const style = getComputedStyle(element);
          const visibleCopy = [...element.querySelectorAll("h1,h2,h3,p,a,button")].filter((node) => {
            const nodeStyle = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && nodeStyle.display !== "none" && nodeStyle.visibility !== "hidden" && Number(nodeStyle.opacity) > 0;
          });
          return {
            textLength: element.innerText.trim().length,
            display: style.display,
            visibility: style.visibility,
            opacity: Number(style.opacity),
            visibleCopy: visibleCopy.length,
          };
        });
        if (sectionAudit.textLength < 20 || sectionAudit.display === "none" || sectionAudit.visibility === "hidden" || sectionAudit.opacity === 0 || (sectionId !== "intro" && sectionAudit.visibleCopy === 0)) {
          fail(`${viewport.name}:home-${sectionId}`, JSON.stringify(sectionAudit));
        }
        if (viewport.isMobile) {
          await section.screenshot({ path: path.join(outputDirectory, `${viewport.name}-home-${sectionId}.png`) });
        }
        sectionAudits.push({ sectionId, ...sectionAudit });
      }
      results.push({ viewport: viewport.name, route: "/", sectionAudits });
    }

    results.push({ viewport: viewport.name, route, status, ...audit, consoleErrors, pageErrors, failedRequests });
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
  }

  for (const route of protectedRoutes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(250);
    const finalPath = new URL(page.url()).pathname;
    const allowed = finalPath === "/login" || finalPath === "/conta/login";
    if (!allowed) fail(`${viewport.name}${route}:auth`, `a ajuns la ${finalPath}, HTTP ${response?.status()}`);
    results.push({ viewport: viewport.name, route, status: response?.status() ?? 0, finalPath, protected: true });
  }

  await page.goto(`${baseUrl}/eveniment-staging/checkout`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const checkoutForm = page.locator("form").first();
  const checkoutFormPresent = await checkoutForm.count() === 1;
  await page.getByLabel("Prenume și nume", { exact: true }).fill("Ana Test Staging");
  await page.getByLabel(/Adresa de email/).fill("ana.checkout@example.invalid");
  await page.getByRole("checkbox").check();
  const checkoutReady = await page.getByLabel("Prenume și nume", { exact: true }).evaluate((input) => input.value === "Ana Test Staging")
    && await page.getByLabel(/Adresa de email/).evaluate((input) => input.value === "ana.checkout@example.invalid")
    && await page.getByRole("checkbox").isChecked()
    && await page.getByRole("button", { name: "Rezervă biletul", exact: true }).isEnabled();
  if (!checkoutFormPresent || !checkoutReady) fail(`${viewport.name}:checkout-form`, `present=${checkoutFormPresent}, ready=${checkoutReady}`);

  await page.goto(`${baseUrl}/devino-membru`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const continueButton = page.getByRole("button", { name: /Continuă/ }).first();
  const recruitmentInitiallyBlocked = !(await continueButton.isEnabled());
  if (!recruitmentInitiallyBlocked) fail(`${viewport.name}:recruitment-validation`, "primul pas poate continua cu date goale");

  results.push({ viewport: viewport.name, forms: { checkoutFormPresent, checkoutReady, recruitmentInitiallyBlocked } });
  await context.close();
}

await browser.close();
const report = { baseUrl, capturedAt: new Date().toISOString(), results, failures };
writeFileSync(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
