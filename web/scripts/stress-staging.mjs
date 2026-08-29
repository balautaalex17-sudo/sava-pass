import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  qrTokenFingerprint,
  signTicketWithSecret,
  verifyTicketTokenWithSecret,
} from "../lib/qr-token-core.ts";
import { generateCode } from "../lib/ticket-code.ts";

const PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip";
const MAX_OPERATIONS = 1_000;
const REQUEST_TIMEOUT_MS = 30_000;

function required(name, minimumLength = 1) {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name] ?? String(fallback);
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1),
  );
  return Number(ordered[index].toFixed(1));
}

function latencySummary(values) {
  if (values.length === 0) return { count: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, max_ms: 0 };
  return {
    count: values.length,
    p50_ms: percentile(values, 50),
    p95_ms: percentile(values, 95),
    p99_ms: percentile(values, 99),
    max_ms: Number(Math.max(...values).toFixed(1)),
  };
}

function resultCode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "error";
  return String(value.result ?? "error");
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

async function runPool(items, concurrency, worker, onProgress) {
  let cursor = 0;
  let completed = 0;
  let firstError = null;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      if (firstError) return;
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        await worker(items[index], index);
      } catch (error) {
        firstError ??= error;
        return;
      }
      completed += 1;
      if (onProgress && (completed % 100 === 0 || completed === items.length)) {
        onProgress(completed, items.length);
      }
    }
  });
  await Promise.all(workers);
  if (firstError) throw firstError;
}

function batches(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

async function insertBatches(supabase, table, rows, batchSize) {
  const groups = batches(rows, batchSize);
  for (let index = 0; index < groups.length; index += 1) {
    const batch = groups[index];
    console.log(`${table} setup: batch ${index + 1}/${groups.length}`);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table} setup failed (${error.code ?? "unknown"})`);
  }
}

async function deleteIds(supabase, table, ids, batchSize) {
  const failures = [];
  for (const batch of batches(ids, batchSize)) {
    const { error } = await supabase.from(table).delete().in("id", batch);
    if (error) failures.push(`${table}:${error.code ?? "unknown"}`);
  }
  return failures;
}

async function deleteAuditEntities(supabase, ticketIds, batchSize) {
  const failures = [];
  for (const batch of batches(ticketIds, batchSize)) {
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .eq("entity_type", "ticket")
      .in("entity_id", batch);
    if (error) failures.push(`audit_logs:${error.code ?? "unknown"}`);
  }
  return failures;
}

async function countIds(supabase, table, ids, batchSize) {
  let total = 0;
  for (const batch of batches(ids, batchSize)) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("id", batch);
    if (error) throw new Error(`${table} cleanup verification failed (${error.code ?? "unknown"})`);
    total += count ?? 0;
  }
  return total;
}

function safeError(error) {
  if (error instanceof Error) return error.message.replaceAll(/sb_secret_[A-Za-z0-9_-]+/g, "[secret]");
  return "Unknown stress-test failure";
}

const projectUrl = new URL(required("NEXT_PUBLIC_SUPABASE_URL"));
const actualProjectRef = projectUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1]?.toLowerCase();
const expectedProjectRef = required("SUPABASE_TEST_PROJECT_REF").toLowerCase();
if (!actualProjectRef) throw new Error("Unexpected Supabase hostname");
if (actualProjectRef === PRODUCTION_PROJECT_REF) throw new Error("Refusing the production Supabase project");
if (actualProjectRef !== expectedProjectRef) throw new Error("Supabase project ref does not match the staging guard");
if (required("STRESS_CONFIRM") !== "STAGING_ONLY") throw new Error("Set STRESS_CONFIRM=STAGING_ONLY");
if (Object.keys(process.env).some((name) => name.startsWith("STRIPE_"))) {
  throw new Error("Stripe variables are forbidden in cash-only staging");
}

const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY", 32);
const qrSecret = required("QR_SIGNING_SECRET", 32);
const scanOperations = boundedInteger("STRESS_SCANS", 1_000, 1, MAX_OPERATIONS);
const formOperations = boundedInteger("STRESS_FORMS", 1_000, 1, MAX_OPERATIONS);
const concurrency = boundedInteger("STRESS_CONCURRENCY", 20, 1, 30);
const batchSize = boundedInteger("STRESS_BATCH_SIZE", 25, 1, 100);
const uniqueScanCount = Math.max(1, Math.floor(scanOperations * 0.8));
const duplicateScanCount = scanOperations - uniqueScanCount;
const membershipFormCount = Math.floor(formOperations / 2);
const contactFormCount = formOperations - membershipFormCount;
const runId = randomUUID();
const runShort = runId.slice(0, 8);

async function fetchWithTimeout(input, init = {}) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

const supabase = createClient(projectUrl.toString(), serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetchWithTimeout },
});

const orderIds = [];
const ticketIds = [];
const applicationIds = [];
const contactIds = [];
let capacityEventId = null;
let originalEventCapacity = null;
let temporaryEventCapacity = null;
const report = {
  run_id: runId,
  project_ref: actualProjectRef,
  started_at: new Date().toISOString(),
  configuration: {
    scan_operations: scanOperations,
    unique_scans: uniqueScanCount,
    duplicate_scans: duplicateScanCount,
    form_operations: formOperations,
    membership_forms: membershipFormCount,
    contact_forms: contactFormCount,
    concurrency,
    setup_batch_size: batchSize,
    request_timeout_ms: REQUEST_TIMEOUT_MS,
    email_delivery: "suppressed_by_direct_database_load",
  },
  setup: {},
  scans: {},
  forms: {},
  cleanup: { attempted: false, verified: false, failures: [] },
  failure: null,
};

let runFailure = null;

try {
  console.log(`Stress run ${runShort}: preflight on staging ${actualProjectRef}`);
  const now = new Date().toISOString();
  const [{ data: event, error: eventError }, { data: scanner, error: scannerError }, { data: campaign, error: campaignError }] = await Promise.all([
    supabase.from("events").select("id, title, capacity").eq("status", "active").gt("starts_at", now).order("starts_at").limit(1).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("membership_status", "active").in("role", ["scanner", "board", "admin"]).order("created_at").limit(1).maybeSingle(),
    supabase.from("recruitment_campaigns").select("id").eq("status", "open").lte("opens_at", now).gte("closes_at", now).order("opens_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (eventError || !event) throw eventError ?? new Error("No future active staging event");
  if (scannerError || !scanner) throw scannerError ?? new Error("No active scanner account");
  if (campaignError || !campaign) throw campaignError ?? new Error("No open recruitment campaign");
  console.log("Preflight queries: ready");

  const { count: currentlySold, error: soldError } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["reserved", "paid", "checked_in"]);
  if (soldError) throw new Error(`Ticket capacity preflight failed (${soldError.code ?? "unknown"})`);
  capacityEventId = event.id;
  originalEventCapacity = event.capacity;
  temporaryEventCapacity = Math.max(event.capacity, (currentlySold ?? 0) + uniqueScanCount + 20);
  if (temporaryEventCapacity !== originalEventCapacity) {
    const { data: capacityUpdate, error: capacityError } = await supabase
      .from("events")
      .update({ capacity: temporaryEventCapacity })
      .eq("id", event.id)
      .eq("capacity", originalEventCapacity)
      .select("id")
      .maybeSingle();
    if (capacityError || !capacityUpdate) {
      throw capacityError ?? new Error("The staging event capacity changed during preflight");
    }
    console.log(`Temporary event capacity: ${originalEventCapacity} -> ${temporaryEventCapacity}`);
  }

  const { data: activeForm, error: formError } = await supabase
    .from("recruitment_forms")
    .select("id")
    .eq("status", "active")
    .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (formError || !activeForm) throw formError ?? new Error("No active recruitment form");

  const codes = new Set();
  const orders = [];
  const tickets = [];
  for (let index = 0; index < uniqueScanCount; index += 1) {
    const orderId = randomUUID();
    const ticketId = randomUUID();
    orderIds.push(orderId);
    ticketIds.push(ticketId);
    let code = generateCode(6);
    while (codes.has(code)) code = generateCode(6);
    codes.add(code);
    const email = `stress.scan.${runShort}.${index}@example.invalid`;
    const qrToken = signTicketWithSecret(qrSecret, ticketId);
    const verification = verifyTicketTokenWithSecret(qrSecret, qrToken);
    if (!verification.ok || verification.reference !== ticketId) {
      throw new Error("Local QR signature preflight failed");
    }
    orders.push({
      id: orderId,
      event_id: event.id,
      buyer_name: `[STRESS ${runShort}] Scan ${index}`,
      buyer_email: email,
      amount_bani: 4_500,
      status: "paid",
      paid_at: now,
    });
    tickets.push({
      id: ticketId,
      order_id: orderId,
      event_id: event.id,
      code,
      qr_token: qrToken,
      holder_name: `[STRESS ${runShort}] Scan ${index}`,
      holder_email: email,
      status: "paid",
      payment_confirmed_at: now,
    });
    if ((index + 1) % 100 === 0 || index + 1 === uniqueScanCount) {
      console.log(`QR fixtures prepared: ${index + 1}/${uniqueScanCount}`);
    }
  }

  const setupStarted = performance.now();
  await insertBatches(supabase, "orders", orders, batchSize);
  await insertBatches(supabase, "tickets", tickets, batchSize);
  report.setup = {
    event: event.title,
    scanner: scanner.full_name,
    original_event_capacity: originalEventCapacity,
    temporary_event_capacity: temporaryEventCapacity,
    tickets_created: tickets.length,
    duration_ms: Number((performance.now() - setupStarted).toFixed(1)),
  };

  const scanLatencies = [];
  const scanResults = {};
  const scanStarted = performance.now();
  const scanTicket = async (ticket, phase) => {
    const started = performance.now();
    const { data, error } = await supabase.rpc("check_in_ticket", {
      p_ticket_id: ticket.id,
      p_actor_id: scanner.id,
      p_token_fingerprint: qrTokenFingerprint(ticket.qr_token),
      p_device_metadata: { surface: "stress_test", run_id: runId, phase },
    });
    scanLatencies.push(performance.now() - started);
    if (error) throw new Error(`QR RPC failed (${error.code ?? "unknown"})`);
    increment(scanResults, resultCode(data));
  };

  await runPool(tickets, concurrency, (ticket) => scanTicket(ticket, "unique"), (done, total) => {
    console.log(`QR unique: ${done}/${total}`);
  });
  const duplicates = Array.from({ length: duplicateScanCount }, (_, index) => tickets[index % tickets.length]);
  await runPool(duplicates, concurrency, (ticket) => scanTicket(ticket, "duplicate"), (done, total) => {
    console.log(`QR duplicate: ${done}/${total}`);
  });
  const scanDuration = performance.now() - scanStarted;
  report.scans = {
    results: scanResults,
    latency: latencySummary(scanLatencies),
    duration_ms: Number(scanDuration.toFixed(1)),
    throughput_per_second: Number((scanOperations / (scanDuration / 1_000)).toFixed(2)),
  };
  if ((scanResults.accepted ?? 0) !== uniqueScanCount || (scanResults.already_checked_in ?? 0) !== duplicateScanCount) {
    throw new Error("QR result distribution does not match the atomicity expectation");
  }

  const answerText = "Acesta este un răspuns fictiv pentru testul de stres. Conține două fraze complete și nu reprezintă o persoană reală.";
  const formItems = [];
  for (let index = 0; index < membershipFormCount; index += 1) {
    const id = randomUUID();
    applicationIds.push(id);
    formItems.push({
      type: "membership",
      row: {
        id,
        campaign_id: campaign.id,
        form_id: activeForm.id,
        full_name: `[STRESS ${runShort}] Candidat ${index}`,
        email: `stress.form.${runShort}.${index}@example.invalid`,
        phone: `0700${String(index).padStart(6, "0")}`,
        grade: "Clasa de test",
        motivation: answerText,
        answers: {
          version: 2,
          stress_run_id: runId,
          about_you: answerText,
          mistake: answerText,
          team_priority: answerText,
          club_exchange: answerText,
          promote_event: answerText,
          team_organization: answerText,
        },
        status: "submitted",
        source: "stress",
        source_row_identifier: `stress:${runId}:${index}`,
        source_payload: { stress_run_id: runId },
        submitted_at: now,
      },
    });
  }
  for (let index = 0; index < contactFormCount; index += 1) {
    const id = randomUUID();
    contactIds.push(id);
    formItems.push({
      type: "contact",
      row: {
        id,
        name: `[STRESS ${runShort}] Contact ${index}`,
        email: `stress.contact.${runShort}.${index}@example.invalid`,
        message: `[STRESS:${runId}] Mesaj fictiv ${index} pentru măsurarea formularului de contact.`,
      },
    });
  }

  const formLatencies = { membership: [], contact: [] };
  const formResults = { membership: { ok: 0 }, contact: { ok: 0 } };
  const formsStarted = performance.now();
  await runPool(formItems, concurrency, async (item) => {
    const started = performance.now();
    const table = item.type === "membership" ? "membership_applications" : "contact_messages";
    const { error } = await supabase.from(table).insert(item.row);
    formLatencies[item.type].push(performance.now() - started);
    if (error) {
      increment(formResults[item.type], `error_${error.code ?? "unknown"}`);
      throw new Error(`${item.type} form insert failed (${error.code ?? "unknown"})`);
    }
    formResults[item.type].ok += 1;
  }, (done, total) => {
    console.log(`Forms: ${done}/${total}`);
  });
  const formsDuration = performance.now() - formsStarted;
  report.forms = {
    results: formResults,
    membership_latency: latencySummary(formLatencies.membership),
    contact_latency: latencySummary(formLatencies.contact),
    duration_ms: Number(formsDuration.toFixed(1)),
    throughput_per_second: Number((formOperations / (formsDuration / 1_000)).toFixed(2)),
  };
  if (formResults.membership.ok !== membershipFormCount || formResults.contact.ok !== contactFormCount) {
    throw new Error("Form success count does not match the requested load");
  }
} catch (error) {
  runFailure = error;
  report.failure = safeError(error);
} finally {
  report.cleanup.attempted = true;
  const cleanupFailures = [];
  cleanupFailures.push(...await deleteAuditEntities(supabase, ticketIds, batchSize));

  // Scans are keyed by ticket_id, so delete them in bounded batches separately.
  for (const batch of batches(ticketIds, batchSize)) {
    const { error } = await supabase.from("scans").delete().in("ticket_id", batch);
    if (error) cleanupFailures.push(`scans:${error.code ?? "unknown"}`);
  }
  cleanupFailures.push(...await deleteIds(supabase, "tickets", ticketIds, batchSize));
  cleanupFailures.push(...await deleteIds(supabase, "orders", orderIds, batchSize));
  cleanupFailures.push(...await deleteIds(supabase, "membership_applications", applicationIds, batchSize));
  cleanupFailures.push(...await deleteIds(supabase, "contact_messages", contactIds, batchSize));
  if (
    capacityEventId
    && originalEventCapacity !== null
    && temporaryEventCapacity !== null
    && temporaryEventCapacity !== originalEventCapacity
  ) {
    const { data: restoredEvent, error: restoreError } = await supabase
      .from("events")
      .update({ capacity: originalEventCapacity })
      .eq("id", capacityEventId)
      .eq("capacity", temporaryEventCapacity)
      .select("id")
      .maybeSingle();
    if (restoreError || !restoredEvent) {
      cleanupFailures.push(`events:capacity_restore:${restoreError?.code ?? "not_restored"}`);
    }
  }

  report.cleanup.failures = cleanupFailures;
  try {
    const remaining = {
      tickets: await countIds(supabase, "tickets", ticketIds, batchSize),
      orders: await countIds(supabase, "orders", orderIds, batchSize),
      membership_applications: await countIds(supabase, "membership_applications", applicationIds, batchSize),
      contact_messages: await countIds(supabase, "contact_messages", contactIds, batchSize),
    };
    if (capacityEventId && originalEventCapacity !== null) {
      const { data: restoredCapacity, error: capacityReadError } = await supabase
        .from("events")
        .select("capacity")
        .eq("id", capacityEventId)
        .maybeSingle();
      if (capacityReadError || !restoredCapacity) {
        throw capacityReadError ?? new Error("Could not verify the restored event capacity");
      }
      remaining.event_capacity = restoredCapacity.capacity;
      if (restoredCapacity.capacity !== originalEventCapacity) {
        cleanupFailures.push("events:capacity_verification_failed");
      }
    }
    report.cleanup.remaining_rows = remaining;
    report.cleanup.verified = cleanupFailures.length === 0
      && remaining.tickets === 0
      && remaining.orders === 0
      && remaining.membership_applications === 0
      && remaining.contact_messages === 0;
  } catch (error) {
    cleanupFailures.push(safeError(error));
    report.cleanup.failures = cleanupFailures;
  }

  report.finished_at = new Date().toISOString();
  const outputDirectory = resolve(process.cwd(), "..", "active", "stress-results");
  await mkdir(outputDirectory, { recursive: true });
  const reportPath = resolve(outputDirectory, `staging-${runId}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Report: ${reportPath}`);
  console.log(`Cleanup verified: ${report.cleanup.verified ? "yes" : "no"}`);
}

if (runFailure) throw runFailure;
if (!report.cleanup.verified) throw new Error("Stress data cleanup was not fully verified");
console.log(`Stress test passed: ${scanOperations} QR operations and ${formOperations} form operations.`);
