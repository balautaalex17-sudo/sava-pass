import assert from "node:assert/strict";
import test from "node:test";
import { timedSupabaseFetch } from "../lib/supabase/timed-fetch";

test("server timing preserves fetch and excludes sensitive request information", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const originalFlag = process.env.SAVAPASS_PERF_LOG;
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    if (originalFlag === undefined) delete process.env.SAVAPASS_PERF_LOG;
    else process.env.SAVAPASS_PERF_LOG = originalFlag;
  });
  process.env.SAVAPASS_PERF_LOG = "1";
  const logs: unknown[][] = [];
  console.info = (...args) => { logs.push(args); };
  const response = new Response("private response", { status: 200 });
  const input = "https://project.supabase.co/rest/v1/tickets?holder_email=eq.private@example.com";
  const init = { headers: { Authorization: "Bearer private-token" } };
  globalThis.fetch = async (receivedInput, receivedInit) => {
    assert.equal(receivedInput, input);
    assert.equal(receivedInit, init);
    return response;
  };
  assert.equal(await timedSupabaseFetch(input, init), response);
  assert.equal(logs.length, 1);
  assert.deepEqual(Object.keys(JSON.parse(String(logs[0][1]))).sort(), ["durationMs", "operation", "status"]);
  assert.equal(JSON.parse(String(logs[0][1])).operation, "tickets");
  assert.doesNotMatch(JSON.stringify(logs), /private|example|project|Bearer/);

  const failure = new Error("private upstream failure");
  globalThis.fetch = async () => { throw failure; };
  await assert.rejects(timedSupabaseFetch(input), (error) => error === failure);
  assert.equal(JSON.parse(String(logs[1][1])).status, 0);
  assert.doesNotMatch(JSON.stringify(logs), /private|upstream/);

  process.env.SAVAPASS_PERF_LOG = "0";
  globalThis.fetch = async () => response;
  await timedSupabaseFetch(input);
  assert.equal(logs.length, 2);
});
