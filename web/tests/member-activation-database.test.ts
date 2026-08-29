import assert from "node:assert/strict";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";
import "./safe-test-database";

test("a permanent member code creates one session and cannot be reused", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const signingSecret = process.env.QR_SIGNING_SECRET;
  assert.ok(url && anonKey && serviceKey && signingSecret, "Staging activation environment is missing");

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `savapass-permanent-code-${randomUUID()}@example.com`;
  const code = randomInt(0, 10 ** 12).toString().padStart(12, "0");
  const codeHash = createHmac("sha256", signingSecret)
    .update(`member-activation-v1\0${email}\0${code}`)
    .digest("hex");
  let userId: string | null = null;

  try {
    const invite = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { name: "Permanent Code Test" } },
    });
    assert.ifError(invite.error);
    assert.ok(invite.data.user);
    userId = invite.data.user.id;

    const issued = await admin.rpc("issue_member_activation_code", {
      p_user_id: userId,
      p_email: email,
      p_code_hash: codeHash,
    });
    assert.ifError(issued.error);
    assert.equal(issued.data, true);

    const claimId = randomUUID();
    const claim = await admin.rpc("claim_member_activation_code", {
      p_email: email,
      p_code_hash: codeHash,
      p_claim_id: claimId,
    });
    assert.ifError(claim.error);
    assert.equal(claim.data, userId);

    const sessionLink = await admin.auth.admin.generateLink({ type: "magiclink", email });
    assert.ifError(sessionLink.error);
    assert.ok(sessionLink.data.properties?.email_otp);

    const browser = createClient<Database>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const verified = await browser.auth.verifyOtp({
      email,
      token: sessionLink.data.properties.email_otp,
      type: "magiclink",
    });
    assert.ifError(verified.error);
    assert.equal(verified.data.user?.id, userId);
    assert.ok(verified.data.session);

    const finished = await admin.rpc("finish_member_activation_code", {
      p_user_id: userId,
      p_claim_id: claimId,
    });
    assert.ifError(finished.error);
    assert.equal(finished.data, true);

    const reused = await admin.rpc("claim_member_activation_code", {
      p_email: email,
      p_code_hash: codeHash,
      p_claim_id: randomUUID(),
    });
    assert.ifError(reused.error);
    assert.equal(reused.data, null);
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
