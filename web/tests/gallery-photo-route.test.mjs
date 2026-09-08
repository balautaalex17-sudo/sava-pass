// Exercise the real private photo route with in-memory Auth/Drive adapters.
// No credentials, environment files, or live network are used.
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import test, { beforeEach } from "node:test";
import { build } from "esbuild";

const root = process.cwd();
const req = createRequire(resolve(root, "package.json"));
const photoId = "10000000-0000-4000-8000-000000000001";
const original = new Uint8Array([255, 216, 255, 225, 1, 2, 3, 4]);
const fixture = {};
globalThis.__galleryPhotoFixture = fixture;
beforeEach(() => Object.assign(fixture, {
  authenticated: true, photo: { drive_file_id: "fixture-file", original_name: "amintire.jpg", mime_type: "image/jpeg" },
  file: { id: "fixture-file", trashed: false }, accessCalls: 0, mediaCalls: [],
}));
const adapters = {
  "@/lib/gallery-auth": `export async function getGalleryViewer(){
    const f=globalThis.__galleryPhotoFixture;
    return f.authenticated?{client:{from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:f.photo,error:null}}}}}}:null;
  }`,
  "@/lib/server-log": "export function logServerError(){}",
  "@/lib/gallery-drive": `const f=globalThis.__galleryPhotoFixture;
    export class DriveError extends Error{}
    export async function getDriveAccess(){f.accessCalls++;return {token:'fixture-token'}}
    export async function driveFile(){return f.file}
    export const isGoogleThumbnailUrl=url=>url.startsWith('https://lh3.googleusercontent.com/');
    export async function driveFetch(path,token,init){
      f.mediaCalls.push({path,token,range:new Headers(init?.headers).get('range')});
      return new Response(new Uint8Array([255,216,255,225,1,2,3,4]),{status:init?.headers?.Range?206:200});
    }`,
};
const bundle = await build({ entryPoints: [resolve(root, "app/api/gallery/photos/[id]/route.ts")],
  bundle: true, write: false, platform: "node", format: "cjs", tsconfig: resolve(root, "tsconfig.json"),
  plugins: [{ name: "isolated-photo-route", setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => Object.hasOwn(adapters, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: adapters[args.path], loader: "js" }));
  } }],
});
const compiled = new Module(resolve(root, "tests/gallery-photo-route.fixture.cjs"));
compiled.filename = resolve(root, "tests/gallery-photo-route.fixture.cjs");
compiled.paths = req.resolve.paths(".");
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const readPhoto = (query = "?size=thumbnail", headers) => compiled.exports.GET(
  new Request(`https://fixture.example/api/gallery/photos/${photoId}${query}`, { headers }),
  { params: Promise.resolve({ id: photoId }) },
);

test("guests and missing photos cannot fetch private Drive files", async () => {
  fixture.authenticated = false;
  assert.equal((await readPhoto()).status, 401);
  fixture.authenticated = true;
  fixture.photo = null;
  assert.equal((await readPhoto()).status, 404);
  assert.equal(fixture.accessCalls, 0);
  assert.deepEqual(fixture.mediaCalls, []);
});

test("new browser-compatible photos display the original while Drive generates a preview", async () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
    fixture.photo.mime_type = mimeType;
    const response = await readPhoto();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), mimeType);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("vary"), "Cookie");
    assert.match(response.headers.get("content-disposition"), /^inline;/);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original);
  }
  assert.equal(fixture.mediaCalls.length, 4);
});

test("ready Drive thumbnails are preferred over downloading the full original", async () => {
  fixture.file.thumbnailLink = "https://lh3.googleusercontent.com/fixture-photo";
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, fixture.file.thumbnailLink);
    assert.equal(init.headers.Authorization, "Bearer fixture-token");
    assert.equal(init.redirect, "error");
    return new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/webp" } });
  };
  try {
    const response = await readPhoto();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2]));
    assert.deepEqual(fixture.mediaCalls, []);
  } finally { globalThis.fetch = previousFetch; }
});

test("expired, failed, and unsafe previews fall back without exposing Drive credentials", async () => {
  const previousFetch = globalThis.fetch;
  try {
    fixture.file.thumbnailLink = "https://lh3.googleusercontent.com/fixture-photo";
    for (const mode of ["expired", "wrong-type", "network"]) {
      globalThis.fetch = async () => {
        if (mode === "network") throw new TypeError("Fixture network failure");
        return new Response("not an image", { status: mode === "expired" ? 404 : 200, headers: { "Content-Type": "text/html" } });
      };
      const response = await readPhoto();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original);
    }
    fixture.file.thumbnailLink = "https://untrusted.example/thumbnail";
    globalThis.fetch = async () => assert.fail("Never send a Drive token to an untrusted thumbnail host");
    assert.equal((await readPhoto()).status, 200);
  } finally { globalThis.fetch = previousFetch; }
});

test("HEIC needs a generated preview but its original remains downloadable with Range support", async () => {
  fixture.photo.mime_type = "image/heic";
  fixture.photo.original_name = "vacanță.heic";
  assert.equal((await readPhoto()).status, 404);
  assert.deepEqual(fixture.mediaCalls, []);
  const response = await readPhoto("?download=1", { Range: "bytes=0-7" });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-type"), "image/heic");
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.match(response.headers.get("content-disposition"), /vacan%C8%9B%C4%83.heic/);
  assert.equal(fixture.mediaCalls[0].range, "bytes=0-7");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original);
});
