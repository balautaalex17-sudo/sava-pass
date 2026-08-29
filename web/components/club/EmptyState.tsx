/** A calm, deliberate empty state for club lists that have no rows yet (pre-seed).
 * Reads as intentional, not broken — used by team / projects / sponsors. */
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="cl-empty anim-rise">
      <div className="cl-empty__title">{title}</div>
      <p className="cl-empty__text">{text}</p>
    </div>
  );
}
