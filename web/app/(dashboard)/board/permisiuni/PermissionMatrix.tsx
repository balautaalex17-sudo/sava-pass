"use client";

import { useState, useTransition } from "react";
import { setRolePermission } from "./actions";
import { MEMBER_BASELINE_PERMISSIONS, type PermissionKey } from "@/lib/dashboard/permissions";

interface PermissionRow { key: PermissionKey; label: string; description: string; category: string; }
const roles = ["member", "board", "scanner", "interviewer", "statistici", "admin"] as const;
const roleLabels: Record<(typeof roles)[number],string> = { member:"Membru", board:"Board", scanner:"Scanner bilete", statistici:"Statistici", interviewer:"Intervievator", admin:"Super admin" };

export function PermissionMatrix({ permissions, initialMappings }: { permissions: PermissionRow[]; initialMappings: Array<{ role_key:string; permission_key:string }> }) {
  const [mappings,setMappings] = useState(() => new Set(initialMappings.map((row) => `${row.role_key}:${row.permission_key}`)));
  const [pending,startTransition] = useTransition(); const [message,setMessage] = useState<string|null>(null);
  const categories = [...new Set(permissions.map((permission) => permission.category))];
  function change(role: Exclude<(typeof roles)[number],"admin"|"board">, permission: PermissionKey, allowed: boolean) { setMessage(null); startTransition(async () => { const result = await setRolePermission({ role, permission, allowed }); setMessage(result.message); if (result.ok) setMappings((current) => { const next = new Set(current); const key = `${role}:${permission}`; if (allowed) next.add(key); else next.delete(key); return next; }); }); }
  return <><div className="dash-card permission-matrix-wrap"><table className="permission-matrix"><thead><tr><th>Permisiune</th>{roles.map((role) => <th key={role}>{roleLabels[role]}</th>)}</tr></thead><tbody>{categories.map((category) => <PermissionCategory key={category} category={category} permissions={permissions.filter((permission) => permission.category === category)} mappings={mappings} pending={pending} onChange={change} />)}</tbody></table></div>{message && <p className="dash-form-message" role="status">{message}</p>}</>;
}

function PermissionCategory({ category, permissions, mappings, pending, onChange }: { category:string; permissions:PermissionRow[]; mappings:Set<string>; pending:boolean; onChange:(role:"member"|"scanner"|"statistici"|"interviewer",permission:PermissionKey,allowed:boolean)=>void }) { return <><tr className="permission-category"><th colSpan={7}>{category}</th></tr>{permissions.map((permission) => <tr key={permission.key}><td><strong>{permission.label}</strong><span>{permission.description}</span><code>{permission.key}</code></td>{roles.map((role) => { const requiredMemberPermission = role === "member" && MEMBER_BASELINE_PERMISSIONS.includes(permission.key as (typeof MEMBER_BASELINE_PERMISSIONS)[number]); const hierarchyDenied = role === "board" && permission.key === "manage_permissions"; const lockedFullAccess = role === "admin" || (role === "board" && !hierarchyDenied); const checked = !hierarchyDenied && (lockedFullAccess || requiredMemberPermission || mappings.has(`${role}:${permission.key}`)); return <td key={role}><label className="permission-toggle"><input type="checkbox" aria-label={`${permission.label}, ${roleLabels[role]}`} checked={checked} disabled={pending || lockedFullAccess || requiredMemberPermission || role === "board"} onChange={(event) => role !== "admin" && role !== "board" && onChange(role,permission.key,event.target.checked)} /></label></td>; })}</tr>)}</>; }
