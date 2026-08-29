import { redirect } from "next/navigation";
import { requirePagePermission } from "@/lib/dashboard/auth";

export default async function SignupsRedirectPage() {
  await requirePagePermission("view_recruitment_signups");
  redirect("/board/interviuri?view=raspunsuri");
}
