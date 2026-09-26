import { z } from "zod";
import { getGalleryViewer } from "@/lib/gallery-auth";
import { DriveError, driveFetch, driveFile, getDriveAccess, isGoogleThumbnailUrl } from "@/lib/gallery-drive";
import { logServerError } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await getGalleryViewer();
    if (!viewer) return new Response("Autentificare necesară", { status: 401, headers: privateHeaders });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404, headers: privateHeaders });
    const { data: photo, error } = await viewer.client.from("gallery_photos")
      .select("drive_file_id, original_name, mime_type").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!photo) return new Response(null, { status: 404, headers: privateHeaders });
    const url = new URL(request.url);
    const thumbnail = url.searchParams.get("size") === "thumbnail";
    const { token } = await getDriveAccess();
    const file = await driveFile(photo.drive_file_id, token);
    if (file.trashed) return new Response(null, { status: 404, headers: privateHeaders });
    let response: Response | undefined;
    let usingThumbnail = false;
    if (thumbnail && file.thumbnailLink && isGoogleThumbnailUrl(file.thumbnailLink)) {
      response = await fetch(file.thumbnailLink, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: request.signal,
      }).catch((error) => {
        if (request.signal.aborted) throw error;
        return undefined;
      });
      if (response?.ok && /^image\/(jpeg|png|webp|avif)(;|$)/i.test(response.headers.get("content-type") ?? "")) {
        usingThumbnail = true;
      } else {
        await response?.body?.cancel();
        response = undefined;
      }
    }
    if (!response) {
      // Drive thumbnails can lag behind a completed upload. Browsers can show
      // these originals immediately; HEIC/HEIF still need Google's conversion.
      if (thumbnail && !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(photo.mime_type)) {
        return new Response(null, { status: 404, headers: privateHeaders });
      }
      const range = thumbnail ? null : request.headers.get("range");
      if (range && (!/^bytes=(?:\d+-\d*|-\d+)$/.test(range) || range.length > 70)) return new Response(null, { status: 416, headers: privateHeaders });
      response = await driveFetch(`files/${encodeURIComponent(photo.drive_file_id)}?alt=media`, token, {
        headers: range ? { Range: range } : undefined, signal: request.signal,
      });
    }
    const headers = new Headers(privateHeaders);
    headers.set("Content-Type", usingThumbnail ? response.headers.get("content-type")! : photo.mime_type);
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    const disposition = !thumbnail && url.searchParams.has("download") ? "attachment" : "inline";
    headers.set("Content-Disposition", `${disposition}; filename="photo"; filename*=UTF-8''${encodeURIComponent(photo.original_name).replace(/'/g, "%27")}`);
    if (!thumbnail) headers.set("Accept-Ranges", "bytes");
    const contentRange = response.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);
    // Stream originals without buffering them or routing them through a public image cache.
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    logServerError("gallery_photo_read_failed", error);
    const status = error instanceof DriveError && [404, 416].includes(error.status) ? error.status : 503;
    return new Response("Poza nu este disponibilă momentan.", { status, headers: privateHeaders });
  }
}
