import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { isPermissionKey } from "@/lib/dashboard/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PermissionMatrix } from "./PermissionMatrix";

export const metadata: Metadata = { title: "Permisiuni", robots: { index: false, follow: false } };

export default async function PermissionsPage() {
  await requirePagePermission("manage_permissions");
  const [{ data: permissionsData }, { data: mappings }] = await Promise.all([supabaseAdmin.from("permissions").select("key, label, description, category").order("category").order("key"), supabaseAdmin.from("role_permissions").select("role_key, permission_key")]);
  const permissions = (permissionsData ?? []).filter((row): row is typeof row & { key: import("@/lib/dashboard/permissions").PermissionKey } => isPermissionKey(row.key));
  return <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Super Admin</span><h1>Roluri și permisiuni</h1><p>Doar Super Admin poate modifica matricea. Board păstrează instrumentele operaționale, fără dreptul de a acorda roluri egale sau superioare.</p></div></header><PermissionMatrix permissions={permissions} initialMappings={mappings ?? []} /></div>;
}
