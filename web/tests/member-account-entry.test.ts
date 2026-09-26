import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import * as departments from "../lib/dashboard/member-departments";
import { safeLocalPath } from "../lib/safe-local-path";

// No credentials, environment files or external clients are loaded.
function load<T>(path: string, imports: Record<string, unknown>): T {
  const filename = resolve(path);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  const exports = {};
  runInNewContext(outputText, { exports, URL, require(name: string) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  } }, { filename });
  return exports as T;
}

function account(role: string | null = null, department: string | null = null, email: string | undefined = " Member@Example.com ") {
  let ticketReads = 0;
  const viewer = { profile: { role, member_department: department, membership_status: "active" }, roles: role ? [role] : [] };
  const imports = {
    "react/jsx-runtime": jsx,
    "next/navigation": { redirect(path: string) { throw new Error(`redirect:${path}`); } },
    "next/link": {}, "lucide-react": {}, "@/components/ui/Chip": {},
    "@/components/ui/GearWatermark": {}, "@/lib/event-lifecycle": {},
    "./SignOutButton": {}, "./TicketAccessForm": {}, "./conta.module.css": { default: {} },
    "@/lib/dashboard/auth": { async getDashboardViewer() { return viewer; } },
    "@/lib/dashboard/member-departments": departments,
    "@/lib/supabase/server": { async createClient() { return {
      auth: { async getClaims() { return { data: { claims: { sub: "existing-session", email } } }; } },
      from(table: string) {
        if (table === "profiles") return { select() { return { eq(column: string, value: string) {
          assert.equal(column, "id"); assert.equal(value, "existing-session");
          return { async maybeSingle() { return { data: viewer.profile }; } };
        } }; } };
        assert.equal(table, "tickets"); ticketReads++;
        return { select() { return { eq(column: string, value: string) {
          assert.equal(column, "holder_email"); assert.equal(value, "member@example.com");
          return { async order() { return { data: [] }; } };
        } }; } };
      },
    }; } },
  };
  return {
    page: load<typeof import("../app/conta/page")>("app/conta/page.tsx", imports).default,
    get ticketReads() { return ticketReads; },
  };
}

test("the ticket account stays accessible without sending members to a separate department page", async () => {
  const member = account();
  assert.ok(await member.page({ searchParams: Promise.resolve({}) }));
  assert.equal(member.ticketReads, 1);
});

test("entering the portal renders its content and only unassigned members receive the popup", async () => {
  const Prompt = () => null;
  for (const [role, department] of [[null, null], [null, "hr"], [null, "pr"], ["board", null], ["admin", null]]) {
    const permissions = new Set(["view_member_dashboard"]);
    const viewer = { user: { id: "portal-member" },
      profile: { full_name: "Ana Test", role, member_department: department, membership_status: "active" },
      roles: role ? [role] : [], permissions, permissionKeys: [...permissions],
    };
    const { default: Layout } = load<typeof import("../app/(dashboard)/layout")>("app/(dashboard)/layout.tsx", {
      "react/jsx-runtime": jsx,
      "next/navigation": { redirect(path: string) { throw new Error(`Unexpected navigation: ${path}`); } },
      "@/lib/dashboard/auth": { async getDashboardViewer() { return viewer; } },
      "@/lib/dashboard/member-departments": departments,
      "@/components/dashboard/DashboardNav": {},
      "@/components/dashboard/MemberDepartmentPrompt": { MemberDepartmentPrompt: Prompt },
      "./dashboard.css": {},
    });
    const tree = await Layout({ children: "member-portal-content" });
    const children = tree.props.children;
    assert.ok(children.some((child: { type?: string; props?: { children?: unknown } }) => child?.type === "main" && child.props?.children === "member-portal-content"));
    const prompt = children.find((child: { type?: unknown }) => child?.type === Prompt);
    assert.equal(Boolean(prompt), role === null && department === null);
    if (prompt) assert.equal(prompt.props.profileId, "portal-member");
  }
});

test("Board, Super Admin and members with a department open their account normally", async () => {
  for (const [role, department] of [["board", null], ["admin", null], [null, "hr"], [null, "pr"]]) {
    const member = account(role, department);
    const page = await member.page({ searchParams: Promise.resolve({}) });
    assert.ok(page);
    assert.equal(member.ticketReads, 1);
  }
});

test("a session without an email never reads unfiltered tickets", async () => {
  const member = account("board", null, "");
  assert.ok(await member.page({ searchParams: Promise.resolve({}) }));
  assert.equal(member.ticketReads, 0);
});

test("email login preserves its destination without checking or assigning a department", async () => {
  const { GET } = load<typeof import("../app/conta/confirm/route")>("app/conta/confirm/route.ts", {
    "next/server": { NextResponse: { redirect(url: URL) { return { url: url.toString() }; } } },
    "@/lib/safe-local-path": { safeLocalPath },
    "@/lib/supabase/server": { async createClient() { return {
      auth: { async verifyOtp() { return { error: null }; }, async exchangeCodeForSession() { return { error: null }; } },
    }; } },
  });
  for (const next of ["/", "/evenimente", "/conta"]) {
    const url = new URL(`https://savapass.example/conta/confirm?code=fixture&next=${encodeURIComponent(next)}`);
    const response = await GET({ nextUrl: url, url: url.toString() } as Parameters<typeof GET>[0]);
    assert.equal(response.url, `https://savapass.example${next}`);
  }
});
