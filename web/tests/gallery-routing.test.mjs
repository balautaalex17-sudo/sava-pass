// Exercise the actual route entries with isolated viewers, never live accounts.
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import test, { beforeEach } from "node:test";
import { build } from "esbuild";

const root = process.cwd();
const req = createRequire(resolve(root, "package.json"));
const fixture = { viewer: null, permissions: [], checks: 0 };
globalThis.__galleryRoutingFixture = fixture;
beforeEach(() => { fixture.viewer = null; fixture.permissions = []; fixture.checks = 0; });
const content = "export const metadata={}; export default function GalleryContent(){return null}";
const adapters = {
  "@/lib/gallery-auth": "export async function getGalleryViewer(){return globalThis.__galleryRoutingFixture.viewer}",
  "@/lib/dashboard/auth": `export async function getDashboardViewer(){const f=globalThis.__galleryRoutingFixture;f.checks++;return {permissions:new Set(f.permissions)}}
    export async function requirePagePermission(key){if(!globalThis.__galleryRoutingFixture.permissions.includes(key))throw new Error('permission denied')}`,
  "next/navigation": "export function redirect(url){throw Object.assign(new Error('redirect'),{url})}",
  "./GalleryContent": content,
  "@/app/conta/galerie/GalleryContent": content,
};
const bundle = await build({
  stdin: { contents: 'export {default as account} from "./app/conta/galerie/page"; export {default as board} from "./app/(dashboard)/board/galerie/page";', loader: "ts", resolveDir: root },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", tsconfig: resolve(root, "tsconfig.json"),
  plugins: [{ name: "isolated-route-adapters", setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => adapters[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: adapters[args.path], loader: "js" }));
  } }],
});
const compiled = new Module(resolve(root, "tests/gallery-routing.fixture.cjs"));
compiled.filename = resolve(root, "tests/gallery-routing.fixture.cjs");
compiled.paths = req.resolve.paths(".");
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const routes = compiled.exports;
const props = () => ({ searchParams: Promise.resolve({ page: "2", drive: "cancelled" }) });

test("old gallery bookmarks send members and board to their portal without dropping query state", async () => {
  fixture.viewer = { membershipStatus: "active" };
  fixture.permissions = ["view_member_dashboard"];
  await assert.rejects(routes.account(props()), (error) => error.url === "/membru/galerie?page=2&drive=cancelled");
  fixture.permissions.push("view_board_dashboard");
  await assert.rejects(routes.account(props()), (error) => error.url === "/board/galerie?page=2&drive=cancelled");
});

test("recruits and account-only visitors keep access without a portal redirect loop", async () => {
  for (const membershipStatus of [null, "recruit", "inactive"]) {
    fixture.viewer = { membershipStatus };
    assert.equal((await routes.account(props())).type(), null);
  }
  assert.equal(fixture.checks, 0);
  fixture.viewer = { membershipStatus: "active" };
  assert.equal((await routes.account(props())).type(), null);
});

test("guests still need login and members cannot enter the board gallery", async () => {
  await assert.rejects(routes.account(props()), (error) => error.url === "/conta/login?next=/conta/galerie");
  await assert.rejects(routes.board(props()), /permission denied/);
  fixture.permissions = ["view_board_dashboard"];
  assert.equal((await routes.board(props())).type(), null);
});
