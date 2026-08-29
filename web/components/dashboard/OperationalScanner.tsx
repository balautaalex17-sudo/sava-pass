"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Keyboard,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { formatDateTime } from "@/lib/dashboard/format";

type ScannerMode = "attendance" | "tickets";
type CameraState =
  | "not_requested"
  | "requesting"
  | "running"
  | "paused"
  | "denied"
  | "missing"
  | "busy"
  | "unsupported"
  | "error";

interface ScanTicket {
  id: string;
  status: string;
  holderName: string;
  holderEmail: string;
  code: string;
  eventName: string;
  eventStartsAt: string | null;
  ticketType: string;
  priceBani: number;
  reservationCreatedAt: string;
  paymentConfirmedAt: string | null;
  checkedInAt: string | null;
}

interface ScanResponse {
  result: string;
  message: string;
  member_name?: string;
  member_avatar_url?: string | null;
  membership_status?: string;
  meeting_name?: string;
  checked_in_at?: string;
  confirmed_by?: string | null;
  ticket?: ScanTicket;
}

interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

interface NativeBarcodeDetectorConstructor {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const positiveResults = new Set(["accepted", "payment_confirmed"]);
const warningResults = new Set([
  "already_present",
  "already_checked_in",
  "reservation_found",
  "valid_ticket",
  "payment_required",
  "already_paid",
]);

function cameraMessage(state: CameraState): string {
  const messages: Record<CameraState, string> = {
    not_requested: "Camera nu a fost pornită încă.",
    requesting: "Se solicită accesul la cameră...",
    running: "Ține codul QR în interiorul cadrului.",
    paused: "Scanerul este pus pe pauză.",
    denied: "Accesul la cameră a fost refuzat. Permite camera din setările browserului, apoi încearcă din nou.",
    missing: "Nu a fost găsită nicio cameră compatibilă.",
    busy: "Camera este folosită de o altă aplicație. Închide acea aplicație și reîncearcă.",
    unsupported: "Browserul nu oferă acces compatibil la cameră. Folosește introducerea manuală.",
    error: "Camera s-a oprit temporar. Încearcă din nou sau introdu codul manual.",
  };
  return messages[state];
}

function scanInput(value: string) {
  const trimmed = value.trim();
  return trimmed.includes(".") ? { token: trimmed } : { code: trimmed };
}

export function OperationalScanner({
  mode,
  meeting,
}: {
  mode: ScannerMode;
  meeting?: { id: string; title: string };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const nativeTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const mutedRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000",
  );
  const resultRef = useRef<HTMLDivElement>(null);

  const [cameraState, setCameraState] = useState<CameraState>("not_requested");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [recent, setRecent] = useState<Array<ScanResponse & { at: string }>>([]);
  const meetingId = meeting?.id;

  const stopCamera = useCallback(() => {
    if (nativeTimerRef.current) window.clearTimeout(nativeTimerRef.current);
    nativeTimerRef.current = null;
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const feedback = useCallback((success: boolean) => {
    if (!mutedRef.current) {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          const context = new AudioContextCtor();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = success ? 720 : 210;
          gain.gain.setValueAtTime(0.08, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.15);
          oscillator.addEventListener("ended", () => void context.close());
        }
      } catch {}
    }
    if (!mutedRef.current && navigator.vibrate) navigator.vibrate(success ? 60 : [45, 45, 70]);
  }, []);

  const resumeScanning = useCallback(() => {
    processingRef.current = false;
    setResult(null);
    setCameraState(streamRef.current ? "running" : "not_requested");
  }, []);

  const scheduleResume = useCallback((delay = 1900) => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(resumeScanning, delay);
  }, [resumeScanning]);

  const showResult = useCallback((next: ScanResponse, keepPaused = false) => {
    setResult(next);
    setRecent((rows) => [{ ...next, at: new Date().toISOString() }, ...rows].slice(0, 8));
    setCameraState("paused");
    feedback(positiveResults.has(next.result));
    window.setTimeout(() => resultRef.current?.focus(), 0);
    if (!keepPaused) scheduleResume(next.result === "accepted" ? 1500 : 2200);
  }, [feedback, scheduleResume]);

  const processCode = useCallback(async (value: string, manual = false) => {
    if (processingRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const previous = lastScanRef.current;
    if (previous?.value === trimmed && Date.now() - previous.at < 2500) return;
    lastScanRef.current = { value: trimmed, at: Date.now() };
    processingRef.current = true;
    setCameraState("paused");

    const input = scanInput(trimmed);
    try {
      const endpoint = mode === "attendance"
        ? "/api/board/attendance/scan"
        : "/api/board/tickets/check-in";
      const body = mode === "attendance"
        ? {
            meetingId,
            token: trimmed,
            sessionId: sessionIdRef.current,
            manual,
          }
        : input;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as ScanResponse;
      showResult(data);
    } catch {
      showResult({ result: "error", message: "Conexiunea a eșuat. Verifică internetul și încearcă din nou." });
    }
  }, [meetingId, mode, showResult]);

  const startNativeDetector = useCallback(async (stream: MediaStream) => {
    const Detector = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) return false;
    try {
      const formats = Detector.getSupportedFormats ? await Detector.getSupportedFormats() : ["qr_code"];
      if (!formats.includes("qr_code")) return false;
      const detector = new Detector({ formats: ["qr_code"] });
      const detect = async () => {
        if (!stream.active || !videoRef.current) return;
        if (!processingRef.current && videoRef.current.readyState >= 2) {
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes.find((code) => code.rawValue)?.rawValue;
            if (value) void processCode(value);
          } catch {}
        }
        nativeTimerRef.current = window.setTimeout(detect, 130);
      };
      void detect();
      return true;
    } catch {
      return false;
    }
  }, [processCode]);

  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }
    setCameraState("requesting");
    setResult(null);
    processingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("video_missing");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === "videoinput");
      setDevices(cameras);
      const activeTrack = stream.getVideoTracks()[0];
      const settings = activeTrack?.getSettings();
      if (settings?.deviceId) setSelectedDevice(settings.deviceId);
      const capabilities = activeTrack?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(Boolean(capabilities?.torch));

      const nativeStarted = await startNativeDetector(stream);
      if (!nativeStarted) {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 110,
          delayBetweenScanSuccess: 800,
        });
        controlsRef.current = await reader.decodeFromStream(
          stream,
          videoRef.current,
          (decoded) => {
            if (decoded && !processingRef.current) void processCode(decoded.getText());
          },
        );
      }
      setCameraState("running");
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") setCameraState("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setCameraState("missing");
      else if (name === "NotReadableError" || name === "AbortError") setCameraState("busy");
      else setCameraState("error");
    }
  }, [processCode, startNativeDetector, stopCamera]);

  useEffect(() => () => {
    stopCamera();
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
  }, [stopCamera]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  const tone = result
    ? positiveResults.has(result.result)
      ? "success"
      : warningResults.has(result.result)
        ? "warning"
        : "danger"
    : "neutral";

  return (
    <div className="operational-scanner">
      <section className="scanner-camera-panel" aria-label="Cameră scaner">
        {meeting && <div className="scanner-context"><div><span>Întâlnire selectată</span><strong>{meeting.title}</strong></div><Link href="/board/scaneaza-prezenta">Schimbă</Link></div>}
        <div className="scanner-preview">
          <video ref={videoRef} muted playsInline aria-label="Imagine live de la cameră" />
          <div className="scanner-reticle" aria-hidden="true"><span /><span /><span /><span /></div>
          {cameraState !== "running" && (
            <div className="scanner-camera-state"><CameraOff size={28} /><p>{cameraMessage(cameraState)}</p>{["not_requested", "denied", "missing", "busy", "error"].includes(cameraState) && <button type="button" className="dash-button" onClick={() => void startCamera(selectedDevice || undefined)}><Camera size={17} /> Pornește camera</button>}{cameraState === "requesting" && <LoaderCircle className="scanner-spin" size={24} />}</div>
          )}
        </div>
        <div className="scanner-controls">
          <label><span className="sr-only">Camera folosită</span><select value={selectedDevice} onChange={(event) => { setSelectedDevice(event.target.value); void startCamera(event.target.value); }} disabled={devices.length < 2}>{devices.length ? devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>) : <option value="">Camera din spate</option>}</select></label>
          <button type="button" onClick={() => cameraState === "running" ? (stopCamera(), setCameraState("paused")) : void startCamera(selectedDevice || undefined)} aria-label={cameraState === "running" ? "Oprește scanerul" : "Pornește scanerul"}>{cameraState === "running" ? <Pause size={18} /> : <Play size={18} />}{cameraState === "running" ? "Oprește" : "Pornește"}</button>
          <button type="button" disabled={!torchSupported} onClick={() => void toggleTorch()} aria-label={torchOn ? "Oprește lanterna" : "Pornește lanterna"}>{torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />} Lanternă</button>
          <button type="button" onClick={() => { const next = !muted; setMuted(next); mutedRef.current = next; }} aria-label={muted ? "Pornește sunetul" : "Oprește sunetul"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />} Sunet</button>
        </div>
      </section>

      <aside className="scanner-result-panel">
        <div className="scanner-live-status" role="status" aria-live="polite">{result ? result.message : cameraMessage(cameraState)}</div>
        {result ? (
          <div ref={resultRef} tabIndex={-1} className={`scanner-result scanner-result--${tone}`}>
            {tone === "success" ? <CheckCircle2 size={34} /> : tone === "warning" ? <RotateCcw size={34} /> : <XCircle size={34} />}
            <h2>{result.message}</h2>
            {mode === "attendance" && result.member_name && <div className="scanner-person"><div className="dash-initials">{result.member_name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</div><div><strong>{result.member_name}</strong><span>{result.meeting_name}</span></div></div>}
            {result.checked_in_at && <p>Confirmat la <strong>{formatDateTime(result.checked_in_at)}</strong>{result.confirmed_by ? ` de ${result.confirmed_by}` : ""}</p>}
            {result.ticket && <TicketResult ticket={result.ticket} />}
            <button type="button" className="scanner-next" onClick={resumeScanning}><RotateCcw size={16} /> Scanează următorul</button>
          </div>
        ) : (
          <div className="scanner-ready"><ScanIcon mode={mode} /><h2>Pregătit pentru scanare</h2><p>{mode === "attendance" ? "Codurile de membru sunt validate pentru întâlnirea selectată." : "O scanare confirmă plata cash și intrarea, într-un singur pas."}</p></div>
        )}

        <form className="scanner-manual" onSubmit={(event) => { event.preventDefault(); void processCode(manualCode, true); setManualCode(""); }}><label htmlFor={`manual-${mode}`}><Keyboard size={16} /> Introducere manuală</label><div><input id={`manual-${mode}`} value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder={mode === "tickets" ? "Cod bilet sau token QR" : "Tokenul codului QR"} autoComplete="off" /><button type="submit" disabled={!manualCode.trim()}>Verifică</button></div></form>

        <section className="scanner-recent" aria-labelledby={`recent-${mode}`}><h3 id={`recent-${mode}`}>Scanări recente</h3>{recent.length ? <ol>{recent.map((item, index) => <li key={`${item.at}-${index}`}><span className={`scanner-dot scanner-dot--${positiveResults.has(item.result) ? "success" : warningResults.has(item.result) ? "warning" : "danger"}`} /><div><strong>{item.member_name ?? item.ticket?.holderName ?? item.message}</strong><span>{item.message}</span></div><time>{new Date(item.at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></li>)}</ol> : <p>Nicio scanare în această sesiune.</p>}</section>
      </aside>
    </div>
  );
}

function TicketResult({ ticket }: { ticket: ScanTicket }) {
  return <dl className="scanner-ticket-details"><div><dt>Participant</dt><dd>{ticket.holderName}</dd></div><div><dt>Eveniment</dt><dd>{ticket.eventName}</dd></div><div><dt>Tip bilet</dt><dd>{ticket.ticketType}</dd></div><div><dt>Cod</dt><dd>{ticket.code}</dd></div><div><dt>Rezervat</dt><dd>{formatDateTime(ticket.reservationCreatedAt)}</dd></div><div><dt>Valoare</dt><dd>{(ticket.priceBani / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" })}</dd></div></dl>;
}

function ScanIcon({ mode }: { mode: ScannerMode }) {
  return mode === "attendance" ? <Camera size={30} /> : <Camera size={30} />;
}
