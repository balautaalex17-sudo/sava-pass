export default function LoadingBoardEvents() {
  return (
    <div className="dash-page" aria-live="polite" aria-busy="true">
      <header className="dash-page-head"><div><span className="dash-eyebrow">Se încarcă</span><h1>Evenimente</h1><p>Pregătim sloturile și arhiva…</p></div></header>
      <div className="board-event-view-tabs" aria-hidden>
        <span className="board-event-view-tab"><span><strong>Evenimente pe Despre</strong><small>Se încarcă…</small></span></span>
        <span className="board-event-view-tab"><span><strong>Arhivă</strong><small>Se încarcă…</small></span></span>
      </div>
      <div className="board-featured-grid" aria-hidden>
        {([1, 2, 3] as const).map((slot) => <div className="dash-card board-featured-slot board-featured-slot--loading" key={slot}><span>Slot {slot}</span><div /><div /></div>)}
      </div>
    </div>
  );
}
