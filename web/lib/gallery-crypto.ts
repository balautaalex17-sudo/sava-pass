import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Purpose-bound authenticated encryption prevents swapping an upload ticket for
// a connection token or an OAuth state cookie, even though they share one key.
export function sealGalleryValue(value: unknown, purpose: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Invalid gallery encryption key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openGalleryValue(value: string, purpose: string, key: Buffer): unknown {
  if (key.length !== 32 || value.length > 10000) throw new Error("Invalid gallery token");
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new Error("Invalid gallery token");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
}
