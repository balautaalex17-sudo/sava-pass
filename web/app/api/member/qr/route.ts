import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { createMemberQr } from "@/lib/dashboard/member-qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requirePermission("display_member_qr");
    return privateJson(await createMemberQr(viewer.profile.member_ref));
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("member_qr_generation_failed");
    return privateJson(
      { error: "Codul QR nu a putut fi generat. Încearcă din nou." },
      { status: 500 },
    );
  }
}
