import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { importFileHash, parseRecruitmentFile } from "@/lib/dashboard/recruitment-import";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const viewer = await requirePermission("import_recruitment_signups");
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return privateJson({ error: "Alege un fișier CSV sau XLSX." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed: Awaited<ReturnType<typeof parseRecruitmentFile>>;
    try {
      parsed = await parseRecruitmentFile(file.name, buffer);
    } catch (error) {
      const message = error instanceof Error && error.message.length < 180
        ? error.message
        : "Fișierul nu a putut fi citit.";
      return privateJson({ error: message }, { status: 400 });
    }
    const { data: form } = await supabaseAdmin.from("recruitment_forms").select("id, title, version").eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle();
    if (!form) return privateJson({ error: "Nu există o schemă de recrutare activă." }, { status: 409 });
    const { data: fields } = await supabaseAdmin.from("recruitment_fields").select("id, key, label, source_header, position, required").eq("form_id", form.id).order("position");
    const byHeader = new Map((fields ?? []).map((field) => [field.source_header, field.key]));
    const mapping = Object.fromEntries(parsed.headers.map((header) => [header, byHeader.get(header) ?? "__preserve__"]));
    const unmatchedHeaders = parsed.headers.filter((header) => !byHeader.has(header));
    const { data: importRow, error } = await supabaseAdmin.from("recruitment_imports").insert({ form_id: form.id, file_name: file.name.slice(0, 255), file_sha256: importFileHash(buffer), detected_headers: parsed.headers, field_mapping: mapping, staged_rows: parsed.rows, status: "preview", summary: { total_rows: parsed.rows.length, unmatched_headers: unmatchedHeaders.length }, created_by: viewer.profile.id }).select("id").single();
    if (error || !importRow) throw error ?? new Error("import_preview_failed");
    return privateJson({ importId: importRow.id, form, fields: fields ?? [], headers: parsed.headers, mapping, unmatchedHeaders, rowCount: parsed.rows.length, previewRows: parsed.rows.slice(0, 5) });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("recruitment_import_preview_failed");
    return privateJson({ error: "Previzualizarea importului nu a putut fi salvată." }, { status: 500 });
  }
}
