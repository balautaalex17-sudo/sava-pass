"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import type { EventCategory, EventRecord, EventStatus } from "@/lib/event-types";
import { CATEGORY_LABELS, filterArchiveEvents } from "@/lib/event-display";
import { CompactEventCard } from "./CompactEventCard";
import styles from "./events-index.module.css";

const PAGE_SIZE = 10;

function readPeriod(value: string | null, years: readonly string[]) {
  if (value === "upcoming" || value === "ongoing" || value === "past" || value === "date-unknown") return value;
  if (value?.startsWith("year:") && years.includes(value.slice(5))) return value;
  return "all";
}

export function EventsExplorer({ events, years }: { events: EventRecord[]; years: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const queryParam = searchParams.get("q") || "";
  const [queryEdit, setQueryEdit] = useState<{ source: string; value: string } | null>(null);
  const categories = useMemo(() => [...new Set(events.map((event) => event.category))], [events]);
  const categoryParam = searchParams.get("category");
  const category = categories.includes(categoryParam as EventCategory) ? categoryParam as EventCategory : "all";

  const legacyPeriod = searchParams.get("status") || (searchParams.get("year") ? `year:${searchParams.get("year")}` : null);
  const period = readPeriod(searchParams.get("period") || legacyPeriod, years);
  const queryDraft = queryEdit?.source === queryParam ? queryEdit.value : queryParam;
  const filterSignature = `${period}|${category}|${queryDraft}`;
  const [pagination, setPagination] = useState({ signature: filterSignature, count: PAGE_SIZE });
  const visibleCount = pagination.signature === filterSignature ? pagination.count : PAGE_SIZE;

  const filtered = useMemo(() => {
    const status: "all" | EventStatus = period.startsWith("year:") ? "all" : period as "all" | EventStatus;
    const year = period.startsWith("year:") ? period.slice(5) : "all";
    return filterArchiveEvents(events, { status, year, category, query: queryDraft });
  }, [category, events, period, queryDraft]);

  const visibleEvents = filtered.slice(0, visibleCount);
  const hasFilters = period !== "all" || category !== "all" || Boolean(queryDraft);

  useEffect(() => {
    if (queryDraft === queryParam) return;
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParamsKey);
      if (queryDraft) next.set("q", queryDraft);
      else next.delete("q");
      next.delete("status");
      next.delete("year");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 280);
    return () => window.clearTimeout(timeout);
  }, [pathname, queryDraft, queryParam, router, searchParamsKey]);

  function updateParam(name: "category" | "period", value: string) {
    const next = new URLSearchParams(searchParamsKey);
    next.delete("status");
    next.delete("year");
    if (!value || value === "all") next.delete(name);
    else next.set(name, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQueryEdit(null);
    setPagination({ signature: "all|all|", count: PAGE_SIZE });
    router.replace(pathname, { scroll: false });
  }

  return (
    <section className={styles.eventsSection} id="toate-evenimentele" aria-labelledby="events-title">
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="events-title">Toate evenimentele</h2>
          <p>Explorează evenimentele active și edițiile încheiate ale Interact Sf. Sava.</p>
        </div>
      </div>

      <div className={styles.filters} id="event-filter-controls">
        <label className={styles.selectField}>
          <span>Categorie</span>
          <select value={category} onChange={(event) => updateParam("category", event.target.value)}>
            <option value="all">Toate categoriile</option>
            {categories.map((item) => <option value={item} key={item}>{CATEGORY_LABELS[item]}</option>)}
          </select>
        </label>

        <label className={styles.selectField}>
          <span>Perioadă</span>
          <select value={period} onChange={(event) => updateParam("period", event.target.value)}>
            <option value="all">Toate datele</option>
            <option value="upcoming">Urmează</option>
            <option value="ongoing">În desfășurare</option>
            <option value="past">Încheiate</option>
            {years.map((year) => <option value={`year:${year}`} key={year}>Anul {year.replace("-", "–")}</option>)}
          </select>
        </label>

        <label className={styles.searchField}>
          <span>Caută în evenimente</span>
          <div><Search size={17} aria-hidden="true" /><input type="search" value={queryDraft} onChange={(event) => setQueryEdit({ source: queryParam, value: event.target.value })} placeholder="Caută evenimente…" /></div>
        </label>

        {hasFilters && <button type="button" className={styles.clearButton} onClick={clearFilters}><X size={16} aria-hidden="true" />Resetează</button>}
      </div>

      <div className={styles.resultsBar}>
        <p aria-live="polite">{filtered.length} {filtered.length === 1 ? "eveniment găsit" : "evenimente găsite"}</p>
        {visibleCount < filtered.length && <span>Se afișează {visibleEvents.length}</span>}
      </div>

      {visibleEvents.length > 0 ? (
        <div className={styles.eventsGrid}>
          {visibleEvents.map((event) => <CompactEventCard event={event} key={event.id} />)}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>Niciun eveniment nu corespunde filtrelor.</strong>
          <p>Schimbă categoria, perioada sau termenul căutat.</p>
          <button type="button" onClick={clearFilters}>Șterge filtrele</button>
        </div>
      )}

      {visibleCount < filtered.length && (
        <button type="button" className={styles.loadMore} onClick={() => setPagination({ signature: filterSignature, count: visibleCount + PAGE_SIZE })}>
          Încarcă mai multe evenimente <ChevronDown size={17} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
