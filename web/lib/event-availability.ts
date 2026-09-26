import type { PurchaseState } from '@/components/events/EventPurchaseExperience';
import type { Event } from '@/lib/supabase/types';
import { isEventEnded } from '@/lib/event-lifecycle';
import { getEventStats, getEventTicketTypes, getTicketTypeSoldCounts, priceRon, seatsLeft } from '@/lib/events';

// Start fresh availability once; status, price and checkout share the same work.
export async function getAvailability(event: Event) {
  const [stats, rawTicketTypes, typeSold] = await Promise.all([
    getEventStats(event.id),
    getEventTicketTypes(event.id),
    getTicketTypeSoldCounts(event.id),
  ]);

  const sold = stats?.sold ?? 0;
  const remaining = seatsLeft(event, sold);
  const ticketTypes = rawTicketTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description,
    priceRon: priceRon(type.price_bani),
    seatsLeft: Math.min(remaining, Math.max(0, type.capacity - (typeSold[type.id] ?? 0))),
  }));
  const ended = isEventEnded(event);
  const allTypesSoldOut = ticketTypes.length > 0 && ticketTypes.every((type) => type.seatsLeft <= 0);
  const purchaseState: PurchaseState = event.status === "draft"
    ? "unavailable"
    : ended
      ? "ended"
      : ticketTypes.length === 0
        ? "unavailable"
        : remaining <= 0 || allTypesSoldOut
          ? "sold_out"
          : "active";
  const availableTicketTypes = ticketTypes.filter((type) => type.seatsLeft > 0);
  const startingPrice = availableTicketTypes.length
    ? Math.min(...availableTicketTypes.map((type) => type.priceRon))
    : null;
  return { sold, remaining, ticketTypes, purchaseState, startingPrice };
}
