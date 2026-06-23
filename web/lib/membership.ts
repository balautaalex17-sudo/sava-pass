import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MembershipApplication } from "@/lib/supabase/types";

/** Newest-first list of membership applications. Staff-only callers (gated by requireStaffRole). */
export async function listApplications(): Promise<MembershipApplication[]> {
  const { data } = await supabaseAdmin
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as MembershipApplication[];
}
