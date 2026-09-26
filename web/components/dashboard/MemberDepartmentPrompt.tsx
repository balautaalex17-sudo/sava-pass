import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseDepartmentOptions } from "@/lib/dashboard/member-departments";
import { logServerError } from "@/lib/server-log";
import { MemberDepartmentDialog } from "./MemberDepartmentDialog";

export async function MemberDepartmentPrompt({ profileId }: { profileId: string }) {
  const { data, error } = await supabaseAdmin.rpc("get_member_department_options", { p_profile_id: profileId });
  if (error) logServerError("member_department_options_failed", error);
  const result = data && typeof data === "object" && !Array.isArray(data) ? data.result : null;
  if (!error && (result === "already_selected" || result === "excluded")) return null;
  return <MemberDepartmentDialog initialOptions={error ? null : parseDepartmentOptions(data)} />;
}
