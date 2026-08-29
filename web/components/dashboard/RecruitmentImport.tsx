"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle, UploadCloud, X } from "lucide-react";

interface PreviewField { key: string; label: string; source_header: string; }
interface PreviewData {
  importId: string;
  headers: string[];
  fields: PreviewField[];
  mapping: Record<string, string>;
  unmatchedHeaders: string[];
  rowCount: number;
  previewRows: Record<string, string>[];
}

interface ImportSummary { importedRows: number; updatedRows: number; skippedDuplicates: number; invalidRows: number; mappingErrors: number; invalidDetails?: Array<{ row: number; reason: string }> }

export function RecruitmentImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "committing">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSummary(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Alege un fișier CSV sau XLSX."); return; }
    setStatus("uploading");
    const form = new FormData(); form.append("file", file);
    try {
      const response = await fetch("/api/board/recruitment/import/preview", { method: "POST", body: form, credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Fișierul nu a putut fi citit.");
      setPreview(data); setMapping(data.mapping);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Fișierul nu a putut fi citit."); }
    finally { setStatus("idle"); }
  }

  async function commit() {
    if (!preview) return; setError(null); setStatus("committing");
    try {
      const response = await fetch("/api/board/recruitment/import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ importId: preview.importId, mapping }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Importul nu a putut fi finalizat.");
      setSummary(data.summary); setPreview(null); router.refresh();
    } catch (commitError) { setError(commitError instanceof Error ? commitError.message : "Importul nu a putut fi finalizat."); }
    finally { setStatus("idle"); }
  }

  return <section className="dash-card recruitment-import">
    <div className="recruitment-import-head"><div><span className="dash-eyebrow"><FileSpreadsheet size={15} /> Import administrativ</span><h2>Importă răspunsurile din Google Sheets</h2><p>Exportă foaia ca CSV sau XLSX. Antetele sunt citite pe server, previzualizate și păstrate exact.</p></div>{preview && <button type="button" onClick={() => { setPreview(null); setError(null); }} aria-label="Închide previzualizarea"><X size={18} /></button>}</div>
    {!preview && <form onSubmit={upload} className="recruitment-upload"><label htmlFor="recruitment-file"><UploadCloud size={24} /><strong>Alege un fișier CSV sau XLSX</strong><span>Maximum 10 MB și 5.000 de rânduri</span></label><input ref={fileRef} id="recruitment-file" name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /><button className="dash-button" disabled={status !== "idle"}>{status === "uploading" ? <><LoaderCircle className="scanner-spin" size={17} /> Se citește...</> : "Previzualizează importul"}</button></form>}
    {preview && <div className="import-preview"><div className="import-preview-summary"><strong>{preview.rowCount} rânduri</strong><span>{preview.headers.length} coloane detectate</span><span>{preview.unmatchedHeaders.length} coloane fără potrivire exactă</span></div><div className="import-mapping"><h3>Maparea antetelor</h3><p>Coloanele necunoscute pot rămâne „Păstrează doar sursa”. Valoarea nu este aruncată.</p>{preview.headers.map((header) => <label key={header}><span>{header}</span><select value={mapping[header] ?? "__preserve__"} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}><option value="__preserve__">Păstrează doar sursa</option>{preview.fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>)}</div><div className="import-sample"><h3>Primele {preview.previewRows.length} rânduri</h3><div><table><thead><tr>{preview.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{preview.previewRows.map((row,index) => <tr key={index}>{preview.headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div></div><button type="button" className="dash-button" onClick={() => void commit()} disabled={status !== "idle"}>{status === "committing" ? "Se importă..." : `Importă ${preview.rowCount} rânduri`}</button></div>}
    {error && <p className="dash-form-message dash-form-message--error" role="alert">{error}</p>}
    {summary && <div className="import-report" role="status"><strong>Import finalizat</strong><span>{summary.importedRows} importate</span><span>{summary.updatedRows} actualizate</span><span>{summary.skippedDuplicates} duplicate ignorate</span><span>{summary.invalidRows} invalide</span>{summary.invalidDetails?.slice(0,5).map((item,index) => <p key={index}>Rând {item.row || "?"}: {item.reason}</p>)}</div>}
  </section>;
}
