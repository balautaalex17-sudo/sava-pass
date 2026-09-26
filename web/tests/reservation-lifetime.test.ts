import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import { normalizeRomanianPhone } from "../lib/phone";

// Evaluate the real actions with inert adapters. No environment or live client is loaded.
function load<T>(file: string, imports: Record<string, unknown>): T {
  const filename = resolve(file);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  const exports = {};
  runInNewContext(outputText, { exports, crypto: { randomUUID }, require(name: string) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  } }, { filename });
  return exports as T;
}

const ticketId = "00000000-0000-4000-8000-000000000001";
const orderId = "00000000-0000-4000-8000-000000000002";
const eventId = "00000000-0000-4000-8000-000000000003";
const typeId = "00000000-0000-4000-8000-000000000004";
const token = "fixture-signed-token".repeat(6);

function checkout(clearResult: "ok" | "error" | "missing" = "ok", created = true) {
  const calls: string[] = [];
  const imports = {
    "zod": { z }, "@/lib/phone": { normalizeRomanianPhone },
    "next/navigation": { redirect(url: string) { calls.push("redirect"); throw new Error(`redirect:${url}`); } },
    "@/lib/events": { async getEventBySlug() { return { id: eventId, title: "Test", starts_at: "2026-10-01" }; }, eventIsBookable: () => true },
    "@/lib/public-rate-limit": { allowPublicAction: async () => true },
    "@/lib/qr-token": { signTicket: () => token },
    "@/lib/ticket-code": { generateCode: () => "ABC123" },
    "@/lib/site-url": { resolveSiteUrl: () => "https://fixture.invalid" },
    "@/lib/server-log": { logServerError() {} },
    "@/lib/ticket-notifications": { async notifyTicketIssued(input: { ticketId: string; ticketUrl: string }) {
      assert.ok(calls.includes("deadline-cleared"));
      assert.equal(input.ticketId, ticketId);
      assert.equal(input.ticketUrl, `https://fixture.invalid/bilet/${token}`);
      calls.push("notify");
    } },
    "@/lib/supabase/admin": { supabaseAdmin: {
      async rpc(name: string) {
        assert.equal(name, "reserve_public_ticket"); calls.push("reserved");
        return { data: { result: "reserved", created, order_id: orderId, ticket_id: ticketId, qr_token: token, order_status: "pending" }, error: null };
      },
      from(table: string) {
        if (table === "event_ticket_types") {
          const query = { select() { return query; }, eq() { return query; },
            async maybeSingle() { return { data: { id: typeId, status: "active" } }; } };
          return query;
        }
        assert.ok(["orders", "tickets"].includes(table));
        return { update(values: Record<string, unknown>) {
          assert.ok(calls.includes("reserved"));
          if (table === "tickets") assert.equal(values.expires_at, null);
          assert.equal(values[table === "tickets" ? "holder_phone" : "buyer_phone"], "+40722123456");
          return { eq(column: string, id: string) {
            assert.equal(column, "id"); assert.equal(id, table === "tickets" ? ticketId : orderId);
            if (table === "orders") return Promise.resolve({ error: null });
            return { select() { return { async single() {
              if (clearResult === "ok") calls.push("deadline-cleared");
              return { data: clearResult === "ok" ? { id: ticketId } : null, error: clearResult === "error" ? { message: "fixture failure" } : null };
            } }; } };
          } };
        } };
      },
    } },
  };
  const form = new FormData();
  for (const [key, value] of Object.entries({ slug: "test-event", ticket_type_id: typeId, request_key: randomUUID(), name: "Ana Fixture", email: "ANA@example.com", phone: "0722123456", gdpr: "on" })) form.set(key, value);
  return { calls, run: () => load<typeof import("../app/[slug]/checkout/actions")>("app/[slug]/checkout/actions.ts", imports).createCheckout({}, form) };
}

for (const created of [true, false]) {
  test(`checkout clears the deadline before delivery, including idempotent retries (created=${created})`, async () => {
    const fixture = checkout("ok", created);
    await assert.rejects(fixture.run, /redirect:https:\/\/fixture.invalid\/bilet\//);
    assert.deepEqual(fixture.calls, ["reserved", "deadline-cleared", "notify", "redirect"]);
  });
}

for (const result of ["error", "missing"] as const) {
  test(`checkout does not deliver a reservation when clearing its deadline returns ${result}`, async () => {
    const fixture = checkout(result);
    assert.match((await fixture.run()).errors?.general ?? "", /nu a putut fi finalizată/);
    assert.deepEqual(fixture.calls, ["reserved"]);
  });
}

for (const status of ["paid", "pending"]) {
  test(`admin issuance keeps ${status} tickets indefinite without changing payment status`, async () => {
    let inserted: Record<string, unknown> | undefined;
    const { issueTicket } = load<typeof import("../lib/tickets")>("lib/tickets.ts", {
      "server-only": {}, "@/lib/server-log": { logServerError() {} },
      "@/lib/qr-token": { signTicket: () => token }, "@/lib/ticket-code": { generateCode: () => "ABC123" },
      "@/lib/supabase/admin": { supabaseAdmin: { from(table: string) {
        if (table === "orders") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status } }) }) }) };
        assert.equal(table, "tickets");
        return { insert(values: Record<string, unknown>) { inserted = values; return { select: () => ({ single: async () => ({ data: { id: values.id }, error: null }) }) }; } };
      } } },
    });
    assert.ok(await issueTicket({ eventId, orderId, ticketTypeId: typeId, holderName: "Ana", holderEmail: "ANA@example.com" }));
    assert.equal(inserted?.expires_at, null);
    assert.equal(inserted?.status, status === "paid" ? "paid" : "reserved");
    assert.equal(inserted?.holder_email, "ana@example.com");
    assert.equal(inserted?.payment_confirmed_at === null, status === "pending");
  });
}
