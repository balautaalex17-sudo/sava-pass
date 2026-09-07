import { redirect } from "next/navigation";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import { getGalleryViewer } from "@/lib/gallery-auth";
import GalleryContent from "./GalleryContent";

export { metadata } from "./GalleryContent";
export const dynamic = "force-dynamic";

export default async function GalleryPage(props: Parameters<typeof GalleryContent>[0]) {
  const viewer = await getGalleryViewer();
  if (!viewer) redirect("/conta/login?next=/conta/galerie");

  // Old bookmarks should enter the same portal as the sidebar link.
  // Recruits and account-only visitors retain their existing gallery access.
  if (viewer.membershipStatus === "active") {
    const dashboard = await getDashboardViewer();
    if (dashboard?.permissions.has("view_member_dashboard")) {
      const pathname = dashboard.permissions.has("view_board_dashboard")
        ? "/board/galerie" : "/membru/galerie";
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(await props.searchParams)) {
        if (typeof value === "string") query.set(key, value);
      }
      const search = query.toString();
      redirect(search ? `${pathname}?${search}` : pathname);
    }
  }

  return <GalleryContent {...props} />;
}
