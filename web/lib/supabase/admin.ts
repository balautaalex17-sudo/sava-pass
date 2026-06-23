import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

if (typeof window !== "undefined") {
  throw new Error("lib/supabase/admin must only be used server-side");
}

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
