import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";
import "./safe-test-database";

test("a fresh invited Auth user can receive the server-created activation session", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && anonKey && serviceKey, "Supabase test environment is missing");

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `savapass-invite-${randomUUID()}@example.com`;
  let userId: string | null = null;

  try {
    const invite = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { name: "Test Member Invitation" },
        redirectTo: "https://sava-pass.vercel.app/invite",
      },
    });
    assert.ifError(invite.error);
    assert.ok(invite.data.user);
    assert.ok(invite.data.properties);
    userId = invite.data.user.id;
    assert.match(invite.data.properties.email_otp, /^\d{6,10}$/);

    const sessionLink = await admin.auth.admin.generateLink({ type: "magiclink", email });
    assert.ifError(sessionLink.error);
    assert.ok(sessionLink.data.properties);
    assert.match(sessionLink.data.properties.email_otp, /^\d{6,10}$/);

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
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
