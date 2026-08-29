import assert from "node:assert/strict";
import test from "node:test";

import { renderAuthLinkEmail } from "../lib/auth-email-template";

test("auth emails contain the correct action and escape untrusted values", () => {
  const actionUrl = "https://savapass.ro/conta/confirm?next=%2Fconta&source=email";
  const email = "ana+<test>@example.com";
  const message = renderAuthLinkEmail({ kind: "magiclink", email, actionUrl });

  assert.equal(message.subject, "Linkul tău de acces SavaPass");
  assert.match(message.html, /Intră în cont/);
  assert.match(message.html, /next=%2Fconta&amp;source=email/);
  assert.match(message.html, /ana\+&lt;test&gt;@example\.com/);
  assert.doesNotMatch(message.html, /ana\+<test>@example\.com/);
  assert.match(message.text, new RegExp(actionUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
