"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import {
  ensureInvitedAuthUser,
  sendMemberInvitation,
  type EnsuredAuthUser,
} from "@/lib/dashboard/member-auth";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  canManagePrimaryRole,
  type PrimaryRole,
} from "@/lib/dashboard/role-hierarchy";

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLocaleLowerCase("ro")),
  phone: z.string().trim().max(30).optional(),
  grade: z.string().trim().max(30).optional(),
  membershipStatus: z.enum(["active", "inactive", "suspended", "alumni"]),
  role: z.enum(["admin", "board", "statistici"]).nullable(),
}).strict();

const resendSchema = z.object({ id: z.string().uuid() }).strict();

export type MemberAdminInput = z.input<typeof memberSchema>;

async function removeNewAuthUser(ensured: EnsuredAuthUser | null) {
  if (!ensured?.authUserCreated) return;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(ensured.user.id);
  if (error) logServerError("new_member_auth_cleanup_failed", error);
}

export async function saveMember(input: unknown) {
  let ensured: EnsuredAuthUser | null = null;
  let profileSaved = false;

  try {
    const viewer = await requirePermission("manage_members");
    const parsed = memberSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        tone: "error" as const,
        message: parsed.error.issues[0]?.message ?? "Date invalide.",
      };
    }

    const values = parsed.data;
    let userId = values.id;
    let previous: {
      role: PrimaryRole;
      membership_status: string;
      email: string | null;
    } | null = null;

    if (userId) {
      const previousResult = await supabaseAdmin
        .from("profiles")
        .select("role, membership_status, email")
        .eq("id", userId)
        .maybeSingle();
      if (previousResult.error) throw previousResult.error;
      previous = previousResult.data;
    }

    if (!canManagePrimaryRole(viewer.profile.role, previous?.role ?? null, values.role)) {
      return {
        ok: false as const,
        tone: "error" as const,
        message: "Nu poți acorda sau modifica un rol egal ori mai mare decât rolul tău.",
      };
    }

    if (
      values.id === viewer.profile.id
      && (values.membershipStatus !== "active" || !["admin", "board"].includes(values.role ?? ""))
    ) {
      return {
        ok: false as const,
        tone: "error" as const,
        message: "Nu îți poți retrage singur accesul administrativ.",
      };
    }

    if (!userId) {
      ensured = await ensureInvitedAuthUser({
        email: values.email,
        fullName: values.fullName,
      });
      userId = ensured.user.id;
    }

    if (previous?.email && previous.email.toLocaleLowerCase("ro") !== values.email) {
      await removeNewAuthUser(ensured);
      return {
        ok: false as const,
        tone: "error" as const,
        message: "Emailul de autentificare nu se schimbă din profil. Creează o invitație nouă pentru altă adresă.",
      };
    }

    if (previous?.role === "admin" && values.role !== "admin") {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("membership_status", "active");
      if ((count ?? 0) <= 1) {
        return {
          ok: false as const,
          tone: "error" as const,
          message: "Trebuie să rămână cel puțin un super admin activ.",
        };
      }
    }

    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: values.fullName,
      email: values.email,
      phone: values.phone || null,
      grade: values.grade || null,
      membership_status: values.membershipStatus,
      role: values.role,
    }, { onConflict: "id" });

    if (error) {
      throw error;
    }
    profileSaved = true;

    const invitationDelivery = ensured?.invitation
      ? await sendMemberInvitation(ensured.invitation, values.role)
      : null;

    await logAudit({
      actorId: viewer.profile.id,
      action: previous ? "member.updated" : "member.created",
      entityType: "profile",
      entityId: userId,
      metadata: {
        previous_role: previous?.role ?? null,
        role: values.role,
        previous_status: previous?.membership_status ?? null,
        membership_status: values.membershipStatus,
        invitation_sent: invitationDelivery?.ok ?? false,
        invitation_flow: ensured?.invitation ? "persistent_one_time" : null,
      },
    });

    revalidatePath("/board/membri");
    revalidatePath("/board", "layout");

    if (invitationDelivery && !invitationDelivery.ok) {
      return {
        ok: true as const,
        tone: "warning" as const,
        message: "Membrul a fost salvat, dar emailul cu codul nu a putut fi trimis. Îl poți retrimite din listă după configurarea domeniului de email.",
      };
    }

    return {
      ok: true as const,
      tone: "success" as const,
      message: invitationDelivery
        ? "Membrul a fost creat, iar codul de activare a fost trimis pe email."
        : ensured
          ? "Membrul a fost salvat. Contul existent era deja activat."
        : "Membrul a fost salvat.",
    };
  } catch (error) {
    if (!profileSaved) await removeNewAuthUser(ensured);
    logServerError("member_save_failed", error);
    return {
      ok: false as const,
      tone: "error" as const,
      message: "Membrul nu a putut fi salvat. Verifică emailul și încearcă din nou.",
    };
  }
}

export async function resendMemberInvitation(input: unknown) {
  try {
    const viewer = await requirePermission("manage_members");
    const parsed = resendSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Membrul selectat este invalid." };
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, membership_status")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile?.email) {
      return { ok: false as const, message: "Membrul nu are un email de autentificare." };
    }
    if (profile.membership_status !== "active") {
      return { ok: false as const, message: "Reactivează membrul înainte să trimiți un cod de acces." };
    }

    const ensured = await ensureInvitedAuthUser({
      email: profile.email,
      fullName: profile.full_name,
    });
    if (ensured.user.id !== profile.id) {
      await removeNewAuthUser(ensured);
      return {
        ok: false as const,
        message: "Profilul nu mai corespunde contului de autentificare. Verifică adresa de email.",
      };
    }

    if (!ensured.invitation) {
      return {
        ok: false as const,
        message: "Contul este deja activat. Membrul poate folosi resetarea parolei din pagina de login.",
      };
    }

    const delivery = await sendMemberInvitation(ensured.invitation, profile.role);
    await logAudit({
      actorId: viewer.profile.id,
      action: "member.invitation_resent",
      entityType: "profile",
      entityId: profile.id,
      metadata: {
        invitation_sent: delivery.ok,
        invitation_flow: "persistent_one_time",
      },
    });

    return delivery.ok
      ? { ok: true as const, message: `Un cod nou a fost trimis la ${profile.email}.` }
      : { ok: false as const, message: "Codul a fost creat, dar emailul nu a putut fi trimis. Verifică domeniul Resend." };
  } catch (error) {
    logServerError("member_invitation_resend_failed", error);
    return { ok: false as const, message: "Invitația nu a putut fi retrimisă." };
  }
}
