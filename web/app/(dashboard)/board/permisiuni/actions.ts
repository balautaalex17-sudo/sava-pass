"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import { canUseAdministrativePermission } from "@/lib/dashboard/role-hierarchy";
import { MEMBER_BASELINE_PERMISSIONS, PERMISSIONS } from "@/lib/dashboard/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";

const mappingSchema = z.object({
  role: z.enum(["member", "scanner", "statistici", "interviewer"]),
  permission: z.enum(PERMISSIONS),
  allowed: z.boolean(),
}).strict();

export async function setRolePermission(input: unknown) {
  try {
    const viewer = await requirePermission("manage_permissions");
    if (!canUseAdministrativePermission(viewer.profile.role, "manage_permissions")) {
      return { ok: false as const, message: "Doar un Super Admin poate modifica permisiunile rolurilor." };
    }
    const parsed = mappingSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, message: "Maparea este invalidă." };
    const { role, permission, allowed } = parsed.data;
    if (role === "member" && !allowed && MEMBER_BASELINE_PERMISSIONS.includes(permission as (typeof MEMBER_BASELINE_PERMISSIONS)[number])) {
      return { ok: false as const, message: "Accesul de bază al membrilor activi nu poate fi eliminat." };
    }
    const operation = allowed
      ? supabaseAdmin.from("role_permissions").upsert({ role_key: role, permission_key: permission }, { onConflict: "role_key,permission_key" })
      : supabaseAdmin.from("role_permissions").delete().eq("role_key", role).eq("permission_key", permission);
    const { error } = await operation;
    if (error) throw error;
    await logAudit({ actorId: viewer.profile.id, action: "permissions.role_mapping_changed", entityType: "role_permission", entityId: `${role}:${permission}`, metadata: { role, permission, allowed } });
    revalidatePath("/board/permisiuni");
    revalidatePath("/board", "layout");
    return { ok: true as const, message: "Permisiunea a fost actualizată." };
  } catch {
    return { ok: false as const, message: "Permisiunea nu a putut fi actualizată." };
  }
}
