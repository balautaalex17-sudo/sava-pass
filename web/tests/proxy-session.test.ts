import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { NextRequest, NextResponse } from "next/server";
import ts from "typescript";
import * as roles from "../lib/roles";
import * as staffRoutes from "../lib/staff-routes";

// Exercise the actual proxy with real Next.js request/response cookies. Auth
// refresh and profile reads are disposable fixtures, with no network or env file.
function loadProxy({ signedIn = true, role = "board", refresh = true } = {}) {
  const exports: { proxy?: (request: NextRequest) => Promise<NextResponse> } = {};
  const imports: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/roles": roles,
    "@/lib/staff-routes": staffRoutes,
    "@supabase/ssr": { createServerClient(_url: string, _key: string, { cookies }: {
      cookies: { setAll: (values: unknown[], headers: Record<string, string>) => void };
    }) {
      return {
        auth: { async getClaims() {
          if (refresh) cookies.setAll([
            { name: "sb-fixture-auth-token.0", value: signedIn ? "renewed-session" : "", options: { path: "/", maxAge: signedIn ? 3600 : 0, sameSite: "lax", secure: true } },
            { name: "sb-fixture-auth-token.1", value: "", options: { path: "/", maxAge: 0 } },
          ], { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", "Expires": "0", "Pragma": "no-cache" });
          return { data: signedIn ? { claims: { sub: "fixture-member" } } : null };
        } },
        from(table: string) {
          const result = { data: table === "profiles" ? { role, membership_status: "active" } : [] };
          return { select() { return { eq() { return { ...result, async maybeSingle() { return result; } }; } }; } };
        },
      };
    } },
  };
  const { outputText } = ts.transpileModule(readFileSync("proxy.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports, URL, Headers, process: { env: { NODE_ENV: "production" } },
    require(name: string) { assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`); return imports[name]; },
  });
  return exports.proxy!;
}

function request(path: string, prefetch = false) {
  return new NextRequest(`https://savapass.example${path}`, { headers: {
    cookie: "sb-fixture-auth-token.0=expired-session; sb-fixture-auth-token.1=stale-chunk; theme=dark",
    ...(prefetch ? { RSC: "1", "Next-Router-Prefetch": "1" } : {}),
  } });
}

for (const path of ["/board/cereri-departament", "/board/cereri-departament?view=history", "/membru", "/membru/profil", "/conta"]) {
  for (const prefetch of [false, true]) {
    test(`refreshed session reaches browser and page: ${path}, prefetch=${prefetch}`, async () => {
      const response = await loadProxy()(request(path, prefetch));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
      const forwarded = response.headers.get("x-middleware-request-cookie") ?? "";
      assert.match(forwarded, /sb-fixture-auth-token\.0=renewed-session/);
      assert.doesNotMatch(forwarded, /expired-session|stale-chunk/);
      assert.match(forwarded, /theme=dark/);
      assert.equal(response.cookies.get("sb-fixture-auth-token.0")?.value, "renewed-session");
      assert.equal(response.cookies.get("sb-fixture-auth-token.1")?.maxAge, 0);
      assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
      assert.equal(response.headers.get("pragma"), "no-cache");
    });
  }
}

for (const path of ["/login?next=/board", "/admin", "/scanner"]) {
  test(`role redirect keeps renewed cookies: ${path}`, async () => {
    const response = await loadProxy()(request(path));
    assert.equal(response.status, 307);
    assert.equal(response.cookies.get("sb-fixture-auth-token.0")?.value, "renewed-session");
    assert.equal(response.cookies.get("sb-fixture-auth-token.0")?.secure, true);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(response.headers.get("x-middleware-request-cookie"), null);
  });
}

test("invalid sessions go to login, clear old cookies, and keep the requested page and query", async () => {
  for (const path of ["/board/cereri-departament?view=history", "/membru/profil?tab=departament"]) {
    const response = await loadProxy({ signedIn: false })(request(path));
    assert.equal(response.status, 307);
    const destination = new URL(response.headers.get("location")!);
    assert.equal(destination.pathname, "/conta/login");
    assert.equal(destination.searchParams.get("next"), path);
    assert.equal(response.cookies.get("sb-fixture-auth-token.0")?.maxAge, 0);
  }
});

test("a still-valid session proceeds without unnecessary cookie writes", async () => {
  const response = await loadProxy({ refresh: false })(request("/membru/profil"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
});
