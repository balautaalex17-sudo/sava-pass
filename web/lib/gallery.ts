import { z } from "zod";

export const GALLERY_PAGE_SIZE = 24;
export const GALLERY_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"] as const;

export const galleryUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(GALLERY_TYPES),
  // No application file-size ceiling. Drive enforces its account/provider limits.
  size: z.number().int().positive(),
  caption: z.string().trim().max(300),
}).strict();

export const galleryTicketSchema = galleryUploadSchema.extend({
  photoId: z.string().uuid(),
  fileId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  userId: z.string().uuid(),
  folderId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  expiresAt: z.number().int().positive(),
}).strict();

export function canConnectGalleryDrive(role: string | null, membershipStatus: string | null) {
  return membershipStatus === "active" && (role === "board" || role === "admin");
}

export function canManageGalleryPhoto(userId: string, uploaderId: string | null, role: string | null, membershipStatus: string | null) {
  return userId === uploaderId || canConnectGalleryDrive(role, membershipStatus);
}

export interface GalleryPhoto {
  id: string;
  uploaderName: string;
  caption: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  canDelete: boolean;
}

export function galleryPhotoUrl(id: string, thumbnail = false) {
  return `/api/gallery/photos/${encodeURIComponent(id)}${thumbnail ? "?size=thumbnail" : ""}`;
}

export function matchesPhotoSignature(bytes: Uint8Array, mime: string) {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  if (mime === "image/webp") return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (text(4, 8) !== "ftyp") return false;
  const brands = [text(8, 12)];
  for (let i = 16; i + 4 <= bytes.length; i += 4) brands.push(text(i, i + 4));
  if (mime === "image/avif") return brands.some((brand) => brand === "avif" || brand === "avis");
  return (mime === "image/heic" || mime === "image/heif")
    && brands.some((brand) => ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand));
}
