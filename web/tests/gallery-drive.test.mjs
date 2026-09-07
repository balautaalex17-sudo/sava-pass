// Exercise the actual Drive session creation with no credentials or live network.
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";

const root = process.cwd();
const req = createRequire(resolve(root, "package.json"));
const adapters = {
  "server-only": "",
  react: "export const cache=(fn)=>fn",
  "@/lib/supabase/admin": `export const supabaseAdmin={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{folder_id:'fixture-folder',encrypted_refresh_token:'sealed-fixture'},error:null}}}}}`,
  "@/lib/gallery-crypto": "export const openGalleryValue=()=> 'fixture-refresh'; export const sealGalleryValue=()=> 'sealed-fixture'",
  "@/lib/site-url": "export const resolveSiteUrl=()=> 'https://canonical.example'",
};
const bundle = await build({ entryPoints: [resolve(root, "lib/gallery-drive.ts")], bundle: true, write: false, platform: "node", format: "cjs",
  tsconfig: resolve(root, "tsconfig.json"), plugins: [{ name: "isolated-drive", setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => Object.hasOwn(adapters, args.path) ? { path: args.path, namespace: "fixture" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: adapters[args.path], loader: "js" }));
  } }],
});
const compiled = new Module(resolve(root, "tests/gallery-drive.fixture.cjs"));
compiled.filename = resolve(root, "tests/gallery-drive.fixture.cjs");
compiled.paths = req.resolve.paths(".");
compiled._compile(bundle.outputFiles[0].text, compiled.filename);

test("Drive session creation declares the browser origin for the completed upload response", async () => {
  const originalFetch = globalThis.fetch;
  const values = { GOOGLE_DRIVE_CLIENT_ID: "fixture-client", GOOGLE_DRIVE_CLIENT_SECRET: "fixture-secret", GOOGLE_DRIVE_TOKEN_KEY: Buffer.alloc(32).toString("base64") };
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  Object.assign(process.env, values);
  const sessionUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=fixture";
  let uploadHeaders;
  globalThis.fetch = async (url, init) => {
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "fixture-access" });
    if (url === "https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files") return Response.json({ ids: ["fixture-file"] });
    assert.equal(url, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id");
    assert.equal(init.method, "POST");
    uploadHeaders = new Headers(init.headers);
    assert.deepEqual(JSON.parse(init.body).parents, ["fixture-folder"]);
    return new Response(null, { headers: { Location: sessionUrl } });
  };
  try {
    const result = await compiled.exports.createDriveUpload({ photoId: "fixture-photo", userId: "fixture-user", fileName: "photo.png", mimeType: "image/png", size: 3145728, origin: "https://preview.example" });
    assert.equal(uploadHeaders.get("origin"), "https://preview.example");
    assert.equal(uploadHeaders.get("x-upload-content-type"), "image/png");
    assert.equal(uploadHeaders.get("x-upload-content-length"), "3145728");
    assert.deepEqual(result, { fileId: "fixture-file", folderId: "fixture-folder", sessionUrl });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
