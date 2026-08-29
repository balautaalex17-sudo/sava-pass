import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";
import "./safe-test-database";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) throw new Error("Supabase test environment is missing");

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test("board keeps operational access but cannot manage the permission hierarchy", async () => {
  const interviewMigration = source("supabase/migrations/20260818170253_board_only_interview_scoring.sql");
  assert.match(
    interviewMigration,
    /delete from public\.role_permissions[\s\S]*role_key = 'interviewer'[\s\S]*permission_key = 'evaluate_interview_candidates'/,
  );
  const [{ data, error }, permissionsResult] = await Promise.all([
    admin
    .from("role_permissions")
    .select("role_key, permission_key")
    .in("role_key", ["board", "scanner", "interviewer"]),
    admin.from("permissions").select("key"),
  ]);
  assert.ifError(error);
  assert.ifError(permissionsResult.error);

  const permissions = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const role = permissions.get(row.role_key) ?? new Set<string>();
    role.add(row.permission_key);
    permissions.set(row.role_key, role);
  }

  const board = permissions.get("board") ?? new Set();
  const everyPermission = new Set((permissionsResult.data ?? []).map((row) => row.key));
  const expectedBoardPermissions = new Set(
    [...everyPermission].filter((permission) => permission !== "manage_permissions"),
  );
  assert.deepEqual(board, expectedBoardPermissions);
  assert.equal(board.has("manage_permissions"), false);

  const scanner = permissions.get("scanner") ?? new Set();
  assert.equal(scanner.has("scan_event_tickets"), true);
  assert.equal(scanner.has("confirm_cash_payments"), true);
  assert.equal(scanner.has("scan_meeting_attendance"), false);
  assert.equal(scanner.has("view_recruitment_signups"), false);

  const interviewer = permissions.get("interviewer") ?? new Set();
  assert.equal(interviewer.has("evaluate_recruitment_forms"), true);
  assert.equal(interviewer.has("view_recruitment_signups"), false);
  assert.equal(interviewer.has("scan_event_tickets"), false);
});

test("role assignment paths enforce the primary-role hierarchy", () => {
  const action = source("app/(dashboard)/board/echipa/actions.ts");
  const dashboardAuth = source("lib/dashboard/auth.ts");
  const permissionMatrix = source("app/(dashboard)/board/permisiuni/PermissionMatrix.tsx");
  const migration = source("supabase/migrations/20260813210000_multi_operational_roles_board_admin_equivalence.sql");
  const boardMigration = source("supabase/migrations/20260813212000_assign_board_role_from_team.sql");
  const hierarchyMigration = source("supabase/migrations/20260829182823_enforce_role_hierarchy.sql");
  assert.match(action, /requirePermission\("manage_staff_assignments"\)/);
  assert.match(action, /\["scanner", "interviewer"\]\.includes\(target\.role\)/);
  assert.match(action, /roles: z\.array\(operationalRoleSchema\)\.max\(2\)/);
  assert.match(action, /set_profile_operational_roles/);
  assert.match(action, /setBoardMembership/);
  assert.match(action, /set_profile_board_role/);
  assert.match(action, /z\.boolean\(\)/);
  assert.match(action, /canManagePrimaryRole\(viewer\.profile\.role, target\.role, nextRole\)/);
  assert.match(dashboardAuth, /roles\.includes\("admin"\) \|\| roles\.includes\("board"\)/);
  assert.match(dashboardAuth, /canUseAdministrativePermission\(profile\.role, permission\)/);
  assert.match(permissionMatrix, /role === "board" && permission\.key === "manage_permissions"/);
  assert.match(migration, /staff\.operational_roles_changed/);
  assert.match(migration, /revoke all on function public\.set_profile_operational_roles[\s\S]*from public, anon, authenticated/);
  assert.match(boardMigration, /staff\.board_role_changed/);
  assert.match(boardMigration, /self_board_removal_blocked/);
  assert.match(boardMigration, /revoke all on function public\.set_profile_board_role[\s\S]*from public, anon, authenticated/);
  assert.match(hierarchyMigration, /v_actor_role <> 'admin'::public\.staff_role/);
  assert.match(hierarchyMigration, /raise exception 'unauthorized_board_assignment'/);
  assert.match(hierarchyMigration, /p_permission_key = 'manage_permissions'[\s\S]*v_role = 'admin'/);
});

test("one member can receive scanner and interviewer together atomically", async () => {
  const boardEmail = process.env.STAFF_TEST_BOARD_EMAIL;
  const boardPassword = process.env.STAFF_TEST_BOARD_PASSWORD;
  assert.ok(boardEmail && boardPassword, "Missing board test credentials");

  const boardClient = createClient<Database>(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const targetClient = createClient<Database>(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = randomUUID();
  const email = `role-combination-${suffix}@example.com`;
  const password = `Tmp-${suffix}-Aa1!`;
  let targetId: string | null = null;

  try {
    const { data: boardAuth, error: boardAuthError } = await boardClient.auth.signInWithPassword({
      email: boardEmail,
      password: boardPassword,
    });
    assert.ifError(boardAuthError);
    assert.ok(boardAuth.user);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Test Rol Dublu" },
    });
    assert.ifError(createError);
    assert.ok(created.user);
    targetId = created.user.id;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: targetId,
      full_name: "Test Rol Dublu",
      email,
      membership_status: "active",
      role: null,
    });
    assert.ifError(profileError);

    const { data: saved, error: assignmentError } = await admin.rpc(
      "set_profile_operational_roles",
      {
        p_actor_id: boardAuth.user.id,
        p_profile_id: targetId,
        p_roles: ["scanner", "interviewer", "scanner"],
      },
    );
    assert.ifError(assignmentError);
    assert.deepEqual(new Set(saved), new Set(["scanner", "interviewer"]));

    const { data: assignments, error: readError } = await admin
      .from("profile_roles")
      .select("role")
      .eq("profile_id", targetId);
    assert.ifError(readError);
    assert.deepEqual(
      new Set((assignments ?? []).map((assignment) => assignment.role)),
      new Set(["scanner", "interviewer"]),
    );

    const { error: boardPromoteError } = await admin.rpc(
      "set_profile_board_role",
      {
        p_actor_id: boardAuth.user.id,
        p_board_enabled: true,
        p_profile_id: targetId,
      },
    );
    assert.ok(boardPromoteError, "A Board actor promoted a member to Board");
    assert.match(boardPromoteError.message, /unauthorized_board_assignment/);

    const { data: adminProfile, error: adminProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("membership_status", "active")
      .limit(1)
      .single();
    assert.ifError(adminProfileError);

    const { data: promotedRole, error: promoteError } = await admin.rpc(
      "set_profile_board_role",
      {
        p_actor_id: adminProfile.id,
        p_board_enabled: true,
        p_profile_id: targetId,
      },
    );
    assert.ifError(promoteError);
    assert.equal(promotedRole, "board");

    const { data: promotedProfile, error: promotedProfileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .single();
    assert.ifError(promotedProfileError);
    assert.equal(promotedProfile.role, "board");

    const { data: demotedRole, error: demoteError } = await admin.rpc(
      "set_profile_board_role",
      {
        p_actor_id: adminProfile.id,
        p_board_enabled: false,
        p_profile_id: targetId,
      },
    );
    assert.ifError(demoteError);
    assert.equal(demotedRole, null);

    const { data: demotedProfile, error: demotedProfileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .single();
    assert.ifError(demotedProfileError);
    assert.equal(demotedProfile.role, null);

    const { data: preservedAssignments, error: preservedAssignmentsError } = await admin
      .from("profile_roles")
      .select("role")
      .eq("profile_id", targetId);
    assert.ifError(preservedAssignmentsError);
    assert.deepEqual(
      new Set((preservedAssignments ?? []).map((assignment) => assignment.role)),
      new Set(["scanner", "interviewer"]),
    );

    const { count: auditCount, error: auditError } = await admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", targetId)
      .eq("action", "staff.operational_roles_changed");
    assert.ifError(auditError);
    assert.equal(auditCount, 1);

    const { count: boardAuditCount, error: boardAuditError } = await admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", targetId)
      .eq("action", "staff.board_role_changed");
    assert.ifError(boardAuditError);
    assert.equal(boardAuditCount, 2);

    const { error: selfDemotionError } = await admin.rpc("set_profile_board_role", {
      p_actor_id: boardAuth.user.id,
      p_board_enabled: false,
      p_profile_id: boardAuth.user.id,
    });
    assert.ok(selfDemotionError, "A Board user removed their own Board role");
    assert.match(selfDemotionError.message, /unauthorized_board_assignment/);

    const { error: targetAuthError } = await targetClient.auth.signInWithPassword({ email, password });
    assert.ifError(targetAuthError);
    const [{ data: ownRoles, error: ownRolesError }, { data: otherRoles, error: otherRolesError }] = await Promise.all([
      targetClient.from("profile_roles").select("profile_id, role").eq("profile_id", targetId),
      targetClient.from("profile_roles").select("profile_id, role").eq("profile_id", boardAuth.user.id),
    ]);
    assert.ifError(ownRolesError);
    assert.ifError(otherRolesError);
    assert.equal(ownRoles?.length, 2);
    assert.equal(otherRoles?.length, 0);

    const { error: directRpcError } = await targetClient.rpc("set_profile_operational_roles", {
      p_actor_id: targetId,
      p_profile_id: targetId,
      p_roles: [],
    });
    assert.ok(directRpcError, "An authenticated browser called the server-only role RPC");

    const { error: directBoardRpcError } = await targetClient.rpc("set_profile_board_role", {
      p_actor_id: targetId,
      p_board_enabled: true,
      p_profile_id: targetId,
    });
    assert.ok(directBoardRpcError, "An authenticated browser called the server-only Board RPC");
  } finally {
    await boardClient.auth.signOut();
    await targetClient.auth.signOut();
    if (targetId) {
      await admin.from("audit_logs").delete().eq("entity_id", targetId);
      await admin.auth.admin.deleteUser(targetId);
    }
  }
});

test("meeting calendar uses the existing meetings collection", () => {
  const manager = source("app/(dashboard)/board/intalniri/MeetingManager.tsx");
  const calendar = source("app/(dashboard)/board/intalniri/MeetingCalendar.tsx");
  assert.match(manager, /<MeetingCalendar meetings=\{meetings\} onEdit=\{edit\}/);
  assert.match(calendar, /meeting\.starts_at/);
  assert.match(calendar, /onEdit\(meeting\)/);
});

test("public recruitment state is enforced on page and submission action", () => {
  const page = source("app/devino-membru/page.tsx");
  const publicState = source("lib/recruitment-public.ts");
  const submit = source("app/devino-membru/actions.ts");
  const boardAction = source("app/(dashboard)/board/formular-inscrieri/actions.ts");

  assert.match(page, /recruitment\.isOpen \? \(/);
  assert.match(page, /Formular blocat/);
  assert.match(publicState, /campaign\.status === "open" && withinWindow/);
  assert.match(submit, /\.eq\("status", "open"\)/);
  assert.match(submit, /latestCampaign\?\.closed_message/);
  assert.match(boardAction, /requirePermission\("manage_recruitment_campaigns"\)/);
  assert.match(boardAction, /configure_recruitment_campaign/);
  assert.match(boardAction, /recruitment\.public_state_changed/);
});

test("recruitment control RPC cannot be called directly by a board browser session", async () => {
  const email = process.env.STAFF_TEST_BOARD_EMAIL;
  const password = process.env.STAFF_TEST_BOARD_PASSWORD;
  assert.ok(email && password, "Missing board test credentials");

  const boardClient = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth, error: authError } = await boardClient.auth.signInWithPassword({ email, password });
  assert.ifError(authError);
  assert.ok(auth.user);

  const { data: campaign, error: campaignError } = await admin
    .from("recruitment_campaigns")
    .select("id, title, intro, closed_message, status, opens_at, closes_at")
    .neq("status", "archived")
    .limit(1)
    .single();
  assert.ifError(campaignError);

  const { error } = await boardClient.rpc("configure_recruitment_campaign", {
    p_actor_id: auth.user.id,
    p_campaign_id: campaign.id,
    p_closed_message: campaign.closed_message,
    p_closes_at: campaign.closes_at!,
    p_intro: campaign.intro,
    p_opens_at: campaign.opens_at!,
    p_status: campaign.status,
    p_title: campaign.title,
  });
  assert.ok(error, "The server-only campaign RPC unexpectedly accepted a browser request");
  await boardClient.auth.signOut();
});

test("board event actions publish into the homepage event source", () => {
  const action = source("app/(staff)/admin/events/actions.ts");
  const boardPage = source("app/(dashboard)/board/evenimente/page.tsx");
  const homepage = source("app/page.tsx");
  assert.match(action, /requirePermission\("manage_public_events"\)/);
  assert.match(action, /revalidatePath\("\/"\)/);
  assert.match(boardPage, /getAllEventsForAdmin/);
  assert.match(homepage, /getActiveEvent/);
});
