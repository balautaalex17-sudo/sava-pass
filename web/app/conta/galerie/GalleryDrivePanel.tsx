/* eslint-disable @next/next/no-html-link-for-pages -- OAuth needs a full document navigation. */
"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { FolderOpen, Unplug } from "lucide-react";
import { disconnectGalleryDrive } from "./actions";
import styles from "./gallery.module.css";

type Connection = { accountEmail: string; folderId: string; connectedAt: string };

export function GalleryDrivePanel({ connection, configured }: { connection: Connection | null; configured: boolean }) {
  const [confirming, setConfirming] = useState<Connection | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removedAt, setRemovedAt] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const connect = useRef<HTMLAnchorElement>(null);
  const busy = useRef(false);
  const confirmationId = useId();
  const activeConnection = connection?.connectedAt === removedAt ? null : connection;

  useEffect(() => { if (confirming) cancel.current?.focus(); }, [confirming]);
  useEffect(() => { if (removedAt) connect.current?.focus(); }, [removedAt]);

  function dismiss() {
    if (busy.current) return;
    setConfirming(null);
    setError("");
    trigger.current?.focus();
  }

  function remove() {
    if (!confirming || busy.current) return;
    const confirmed = confirming;
    busy.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await disconnectGalleryDrive({ accountEmail: confirmed.accountEmail, connectedAt: confirmed.connectedAt });
        if (!result.ok) { setError(result.error); return; }
        setRemovedAt(confirmed.connectedAt);
        setMessage(result.message);
        setConfirming(null);
      } catch {
        setError("Contul nu a putut fi eliminat. Verifică conexiunea și încearcă din nou.");
      } finally { busy.current = false; }
    });
  }

  return (
    <section className={styles.connection} aria-label="Conexiune Google Drive" aria-busy={pending}>
      <div><strong><FolderOpen size={18} aria-hidden="true" /> Google Drive</strong>
        <p>{activeConnection ? `Conectat la ${activeConnection.accountEmail}` : "Conectează contul clubului. Creăm automat un folder privat pentru galerie."}</p>
      </div>
      {configured ? <a ref={connect} className={styles.secondary} href="/api/gallery/drive/connect"
        aria-disabled={pending || undefined} onClick={(event) => { if (busy.current) event.preventDefault(); }}>
        {activeConnection ? "Reconectează" : "Conectează Google Drive"}
      </a> : <span className={styles.muted}>Configurarea Google este în așteptare.</span>}
      {activeConnection && <>
        <a className={styles.textLink} href={`https://drive.google.com/drive/folders/${encodeURIComponent(activeConnection.folderId)}`} target="_blank" rel="noreferrer">Deschide folderul</a>
        <button ref={trigger} type="button" className={`${styles.secondary} ${styles.disconnectButton}`} disabled={pending}
          aria-expanded={Boolean(confirming)} aria-controls={confirming ? confirmationId : undefined}
          onClick={() => { setConfirming(activeConnection); setMessage(""); }}>
          <Unplug size={16} aria-hidden="true" /> Elimină contul
        </button>
      </>}
      {confirming && activeConnection && <div id={confirmationId} className={styles.connectionConfirmation}
        role="group" aria-labelledby={`${confirmationId}-title`} onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}>
        <strong id={`${confirmationId}-title`}>Elimini contul {confirming.accountEmail} din galerie?</strong>
        <p>Pozele rămân în Google Drive. Afișarea, descărcarea și încărcarea în galerie necesită un cont conectat cu acces la ele. Un alt cont nu primește automat acces la pozele existente.</p>
        <div className={styles.connectionConfirmationActions}>
          <button ref={cancel} type="button" className={styles.secondary} disabled={pending} onClick={dismiss}>Renunță</button>
          <button type="button" className={`${styles.secondary} ${styles.disconnectButton}`} disabled={pending} onClick={remove}>
            {pending ? "Se elimină…" : "Da, elimină contul"}
          </button>
        </div>
        {error && <p className={styles.connectionError} role="alert">{error}</p>}
      </div>}
      {message && <p className={styles.connectionMessage} role="status">{message}</p>}
    </section>
  );
}
