import { z } from "zod";
import { dashboardAccessResponse, privateJson } from "@/lib/dashboard/api";
import { requirePermission } from "@/lib/dashboard/auth";
import { consumeDashboardRateLimit } from "@/lib/dashboard/rate-limit";
import { ATTENDANCE_MESSAGES, resultObject } from "@/lib/dashboard/scan-results";
import {
  qrTokenFingerprint,
  verifyMemberAttendance,
} from "@/lib/qr-token";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    meetingId: z.string().uuid(),
    token: z.string().trim().min(8).max(4096),
    sessionId: z.string().uuid().optional(),
    manual: z.boolean().optional(),
  })
  .strict();

function scanMetadata(request: Request, body: z.infer<typeof bodySchema>) {
  return {
    session_id: body.sessionId ?? null,
    manual: body.manual ?? false,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}

async function logRejectedScan(
  meetingId: string,
  actorId: string,
  fingerprint: string,
  result: string,
  metadata: ReturnType<typeof scanMetadata>,
) {
  await supabaseAdmin.from("attendance_scans").insert({
    meeting_id: meetingId,
    scanner_user_id: actorId,
    token_fingerprint: fingerprint,
    result,
    error_code: result.toUpperCase(),
    device_metadata: metadata,
  });
}

export async function POST(request: Request) {
  try {
    const viewer = await requirePermission("scan_meeting_attendance");
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return privateJson(
        { result: "invalid_token", message: ATTENDANCE_MESSAGES.invalid_token },
        { status: 400 },
      );
    }

    const allowed = await consumeDashboardRateLimit(
      viewer.profile.id,
      "meeting_attendance_scan",
    );
    if (!allowed) {
      return privateJson(
        { result: "rate_limited", message: ATTENDANCE_MESSAGES.rate_limited },
        { status: 429 },
      );
    }

    const { meetingId, token } = parsed.data;
    const fingerprint = qrTokenFingerprint(token);
    const metadata = scanMetadata(request, parsed.data);
    const validation = verifyMemberAttendance(token);
    if (!validation.ok) {
      await logRejectedScan(
        meetingId,
        viewer.profile.id,
        fingerprint,
        validation.code,
        metadata,
      );
      return privateJson({
        result: validation.code,
        message: ATTENDANCE_MESSAGES[validation.code],
      });
    }

    const { data, error } = await supabaseAdmin.rpc(
      "record_meeting_attendance",
      {
        p_meeting_id: meetingId,
        p_member_ref: validation.reference,
        p_scanner_user_id: viewer.profile.id,
        p_token_fingerprint: fingerprint,
        p_device_metadata: metadata,
      },
    );
    if (error) throw error;

    const result = resultObject(data);
    const resultCode = String(result.result ?? "error");
    return privateJson({
      ...result,
      result: resultCode,
      message: ATTENDANCE_MESSAGES[resultCode] ?? ATTENDANCE_MESSAGES.error,
    });
  } catch (error) {
    const accessResponse = dashboardAccessResponse(error);
    if (accessResponse) return accessResponse;
    console.error("attendance_scan_failed");
    return privateJson(
      { result: "error", message: ATTENDANCE_MESSAGES.error },
      { status: 500 },
    );
  }
}
