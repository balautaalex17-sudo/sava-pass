import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthActionUrl } from "../lib/auth-email-link";
import { renderAuthLinkEmail } from "../lib/auth-email-template";

test("auth emails contain the correct action and escape untrusted values", () => {
  const actionUrl = "https://savapass.ro/conta/confirm?next=%2Fconta&source=email";
  const email = "ana+<test>@example.com";
  const message = renderAuthLinkEmail({ kind: "magiclink", email, actionUrl });

  assert.equal(message.subject, "Biletele tale SavaPass");
  assert.match(message.html, /Vezi biletele/);
  assert.match(message.html, /next=%2Fconta&amp;source=email/);
  assert.match(message.html, /ana\+&lt;test&gt;@example\.com/);
  assert.doesNotMatch(message.html, /ana\+<test>@example\.com/);
  assert.match(message.text, new RegExp(actionUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("auth links stay on the SavaPass domain and preserve their safe destination", () => {
  const magicLink = new URL(buildAuthActionUrl(
    "https://www.interactsfsava.com/conta/confirm?next=%2Fconta",
    "hashed-token",
    "magiclink",
  ));
  const recoveryLink = new URL(buildAuthActionUrl(
    "https://www.interactsfsava.com/auth/password/confirm",
    "recovery-token",
    "recovery",
  ));

  assert.equal(magicLink.origin, "https://www.interactsfsava.com");
  assert.equal(magicLink.pathname, "/conta/confirm");
  assert.equal(magicLink.searchParams.get("next"), "/conta");
  assert.equal(magicLink.searchParams.get("token_hash"), "hashed-token");
  assert.equal(magicLink.searchParams.get("type"), "email");
  assert.equal(recoveryLink.searchParams.get("type"), "recovery");
});

test("recovery and invitation emails use different, explicit calls to action", () => {
  const recovery = renderAuthLinkEmail({
    kind: "recovery",
    email: "ana@example.com",
    actionUrl: "https://savapass.ro/reset",
  });
  const invite = renderAuthLinkEmail({
    kind: "invite",
    email: "ana@example.com",
    actionUrl: "https://savapass.ro/invite",
  });

  assert.match(recovery.html, /Alege parola/);
  assert.match(invite.html, /Acceptă invitația/);
  assert.notEqual(recovery.subject, invite.subject);
});
