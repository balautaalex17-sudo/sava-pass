import { unstable_cache, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import type { Event, EventStats, EventTicketType } from "@/lib/supabase/types";

// Perf (U5): public event reads are cached in the Next data cache so the homepage
// and buyer pages don't hit Supabase on every request (also reduces how often a
// cold DB has to wake). Cached reads use the ADMIN client because unstable_cache
// cannot wrap the cookie-based client (it reads cookies). Mutations call
// revalidateTag(EVENTS_TAG) to refresh immediately. Stats stay UNCACHED (live
// sold counts). Events are public data, so admin-client reads are equivalent.
export const EVENTS_TAG = "events";
const CACHE = { tags: [EVENTS_TAG], revalidate: 300 };

const cachedActiveEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const { data } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("status", "active")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(3);
    return data ?? [];
  },
  ["active-events"],
  CACHE,
);

const cachedPublicEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const { data } = await supabaseAdmin
      .from("events")
      .select("*")
      .in("status", ["active", "past"])
      .order("starts_at", { ascending: false });
    return data ?? [];
  },
  ["public-events"],
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
  return (await cachedActiveEvents())[0] ?? null;
}

export async function getActiveEvents(): Promise<Event[]> {
  return cachedActiveEvents();
}

export async function getPublicEvents(): Promise<Event[]> {
  return cachedPublicEvents();
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

export async function getEventTicketTypes(eventId: string, includeHidden = false): Promise<EventTicketType[]> {
  let query = supabaseAdmin
    .from("event_ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort")
    .order("created_at");
  if (!includeHidden) {
    const now = new Date().toISOString();
    query = query
      .eq("status", "active")
      .or(`sales_start_at.is.null,sales_start_at.lte.${now}`)
      .or(`sales_end_at.is.null,sales_end_at.gte.${now}`);
  }
  const { data } = await query;
  return data ?? [];
}

/** Live issued-ticket count per ticket type. Cancelled/expired tickets release their seat. */
export async function getTicketTypeSoldCounts(eventId: string): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from("tickets")
    .select("ticket_type_id")
    .eq("event_id", eventId)
    .in("status", ["reserved", "paid", "checked_in"]);
  const counts: Record<string, number> = {};
  for (const ticket of data ?? []) {
    if (ticket.ticket_type_id) counts[ticket.ticket_type_id] = (counts[ticket.ticket_type_id] ?? 0) + 1;
  }
  return counts;
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

/** One shared lifecycle rule prevents stale "active" records from accepting sales. */
export function eventIsBookable(event: Pick<Event, "status" | "starts_at">): boolean {
  return event.status === "active" && new Date(event.starts_at).getTime() > Date.now();
}
