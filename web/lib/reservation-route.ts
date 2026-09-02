export type ReservationRouteDecision =
  | { kind: "redirect"; href: string }
  | { kind: "choose" };

/** Keep every generic ticket CTA independent from the number of live events. */
export function resolveReservationRoute(
  activeEvents: readonly { slug: string }[],
): ReservationRouteDecision {
  if (activeEvents.length === 0) {
    return { kind: "redirect", href: "/evenimente" };
  }

  if (activeEvents.length === 1) {
    return { kind: "redirect", href: `/${activeEvents[0].slug}/checkout` };
  }

  return { kind: "choose" };
}
