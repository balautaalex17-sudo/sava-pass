import { z } from "zod";
import { csvCell } from "@/lib/csv";
import { dashboardAccessResponse } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requirePermission("view_attendance_roster");
    const meetingId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("meeting"));
    if (!meetingId.success) return new Response("Întâlnire invalidă", { status: 400 });
    const [{ data: meeting }, { data: members }, { data: attendance }] = await Promise.all([
      supabaseAdmin.from("meetings").select("title").eq("id", meetingId.data).maybeSingle(),
      supabaseAdmin.from("profiles").select("id, full_name, email, grade").eq("membership_status", "active").order("full_name"),
      supabaseAdmin.from("meeting_attendance").select("member_id, status, checked_in_at, profiles!meeting_attendance_checked_in_by_fkey(full_name)").eq("meeting_id", meetingId.data),
    ]);
    if (!meeting) return new Response("Întâlnirea nu există", { status: 404 });
    const map = new Map((attendance ?? []).map((row) => [row.member_id, row]));
    const lines = [["Nume", "Email", "Clasa", "Status", "Ora confirmării", "Confirmat de"].map(csvCell).join(","), ...(members ?? []).map((member) => { const row = map.get(member.id); const confirmer = row?.profiles as unknown as { full_name?: string } | null; return [member.full_name, member.email, member.grade, row?.status === "present" ? "Prezent" : "Neconfirmat", row?.checked_in_at, confirmer?.full_name].map(csvCell).join(","); })];
    const filename = meeting.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "prezenta";
    return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return dashboardAccessResponse(error) ?? new Response("Exportul nu a putut fi generat", { status: 500 });
  }
}
