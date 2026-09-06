// Browser-only transport: original bytes go straight to the scoped Drive session.
// 2 MiB is a transfer chunk, not a limit on the complete photograph.
const CHUNK_BYTES = 2 * 1024 * 1024;

export class GalleryUploadError extends Error {
  constructor(message: string, public readonly expired = false) { super(message); this.name = "GalleryUploadError"; }
}

function acceptedBytes(response: Response, total: number) {
  const range = response.headers.get("Range");
  if (!range) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range);
  const next = match ? Number(match[1]) + 1 : NaN;
  if (!Number.isSafeInteger(next) || next < 1 || next > total) throw new GalleryUploadError("Răspuns de încărcare invalid.");
  return next;
}

export async function uploadGalleryFile(file: Blob, sessionUrl: string, onProgress: (percent: number) => void, signal?: AbortSignal) {
  const url = new URL(sessionUrl);
  if (url.origin !== "https://www.googleapis.com" || url.pathname !== "/upload/drive/v3/files"
    || url.searchParams.get("uploadType") !== "resumable" || !url.searchParams.get("upload_id")) throw new GalleryUploadError("Sesiune de încărcare invalidă.");
  let offset = 0;
  let failures = 0;
  let probe = true;
  while (offset < file.size) {
    signal?.throwIfAborted();
    const end = Math.min(offset + CHUNK_BYTES, file.size);
    // Compose abort signals manually for the supported Safari 15.4 browsers.
    const requestAbort = new AbortController();
    const forwardAbort = () => requestAbort.abort(signal?.reason);
    signal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = setTimeout(() => requestAbort.abort(), 120000);
    try {
      const response = await fetch(sessionUrl, {
        method: "PUT", credentials: "omit", referrerPolicy: "no-referrer", signal: requestAbort.signal,
        headers: { "Content-Range": probe ? `bytes */${file.size}` : `bytes ${offset}-${end - 1}/${file.size}` },
        body: probe ? undefined : file.slice(offset, end),
      });
      if (response.ok) { onProgress(100); return; }
      if (response.status === 404 || response.status === 410) throw new GalleryUploadError("Sesiunea a expirat. Reîncearcă pentru a porni o încărcare nouă.", true);
      if (response.status === 308) {
        const next = acceptedBytes(response, file.size);
        if (!probe && next <= offset) {
          if (++failures > 3) throw new GalleryUploadError("Încărcarea nu avansează. Reîncearcă după verificarea conexiunii.");
        } else if (next > offset) failures = 0;
        offset = next;
        if (offset >= file.size) throw new GalleryUploadError("Drive nu a confirmat încă finalizarea. Reîncearcă.");
        onProgress(Math.floor(offset / file.size * 100));
        probe = false;
        continue;
      }
      if (response.status < 500 && response.status !== 429) throw new GalleryUploadError("Drive a refuzat încărcarea. Verifică spațiul disponibil și conexiunea contului.", true);
      throw new Error("Temporary Drive failure");
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof GalleryUploadError) throw error;
      if (++failures > 3) throw new GalleryUploadError("Conexiunea a fost întreruptă. Apasă Reîncearcă pentru a continua.");
      // Probe the acknowledged byte range before retransmitting after an uncertain response.
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** failures));
      probe = true;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
  throw new GalleryUploadError("Fotografia este goală.");
}
