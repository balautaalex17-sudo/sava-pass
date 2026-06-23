import { unstable_cache, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import type { Event, EventStats } from "@/lib/supabase/types";

// Perf (U5): public event reads are cached in the Next data cache so the homepage
// and buyer pages don't hit Supabase on every request (also reduces how often a
// cold DB has to wake). Cached reads use the ADMIN client because unstable_cache
// cannot wrap the cookie-based client (it reads cookies). Mutations call
// revalidateTag(EVENTS_TAG) to refresh immediately. Stats stay UNCACHED (live
// sold counts). Events are public data, so admin-client reads are equivalent.
export const EVENTS_TAG = "events";
const CACHE = { tags: [EVENTS_TAG], revalidate: 300 };

const cachedActiveEvent = unstable_cache(
  async (): Promise<Event | null> => {
    const { data } = await supabaseAdmin.from("events").select("*").eq("status", "active").single();
    return data ?? null;
  },
  ["active-event"],
  CACHE,
);

const cachedEventBySlugPublic = unstable_cache(
  async (slug: string): Promise<Event | null> => {
    const { data } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("slug", slug)
      .in("status", ["active", "past"])
      .single();
    return data ?? null;
  },
  ["event-by-slug-public"],
  CACHE,
);

const cachedPastEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const { data } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("status", "past")
      .order("starts_at", { ascending: false });
    return data ?? [];
  },
  ["past-events"],
  CACHE,
);

export async function getActiveEvent(): Promise<Event | null> {
  return cachedActiveEvent();
}

export async function getPastEvents(): Promise<Event[]> {
  return cachedPastEvents();
}

export async function getEventBySlug(slug: string, options?: { includeDraftForAdmin?: boolean }): Promise<Event | null> {
  // Fast path: public (active/past) events come from the cache — covers all normal
  // visitors with no DB round-trip.
  const published = await cachedEventBySlugPublic(slug);
  if (published) return published;

  // Not public → may be a draft. Only an admin previewing a draft reaches here;
  // this branch reads auth (cookies) and is intentionally uncached.
  if (options?.includeDraftForAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.from("events").select("*").eq("slug", slug).single();
    if (data?.status === "draft") {
      const admin = await requireStaffRole(["admin"]);
      if (!admin) return null;
    }
    return data ?? null;
  }

  return null;
}

export async function getAllEventsForAdmin(): Promise<Event[]> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });
  return data ?? [];
}

export async function getEventStats(eventId: string): Promise<EventStats | null> {
  // Uncached on purpose: sold/checked-in counts must always be live.
  const { data } = await supabaseAdmin
    .from("event_stats")
    .select("*")
    .eq("event_id", eventId)
    .single();
  return data ?? null;
}

/** Invalidate all cached event reads. Call from an event-mutation server action
 * (updateTag is server-action-scoped with read-your-own-writes semantics; the
 * 300s revalidate on each cache is the time-based backstop). */
export function revalidateEvents(): void {
  updateTag(EVENTS_TAG);
}

export function seatsLeft(event: Event, sold: number): number {
  return Math.max(0, event.capacity - sold);
}

export function priceRon(priceBani: number): number {
  return Math.round(priceBani / 100);
}
