import "server-only";

import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Json;
}

/** Best-effort audit history. A logging outage must never undo the real action. */
export async function logAudit({ actorId, action, entityType, entityId, metadata = {} }: AuditInput) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });

  if (error) logServerError("audit_log_insert_failed", error, { action, entityType });
}
