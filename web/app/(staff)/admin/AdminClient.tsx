"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AlertTriangle, CheckCircle, Download, XCircle } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import type { Database } from "@/lib/supabase/types";

type ScanRow = {
  id: string;
  result: string;
  created_at: string;
  ticket_id: string | null;
  code: string | null;
  holder_name: string | null;
};

type TicketRow = {
  id: string;
  code: string;
  holder_name: string;
  holder_email: string;
  status: string;
  issued_at: string;
  checked_in_at: string | null;
};

interface Props {
  eventId: string;
  initialScans: ScanRow[];
  tickets: TicketRow[];
  csvRows: string[][];
}

const RESULT_LABELS: Record<string, { text: string; icon: "ok" | "warn" | "err" }> = {
  ok:           { text: "OK",              icon: "ok" },
  already_in:   { text: "Deja înăuntru",   icon: "warn" },
  already_used: { text: "Folosit",         icon: "warn" },
  invalid:      { text: "Invalid",         icon: "err" },
  void_ticket:  { text: "Anulat",          icon: "err" },
};

function VerdictLabel({ result }: { result: string }) {
  const def = RESULT_LABELS[result];
  if (!def) return <span style={{ fontSize: 12, color: "var(--im-fg-2)" }}>{result}</span>;
  const { text, icon } = def;
  const color =
    icon === "ok" ? "var(--success)" :
    icon === "warn" ? "var(--warning)" :
    "var(--danger)";
  const Icon =
    icon === "ok" ? CheckCircle :
    icon === "warn" ? AlertTriangle :
    XCircle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color }}>
      <Icon size={16} strokeWidth={1.75} />
      {text}
    </span>
  );
}

const STATUS_TONE: Record<string, "brand" | "success" | "used" | "danger"> = {
  valid: "brand",
  in:    "success",
  used:  "used",
  void:  "danger",
};

export function AdminClient({ eventId, initialScans, tickets, csvRows }: Props) {
  const [scans, setScans] = useState<ScanRow[]>(initialScans);
  const [tab, setTab] = useState<"scans" | "attendees">("scans");
  const initialIds = useMemo(() => new Set(initialScans.map(s => s.id)), [initialScans]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`scans:${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scans", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const s = payload.new as Database["public"]["Tables"]["scans"]["Row"];
          const newRow: ScanRow = {
            id: s.id,
            result: s.result,
            created_at: s.created_at,
            ticket_id: s.ticket_id ?? null,
            code: null,
            holder_name: null,
          };
          setScans(prev => [newRow, ...prev.slice(0, 49)]);
          setNewIds(prev => new Set([...prev, s.id]));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  function downloadCsv() {
    const content = csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participanti.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--im-line)" }}>
        {(["scans", "attendees"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none",
              background: "none", cursor: "pointer",
              color: tab === t ? "var(--im-cyan-light)" : "var(--im-fg-2)",
              marginBottom: -1,
              position: "relative",
            }}
          >
            {t === "scans" ? `Scan-uri live (${scans.length})` : `Participanți (${tickets.length})`}
            <span style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "var(--im-cyan)",
              borderRadius: "2px 2px 0 0",
              transform: tab === t ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "left",
              transition: "transform var(--dur-base) var(--ease-out)",
            }} />
          </button>
        ))}
      </div>

      {tab === "scans" && (
        <div style={{ background: "var(--im-ink-2)", borderRadius: 16, border: "1px solid var(--im-line)", overflow: "hidden" }}>
          {scans.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--im-fg-2)", padding: "32px 20px", margin: 0 }}>
              Niciun scan înregistrat încă.
            </p>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {scans.map(s => {
                const isNew = newIds.has(s.id) && !initialIds.has(s.id);
                return (
                  <tr
                    key={s.id}
                    className={`row-hover${isNew ? " anim-flash anim-rise-fast" : ""}`}
                    style={{ borderBottom: "1px solid var(--im-line-soft)" }}
                  >
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--im-fg-2)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {new Date(s.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 13, fontWeight: 600, color: "var(--im-fg)", fontVariantNumeric: "tabular-nums" }}>
                      {s.code ?? "—"}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "var(--im-fg-2)" }}>
                      {s.holder_name ?? "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <VerdictLabel result={s.result} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "attendees" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={downloadCsv}
              className="pressable"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600, color: "var(--im-fg)",
                background: "var(--im-ink-3)", border: "1px solid var(--im-line)",
                borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              }}
            >
              <Download size={14} strokeWidth={1.75} />
              Export CSV
            </button>
          </div>
          <div style={{ background: "var(--im-ink-2)", borderRadius: 16, border: "1px solid var(--im-line)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--im-line)", background: "var(--im-ink-3)" }}>
                  {["Cod", "Nume", "Email", "Status", "Emis"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--im-fg-3)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="row-hover" style={{ borderBottom: "1px solid var(--im-line-soft)" }}>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--im-cyan-light)", letterSpacing: "0.08em", fontVariantNumeric: "tabular-nums" }}>{t.code}</td>
                    <td style={{ padding: "9px 14px", fontSize: 13, color: "var(--im-fg)" }}>{t.holder_name}</td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--im-fg-2)" }}>{t.holder_email}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <Chip size="sm" tone={STATUS_TONE[t.status] ?? "used"} dot>
                        {t.status}
                      </Chip>
                    </td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--im-fg-2)", fontVariantNumeric: "tabular-nums" }}>
                      {new Date(t.issued_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--im-fg-2)", fontSize: 13 }}>Niciun bilet vândut.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
