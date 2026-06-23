import { NextRequest } from "next/server";
import { verifyTicket } from "@/lib/qr-token";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ticketId = verifyTicket(token);
  if (!ticketId) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const png = await QRCode.toBuffer(token, {
    errorCorrectionLevel: "M",
    width: 360,
    margin: 2,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
