import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { Event, EventStats } from "@/lib/supabase/types";
import { priceRon, seatsLeft } from "@/lib/events";
import { MhReveal } from "./MhReveal";

// Signature Moment 2 — the ticket. The live next event as a boarding-pass
// silhouette (poster + perforation + notch + seats meter that fills on reveal).
export function MhEventCard({
  event,
  stats,
}: {
  event: Event | null;
  stats: EventStats | null;
}) {
  return (
    <MhReveal as="section" className="mh-sec mh-ticket-sec" id="mh-eveniment" amount={0.2}>
      {event ? (
        <a className="mh-ticket mh-up" href={`/${event.slug}`}>
          <div className="mh-ticket__poster">
            <span className="mh-ticket__chip">Următorul eveniment</span>
            {event.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.photo_url} alt={event.title} loading="lazy" />
            ) : null}
          </div>

          <div className="mh-perf" />

          <div className="mh-ticket__body">
            <h2 className="mh-ticket__title">{event.title}</h2>

            <div className="mh-ticket__meta">
              <span><CalendarDays strokeWidth={1.9} /><b>{event.date_label || event.date_long}</b></span>
              <span><MapPin strokeWidth={1.9} />{event.venue}</span>
            </div>

            {(() => {
              const sold = stats?.sold ?? 0;
              const cap = event.capacity || 0;
              const pct = cap > 0 ? Math.min(1, sold / cap) : 0;
              const left = seatsLeft(event, sold);
              return (
                <div className="mh-seats">
                  <div className="mh-seats__track">
                    <span className="mh-seats__fill" style={{ "--p": pct } as React.CSSProperties} />
                  </div>
                  <div className="mh-seats__row">
                    <span><b>{left}</b> locuri rămase</span>
                    <span>{Math.round(pct * 100)}% sală plină</span>
                  </div>
                </div>
              );
            })()}

            <div className="mh-ticket__buy">
              <span>Cumpără bilet · <span className="mh-num">{priceRon(event.price_bani)} RON</span></span>
              <ArrowRight size={20} strokeWidth={2.2} />
            </div>
          </div>
        </a>
      ) : (
        <div className="mh-empty mh-up">
          Niciun eveniment activ acum.{" "}
          <a href="#mh-arhiva">Vezi arhiva</a>
        </div>
      )}
    </MhReveal>
  );
}
