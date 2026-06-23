import { createHmac } from "crypto";

const PREFIX = "SP1";

function getSecret(): string {
  const s = process.env.QR_SIGNING_SECRET;
  if (!s) throw new Error("QR_SIGNING_SECRET is not set");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function signTicket(ticketId: string): string {
  const sig = b64url(createHmac("sha256", getSecret()).update(ticketId).digest());
  return `${PREFIX}.${ticketId}.${sig}`;
}

export function verifyTicket(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, ticketId, sig] = parts;
  const expected = b64url(createHmac("sha256", getSecret()).update(ticketId).digest());
  if (sig !== expected) return null;
  return ticketId;
}
