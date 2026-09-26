import { redirect } from "next/navigation";

// Keep older bookmarks working; the choice now appears inside the portal.
export default function DepartmentPage() {
  redirect("/membru");
}
