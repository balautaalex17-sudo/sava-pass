import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { parseSubmittedAt, stableSourceRowIdentifier } from "@/lib/dashboard/recruitment-import";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json, TablesInsert } from "@/lib/supabase/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  importId: z.string().uuid(),
  mapping: z.record(z.string(), z.string().min(1).max(120)),
}).strict();

const emailSchema = z.string().email();

function jsonRecord(value: Json): Record<string, string> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") return null;
    result[key] = item;
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const viewer = await requirePermission("import_recruitment_signups");
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateJson({ error: "Maparea importului este invalidă." }, { status: 400 });
    const { data: importRow } = await supabaseAdmin.from("recruitment_imports").select("*").eq("id", parsed.data.importId).eq("created_by", viewer.profile.id).eq("status", "preview").maybeSingle();
    if (!importRow) return privateJson({ error: "Previzualizarea nu mai este disponibilă." }, { status: 404 });
    const headers = Array.isArray(importRow.detected_headers) && importRow.detected_headers.every((value) => typeof value === "string") ? importRow.detected_headers as string[] : [];
    const stagedRows = Array.isArray(importRow.staged_rows) ? importRow.staged_rows.map(jsonRecord) : [];
    if (!headers.length || stagedRows.some((row) => !row)) return privateJson({ error: "Datele importului sunt corupte." }, { status: 409 });
    const { data: fields } = await supabaseAdmin.from("recruitment_fields").select("key, source_header").eq("form_id", importRow.form_id);
    const validKeys = new Set((fields ?? []).map((field) => field.key));
    const storedMapping = jsonRecord(importRow.field_mapping) ?? {};
    const mapping = { ...storedMapping, ...parsed.data.mapping };
    const mappingErrors = headers.filter((header) => !mapping[header] || (mapping[header] !== "__preserve__" && !validKeys.has(mapping[header])));
    const mappedKeys = headers.map((header) => mapping[header]).filter((key) => key !== "__preserve__");
    if (new Set(mappedKeys).size !== mappedKeys.length) mappingErrors.push("Două coloane sunt mapate la același câmp.");
    if (mappingErrors.length) return privateJson({ error: "Rezolvă toate coloanele nemapate înainte de import.", mappingErrors }, { status: 400 });

    const candidates: Array<{ rowNumber: number; sourceId: string; sourcePayload: Record<string, string>; answers: Record<string, string>; submittedAt: string | null; fullName: string; email: string; phone: string; grade: string; motivation: string }> = [];
    const invalidRows: Array<{ row: number; reason: string }> = [];
    const seen = new Set<string>();
    let skippedDuplicates = 0;
    for (const [index, row] of (stagedRows as Record<string, string>[]).entries()) {
      const answers: Record<string, string> = {};
      for (const header of headers) if (mapping[header] !== "__preserve__") answers[mapping[header]] = row[header] ?? "";
      const sourceId = stableSourceRowIdentifier(row, answers);
      const fullName = (answers.full_name ?? "").trim();
      const email = (answers.email || answers.respondent_email || "").trim().toLocaleLowerCase("ro");
      if (!sourceId) { invalidRows.push({ row: index + 2, reason: "Lipsesc emailul sau data răspunsului pentru deduplicare." }); continue; }
      if (!fullName) { invalidRows.push({ row: index + 2, reason: "Lipsește numele candidatului." }); continue; }
      if (!emailSchema.safeParse(email).success) { invalidRows.push({ row: index + 2, reason: "Adresa de email este invalidă." }); continue; }
      if (seen.has(sourceId)) { skippedDuplicates += 1; continue; }
      seen.add(sourceId);
      candidates.push({ rowNumber: index + 2, sourceId, sourcePayload: row, answers, submittedAt: parseSubmittedAt(answers.timestamp || row.Timestamp || ""), fullName, email, phone: answers.phone ?? "", grade: answers.grade ?? "", motivation: answers.club_exchange ?? answers.volunteering_impact ?? "" });
    }

    const identifiers = candidates.map((row) => row.sourceId);
    const existing = new Map<string, { id: string; source_payload: Json; answers: Json }>();
    for (let index = 0; index < identifiers.length; index += 300) {
      const { data } = await supabaseAdmin.from("membership_applications").select("id, source_row_identifier, source_payload, answers").eq("source", "google_sheets").in("source_row_identifier", identifiers.slice(index, index + 300));
      for (const row of data ?? []) if (row.source_row_identifier) existing.set(row.source_row_identifier, row);
    }

    const pendingRows: Array<{ rowNumber: number; existed: boolean; values: TablesInsert<"membership_applications"> }> = [];
    for (const candidate of candidates) {
      const found = existing.get(candidate.sourceId);
      const sourceSame = found && JSON.stringify(found.source_payload) === JSON.stringify(candidate.sourcePayload) && JSON.stringify(found.answers) === JSON.stringify(candidate.answers);
      if (sourceSame) { skippedDuplicates += 1; continue; }
      pendingRows.push({
        rowNumber: candidate.rowNumber,
        existed: Boolean(found),
        values: { id: found?.id ?? randomUUID(), form_id: importRow.form_id, full_name: candidate.fullName, email: candidate.email, phone: candidate.phone, grade: candidate.grade || null, motivation: candidate.motivation, answers: candidate.answers, submitted_at: candidate.submittedAt, source: "google_sheets", source_row_identifier: candidate.sourceId, source_payload: candidate.sourcePayload, import_id: importRow.id },
      });
    }

    let importedRows = 0;
    let updatedRows = 0;
    for (let index = 0; index < pendingRows.length; index += 100) {
      const batch = pendingRows.slice(index, index + 100);
      const { error: batchError } = await supabaseAdmin.from("membership_applications").upsert(batch.map((row) => row.values), { onConflict: "id" });
      if (!batchError) {
        importedRows += batch.filter((row) => !row.existed).length;
        updatedRows += batch.filter((row) => row.existed).length;
        continue;
      }

      // A failed statement is rolled back by Postgres. Retry individually so the
      // import report identifies only the rows that actually need attention.
      for (const row of batch) {
        const { error } = await supabaseAdmin.from("membership_applications").upsert(row.values, { onConflict: "id" });
        if (error) invalidRows.push({ row: row.rowNumber, reason: "Înregistrarea nu a putut fi salvată." });
        else if (row.existed) updatedRows += 1;
        else importedRows += 1;
      }
    }

    const summary = { importedRows, updatedRows, skippedDuplicates, invalidRows: invalidRows.length, mappingErrors: 0, invalidDetails: invalidRows };
    await supabaseAdmin.from("recruitment_imports").update({ field_mapping: mapping, status: "imported", committed_at: new Date().toISOString(), summary }).eq("id", importRow.id);
    await logAudit({ actorId: viewer.profile.id, action: "recruitment.imported", entityType: "recruitment_import", entityId: importRow.id, metadata: summary });
    return privateJson({ ok: true, summary });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("recruitment_import_commit_failed");
    return privateJson({ error: "Importul nu a putut fi finalizat." }, { status: 500 });
  }
}
