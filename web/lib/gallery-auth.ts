import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// A recruit may have an Auth account without an active membership or profile.
export const getGalleryViewer = cache(async () => {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("full_name, role, membership_status").eq("id", user.id).maybeSingle();
  if (profileError) throw profileError;
  const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name;
  return {
    client, userId: user.id,
    name: typeof name === "string" && name.trim() ? name.trim().slice(0, 120) : "Utilizator SavaPass",
    role: profile?.role ?? null,
    membershipStatus: profile?.membership_status ?? null,
  };
});
