import GalleryContent from "@/app/conta/galerie/GalleryContent";
import { requirePagePermission } from "@/lib/dashboard/auth";

export { metadata } from "@/app/conta/galerie/GalleryContent";
export const dynamic = "force-dynamic";

export default async function BoardGalleryPage(props: Parameters<typeof GalleryContent>[0]) {
  await requirePagePermission("view_board_dashboard");
  return <GalleryContent {...props} />;
}
