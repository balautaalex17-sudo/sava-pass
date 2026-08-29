"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dashboard/auth";
import {
  canAssignOperationalRoles,
  canManagePrimaryRole,
} from "@/lib/dashboard/role-hierarchy";
import { supabaseAdmin } from "@/lib/supabase/admin";

const operationalRoleSchema = z.enum(["scanner", "interviewer"]);
const assignmentSchema = z.object({
  profileId: z.string().uuid(),
  roles: z.array(operationalRoleSchema).max(2),
}).strict().refine(
  (value) => new Set(value.roles).size === value.roles.length,
  { path: ["roles"], message: "Rolurile trebuie să fie unice." },
);

const boardAssignmentSchema = z.object({
  profileId: z.string().uuid(),
  enabled: z.boolean(),
}).strict();

function boardRoleErrorMessage(message: string) {
  if (message.includes("self_board_removal_blocked")) {
    return "Nu îți poți retrage singur rolul Board.";
  }
  if (message.includes("last_admin_equivalent")) {
    return "Trebuie să rămână cel puțin un membru Board sau Super Admin activ.";
  }
  if (message.includes("protected_primary_role")) {
    return "Rolurile Super Admin și Statistici se modifică din pagina Membri.";
  }
  return "Rolul Board nu a putut fi salvat. Reîncarcă pagina și încearcă din nou.";
}

export async function setOperationalRoles(input: unknown) {
  try {
    const viewer = await requirePermission("manage_staff_assignments");
    if (!canAssignOperationalRoles(viewer.profile.role)) {
      return { ok: false as const, message: "Rolul tău nu poate atribui acces operațional." };
    }
    const parsed = assignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Alegerea rolurilor nu este validă." };
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, membership_status")
      .eq("id", parsed.data.profileId)
      .maybeSingle();

    if (targetError || !target) {
      return { ok: false as const, message: "Membrul nu mai există." };
    }
    if (target.membership_status !== "active") {
      return { ok: false as const, message: "Doar membrii activi pot primi roluri operaționale." };
    }
    if (target.role && !["scanner", "interviewer"].includes(target.role)) {
      return { ok: false as const, message: "Rolurile principale Board, administrator și Statistici sunt protejate aici." };
    }

    const { data: savedRoles, error: updateError } = await supabaseAdmin.rpc(
      "set_profile_operational_roles",
      {
        p_actor_id: viewer.profile.id,
        p_profile_id: target.id,
        p_roles: parsed.data.roles,
      },
    );
    if (updateError) {
      return { ok: false as const, message: "Rolurile nu au putut fi salvate. Reîncarcă pagina și încearcă din nou." };
    }

    const roles = (savedRoles ?? []).filter(
      (role): role is z.infer<typeof operationalRoleSchema> =>
        operationalRoleSchema.safeParse(role).success,
    );

    revalidatePath("/board/echipa");
    revalidatePath("/board", "layout");
    return {
      ok: true as const,
      message: `Rolurile lui ${target.full_name} au fost actualizate.`,
      roles,
    };
  } catch {
    return { ok: false as const, message: "Rolurile nu au putut fi actualizate." };
  }
}

export async function setBoardMembership(input: unknown) {
  try {
    const viewer = await requirePermission("manage_staff_assignments");
    const parsed = boardAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Alegerea rolului Board nu este validă." };
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, membership_status")
      .eq("id", parsed.data.profileId)
      .maybeSingle();

    if (targetError || !target) {
      return { ok: false as const, message: "Membrul nu mai există." };
    }
    if (target.membership_status !== "active") {
      return { ok: false as const, message: "Doar membrii activi pot primi rolul Board." };
    }
    const nextRole = parsed.data.enabled ? "board" as const : null;
    if (!canManagePrimaryRole(viewer.profile.role, target.role, nextRole)) {
      return {
        ok: false as const,
        message: "Doar un Super Admin poate acorda sau retrage rolul Board.",
      };
    }
    if (target.role === "admin" || target.role === "statistici") {
      return { ok: false as const, message: "Rolurile Super Admin și Statistici se modifică din pagina Membri." };
    }
    if (!parsed.data.enabled && target.id === viewer.profile.id) {
      return { ok: false as const, message: "Nu îți poți retrage singur rolul Board." };
    }

    const { data: primaryRole, error: updateError } = await supabaseAdmin.rpc(
      "set_profile_board_role",
      {
        p_actor_id: viewer.profile.id,
        p_board_enabled: parsed.data.enabled,
        p_profile_id: target.id,
      },
    );
    if (updateError) {
      return { ok: false as const, message: boardRoleErrorMessage(updateError.message) };
    }

    revalidatePath("/board/echipa");
    revalidatePath("/board/membri");
    revalidatePath("/board", "layout");
    return {
      ok: true as const,
      message: parsed.data.enabled
        ? `${target.full_name} este acum membru Board.`
        : `Rolul Board al lui ${target.full_name} a fost retras.`,
      primaryRole: primaryRole === "board" ? "board" as const : null,
    };
  } catch {
    return { ok: false as const, message: "Rolul Board nu a putut fi actualizat." };
  }
}
