"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

type QrState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; qr: string; expiresAt: string; refreshAfterSeconds: number };

export function MemberQrCard({
  fullName,
  membershipStatus,
  compact = false,
  initialQr = null,
}: {
  fullName: string;
  membershipStatus: string;
  compact?: boolean;
  initialQr?: { qr: string; expiresAt: string; refreshAfterSeconds: number } | null;
}) {
  const [state, setState] = useState<QrState>(() => initialQr ? { status: "ready", ...initialQr } : { status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  const loadQr = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setRefreshing(true);
    try {
      const response = await fetch("/api/member/qr", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || typeof data.qr !== "string"
        || !Number.isFinite(Date.parse(data.expiresAt))
        || typeof data.refreshAfterSeconds !== "number" || data.refreshAfterSeconds <= 0) {
        throw new Error(typeof data.error === "string" ? data.error : "Codul QR nu a putut fi încărcat.");
      }
      setState({
        status: "ready",
        qr: data.qr,
        expiresAt: data.expiresAt,
        refreshAfterSeconds: data.refreshAfterSeconds,
      });
    } catch (error) {
      setState({
        status: "error",
        message: controller.signal.aborted
          ? "Conexiunea durează prea mult. Încearcă din nou."
          : error instanceof Error ? error.message : "Codul QR nu a putut fi încărcat.",
      });
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = null;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  useEffect(() => {
    if (initialQr && new Date(initialQr.expiresAt).getTime() > Date.now()) return;
    const initialLoad = window.setTimeout(() => void loadQr(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadQr, initialQr]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const timer = window.setTimeout(
      () => void loadQr(),
      // A restored page can contain an older code. Refresh before its actual expiry.
      Math.max(0, Math.min(state.refreshAfterSeconds * 1000, new Date(state.expiresAt).getTime() - Date.now() - 15_000)),
    );
    return () => window.clearTimeout(timer);
  }, [loadQr, state]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void loadQr();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [loadQr]);

  return (
    <section className={`member-qr-card${compact ? " member-qr-card--compact" : ""}`} aria-labelledby="member-qr-title">
      <div className="member-qr-copy">
        <span className="dash-eyebrow"><ShieldCheck size={15} /> Identificare securizată</span>
        <h2 id="member-qr-title">Codul meu QR</h2>
        <p>Arată acest cod unui membru board. Nu îți poți confirma singur prezența.</p>
      </div>

      <div className="member-qr-frame" aria-live="polite" aria-busy={state.status === "loading" || refreshing}>
        {state.status === "loading" && <div className="member-qr-skeleton"><span>Se generează codul...</span></div>}
        {state.status === "error" && (
          <div className="member-qr-error" role="alert"><p>{state.message}</p><button type="button" disabled={refreshing} onClick={() => void loadQr()}><RefreshCw size={17} /> {refreshing ? "Se încarcă…" : "Reîncearcă"}</button></div>
        )}
        {state.status === "ready" && (
          // Server-generated raster image. The data URL never contains personal data.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.qr} alt="Cod QR temporar pentru confirmarea prezenței" width={720} height={720} />
        )}
      </div>

      <div className="member-qr-identity">
        <div className="dash-initials" aria-hidden="true">{fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
        <div><strong>{fullName}</strong><span>{membershipStatus === "active" ? "Membru activ" : membershipStatus === "recruit" ? "Recrut" : membershipStatus}</span></div>
        {state.status === "ready" && <button type="button" disabled={refreshing} onClick={() => void loadQr()} aria-label={refreshing ? "Se reîncarcă codul QR" : "Reîncarcă codul QR"}><RefreshCw size={17} className={refreshing ? "scanner-spin" : undefined} /></button>}
      </div>
      <p className="member-qr-note">Codul se reînnoiește automat și nu conține numele, emailul sau ID-ul contului tău.</p>
    </section>
  );
}
