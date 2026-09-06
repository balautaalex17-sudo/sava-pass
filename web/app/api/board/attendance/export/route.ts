import { z } from "zod";
import { csvCell } from "@/lib/csv";
import { dashboardAccessResponse } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { getAttendanceRosterData } from "@/lib/dashboard/attendance-data";
import { ATTENDANCE_LABELS, REQUEST_LABELS, filterAttendanceRows } from "@/lib/dashboard/attendance";

const exportSchema = z.object({
  view: z.enum(["member", "meeting"]).default("meeting"),
  meeting: z.string().uuid().optional(),
  member: z.string().uuid().optional(),
  filter: z.enum(["all", "present", "absent", "excused", "pending"]).default("all"),
  sort: z.enum(["person-asc", "person-desc", "meeting-desc", "meeting-asc"]).default("person-asc"),
  search: z.string().max(200).default(""),
});

export async function GET(request: Request) {
  try {
    await requirePermission("view_attendance_roster");
    const parsed = exportSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return new Response("Filtre invalide", { status: 400 });
    const query = parsed.data;
    const selectedId = query.view === "member" ? query.member : query.meeting;
    if (!selectedId) return new Response("Alege o persoană sau o ședință", { status: 400 });
    const data = await getAttendanceRosterData(query, false);
    const selected = query.view === "member" ? data.selectedMember : data.selectedMeeting;
    if (selected?.id !== selectedId) return new Response("Persoana sau ședința nu există", { status: 404 });
    const rows = filterAttendanceRows(data.rows, query.search, query.filter, query.sort);
    const lines = [
      ["Nume", "Email", "Clasa", "Ședință", "Data ședinței", "Status", "Motivare", "Ora confirmării", "Confirmat de"].map(csvCell).join(","),
      ...rows.map((row) => [row.name, row.email, row.grade, row.meetingTitle, row.meetingStartsAt,
        ATTENDANCE_LABELS[row.result], row.request ? REQUEST_LABELS[row.request.status] : "",
        row.checkedInAt, row.confirmedBy].map(csvCell).join(",")),
    ];
    return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prezenta-${query.view}-${selectedId}.csv"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    return dashboardAccessResponse(error) ?? new Response("Exportul nu a putut fi generat", { status: 500 });
  }
}
