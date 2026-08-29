import assert from "node:assert/strict";
import test from "node:test";
import { renderMemberInvitationEmail } from "../lib/member-invitation-email";

test("member invitation email is branded, actionable, and HTML-safe", () => {
  const invitation = renderMemberInvitationEmail({
    fullName: "<script>alert(1)</script> Ana Popescu",
    email: "ana+board@example.com",
    code: "482913570246",
    activationUrl: "https://sava-pass.vercel.app/invite?email=ana%2Bboard%40example.com&source=test",
    role: "board",
  });

  assert.equal(invitation.subject, "Contul tău de membru SavaPass este pregătit");
  assert.match(invitation.html, /SavaPass/);
  assert.match(invitation.html, /Interact Sf\. Sava/);
  assert.match(invitation.html, /482913570246/);
  assert.match(invitation.html, /Activează contul/);
  assert.match(invitation.html, /Acces inițial/);
  assert.match(invitation.html, /Board/);
  assert.match(invitation.html, /email=ana%2Bboard%40example.com&amp;source=test/);
  assert.match(invitation.html, /Nu expiră/);
  assert.doesNotMatch(invitation.html, /<script>alert\(1\)<\/script>/);
  assert.match(invitation.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(invitation.text, /Cod de activare: 482913570246/);
  assert.match(invitation.text, /Codul nu expiră/);
  assert.match(invitation.text, /Dashboard-ul|dashboard/);
});
