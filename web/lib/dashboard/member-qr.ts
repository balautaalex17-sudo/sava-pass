import "server-only";

import QRCode from "qrcode";
import { signMemberAttendance } from "@/lib/qr-token";

/** Call only after checking display_member_qr. Never cache a signed QR globally. */
export async function createMemberQr(memberRef: string) {
  const signed = signMemberAttendance(memberRef);
  const qr = await QRCode.toDataURL(signed.token, {
    errorCorrectionLevel: "M",
    margin: 3,
    width: 720,
    color: { dark: "#101611", light: "#ffffff" },
  });
  return {
    qr,
    expiresAt: new Date(signed.expiresAt * 1000).toISOString(),
    refreshAfterSeconds: 60,
  };
}
