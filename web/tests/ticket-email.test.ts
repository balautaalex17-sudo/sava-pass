import assert from "node:assert/strict";
import test from "node:test";

import {
  createTicketQrAttachment,
  extractTicketEmailDetails,
  renderNotificationEmail,
  TICKET_QR_CONTENT_ID,
} from "../lib/ticket-email";

const qrToken = "SPT2.eyJwIjoiZXZlbnRfdGlja2V0In0.test-signature";
const ticketUrl = `https://sava-pass-staging.vercel.app/bilet/${qrToken}`;

test("ticket emails extract the signed token from the existing ticket link", () => {
  assert.deepEqual(
    extractTicketEmailDetails(`Biletul tău este gata: ${ticketUrl}`),
    { ticketUrl, qrToken },
  );
  assert.equal(extractTicketEmailDetails("Mesaj fără bilet"), null);
});

test("ticket email HTML embeds the QR and keeps a safe ticket-link fallback", () => {
  const html = renderNotificationEmail(
    `Biletul pentru <script>alert(1)</script> este gata: ${ticketUrl}`,
    TICKET_QR_CONTENT_ID,
  );

  assert.match(html, new RegExp(`src="cid:${TICKET_QR_CONTENT_ID}"`));
  assert.match(html, new RegExp(`href="${ticketUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(html, /Biletul tău este gata/);
  assert.match(html, /Scanează la intrare/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, new RegExp(`>${ticketUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`));
});

test("ticket QR attachment is a real inline PNG", async () => {
  const attachment = await createTicketQrAttachment(qrToken);

  assert.equal(attachment.contentId, TICKET_QR_CONTENT_ID);
  assert.equal(attachment.contentType, "image/png");
  assert.equal(attachment.filename, "bilet-savapass-qr.png");
  if (!Buffer.isBuffer(attachment.content)) throw new Error("QR attachment content is not a Buffer");
  assert.deepEqual([...attachment.content.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
