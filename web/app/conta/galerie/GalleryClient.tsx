"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { GALLERY_TYPES, galleryPhotoUrl, type GalleryPhoto } from "@/lib/gallery";
import { GalleryUploadError, uploadGalleryFile } from "@/lib/gallery-upload";
import { deleteGalleryPhoto, finalizeGalleryUpload, prepareGalleryUpload } from "./actions";
import styles from "./gallery.module.css";

type PendingPhoto = {
  id: string; file: File; mimeType: string; percent: number;
  status: "waiting" | "preparing" | "uploading" | "publishing" | "done" | "error";
  error?: string; ticket?: string; sessionUrl?: string; uploaded?: boolean;
};
const formatDate = (value: string) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" }).format(new Date(value));

export function GalleryClient({ photos, connected }: { photos: GalleryPhoto[]; connected: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [queue, setQueue] = useState<PendingPhoto[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  function chooseFiles(files: FileList | null) {
    if (!files || controller.current) return;
    const extensions: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heic: "image/heic", heif: "image/heif" };
    const entries: PendingPhoto[] = Array.from(files).map((file) => {
      const mimeType = file.type || extensions[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
      const supported = (GALLERY_TYPES as readonly string[]).includes(mimeType) && file.size > 0;
      return { id: crypto.randomUUID(), file, mimeType, percent: 0, status: supported ? "waiting" : "error",
        error: supported ? undefined : "Format neacceptat sau fișier gol." };
    });
    setQueue((current) => [...current, ...entries]);
    setMessage("");
    if (input.current) input.current.value = "";
  }

  function update(id: string, values: Partial<PendingPhoto>) {
    setQueue((current) => current.map((entry) => entry.id === id ? { ...entry, ...values } : entry));
  }

  async function startUpload() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setMessage("");
    let completed = 0;
    try {
      for (const entry of queue.filter((item) => item.status !== "done")) {
        if (abort.signal.aborted) break;
        update(entry.id, { status: "preparing", error: undefined });
        try {
          let { ticket, sessionUrl } = entry;
          if (!ticket || !sessionUrl) {
            const prepared = await prepareGalleryUpload({ fileName: entry.file.name, mimeType: entry.mimeType, size: entry.file.size, caption });
            if (!prepared.ok) throw new Error(prepared.error);
            ({ ticket, sessionUrl } = prepared);
            update(entry.id, { ticket, sessionUrl });
          }
          abort.signal.throwIfAborted();
          let saved: Awaited<ReturnType<typeof finalizeGalleryUpload>> | undefined;
          if (!entry.uploaded) {
            update(entry.id, { status: "uploading" });
            try {
              await uploadGalleryFile(entry.file, sessionUrl, (percent) => update(entry.id, { percent }), abort.signal);
            } catch (error) {
              abort.signal.throwIfAborted();
              // Drive may have saved the original even if its final response was
              // lost. Verify that same file before offering a fresh upload.
              update(entry.id, { status: "publishing" });
              saved = await finalizeGalleryUpload(ticket).catch(() => undefined);
              if (!saved?.ok) throw error;
            }
            update(entry.id, { uploaded: true });
          }
          update(entry.id, { status: "publishing" });
          saved ??= await finalizeGalleryUpload(ticket);
          if (!saved.ok) throw new Error(saved.error);
          update(entry.id, { status: "done", percent: 100 });
          completed++;
        } catch (error) {
          update(entry.id, { status: "error", error: abort.signal.aborted ? "Încărcare oprită. Poți relua." : error instanceof Error ? error.message : "Încărcarea nu a reușit.",
            ...(error instanceof GalleryUploadError && error.expired ? { ticket: undefined, sessionUrl: undefined, uploaded: false, percent: 0 } : {}) });
        }
      }
      if (completed) { setMessage(`${completed} ${completed === 1 ? "poză adăugată" : "poze adăugate"} în galerie.`); router.replace(pathname, { scroll: false }); router.refresh(); }
    } finally { controller.current = null; setBusy(false); }
  }

  return <>
    <section className={styles.upload} aria-labelledby="gallery-upload-title">
      <div><ImagePlus size={24} aria-hidden="true" /><h2 id="gallery-upload-title">Adaugă amintirile tale</h2><p>{connected ? "Pozele se păstrează la dimensiunea originală, fără limită de mărime impusă de SavaPass. Se aplică spațiul disponibil și limitele Google Drive." : "Board-ul pregătește conexiunea Google Drive. Vei putea adăuga poze imediat ce este conectat."}</p></div>
      {connected && <>
        <input ref={input} type="file" multiple accept={GALLERY_TYPES.join(",") + ",.heic,.heif"} hidden aria-label="Alege fotografii" onChange={(event) => chooseFiles(event.target.files)} disabled={busy} />
        <button className={styles.primary} type="button" onClick={() => input.current?.click()} disabled={busy}><Upload size={17} /> Alege poze</button>
        {queue.length > 0 && <div className={styles.uploadDetails}>
          <label htmlFor="gallery-caption">Descriere pentru pozele alese <span>(opțional)</span></label>
          <textarea id="gallery-caption" maxLength={300} rows={2} value={caption} onChange={(event) => setCaption(event.target.value)} disabled={busy} placeholder="O zi pe care vrem să o ținem minte…" />
          <ul className={styles.queue}>{queue.map((entry) => <li key={entry.id}>
            <div><strong>{entry.file.name}</strong><span role={entry.error ? "alert" : undefined}>{entry.status === "done" ? "Adăugată" : entry.status === "preparing" ? "Se pregătește…" : entry.status === "publishing" ? "Se publică…" : entry.error ?? (entry.status === "waiting" ? "Pregătită pentru încărcare" : `Se încarcă… ${entry.percent}%`)}</span></div>
            {entry.status === "uploading" && <progress max={100} value={entry.percent} aria-label={`Încărcare ${entry.file.name}`} />}
            {!busy && <button type="button" className={styles.iconButton} aria-label={`Elimină ${entry.file.name} din listă`} onClick={() => setQueue((current) => current.filter((item) => item.id !== entry.id))}><X size={17} /></button>}
          </li>)}</ul>
          <div className={styles.actions}>
            {queue.some((entry) => entry.status !== "done") && <button type="button" className={styles.primary} disabled={busy} onClick={startUpload}>{busy ? "Se încarcă…" : queue.some((entry) => entry.status === "error") ? "Reîncearcă încărcarea" : "Încarcă pozele"}</button>}
            {busy && <button type="button" className={styles.secondary} onClick={() => controller.current?.abort()}>Oprește</button>}
          </div>
        </div>}
      </>}
    </section>
    <p className={styles.status} role="status" aria-live="polite">{message}</p>
    <section aria-label="Fotografiile comunității">
      {photos.length ? <div className={styles.grid}>{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onOpen={() => setSelected(photo)} onDeleted={() => router.refresh()} />)}</div>
        : <div className={styles.empty}><ImagePlus size={36} aria-hidden="true" /><h2>Prima amintire poate fi a ta.</h2><p>Pozele adăugate vor apărea aici pentru toată comunitatea.</p></div>}
    </section>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} aria-label="Fotografie din galerie">
      {selected && <>
        <button type="button" autoFocus className={styles.close} aria-label="Închide fotografia" onClick={() => setSelected(null)}><X /></button>
        <PhotoImage key={selected.id} photo={selected} large />
        <div className={styles.dialogInfo}><strong>{selected.caption || `Fotografie de ${selected.uploaderName}`}</strong><p>{selected.uploaderName} · {formatDate(selected.createdAt)}</p><a className={styles.secondary} href={`${galleryPhotoUrl(selected.id)}?download=1`}><Download size={17} /> Descarcă originalul</a></div>
      </>}
    </dialog>
  </>;
}

function PhotoImage({ photo, large = false }: { photo: GalleryPhoto; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={styles.imageFallback}>Previzualizarea nu este disponibilă încă. Originalul poate fi descărcat.</span>;
  return <Image src={galleryPhotoUrl(photo.id, true)} alt={photo.caption || `Fotografie adăugată de ${photo.uploaderName}`} width={photo.width ?? 640} height={photo.height ?? 480}
    className={large ? styles.largeImage : styles.photoImage} unoptimized onError={() => setFailed(true)} />;
}

function PhotoCard({ photo, onOpen, onDeleted }: { photo: GalleryPhoto; onOpen: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setPending(true); setError("");
    try {
      const result = await deleteGalleryPhoto(photo.id);
      if (!result.ok) setError(result.error);
      else onDeleted();
    } catch { setError("Poza nu a putut fi eliminată. Reîncearcă."); }
    finally { setPending(false); setConfirm(false); }
  }
  return <article className={styles.card}>
    <button className={styles.photoButton} type="button" aria-label={`Deschide fotografia de ${photo.uploaderName}`} onClick={onOpen}><PhotoImage photo={photo} /></button>
    <div className={styles.cardInfo}>{photo.caption && <p>{photo.caption}</p>}<strong>{photo.uploaderName}</strong><time dateTime={photo.createdAt}>{formatDate(photo.createdAt)}</time>
      {photo.canDelete && <div className={styles.deleteArea}>{confirm ? <><span>Elimini poza din galerie?</span><button className={styles.secondary} disabled={pending} onClick={remove}>{pending ? "Se elimină…" : "Da, elimină"}</button><button className={styles.textLink} disabled={pending} onClick={() => setConfirm(false)}>Renunță</button></> : <button className={styles.textLink} type="button" onClick={() => setConfirm(true)}><Trash2 size={14} /> Șterge</button>}</div>}
      {error && <p role="alert">{error}</p>}
    </div>
  </article>;
}
