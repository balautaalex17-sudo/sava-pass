"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle, LayoutDashboard, RotateCcw, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { scanTicket, scanTicketByCode, type ScanVerdict } from "./actions";

type ScanState = "idle" | "scanning" | "result";
type ScannerControls = { stop: () => void };
type CameraDevice = { deviceId: string; label: string };
type QrCameraConstraintSet = MediaTrackConstraintSet & {
  focusMode?: "continuous";
  zoom?: number;
};
type QrCameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min?: number; max?: number; step?: number };
};

const VERDICT_COLORS: Record<string, string> = {
  ok: "var(--success)",
  already_in: "var(--warning)",
  already_used: "var(--warning)",
  void_ticket: "var(--danger)",
  invalid: "var(--danger)",
  inactive_event: "var(--danger)",
  unauthorized: "var(--danger)",
};

const VERDICT_LABELS: Record<string, string> = {
  ok: "Intrat",
  already_in: "Deja înăuntru",
  already_used: "Bilet folosit",
  void_ticket: "Bilet anulat",
  invalid: "Bilet invalid",
  inactive_event: "Eveniment inactiv",
  unauthorized: "Acces refuzat",
};

function prefersBackCamera() {
  if (typeof navigator === "undefined") return false;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const hasCoarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return isMobile || hasCoarsePointer;
}

function chooseInitialCamera(devices: CameraDevice[]) {
  if (devices.length === 0) return "";

  if (prefersBackCamera()) {
    const back = devices.find((device) => /back|rear|environment|spate/i.test(device.label));
    if (back) return back.deviceId;
  }

  const laptopCamera = devices.find((device) =>
    /integrated|facetime|front|user|camera/i.test(device.label) &&
    !/virtual|obs|snap|manycam/i.test(device.label)
  );

  return laptopCamera?.deviceId ?? devices[0].deviceId;
}

function buildQrVideoConstraints(deviceId: string): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    width: { ideal: 2560 },
    height: { ideal: 1440 },
    frameRate: { ideal: 30 },
  };

  if (deviceId) {
    constraints.deviceId = { exact: deviceId };
  } else {
    constraints.facingMode = { ideal: prefersBackCamera() ? "environment" : "user" };
  }

  return constraints;
}

async function tuneCameraForQr(video: HTMLVideoElement) {
  const stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
  const track = stream?.getVideoTracks()[0];
  if (!track?.getCapabilities) return "Camera activă";

  const capabilities = track.getCapabilities() as QrCameraCapabilities;
  const advanced: QrCameraConstraintSet[] = [];

  if (capabilities.focusMode?.includes("continuous")) {
    advanced.push({ focusMode: "continuous" });
  }

  if (capabilities.zoom?.max && capabilities.zoom.max > 1) {
    const minZoom = capabilities.zoom.min ?? 1;
    const targetZoom = Math.min(capabilities.zoom.max, Math.max(minZoom, 1.7));
    advanced.push({ zoom: targetZoom });
  }

  if (advanced.length === 0) return "Camera activă";

  try {
    await track.applyConstraints({ advanced });
    return capabilities.zoom?.max && capabilities.zoom.max > 1
      ? "Cameră optimizată pentru QR"
      : "Autofocus activ";
  } catch {
    return "Camera activă";
  }
}

function VerdictIcon({ result }: { result: string }) {
  const color = VERDICT_COLORS[result] ?? "var(--slate-400)";
  if (result === "ok") return <CheckCircle size={54} color={color} strokeWidth={1.75} />;
  if (result === "invalid" || result === "void_ticket") return <XCircle size={54} color={color} strokeWidth={1.75} />;
  return <AlertTriangle size={54} color={color} strokeWidth={1.75} />;
}

/** Returns the animation classes for the verdict circle and inner content wrapper */
function verdictAnimClasses(result: string): { circle: string; inner: string } {
  if (result === "ok") {
    return { circle: "anim-pop ring-pulse", inner: "anim-rise-fast" };
  }
  if (result === "already_in" || result === "already_used") {
    return { circle: "anim-pop", inner: "" };
  }
  // invalid / void_ticket / unauthorized / inactive_event
  return { circle: "anim-pop", inner: "anim-shake" };
}

export function ScannerClient({ isAdmin }: { isAdmin: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [verdict, setVerdict] = useState<ScanVerdict | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraHint, setCameraHint] = useState("Camera activă");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualPending, setManualPending] = useState(false);
  const lastTokenRef = useRef<string | null>(null);
  const scanCooldownRef = useRef(false);

  const loadCameras = useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      const mapped = videoDevices.map((device, index) => ({
        deviceId: device.deviceId ?? "",
        label: device.label || `Camera ${index + 1}`,
      }));

      setDevices(mapped);
      setSelectedDeviceId((current) => current || chooseInitialCamera(mapped));
      setCameraError(mapped.length === 0 ? "Nicio cameră disponibilă." : null);
    } catch {
      setCameraError("Nu am putut citi camerele disponibile.");
    }
  }, []);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const showVerdict = useCallback((nextVerdict: ScanVerdict) => {
    setVerdict(nextVerdict);
    setState("result");

    window.setTimeout(() => {
      setState("scanning");
      setVerdict(null);
      scanCooldownRef.current = false;
    }, 3000);
  }, []);

  const startScanner = useCallback(async (deviceId: string) => {
    if (!videoRef.current) return;

    try {
      stopScanner();
      setCameraError(null);
      setCameraHint("Pornesc camera cu rezoluție mare…");
      setState("idle");
      setVerdict(null);
      lastTokenRef.current = null;
      scanCooldownRef.current = false;

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 700,
        tryPlayVideoTimeout: 8000,
      });
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: buildQrVideoConstraints(deviceId),
      };

      controlsRef.current = await reader.decodeFromConstraints(constraints, videoRef.current, async (result) => {
        if (!result || scanCooldownRef.current) return;
        const text = result.getText();
        if (!text.startsWith("SP1.") || text === lastTokenRef.current) return;

        scanCooldownRef.current = true;
        lastTokenRef.current = text;

        const nextVerdict = await scanTicket(text);
        showVerdict(nextVerdict);
      });

      setCameraHint(await tuneCameraForQr(videoRef.current));
      setState("scanning");
    } catch {
      setState("idle");
      setCameraHint("Camera nu a pornit");
      setCameraError("Nu s-a putut accesa camera. Verifică permisiunile browserului.");
    }
  }, [showVerdict, stopScanner]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCameras();
    });
  }, [loadCameras]);

  useEffect(() => {
    if (devices.length === 0) return;

    queueMicrotask(() => {
      void startScanner(selectedDeviceId);
    });

    return () => {
      stopScanner();
    };
  }, [devices, selectedDeviceId, startScanner, stopScanner]);

  const activeDevice = devices.find((device) => device.deviceId === selectedDeviceId);
  const color = verdict ? (VERDICT_COLORS[verdict.result] ?? "var(--slate-400)") : "var(--im-cyan)";
  const statusLabel = manualPending ? "Verific…" : cameraError ? "Eroare cameră" : state === "scanning" ? "Scanează" : state === "result" ? "Rezultat" : "Pornire";
  const bottomMessage = cameraError
    ? "Camera nu este pornită. Verifică permisiunile și încearcă din nou."
    : manualPending
      ? "Verific codul introdus…"
    : state === "scanning"
      ? `${cameraHint}. Ține biletul mai departe și centrează QR-ul.`
      : state === "idle"
        ? "Pornesc camera…"
        : "Rezultat scanat.";

  async function optimizeCamera() {
    if (!videoRef.current) return;
    setCameraHint(await tuneCameraForQr(videoRef.current));
  }

  async function submitManualCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code || manualPending) return;

    setManualPending(true);
    scanCooldownRef.current = true;

    try {
      const nextVerdict = code.toUpperCase().startsWith("SP1.")
        ? await scanTicket(code)
        : await scanTicketByCode(code);

      if (nextVerdict.result !== "invalid") setManualCode("");
      showVerdict(nextVerdict);
    } finally {
      setManualPending(false);
    }
  }

  function retryScanner() {
    setCameraError(null);
    if (devices.length > 0) {
      void startScanner(selectedDeviceId);
    } else {
      void loadCameras();
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--im-ink)", color: "white", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(2,6,23,0.88)" }}>
        <Logo size={18} dark />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Scanner
          </span>
          {isAdmin && (
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", textDecoration: "none", padding: "7px 11px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
              <LayoutDashboard size={13} strokeWidth={1.75} />
              Admin
            </Link>
          )}
        </div>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 1180, margin: "0 auto", padding: "22px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 18, alignItems: "stretch" }}>
        <section style={{ minHeight: 520, position: "relative", borderRadius: 26, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(15,23,42,0.72)", boxShadow: "0 24px 80px rgba(0,0,0,0.36)" }}>
          <video
            ref={videoRef}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: state === "idle" && !cameraError ? 0.12 : 1, transform: "scaleX(-1)" }}
            autoPlay
            muted
            playsInline
          />

          {/* Legibility scrim over video — allowed per spec (over-video only, not page-level) */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,6,23,0.1) 0%, rgba(2,6,23,0.12) 50%, rgba(2,6,23,0.45) 100%)", pointerEvents: "none" }} />

          {state === "scanning" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: "min(42vw, 320px)", aspectRatio: "1", borderRadius: 28, boxShadow: "0 0 0 9999px rgba(2,6,23,0.45)", border: "2px solid rgba(255,255,255,0.34)", position: "relative" }}>
                {/* Scan line — uses global .anim-scanline, no glow box-shadow */}
                <div
                  className="anim-scanline"
                  style={{ position: "absolute", left: 18, right: 18, top: "50%", height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
                />
                {(["tl", "tr", "bl", "br"] as const).map((corner) => <CornerMark key={corner} pos={corner} color={color} />)}
              </div>
            </div>
          )}

          {cameraError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 28, background: "rgba(2,6,23,0.72)" }}>
              <Camera size={42} color="rgba(255,255,255,0.45)" strokeWidth={1.75} />
              <p style={{ color: "rgba(255,255,255,0.72)", textAlign: "center", fontSize: 14, margin: 0, maxWidth: 360, lineHeight: 1.5 }}>{cameraError}</p>
              <button type="button" onClick={retryScanner} className="pressable" style={buttonStyle}>
                <RotateCcw size={14} strokeWidth={1.75} />
                Reîncearcă
              </button>
            </div>
          )}

          {state === "result" && verdict && (() => {
            const anim = verdictAnimClasses(verdict.result);
            return (
              <div
                className="anim-fade"
                style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.86)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}
              >
                <div
                  className={anim.circle}
                  style={{ width: 96, height: 96, borderRadius: "50%", background: `${color}22`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", color }}
                >
                  <VerdictIcon result={verdict.result} />
                </div>
                <div className={anim.inner || undefined} style={{ textAlign: "center", animationDelay: anim.inner === "anim-rise-fast" ? "80ms" : undefined }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
                    {VERDICT_LABELS[verdict.result] ?? verdict.result}
                  </div>
                  {verdict.ticket && (
                    <>
                      <div style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", marginTop: 7 }}>{verdict.ticket.holder_name}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", color, marginTop: 5 }}>{verdict.ticket.code}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.88)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* Status dot — no glow box-shadow */}
              <span
                className={state === "scanning" && !cameraError ? "anim-pulse-dot" : undefined}
                style={{ width: 9, height: 9, borderRadius: 999, background: cameraError ? "var(--danger)" : state === "scanning" ? "var(--success)" : "var(--warning)", flexShrink: 0 }}
              />
              <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {bottomMessage}
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, flexShrink: 0 }}>
              {activeDevice?.label ?? "Camera"}
            </span>
          </div>
        </section>

        {/* Aside — solid dark, no blur */}
        <aside style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.88)", boxShadow: "0 18px 50px rgba(0,0,0,0.24)", padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(0,167,232,0.16)", color: "var(--im-cyan)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Video size={20} strokeWidth={1.75} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.03em" }}>Scanare bilete</h1>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.58)", margin: 0 }}>
              Pe laptop folosește camera integrată. Dacă browserul întreabă, permite accesul la cameră.
            </p>
          </div>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.09em" }}>Camera</span>
            <select
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
              disabled={devices.length === 0}
              style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(2,6,23,0.65)", color: "white", padding: "10px 12px", fontSize: 13, outline: "none" }}
            >
              {devices.length === 0 ? (
                <option key="no-camera" value="">Nicio cameră</option>
              ) : (
                devices.map((device, index) => (
                  <option key={`${device.deviceId || device.label || "camera"}-${index}`} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <button type="button" onClick={() => void loadCameras()} className="pressable" style={buttonStyle}>
            <RotateCcw size={14} strokeWidth={1.75} />
            Reîncarcă camerele
          </button>

          <button type="button" onClick={() => void optimizeCamera()} disabled={state !== "scanning"} className="pressable" style={{ ...buttonStyle, opacity: state === "scanning" ? 1 : 0.4 }}>
            <Camera size={14} strokeWidth={1.75} />
            Claritate QR
          </button>

          <form onSubmit={submitManualCode} style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.09em" }}>Cod manual</span>
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="QQ3SD8"
                style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(2,6,23,0.65)", color: "white", padding: "10px 12px", fontSize: 15, fontFamily: "var(--font-mono)", fontWeight: 800, letterSpacing: "0.1em", outline: "none", boxSizing: "border-box", transition: "border-color var(--dur-fast) ease" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--brand-cyan)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
              />
            </label>
            <button type="submit" disabled={!manualCode.trim() || manualPending} className="pressable" style={{ ...buttonStyle, opacity: manualCode.trim() && !manualPending ? 1 : 0.4 }}>
              <CheckCircle size={14} strokeWidth={1.75} />
              {manualPending ? "Verific…" : "Validează cod"}
            </button>
          </form>

          <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />

          <div style={{ display: "grid", gap: 10 }}>
            <InfoRow label="Status" value={statusLabel} />
            <InfoRow label="Camera activă" value={activeDevice?.label ?? "Neselectată"} />
            <InfoRow label="Claritate" value={cameraHint} />
            <InfoRow label="Cod acceptat" value="QR SavaPass SP1" />
          </div>
        </aside>
      </main>

      <style>{`
        @media (max-width: 860px) {
          main {
            grid-template-columns: 1fr !important;
            padding: 14px !important;
            padding-bottom: max(14px, env(safe-area-inset-bottom)) !important;
          }

          aside {
            order: -1;
          }

          section {
            min-height: 62dvh !important;
          }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.35 }}>{value}</span>
    </div>
  );
}

function CornerMark({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) {
  const top = pos.startsWith("t");
  const left = pos.endsWith("l");
  // Corner marks: 3px white, no drop-shadow glow; take verdict color during result
  const borderColor = "rgba(255,255,255,0.9)";
  void color; // color passed but corners stay white per spec (idle & scanning = white)
  return (
    <div style={{
      position: "absolute",
      top: top ? -2 : undefined,
      bottom: !top ? -2 : undefined,
      left: left ? -2 : undefined,
      right: !left ? -2 : undefined,
      width: 34,
      height: 34,
      borderTop: top ? `3px solid ${borderColor}` : undefined,
      borderBottom: !top ? `3px solid ${borderColor}` : undefined,
      borderLeft: left ? `3px solid ${borderColor}` : undefined,
      borderRight: !left ? `3px solid ${borderColor}` : undefined,
      borderTopLeftRadius: (top && left) ? 14 : 0,
      borderTopRightRadius: (top && !left) ? 14 : 0,
      borderBottomLeftRadius: (!top && left) ? 14 : 0,
      borderBottomRightRadius: (!top && !left) ? 14 : 0,
    }} />
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};
