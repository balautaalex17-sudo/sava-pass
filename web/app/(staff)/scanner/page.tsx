import { redirect } from "next/navigation";
import { requireStaffRole } from "@/lib/roles";
import { ScannerClient } from "./ScannerClient";

export default async function ScannerPage() {
  const current = await requireStaffRole(["admin", "scanner"]);
  if (!current) redirect("/conta");

  return <ScannerClient isAdmin={current.role === "admin"} />;
}
