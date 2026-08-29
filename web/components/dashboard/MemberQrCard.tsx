"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

type QrState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; qr: string; expiresAt: string; refreshAfterSeconds: number };

export function MemberQrCard({
  fullName,
  membershipStatus,
  compact = false,
}: {
  fullName: string;
  membershipStatus: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<QrState>({ status: "loading" });

  const loadQr = useCallback(async () => {
    try {
      const response = await fetch("/api/member/qr", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok || typeof data.qr !== "string") {
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
        message: error instanceof Error ? error.message : "Codul QR nu a putut fi încărcat.",
      });
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadQr(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadQr]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const timer = window.setTimeout(
      () => void loadQr(),
      Math.max(15, state.refreshAfterSeconds) * 1000,
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

      <div className="member-qr-frame" aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" && <div className="member-qr-skeleton"><span>Se generează codul...</span></div>}
        {state.status === "error" && (
          <div className="member-qr-error" role="alert"><p>{state.message}</p><button type="button" onClick={() => void loadQr()}><RefreshCw size={17} /> Reîncearcă</button></div>
        )}
        {state.status === "ready" && (
          // Server-generated raster image. The data URL never contains personal data.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.qr} alt="Cod QR temporar pentru confirmarea prezenței" width={720} height={720} />
        )}
      </div>

      <div className="member-qr-identity">
        <div className="dash-initials" aria-hidden="true">{fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
        <div><strong>{fullName}</strong><span>{membershipStatus === "active" ? "Membru activ" : membershipStatus}</span></div>
        {state.status === "ready" && <button type="button" onClick={() => void loadQr()} aria-label="Reîncarcă codul QR"><RefreshCw size={17} /></button>}
      </div>
      <p className="member-qr-note">Codul se reînnoiește automat și nu conține numele, emailul sau ID-ul contului tău.</p>
    </section>
  );
}
