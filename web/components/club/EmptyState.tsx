/** A calm, deliberate empty state for club lists that have no rows yet (pre-seed).
 * Reads as intentional, not broken — used by team / projects / sponsors. */
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="cl-empty anim-rise">
      <div className="cl-empty__mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.3" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line key={i}
                x1={12 + Math.cos(a) * 5.6} y1={12 + Math.sin(a) * 5.6}
                x2={12 + Math.cos(a) * 9} y2={12 + Math.sin(a) * 9}
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            );
          })}
        </svg>
      </div>
      <div className="cl-empty__title">{title}</div>
      <p className="cl-empty__text">{text}</p>
    </div>
  );
}
