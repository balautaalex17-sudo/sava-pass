import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function consumeDashboardRateLimit(
  actorId: string,
  scope: string,
  limit = 120,
  windowSeconds = 60,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "consume_dashboard_rate_limit",
    {
      p_actor_id: actorId,
      p_scope: scope,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );
  if (error) {
    console.error("dashboard_rate_limit_failed", { scope });
    return false;
  }
  return data === true;
}
