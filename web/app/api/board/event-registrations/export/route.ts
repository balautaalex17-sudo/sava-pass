import { dashboardAccessResponse } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { getAllRegistrations, registrationFiltersSchema } from "@/lib/dashboard/event-registrations";
import { buildRegistrationsWorkbook } from "@/lib/dashboard/event-registrations-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePermission("manage_public_events");
    const parsed = registrationFiltersSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return new Response("Filtre invalide", { status: 400 });

    const rows = await getAllRegistrations(parsed.data);
    const file = await buildRegistrationsWorkbook(rows);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inscrieri-evenimente-${date}.xlsx"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("event_registrations_export_failed", error);
    return new Response("Exportul nu a putut fi generat", { status: 500 });
  }
}
