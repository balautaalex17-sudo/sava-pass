"use client";

import { useState, useTransition } from "react";
import { setRolePermission } from "./actions";
import { MEMBER_BASELINE_PERMISSIONS, PERMISSION_ROLES, type EditablePermissionRole, type PermissionKey } from "@/lib/dashboard/permissions";
import { canUseAdministrativePermission } from "@/lib/dashboard/role-hierarchy";

interface PermissionRow { key: PermissionKey; label: string; description: string; category: string; }
const roles = PERMISSION_ROLES;
const roleLabels: Record<(typeof roles)[number],string> = { recruit:"Recrut", member:"Membru", board:"Board", scanner:"Scanner bilete", statistici:"Statistici", interviewer:"Intervievator", admin:"Super admin" };

export function PermissionMatrix({ permissions, initialMappings }: { permissions: PermissionRow[]; initialMappings: Array<{ role_key:string; permission_key:string }> }) {
  const [mappings,setMappings] = useState(() => new Set(initialMappings.map((row) => `${row.role_key}:${row.permission_key}`)));
  const [pending,startTransition] = useTransition(); const [message,setMessage] = useState<string|null>(null);
  const categories = [...new Set(permissions.map((permission) => permission.category))];
  function change(role: Exclude<(typeof roles)[number], "admin" | "board">, permission: PermissionKey, allowed: boolean) {
    if (pending) return;
    const key = `${role}:${permission}`;
    const previous = mappings.has(key);
    const update = (value: boolean) => setMappings((current) => {
      const next = new Set(current);
      if (value) next.add(key); else next.delete(key);
      return next;
    });
    setMessage(null);
    update(allowed);
    startTransition(async () => {
      try {
        const result = await setRolePermission({ role, permission, allowed });
        setMessage(result.message);
        if (!result.ok) update(previous);
      } catch {
        update(previous);
        setMessage("Conexiunea a fost întreruptă. Încearcă din nou.");
      }
    });
  }
  return <><div className="dash-card permission-matrix-wrap" aria-busy={pending}><table className="permission-matrix"><thead><tr><th>Permisiune</th>{roles.map((role) => <th key={role}>{roleLabels[role]}</th>)}</tr></thead><tbody>{categories.map((category) => <PermissionCategory key={category} category={category} permissions={permissions.filter((permission) => permission.category === category)} mappings={mappings} pending={pending} onChange={change} />)}</tbody></table></div>{(pending || message) && <p className="dash-form-message" role="status">{pending ? "Se salvează…" : message}</p>}</>;
}

function PermissionCategory({ category, permissions, mappings, pending, onChange }: { category:string; permissions:PermissionRow[]; mappings:Set<string>; pending:boolean; onChange:(role:EditablePermissionRole,permission:PermissionKey,allowed:boolean)=>void }) {
  return <>
    <tr className="permission-category"><th colSpan={roles.length + 1}>{category}</th></tr>
    {permissions.map((permission) => <tr key={permission.key}>
      <td><strong>{permission.label}</strong><span>{permission.description}</span><code>{permission.key}</code></td>
      {roles.map((role) => {
        const requiredMemberPermission = role === "member" && MEMBER_BASELINE_PERMISSIONS.includes(permission.key as (typeof MEMBER_BASELINE_PERMISSIONS)[number]);
        const primaryRole = role === "member" || role === "recruit" ? null : role;
        const hierarchyDenied = !canUseAdministrativePermission(primaryRole, permission.key);
        const lockedFullAccess = role === "admin" || (role === "board" && !hierarchyDenied);
        const checked = !hierarchyDenied && (lockedFullAccess || requiredMemberPermission || mappings.has(`${role}:${permission.key}`));
        return <td key={role}><label className="permission-toggle"><input
          type="checkbox"
          aria-label={`${permission.label}, ${roleLabels[role]}`}
          checked={checked}
          disabled={pending || hierarchyDenied || lockedFullAccess || requiredMemberPermission || role === "board"}
          onChange={(event) => role !== "admin" && role !== "board" && onChange(role,permission.key,event.target.checked)}
        /></label></td>;
      })}
    </tr>)}
  </>;
}
