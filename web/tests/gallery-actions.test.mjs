// Runs the real server actions with disposable in-memory Auth/DB/Drive adapters.
// No environment files are loaded, and every external dependency is intercepted.
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import test, { beforeEach } from "node:test";
import { build } from "esbuild";

const root = process.cwd();
const req = createRequire(resolve(root, "package.json"));
const key = randomBytes(32);
const fixture = { viewer: null, photos: [], driveCalls: 0, revalidated: [], connection: null, connectionError: false, key };
globalThis.__galleryFixture = fixture;
beforeEach(() => { fixture.viewer = null; fixture.photos = []; fixture.driveCalls = 0; fixture.cookie = undefined; fixture.revalidated = []; fixture.connection = null; fixture.connectionError = false; });

function from(table) {
  if (table === "gallery_drive_connection") {
    const filters = [];
    let deleting = false;
    const query = {
      delete() { deleting = true; return query; },
      eq(field, value) { filters.push([field, value]); return query; },
      select(fields) { assert.equal(fields, "singleton"); return query; },
      then(resolve) {
        assert.equal(deleting, true);
        if (fixture.connectionError) return resolve({ data: null, error: new Error("Fixture database failure") });
        const found = fixture.connection && filters.every(([field, value]) => fixture.connection[field] === value);
        if (found) fixture.connection = null;
        resolve({ data: found ? [{ singleton: true }] : [], error: null });
      },
    };
    return query;
  }
  assert.equal(table, "gallery_photos");
  const filters = [];
  let operation = "select", input;
  const query = {
    select() { return query; }, eq(field, value) { filters.push([field, value]); return query; },
    insert(value) { operation = "insert"; input = value; return query; },
    delete() { operation = "delete"; return query; }, maybeSingle() { return query; },
    then(resolve) {
      const found = fixture.photos.find((photo) => filters.every(([field, value]) => photo[field] === value));
      if (operation === "insert") fixture.photos.push(input);
      if (operation === "delete") fixture.photos = fixture.photos.filter((photo) => photo !== found);
      resolve({ data: operation === "select" ? found ?? null : null, error: null });
    },
  };
  return query;
}
fixture.from = from;
const adapters = {
  "@/lib/gallery-auth": "export async function getGalleryViewer(){return globalThis.__galleryFixture.viewer}",
  "@/lib/supabase/admin": "export const supabaseAdmin={from:(...args)=>globalThis.__galleryFixture.from(...args)}",
  "@/lib/public-rate-limit": "export async function allowPublicAction(){return true}",
  "@/lib/server-log": "export function logServerError(){}",
  "next/cache": "export function revalidatePath(path){globalThis.__galleryFixture.revalidated.push(path)}",
  "next/headers": `export async function cookies(){const f=globalThis.__galleryFixture;return {get(){return f.cookie?{value:f.cookie}:undefined},set(name,value,options){f.cookie=value;f.cookieOptions=options}}}`,
  "next/server": `export const NextResponse={redirect(url,init){return new Response(null,{status:307,headers:{...init?.headers,Location:String(url)}})}}`,
  "@/lib/gallery-drive": `const f=globalThis.__galleryFixture;
    export const galleryKey=()=>f.key;
    export const galleryDriveConfigured=()=>true;
    export const galleryCallbackUrl=()=> 'https://fixture.example/api/gallery/drive/callback';
    export const encryptedDriveToken=()=> 'not-used';
    export async function getDriveConnection(){throw new Error('Unexpected connection access in rejection test')}
    export async function exchangeGoogleToken(){throw new Error('Unexpected token exchange in rejection test')}
    export async function createDriveUpload(){f.driveCalls++;return {fileId:'file_fixture',folderId:'folder_fixture',sessionUrl:'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture'}}
    export async function getDriveAccess(){return {token:'fixture-only-token',folderId:'folder_fixture'}}
    export async function driveFile(){return f.file}
    export async function driveFetch(path,token,init){f.driveCalls++;if(init?.method==='PATCH')return new Response('{}');return new Response(new Uint8Array([255,216,255,225]),{status:206})}`,
};
const bundle = await build({ stdin: { contents: 'export * from "./app/conta/galerie/actions"; export * from "./lib/gallery-crypto"; export {GET as connectDrive} from "./app/api/gallery/drive/connect/route"; export {GET as driveCallback} from "./app/api/gallery/drive/callback/route";', loader: "ts", resolveDir: root },
  bundle: true, write: false, platform: "node", format: "cjs", tsconfig: resolve(root, "tsconfig.json"),
  plugins: [{ name: "no-live-access", setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => adapters[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
    build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: adapters[args.path], loader: "js" }));
  } }],
});

test("OAuth starts only for board and binds the callback to the same authenticated account", async () => {
  fixture.viewer = recruit;
  assert.equal((await actions.connectDrive()).status, 403);
  fixture.viewer = { ...recruit, role: "board", membershipStatus: "active" };
  const start = await actions.connectDrive();
  const location = new URL(start.headers.get("location"));
  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.searchParams.get("scope"), "https://www.googleapis.com/auth/drive.file");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.equal(fixture.cookieOptions.httpOnly, true);
  assert.equal(fixture.cookieOptions.sameSite, "lax");
  assert.equal(fixture.cookieOptions.secure, true);
  const cookie = fixture.cookie;
  const oauth = actions.openGalleryValue(cookie, "drive-oauth", key);
  assert.equal(oauth.userId, recruit.userId);
  const wrongState = await actions.driveCallback(new Request("https://fixture.example/api/gallery/drive/callback?state=forged&code=test"));
  assert.equal(new URL(wrongState.headers.get("location")).searchParams.get("drive"), "error");
  assert.equal(fixture.cookie, "");
  fixture.cookie = cookie;
  fixture.viewer = { ...fixture.viewer, userId: "10000000-0000-4000-8000-000000000002" };
  const differentUser = await actions.driveCallback(new Request(`https://fixture.example/api/gallery/drive/callback?state=${oauth.state}&code=test`));
  assert.equal(new URL(differentUser.headers.get("location")).searchParams.get("drive"), "error");
  fixture.cookie = cookie;
  fixture.viewer = { ...recruit, role: "board", membershipStatus: "active" };
  const cancelled = await actions.driveCallback(new Request(`https://fixture.example/api/gallery/drive/callback?state=${oauth.state}&error=access_denied`));
  assert.equal(new URL(cancelled.headers.get("location")).searchParams.get("drive"), "cancelled");
  assert.equal(new URL(cancelled.headers.get("location")).pathname, "/board/galerie");
});
const fixtureModule = new Module(resolve(root, "tests/gallery-actions.fixture.cjs"));
fixtureModule.filename = resolve(root, "tests/gallery-actions.fixture.cjs"); fixtureModule.paths = req.resolve.paths(".");
fixtureModule._compile(bundle.outputFiles[0].text, fixtureModule.filename);
const actions = fixtureModule.exports;
const recruit = { userId: "10000000-0000-4000-8000-000000000001", name: "Recruit", role: null, membershipStatus: null };
const input = { fileName: "large.jpg", mimeType: "image/jpeg", size: 12884901888, caption: "Club photo" };

test("only active board and admins can disconnect Drive, without touching any photos", async () => {
  const connectedAt = "2026-09-07T16:00:00.000+00:00";
  const confirmed = { accountEmail: "club@example.invalid", connectedAt };
  fixture.connection = { singleton: true, account_email: confirmed.accountEmail, connected_at: connectedAt };
  fixture.photos = [{ id: "photo-to-keep", drive_file_id: "original-to-keep" }];
  const originalPhotos = structuredClone(fixture.photos);
  for (const viewer of [null, recruit, { ...recruit, role: "board", membershipStatus: "inactive" }, { ...recruit, role: "scanner", membershipStatus: "active" }]) {
    fixture.viewer = viewer;
    assert.equal((await actions.disconnectGalleryDrive(confirmed)).ok, false);
    assert.ok(fixture.connection);
  }
  fixture.viewer = { ...recruit, role: "board", membershipStatus: "active" };
  assert.equal((await actions.disconnectGalleryDrive({ ...confirmed, connectedAt: "invalid" })).ok, false);
  assert.ok(fixture.connection);
  assert.equal((await actions.disconnectGalleryDrive(confirmed)).ok, true);
  assert.equal(fixture.connection, null);
  assert.deepEqual(fixture.photos, originalPhotos);
  assert.equal(fixture.driveCalls, 0);
  assert.deepEqual(fixture.revalidated, ["/conta/galerie", "/membru/galerie", "/board/galerie"]);
});

test("stale confirmations and database failures preserve the current Drive connection", async () => {
  fixture.viewer = { ...recruit, role: "admin", membershipStatus: "active" };
  const current = { singleton: true, account_email: "club@example.invalid", connected_at: "2026-09-07T17:00:00.000Z" };
  fixture.connection = { ...current };
  const stale = { accountEmail: current.account_email, connectedAt: "2026-09-07T16:00:00.000Z" };
  assert.equal((await actions.disconnectGalleryDrive(stale)).ok, false);
  assert.deepEqual(fixture.connection, current);
  assert.deepEqual(fixture.revalidated, []);
  const confirmed = { accountEmail: current.account_email, connectedAt: current.connected_at };
  fixture.connectionError = true;
  assert.equal((await actions.disconnectGalleryDrive(confirmed)).ok, false);
  assert.deepEqual(fixture.connection, current);
  fixture.connectionError = false;
  assert.equal((await actions.disconnectGalleryDrive(confirmed)).ok, true);
  assert.equal(fixture.connection, null);
  assert.equal(fixture.driveCalls, 0);
});

test("real actions enforce authentication, ownership, Drive metadata and safe retries", async () => {
  assert.equal((await actions.prepareGalleryUpload(input)).ok, false);
  assert.equal(fixture.driveCalls, 0);
  fixture.viewer = recruit;
  const prepared = await actions.prepareGalleryUpload(input);
  assert.equal(prepared.ok, true);
  assert.equal(prepared.sessionUrl.includes("fixture-only-token"), false);
  const ticket = actions.openGalleryValue(prepared.ticket, "gallery-upload", key);
  fixture.file = { id: ticket.fileId, mimeType: input.mimeType, size: String(input.size), parents: [ticket.folderId],
    appProperties: { savapassPhotoId: ticket.photoId, savapassUploaderId: recruit.userId } };
  fixture.viewer = { ...recruit, userId: "10000000-0000-4000-8000-000000000002" };
  assert.equal((await actions.finalizeGalleryUpload(prepared.ticket)).ok, false);
  assert.equal(fixture.photos.length, 0);
  fixture.viewer = recruit;
  fixture.file.size = "42";
  assert.equal((await actions.finalizeGalleryUpload(prepared.ticket)).ok, false);
  fixture.file.size = String(input.size);
  assert.equal((await actions.finalizeGalleryUpload(prepared.ticket)).ok, true);
  assert.equal(fixture.photos[0].uploader_id, recruit.userId);
  assert.equal(fixture.photos[0].size_bytes, input.size);
  assert.deepEqual(fixture.revalidated, ["/conta/galerie", "/membru/galerie", "/board/galerie"]);
  assert.equal((await actions.finalizeGalleryUpload(prepared.ticket)).ok, true);
  assert.equal(fixture.photos.length, 1);
  fixture.viewer = { ...recruit, userId: "10000000-0000-4000-8000-000000000002" };
  const calls = fixture.driveCalls;
  assert.equal((await actions.deleteGalleryPhoto(ticket.photoId)).ok, false);
  assert.equal(fixture.driveCalls, calls);
  fixture.viewer = { ...fixture.viewer, role: "board", membershipStatus: "active" };
  fixture.revalidated = [];
  assert.equal((await actions.deleteGalleryPhoto(ticket.photoId)).ok, true);
  assert.equal(fixture.photos.length, 0);
  assert.deepEqual(fixture.revalidated, ["/conta/galerie", "/membru/galerie", "/board/galerie"]);
  const expired = actions.sealGalleryValue({ ...ticket, expiresAt: Date.now() - 1 }, "gallery-upload", key);
  fixture.viewer = recruit;
  assert.equal((await actions.finalizeGalleryUpload(expired)).ok, false);
});
