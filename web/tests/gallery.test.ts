import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { canConnectGalleryDrive, canManageGalleryPhoto, galleryUploadSchema, matchesPhotoSignature } from "../lib/gallery";
import { openGalleryValue, sealGalleryValue } from "../lib/gallery-crypto";
import { uploadGalleryFile } from "../lib/gallery-upload";

test("gallery keeps original sizes above 10 MB and 2 GB while rejecting invalid formats", () => {
  const input = { fileName: "poza.heic", mimeType: "image/heic", size: 12 * 1024 ** 3, caption: "" };
  assert.equal(galleryUploadSchema.safeParse(input).success, true);
  assert.equal(galleryUploadSchema.safeParse({ ...input, size: 0 }).success, false);
  assert.equal(galleryUploadSchema.safeParse({ ...input, mimeType: "image/svg+xml" }).success, false);
  assert.equal(galleryUploadSchema.safeParse({ ...input, caption: "x".repeat(301) }).success, false);
});

test("authors may remove their photos; only active board/admin may moderate or connect Drive", () => {
  assert.equal(canManageGalleryPhoto("recruit", "recruit", null, null), true);
  assert.equal(canManageGalleryPhoto("other", "recruit", null, "active"), false);
  assert.equal(canManageGalleryPhoto("board", "recruit", "board", "active"), true);
  assert.equal(canManageGalleryPhoto("board", "recruit", "board", "suspended"), false);
  assert.equal(canConnectGalleryDrive("scanner", "active"), false);
  assert.equal(canConnectGalleryDrive("admin", "active"), true);
});

test("encrypted tokens reject tampering, a different key, and a different purpose", () => {
  const key = randomBytes(32);
  const value = { userId: "recruit", fileId: "file1", size: 99999999 };
  const token = sealGalleryValue(value, "gallery-upload", key);
  assert.deepEqual(openGalleryValue(token, "gallery-upload", key), value);
  const bytes = Buffer.from(token, "base64url"); bytes[35] ^= 1;
  assert.throws(() => openGalleryValue(bytes.toString("base64url"), "gallery-upload", key));
  assert.throws(() => openGalleryValue(token, "drive-refresh", key));
  assert.throws(() => openGalleryValue(token, "gallery-upload", randomBytes(32)));
  assert.equal(token.includes("recruit"), false);
});

test("photo signatures reject HTML pretending to be an image", () => {
  assert.equal(matchesPhotoSignature(Buffer.from("<svg onload=alert(1)>"), "image/jpeg"), false);
  assert.equal(matchesPhotoSignature(Uint8Array.from([255, 216, 255, 225]), "image/jpeg"), true);
  assert.equal(matchesPhotoSignature(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(matchesPhotoSignature(Buffer.from("0000ftypavif0000"), "image/avif"), true);
  assert.equal(matchesPhotoSignature(Buffer.from("0000ftypheic0000"), "image/heic"), true);
  assert.equal(matchesPhotoSignature(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
});

const sessionUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture";

test("chunked upload resumes from Drive's acknowledged bytes without exposing credentials", async () => {
  const original = globalThis.fetch;
  const ranges: string[] = [];
  const size = 6 * 1024 * 1024 + 7;
  const progress: number[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, sessionUrl);
    assert.equal(init?.credentials, "omit");
    const headers = new Headers(init?.headers);
    assert.equal(headers.has("authorization"), false);
    const range = headers.get("content-range")!; ranges.push(range);
    if (range.includes("*")) return new Response(null, { status: 308, headers: { Range: "bytes=0-1048575" } });
    const end = Number(/-(\d+)\//.exec(range)![1]);
    assert.ok((init?.body as Blob).size <= 2 * 1024 * 1024);
    return end === size - 1 ? new Response("{}", { status: 200 }) : new Response(null, { status: 308, headers: { Range: `bytes=0-${end}` } });
  };
  try {
    await uploadGalleryFile(new Blob([new Uint8Array(size)]), sessionUrl, (value) => progress.push(value));
    assert.equal(ranges[1], `bytes 1048576-3145727/${size}`);
    assert.equal(progress.at(-1), 100);
  } finally { globalThis.fetch = original; }
});

test("completed sessions are not uploaded again and expired sessions can be restarted", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("{}", { status: 201 });
    let percent = 0;
    await uploadGalleryFile(new Blob(["photo"]), sessionUrl, (value) => { percent = value; });
    assert.equal(percent, 100);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(uploadGalleryFile(new Blob(["photo"]), sessionUrl, () => {}), (error: unknown) => Boolean((error as { expired: boolean }).expired));
    await assert.rejects(uploadGalleryFile(new Blob(["photo"]), "https://example.com/upload", () => {}));
    const abort = new AbortController(); abort.abort();
    await assert.rejects(uploadGalleryFile(new Blob(["photo"]), sessionUrl, () => {}, abort.signal), { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});
