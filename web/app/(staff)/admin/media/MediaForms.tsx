"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, FolderUp, Pin, RotateCcw, Save, Sparkles, Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { MediaAsset } from "@/lib/supabase/types";
import {
  archiveMediaAsset,
  finalizeMediaUpload,
  prepareMediaUpload,
  recommendMediaPlacement,
  saveManualMediaPlacement,
  updateMediaAsset,
  type MediaActionState,
} from "./actions";
import { MEDIA_CATEGORIES, MEDIA_ORIENTATIONS, sourceLabel } from "./media-options";

const SOURCE_OPTIONS = [
  ["real_photo", "Fotografie reală"],
  ["edited_photo", "Fotografie editată"],
  ["higgsfield", "Generat cu Higgsfield"],
  ["fallback", "Imagine fallback"],
] as const;

const initial: MediaActionState = {};

function ActionStatus({ state }: { state: MediaActionState }) {
  return <p className={state.error ? "media-action-state is-error" : "media-action-state"} role="status" aria-live="polite">{state.error ?? state.message}</p>;
}

export function MediaUploadForm() {
  const router = useRouter();
  const [state, setState] = useState<MediaActionState>(initial);
  const [pending, setPending] = useState(false);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!files.length) {
      setState({ error: "Alege cel puțin un fișier." });
      return;
    }
    if (files.some((file) => file.size > 25 * 1024 * 1024)) {
      setState({ error: "Fiecare fișier poate avea maximum 25 MB." });
      return;
    }
    if (files.reduce((sum, file) => sum + file.size, 0) > 60 * 1024 * 1024) {
      setState({ error: "Un import poate avea maximum 60 MB." });
      return;
    }

    setPending(true);
    setState({ message: "Se încarcă și se verifică fișierele…" });
    const supabase = createClient();
    let uploaded = 0;
    let duplicates = 0;
    const failures: string[] = [];

    try {
      for (const file of files) {
        const prepared = await prepareMediaUpload({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        });
        if (!prepared.ok) {
          failures.push(`${file.name}: ${prepared.error}`);
          continue;
        }

        const { error: uploadError } = await supabase.storage
          .from("media-staging")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) {
          failures.push(`${file.name}: încărcarea directă a eșuat`);
          continue;
        }

        const finalized = await finalizeMediaUpload({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          stagingPath: prepared.path,
          sourceKind: String(formData.get("source_kind") ?? "real_photo"),
          category: String(formData.get("category") ?? "General"),
          orientation: String(formData.get("orientation") ?? "landscape"),
          tags: String(formData.get("tags") ?? ""),
          subjects: String(formData.get("subjects") ?? ""),
          mood: String(formData.get("mood") ?? ""),
          altText: String(formData.get("alt_text") ?? ""),
          cropSafe: formData.get("crop_safe") === "on",
          facesVisible: formData.get("faces_visible") === "on",
          multiple: files.length > 1,
        });
        if (finalized.error) failures.push(`${file.name}: ${finalized.error}`);
        else if (finalized.duplicate) duplicates += 1;
        else uploaded += 1;
      }

      if (!uploaded && failures.length) {
        setState({ error: failures.slice(0, 3).join("; ") });
      } else {
        setState({
          ok: true,
          message: `${uploaded} fișier${uploaded === 1 ? "" : "e"} adăugat${uploaded === 1 ? "" : "e"}${duplicates ? `, ${duplicates} duplicate ignorate` : ""}${failures.length ? `, ${failures.length} erori` : ""}.`,
        });
        form.reset();
        router.refresh();
      }
    } catch {
      setState({ error: "Importul a fost întrerupt. Încearcă din nou." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="media-upload">
      <div className="media-field media-field--wide">
        <label htmlFor="media-files">Fișiere sau selecție multiplă</label>
        <input id="media-files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple required />
        <small>Imaginile sunt rotite, redimensionate la maximum 2000 px și salvate WebP.</small>
      </div>
      <details className="media-folder-import media-field--wide">
        <summary><FolderUp size={15} /> Importă un folder</summary>
        <label className="media-field">
          <span>Folder local</span>
          <input name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" multiple {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} />
        </label>
      </details>
      <label className="media-field"><span>Sursă</span><select name="source_kind" defaultValue="real_photo">{SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="media-field"><span>Categorie</span><select name="category" defaultValue="General">{MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="media-field"><span>Format așteptat pentru video</span><select name="orientation" defaultValue="landscape">{MEDIA_ORIENTATIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="media-field"><span>Taguri, separate prin virgulă</span><input name="tags" placeholder="eveniment, grup, scenă" /></label>
      <label className="media-field"><span>Subiecte</span><input name="subjects" placeholder="membri, public, voluntari" /></label>
      <label className="media-field"><span>Stare vizuală</span><input name="mood" placeholder="energic, cald, documentar" /></label>
      <label className="media-field media-field--wide"><span>Text alternativ de bază</span><input name="alt_text" placeholder="Membri Interact colaborând la un eveniment" /></label>
      <label className="media-check"><input type="checkbox" name="crop_safe" defaultChecked /><span>Sigur pentru crop</span></label>
      <label className="media-check"><input type="checkbox" name="faces_visible" /><span>Fețe vizibile</span></label>
      <div className="media-form-foot media-field--wide">
        <ActionStatus state={state} />
        <button type="submit" disabled={pending} className="media-primary pressable"><Upload size={15} />{pending ? "Se procesează…" : "Adaugă în bibliotecă"}</button>
      </div>
    </form>
  );
}

interface PlacementContext {
  pageType: string;
  slot: string;
  targetId: string;
  category: string;
  orientation: string;
  tags: string;
  mood: string;
  preferFaces: boolean;
  needsSafeCrop: boolean;
}

function PlacementHiddenFields({ context }: { context: PlacementContext }) {
  return <>
    <input type="hidden" name="page_type" value={context.pageType} />
    <input type="hidden" name="slot" value={context.slot} />
    <input type="hidden" name="target_id" value={context.targetId} />
    <input type="hidden" name="category" value={context.category} />
    <input type="hidden" name="orientation" value={context.orientation} />
    <input type="hidden" name="tags" value={context.tags} />
    <input type="hidden" name="mood" value={context.mood} />
  </>;
}

export function AutoPlacementForm({ context }: { context: PlacementContext }) {
  const [state, action, pending] = useActionState(recommendMediaPlacement, initial);
  return <form action={action} className="media-placement-action">
    <PlacementHiddenFields context={context} />
    {context.preferFaces ? <input type="hidden" name="prefer_faces" value="on" /> : null}
    {context.needsSafeCrop ? <input type="hidden" name="needs_safe_crop" value="on" /> : null}
    <ActionStatus state={state} />
    <button type="submit" disabled={pending} className="media-primary pressable"><Sparkles size={15} />{pending ? "Analizează…" : "Alege automat"}</button>
  </form>;
}

export function ManualPlacementForm({ context, assets, selectedId, autoSelect }: { context: PlacementContext; assets: Pick<MediaAsset, "id" | "file_name" | "source_kind">[]; selectedId?: string | null; autoSelect: boolean }) {
  const [state, action, pending] = useActionState(saveManualMediaPlacement, initial);
  return <form action={action} className="media-manual-form">
    <PlacementHiddenFields context={context} />
    <label className="media-field"><span>Înlocuiește cu</span><select name="selected_asset_id" defaultValue={selectedId ?? assets[0]?.id}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.file_name} · {sourceLabel(asset.source_kind)}</option>)}</select></label>
    <label className="media-check"><input type="checkbox" name="pin" /><span><Pin size={13} /> Fixează selecția</span></label>
    <label className="media-check"><input type="checkbox" name="auto_select" defaultChecked={autoSelect} /><span>Permite selecția automată viitoare</span></label>
    <ActionStatus state={state} />
    <button type="submit" disabled={pending} className="media-secondary pressable"><Save size={15} />{pending ? "Salvează…" : "Salvează selecția"}</button>
  </form>;
}

export function MediaAssetEditor({ asset }: { asset: MediaAsset }) {
  const [focalX, setFocalX] = useState(Number(asset.focal_x));
  const [focalY, setFocalY] = useState(Number(asset.focal_y));
  const [state, action, pending] = useActionState(updateMediaAsset, initial);
  const [archiveState, archiveAction, archiving] = useActionState(archiveMediaAsset, initial);
  const objectPosition = `${Math.round(focalX * 100)}% ${Math.round(focalY * 100)}%`;
  const isVideo = asset.mime_type.startsWith("video/");

  return <article className={`media-card${asset.archived ? " is-archived" : ""}${asset.excluded ? " is-excluded" : ""}`}>
    <div className="media-card-preview">
      {isVideo ? <video src={asset.public_url} muted controls preload="metadata" /> : <Image src={asset.public_url} alt={asset.alt_text} fill sizes="(max-width: 700px) 100vw, 360px" style={{ objectFit: "cover", objectPosition }} />}
      <span className={`media-source media-source--${asset.source_kind}`}>{sourceLabel(asset.source_kind)}</span>
      <span className="media-resolution">{asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mime_type}</span>
    </div>
    <details>
      <summary><span><b>{asset.file_name}</b><small>{asset.category} · {asset.orientation}</small></span><span>Editare</span></summary>
      <form action={action} className="media-meta-form">
        <input type="hidden" name="id" value={asset.id} />
        <label className="media-field"><span>Categorie</span><select name="category" defaultValue={asset.category}>{MEDIA_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="media-field"><span>Sursă</span><select name="source_kind" defaultValue={asset.source_kind}>{SOURCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}{asset.source_kind === "video" ? <option value="video">Video</option> : null}</select></label>
        <label className="media-field"><span>Orientare</span><select name="orientation" defaultValue={asset.orientation}>{MEDIA_ORIENTATIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="media-field"><span>Subiecte</span><input name="subjects" defaultValue={asset.subjects ?? ""} /></label>
        <label className="media-field"><span>Stare vizuală</span><input name="mood" defaultValue={asset.mood ?? ""} /></label>
        <label className="media-field"><span>Taguri</span><input name="tags" defaultValue={asset.tags.join(", ")} /></label>
        <label className="media-field media-field--wide"><span>Text alternativ</span><input name="alt_text" defaultValue={asset.alt_text} required /></label>
        <label className="media-field"><span>Calitate, 0–1</span><input name="quality_score" type="number" step="0.01" min="0" max="1" defaultValue={Number(asset.quality_score)} /></label>
        <label className="media-field"><span>Claritate, 0–1</span><input name="sharpness_score" type="number" step="0.01" min="0" max="1" defaultValue={Number(asset.sharpness_score ?? 0.5)} /></label>
        <div className="media-crop-lab media-field--wide">
          <div className="media-crop-row">
            <label><span>Focal X · {Math.round(focalX * 100)}%</span><input name="focal_x" type="range" min="0" max="1" step="0.01" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /></label>
            <label><span>Focal Y · {Math.round(focalY * 100)}%</span><input name="focal_y" type="range" min="0" max="1" step="0.01" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /></label>
          </div>
          {!isVideo ? <div className="media-crop-previews"><CropPreview asset={asset} position={objectPosition} label="Desktop 16:9" ratio="16 / 9" /><CropPreview asset={asset} position={objectPosition} label="Mobil 4:5" ratio="4 / 5" /></div> : null}
        </div>
        <label className="media-check"><input type="checkbox" name="crop_safe" defaultChecked={asset.crop_safe} /><span>Sigur pentru crop</span></label>
        <label className="media-check"><input type="checkbox" name="faces_visible" defaultChecked={asset.faces_visible} /><span>Fețe vizibile</span></label>
        <label className="media-check"><input type="checkbox" name="excluded" defaultChecked={asset.excluded} /><span>Exclude din recomandări</span></label>
        <div className="media-form-foot media-field--wide"><ActionStatus state={state} /><button type="submit" disabled={pending} className="media-primary pressable"><Save size={14} />{pending ? "Salvează…" : "Salvează"}</button></div>
      </form>
      <form action={archiveAction} className="media-archive-form">
        <input type="hidden" name="id" value={asset.id} />
        <input type="hidden" name="archived" value={asset.archived ? "false" : "true"} />
        <ActionStatus state={archiveState} />
        <button type="submit" disabled={archiving} className="media-danger pressable">{asset.archived ? <RotateCcw size={14} /> : <Archive size={14} />}{asset.archived ? "Restaurează" : "Arhivează"}</button>
      </form>
    </details>
  </article>;
}

function CropPreview({ asset, position, label, ratio }: { asset: MediaAsset; position: string; label: string; ratio: string }) {
  return <figure style={{ aspectRatio: ratio }}><Image src={asset.public_url} alt="" fill sizes="260px" style={{ objectFit: "cover", objectPosition: position }} /><figcaption>{label}</figcaption></figure>;
}
