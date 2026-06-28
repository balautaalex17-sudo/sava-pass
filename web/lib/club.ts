import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TeamMember, Project, Sponsor, Json } from "@/lib/supabase/types";

// Public club-content reads are cached in the Next data cache (same posture as
// lib/events.ts): the admin client is used because unstable_cache cannot wrap the
// cookie client, and the content is public anyway. Admin content-mutations call
// revalidateClub() (updateTag) to refresh immediately; the 300s revalidate is the
// time-based backstop. Admin "all rows" reads stay UNCACHED (must see drafts).
export const CLUB_TAG = "club-content";
const CACHE = { tags: [CLUB_TAG], revalidate: 300 };

// ── Team (public: active, ordered) ───────────────────────────────────────────
export const getTeam = unstable_cache(
  async (): Promise<TeamMember[]> => {
    const { data } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    return data ?? [];
  },
  ["club-team"],
  CACHE,
);

// ── Projects (public: published, ordered) ────────────────────────────────────
export const getPublishedProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("published", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    return data ?? [];
  },
  ["club-projects"],
  CACHE,
);

export const getProjectBySlug = unstable_cache(
  async (slug: string): Promise<Project | null> => {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    return data ?? null;
  },
  ["club-project-by-slug"],
  CACHE,
);

// ── Sponsors (public: active, by tier/sort) ──────────────────────────────────
export const getSponsors = unstable_cache(
  async (): Promise<Sponsor[]> => {
    const { data } = await supabaseAdmin
      .from("sponsors")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("name", { ascending: true });
    return data ?? [];
  },
  ["club-sponsors"],
  CACHE,
);

// ── Site content (admin-editable prose keyed by string) ──────────────────────
const getSiteContentMap = unstable_cache(
  async (): Promise<Record<string, Json>> => {
    const { data } = await supabaseAdmin.from("site_content").select("key,value");
    const map: Record<string, Json> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  },
  ["club-site-content"],
  CACHE,
);

/** All site_content values as a key→value map (cached). */
export async function getSiteContent(): Promise<Record<string, Json>> {
  return getSiteContentMap();
}

/** One site_content value with a typed fallback so pages render before any prose
 * is seeded. */
export async function getContent<T = string>(key: string, fallback: T): Promise<T> {
  const all = await getSiteContentMap();
  const v = all[key];
  return v === undefined || v === null ? fallback : (v as unknown as T);
}

// ── Admin reads: all rows incl. inactive/unpublished. Uncached. Staff-gated. ──
export async function getAllTeamForAdmin(): Promise<TeamMember[]> {
  const { data } = await supabaseAdmin
    .from("team_members")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getAllProjectsForAdmin(): Promise<Project[]> {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAllSponsorsForAdmin(): Promise<Sponsor[]> {
  const { data } = await supabaseAdmin
    .from("sponsors")
    .select("*")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}

/** Invalidate every cached club-content read. Call from any club-content
 * mutation server action (updateTag is server-action-scoped with
 * read-your-own-writes semantics). */
export function revalidateClub(): void {
  updateTag(CLUB_TAG);
}
