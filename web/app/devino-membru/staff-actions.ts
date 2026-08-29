"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getStaffTestCredential,
  isStaffTestAccessAllowed,
  isStaffTestCodeValid,
} from "@/lib/staff-test-access";
import {
  STAFF_TEST_ROLE_VALUES,
  staffTestDestination,
} from "@/lib/staff-test-roles";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const staffTestLoginSchema = z.object({
  accessKey: z.string().trim().min(1).max(128),
  accessCode: z.string().trim().min(8).max(128),
  role: z.enum(STAFF_TEST_ROLE_VALUES),
});

export type StaffTestLoginState = {
  error?: string;
};

export async function signInAsStaffTest(
  _previousState: StaffTestLoginState,
  formData: FormData,
): Promise<StaffTestLoginState> {
  const parsed = staffTestLoginSchema.safeParse({
    accessKey: formData.get("accessKey"),
    accessCode: formData.get("accessCode"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: "Completează rolul și codul secret." };
  }

  const allowed = await allowPublicAction({
    scope: "staff-test-login",
    ipLimit: 5,
    windowSeconds: 10 * 60,
  });
  if (!allowed) {
    return { error: "Accesul de test nu este disponibil sau codul este incorect." };
  }

  const requestHeaders = await headers();
  if (
    !isStaffTestAccessAllowed(requestHeaders, parsed.data.accessKey) ||
    !isStaffTestCodeValid(parsed.data.accessCode)
  ) {
    return { error: "Accesul de test nu este disponibil sau codul este incorect." };
  }

  const credential = getStaffTestCredential(parsed.data.role);
  if (!credential) {
    return { error: "Contul de test nu este configurat pe acest server." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: credential.email,
    password: credential.password,
  });

  if (authError || !authData.user) {
    return { error: "Contul de test nu a putut fi autentificat." };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, membership_status")
    .eq("id", authData.user.id)
    .maybeSingle();

  const { data: operationalRoles, error: operationalRolesError } = await supabaseAdmin
    .from("profile_roles")
    .select("role")
    .eq("profile_id", authData.user.id);

  const hasRequestedRole = profile?.role === parsed.data.role ||
    (operationalRoles ?? []).some((assignment) => assignment.role === parsed.data.role);

  if (
    profileError ||
    operationalRolesError ||
    !profile ||
    !hasRequestedRole ||
    profile.membership_status !== "active"
  ) {
    await supabase.auth.signOut();
    return { error: "Rolul contului de test nu este configurat corect." };
  }

  redirect(staffTestDestination(parsed.data.role));
}
