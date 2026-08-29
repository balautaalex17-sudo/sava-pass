import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDashboardViewer } from "@/lib/dashboard/auth";
import { BOARD_PERMISSIONS } from "@/lib/dashboard/permissions";

export default async function BoardLayout({ children }: { children: ReactNode }) {
  const viewer = await getDashboardViewer();
  if (!viewer || !BOARD_PERMISSIONS.some((permission) => viewer.permissions.has(permission))) {
    redirect("/membru?acces=refuzat");
  }

  return children;
}
