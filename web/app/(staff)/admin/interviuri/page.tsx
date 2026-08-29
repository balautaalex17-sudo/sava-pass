import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireStaffRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Interviuri — SavaPass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const current = await requireStaffRole(["admin", "board"] as const);
  if (!current) redirect("/conta");
  redirect("/board/interviuri?view=interviuri");
}
