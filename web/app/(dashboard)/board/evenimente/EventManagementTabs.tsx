import Link from "next/link";

export function EventManagementTabs({
  active,
  featuredCount,
  endedCount,
}: {
  active: "featured" | "archive";
  featuredCount: number;
  endedCount: number;
}) {
  return (
    <nav className="board-event-view-tabs" aria-label="Administrare evenimente">
      <Link
        href="/board/evenimente"
        className="board-event-view-tab"
        aria-current={active === "featured" ? "page" : undefined}
      >
        <span>
          <strong>Evenimente pe Despre</strong>
          <small>Cele trei poziții alese manual</small>
        </span>
        <b>{featuredCount}/3</b>
      </Link>
      <Link
        href="/board/evenimente/arhiva"
        className="board-event-view-tab"
        aria-current={active === "archive" ? "page" : undefined}
      >
        <span>
          <strong>Arhivă</strong>
          <small>Toate evenimentele încheiate</small>
        </span>
        <b>{endedCount}</b>
      </Link>
    </nav>
  );
}
