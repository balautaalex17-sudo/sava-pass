// Read-only public flow check. Never submits a reservation or other server action.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const target = process.argv[2] ?? "http://localhost:3407";
const slug = process.env.TEST_EVENT_SLUG ?? "treasure-hunt-x";
const output = fs.mkdtempSync(path.join(os.tmpdir(), "savapass-restored-public-"));
const executablePath = process.env.BROWSER_EXECUTABLE ?? [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find(p => fs.existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/*", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(target + "/devino-membru", { waitUntil: "networkidle" });
    assert.equal(await page.locator(".apply-process__date").count(), 5);
    assert.deepEqual((await page.locator(".apply-process__date").allTextContents()).slice(1), ["1 octombrie", "2–4 octombrie", "6–7 octombrie", "8 octombrie"]);
    await page.screenshot({ path: path.join(output, `membership-${width}.png`), fullPage: true });
    await page.goto(target + "/", { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(".join-timeline li").count(), 5);
    await page.goto(`${target}/${slug}`, { waitUntil: "networkidle" });
    const story = page.locator('p[class*="story"]');
    assert.equal(await story.evaluate(el => getComputedStyle(el).whiteSpace), "pre-wrap");
    assert.doesNotMatch(await page.locator("body").innerText(), /\d+ locuri rămase/);
    const booking = width < 860 ? page.getByRole("link", { name: "Ia bilet", exact: true }) : page.getByRole("link", { name: "Continuă rezervarea", exact: true });
    await booking.click();
    await page.waitForURL(url => url.pathname.endsWith("/checkout"));
    assert.equal(await page.locator("dialog").count(), 0);
    if (await page.getByRole("button", { name: "Continuă", exact: true }).isVisible()) await page.getByRole("button", { name: "Continuă", exact: true }).click();
    await page.getByLabel("Prenume", { exact: true }).fill("Ana");
    await page.getByLabel("Nume", { exact: true }).fill("Fixture");
    await page.getByLabel(/^Email/).fill("fixture@example.com");
    await page.getByRole("button", { name: "Modifică", exact: true }).click();
    await page.getByRole("button", { name: "Continuă", exact: true }).click();
    assert.equal(await page.getByLabel("Prenume", { exact: true }).inputValue(), "Ana");
    assert.equal(await page.getByLabel(/^Email/).inputValue(), "fixture@example.com");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false);
    await page.screenshot({ path: path.join(output, `checkout-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Înapoi la eveniment", exact: true }).click();
    await page.waitForURL(url => url.pathname === `/${slug}`);
    await page.goto(`${target}/${slug}?checkout=1`, { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).pathname, `/${slug}/checkout`);
    const response = await context.request.get(target + "/api/board/event-registrations/export");
    assert.equal(response.status(), 401);
    await page.goto(target + "/board/cereri-departament?view=history", { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).searchParams.get("next"), "/board/cereri-departament?view=history");
    assert.match((await page.getByRole("heading").allTextContents()).join(" "), /Board/i);
    assert.deepEqual(errors, []);
    results.push({ width, result: "passed", checks: ["five dates on membership/home", "description whitespace", "hidden counts", "page checkout and preserved form", "legacy redirect", "export auth", "Board login destination"] });
    await context.close();
  }
  // Hold the destination response to check what a visitor sees on a slow connection.
  const slow = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await slow.route("**/*", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
  const slowPage = await slow.newPage();
  let releaseCheckout;
  const checkoutGate = new Promise(resolve => { releaseCheckout = resolve; });
  let checkoutRequested = false;
  await slowPage.route(url => url.pathname === `/${slug}/checkout`, async route => {
    checkoutRequested = true;
    await checkoutGate;
    await route.continue();
  });
  try {
    await slowPage.goto(`${target}/${slug}`, { waitUntil: "domcontentloaded" });
    await slowPage.getByRole("link", { name: "Ia bilet", exact: true }).click();
    for (let attempt = 0; attempt < 50 && !checkoutRequested; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(checkoutRequested, true);
    assert.equal(await slowPage.locator('p[class*="story"]').isVisible(), true);
    assert.equal(await slowPage.locator('[aria-label="Se încarcă biletele"]').count(), 0);
    releaseCheckout();
    await slowPage.waitForURL(url => url.pathname.endsWith("/checkout"));
  } finally { releaseCheckout(); await slow.close(); }

  const insta = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0" });
  const page = await insta.newPage();
  await page.goto(`${target}/${slug}`, { waitUntil: "networkidle" });
  assert.equal(await page.locator('iframe[src*="google.com/maps"]').count(), 0);
  assert.ok(await page.getByRole("link", { name: /Deschide în Maps/ }).count());
  await insta.close();
  console.log(JSON.stringify({ target, results, retainedPageDuringNavigation: "passed", instagramFallback: "passed", artifacts: output }, null, 2));
} finally { await browser.close(); }
