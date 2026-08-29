"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole, STAFF_ROLES, type StaffRole } from "@/lib/roles";
import { resolveSiteUrl } from "@/lib/site-url";
import { prepareAuthEmail, sendPreparedAuthEmail, type PreparedAuthEmail } from "@/lib/auth-email";
import { logServerError } from "@/lib/server-log";

const roleSchema = z.enum(STAFF_ROLES);

const inviteSchema = z.object({
  email: z.string().email("Email invalid").transform((v) => v.toLowerCase().trim()),
  role: roleSchema,
});

const memberSchema = z.object({
  id: z.string().uuid(),
  role: roleSchema.optional(),
});

export interface TeamActionState {
  ok?: boolean;
  message?: string;
  errors?: { email?: string; role?: string; general?: string };
}

async function requireAdmin() {
  const current = await requireStaffRole(["admin"]);
  if (!current) return null;
  return current.user;
}

async function findUserByEmail(email: string) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return null;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 100) return null;
    page += 1;
  }
  return null;
}

async function wouldRemoveLastAdmin(targetId: string, nextRole?: StaffRole) {
  const { data: admins } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  const adminIds = new Set((admins ?? []).map((admin) => admin.id));
  if (!adminIds.has(targetId)) return false;
  if (nextRole === "admin") return false;
  return adminIds.size <= 1;
}

export async function inviteStaff(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const admin = await requireAdmin();
  if (!admin) return { errors: { general: "Nu ai acces la această acțiune." } };

  const parsed = inviteSchema.safeParse({
    email: form.get("email"),
    role: form.get("role"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { errors: { email: flat.email?.[0], role: flat.role?.[0] } };
  }

  const { email, role } = parsed.data;
  const siteUrl = resolveSiteUrl();

  const existing = await findUserByEmail(email);
  let userId = existing?.id;
  let preparedEmail: PreparedAuthEmail | null = null;
  let message = "Exista deja cont, rol acordat direct.";
  const authUserWasCreated = !existing;

  if (!existing?.confirmed_at) {
    const prepared = await prepareAuthEmail({
      kind: "invite",
      email,
      redirectTo: `${siteUrl}/invite/confirm`,
    });
    if (!prepared.ok) {
      return { errors: { general: "Invitația nu a putut fi trimisă." } };
    }
    if (existing && prepared.email.userId !== existing.id) {
      return { errors: { general: "Invitația a generat un cont diferit. Nu am salvat rolul." } };
    }
    preparedEmail = prepared.email;
    userId = prepared.email.userId;
    message = "Invitația a fost trimisă.";
  }

  if (!userId) return { errors: { general: "Nu am putut găsi utilizatorul." } };

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, email, full_name: email.split("@")[0], role }, { onConflict: "id" });

  if (error) {
    if (preparedEmail && authUserWasCreated) {
      await supabaseAdmin.auth.admin.deleteUser(preparedEmail.userId);
    }
    return { errors: { general: "Rolul nu a putut fi salvat." } };
  }

  if (preparedEmail) {
    const delivery = await sendPreparedAuthEmail(preparedEmail);
    if (!delivery.ok) {
      logServerError("staff_invitation_email_failed", new Error(delivery.error ?? "email_failed"), { userId });
      return { errors: { general: "Rolul a fost salvat, dar emailul nu a plecat. Retrimite invitația." } };
    }
  }

  revalidatePath("/admin/team");
  return { ok: true, message };
}

export async function changeRole(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const admin = await requireAdmin();
  if (!admin) return { errors: { general: "Nu ai acces la această acțiune." } };

  const parsed = memberSchema.safeParse({
    id: form.get("id"),
    role: form.get("role"),
  });

  if (!parsed.success || !parsed.data.role) return { errors: { general: "Date invalide." } };

  if (await wouldRemoveLastAdmin(parsed.data.id, parsed.data.role)) {
    return { errors: { general: "Trebuie să rămână cel puțin un admin." } };
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.id);

  if (error) return { errors: { general: "Rolul nu a putut fi schimbat." } };
  revalidatePath("/admin/team");
  return { ok: true, message: "Rol actualizat." };
}

export async function removeMember(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const admin = await requireAdmin();
  if (!admin) return { errors: { general: "Nu ai acces la această acțiune." } };

  const parsed = memberSchema.safeParse({ id: form.get("id") });
  if (!parsed.success) return { errors: { general: "Date invalide." } };

  if (await wouldRemoveLastAdmin(parsed.data.id)) {
    return { errors: { general: "Trebuie să rămână cel puțin un admin." } };
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { errors: { general: "Membrul nu a putut fi eliminat." } };
  revalidatePath("/admin/team");
  return { ok: true, message: "Membrul a fost scos din staff." };
}
