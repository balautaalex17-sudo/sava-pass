import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { canConnectGalleryDrive, canManageGalleryPhoto, GALLERY_PAGE_SIZE, type GalleryPhoto } from "@/lib/gallery";
import { getGalleryViewer } from "@/lib/gallery-auth";
import { galleryDriveConfigured, getDriveConnection } from "@/lib/gallery-drive";
import { logServerError } from "@/lib/server-log";
import { GalleryClient } from "./GalleryClient";
import { GalleryFrame } from "./GalleryFrame";
import { GalleryDrivePanel } from "./GalleryDrivePanel";
import styles from "./gallery.module.css";

export const metadata: Metadata = { title: "Galeria comunității | SavaPass", robots: { index: false, follow: false } };


const driveMessages: Record<string, string> = {
  connected: "Contul Google este conectat. Galeria este pregătită pentru poze.",
  cancelled: "Conectarea a fost anulată. Poți încerca din nou când dorești.",
  account: "Galeria este deja legată de alt cont Google. Reconectează contul folosit inițial pentru a păstra accesul la poze.",
  error: "Conectarea nu a reușit. Încearcă din nou și acordă acces la folderul galeriei.",
  setup: "Conexiunea Google Drive trebuie configurată înainte de autorizarea contului.",
};

export default async function GalleryContent({ searchParams }: { searchParams: Promise<{ page?: string; drive?: string }> }) {
  const viewer = await getGalleryViewer();
  if (!viewer) redirect("/conta/login?next=/conta/galerie");
  const query = await searchParams;
  const page = /^\d{1,6}$/.test(query.page ?? "") ? Math.max(1, Number(query.page)) : 1;
  const board = canConnectGalleryDrive(viewer.role, viewer.membershipStatus);
  let connection: Awaited<ReturnType<typeof getDriveConnection>> = null;
  let photos: GalleryPhoto[] = [];
  let hasNext = false;
  let failed = false;
  try {
    const [drive, result] = await Promise.all([
      getDriveConnection(),
      viewer.client.from("gallery_photos").select("id, uploader_id, uploader_name, caption, width, height, created_at")
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range((page - 1) * GALLERY_PAGE_SIZE, page * GALLERY_PAGE_SIZE),
    ]);
    if (result.error) throw result.error;
    connection = drive;
    hasNext = result.data.length > GALLERY_PAGE_SIZE;
    photos = result.data.slice(0, GALLERY_PAGE_SIZE).map((photo) => ({ id: photo.id, uploaderName: photo.uploader_name,
      caption: photo.caption, width: photo.width, height: photo.height, createdAt: photo.created_at,
      canDelete: canManageGalleryPhoto(viewer.userId, photo.uploader_id, viewer.role, viewer.membershipStatus) }));
  } catch (error) { failed = true; logServerError("gallery_page_failed", error); }
  const configured = galleryDriveConfigured();
  return (
    <GalleryFrame membershipStatus={viewer.membershipStatus} page={page} hasNext={hasNext}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>INTERACT SF. SAVA</p><h1>Momentele noastre.</h1><p>O galerie pentru toți: recruți, membri și board. Adaugă poze și descoperă amintirile comunității.</p></div>
          <Images size={42} strokeWidth={1.3} aria-hidden="true" />
        </header>
        {query.drive && driveMessages[query.drive] && board && (query.drive !== "connected" || connection) && <p className={styles.notice} role="status">{driveMessages[query.drive]}</p>}
        {board && <GalleryDrivePanel configured={configured} connection={connection ? {
          accountEmail: connection.account_email, folderId: connection.folder_id, connectedAt: connection.connected_at,
        } : null} />}
        {failed ? <p className={styles.notice} role="alert">Galeria nu a putut fi încărcată. Reîncarcă pagina pentru a încerca din nou.</p>
          : <GalleryClient photos={photos} connected={Boolean(connection && configured)} />}
    </GalleryFrame>
  );
}
