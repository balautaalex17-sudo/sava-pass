import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import type { Event, EventStats } from "@/lib/supabase/types";

export async function getActiveEvent(): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "active")
    .single();
  return data ?? null;
}

export async function getEventBySlug(slug: string, options?: { includeDraftForAdmin?: boolean }): Promise<Event | null> {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("slug", slug);

  if (!options?.includeDraftForAdmin) query = query.in("status", ["active", "past"]);

  const { data } = await query.single();
  if (data?.status === "draft") {
    const admin = await requireStaffRole(["admin"]);
    if (!admin) return null;
  }
  return data ?? null;
}

export async function getAllEventsForAdmin(): Promise<Event[]> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });
  return data ?? [];
}

export async function getPastEvents(): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "past")
    .order("starts_at", { ascending: false });
  return data ?? [];
}

export async function getEventStats(eventId: string): Promise<EventStats | null> {
  const { data } = await supabaseAdmin
    .from("event_stats")
    .select("*")
    .eq("event_id", eventId)
    .single();
  return data ?? null;
}

export function seatsLeft(event: Event, sold: number): number {
  return Math.max(0, event.capacity - sold);
}

export function priceRon(priceBani: number): number {
  return Math.round(priceBani / 100);
}
