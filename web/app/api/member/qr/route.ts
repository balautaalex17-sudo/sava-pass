import QRCode from "qrcode";
import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { signMemberAttendance } from "@/lib/qr-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requirePermission("display_member_qr");
    const signed = signMemberAttendance(viewer.profile.member_ref);
    const dataUrl = await QRCode.toDataURL(signed.token, {
      errorCorrectionLevel: "M",
      margin: 3,
      width: 720,
      color: { dark: "#101611", light: "#ffffff" },
    });

    return privateJson({
      qr: dataUrl,
      expiresAt: new Date(signed.expiresAt * 1000).toISOString(),
      refreshAfterSeconds: 60,
    });
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
