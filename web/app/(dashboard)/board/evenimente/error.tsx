"use client";

import { useEffect } from "react";

export default function BoardEventsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("board_events_route_error", { digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <div className="dash-page">
      <div className="dash-card dash-empty">
        <strong>Evenimentele nu s-au încărcat.</strong>
        Datele nu au fost modificate. Încearcă din nou.
        <button type="button" className="dash-button" onClick={reset}>Reîncearcă</button>
      </div>
    </div>
  );
}
