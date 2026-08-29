"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, ShieldCheck, TicketCheck, UserRoundSearch, UsersRound } from "lucide-react";
import type { StaffRole } from "@/lib/roles";
import { canManagePrimaryRole } from "@/lib/dashboard/role-hierarchy";
import { setBoardMembership, setOperationalRoles } from "./actions";

type OperationalRole = "scanner" | "interviewer";

interface StaffMember {
  id: string;
  fullName: string;
  email: string | null;
  grade: string | null;
  primaryRole: StaffRole | null;
  operationalRoles: OperationalRole[];
}

const roleLabels: Record<string, string> = {
  admin: "Super administrator",
  statistici: "Statistici",
};

function canEditOperationalRoles(role: StaffRole | null) {
  return !role || role === "scanner" || role === "interviewer";
}

export function StaffAssignments({
  members,
  viewerId,
  viewerRole,
}: {
  members: StaffMember[];
  viewerId: string;
  viewerRole: StaffRole | null;
}) {
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState(() =>
    new Map(members.map((member) => [member.id, member.operationalRoles])),
  );
  const [primaryRoles, setPrimaryRoles] = useState(() =>
    new Map(members.map((member) => [member.id, member.primaryRole])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ro");
    if (!needle) return members;
    return members.filter((member) =>
      `${member.fullName} ${member.email ?? ""} ${member.grade ?? ""}`
        .toLocaleLowerCase("ro")
        .includes(needle),
    );
  }, [members, query]);

  function toggleRole(member: StaffMember, role: OperationalRole, checked: boolean) {
    const previous = roles.get(member.id) ?? [];
    const nextRoles = checked
      ? [...new Set([...previous, role])]
      : previous.filter((currentRole) => currentRole !== role);

    setPendingId(member.id);
    setMessage(null);
    setRoles((current) => new Map(current).set(member.id, nextRoles));
    startTransition(async () => {
      const result = await setOperationalRoles({ profileId: member.id, roles: nextRoles });
      if (result.ok) {
        setRoles((current) => new Map(current).set(member.id, result.roles));
      } else {
        setRoles((current) => new Map(current).set(member.id, previous));
      }
      setMessage({ ok: result.ok, text: result.message });
      setPendingId(null);
    });
  }

  function toggleBoard(member: StaffMember, enabled: boolean) {
    const previousRole = primaryRoles.get(member.id) ?? null;
    const nextRole = enabled ? "board" as const : null;

    setPendingId(member.id);
    setMessage(null);
    setPrimaryRoles((current) => new Map(current).set(member.id, nextRole));
    startTransition(async () => {
      const result = await setBoardMembership({ profileId: member.id, enabled });
      if (result.ok) {
        setPrimaryRoles((current) => new Map(current).set(member.id, result.primaryRole));
      } else {
        setPrimaryRoles((current) => new Map(current).set(member.id, previousRole));
      }
      setMessage({ ok: result.ok, text: result.message });
      setPendingId(null);
    });
  }

  const scannerCount = [...roles.values()].filter((assigned) => assigned.includes("scanner")).length;
  const interviewerCount = [...roles.values()].filter((assigned) => assigned.includes("interviewer")).length;
  const boardCount = [...primaryRoles.values()].filter((role) => role === "board").length;

  return (
    <>
      <section className="staff-role-summary" aria-label="Rezumat roluri">
        <article>
          <UsersRound size={20} aria-hidden="true" />
          <div><strong>{boardCount}</strong><span>membri Board</span></div>
        </article>
        <article>
          <TicketCheck size={20} aria-hidden="true" />
          <div><strong>{scannerCount}</strong><span>scannere bilete</span></div>
        </article>
        <article>
          <UserRoundSearch size={20} aria-hidden="true" />
          <div><strong>{interviewerCount}</strong><span>intervievatori</span></div>
        </article>
        <p><ShieldCheck size={17} aria-hidden="true" /> Doar Super Admin poate acorda sau retrage rolul Board.</p>
      </section>

      <div className="members-toolbar">
        <label>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Caută membru</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după nume, email sau clasă"
          />
        </label>
      </div>

      {message && (
        <p
          className={`dash-form-message dash-form-message--${message.ok ? "success" : "error"}`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="dash-card staff-assignment-table">
        <table>
          <thead>
            <tr><th>Membru</th><th>Clasa</th><th>Acces și roluri</th></tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const assignedRoles = roles.get(member.id) ?? [];
              const primaryRole = primaryRoles.get(member.id) ?? null;
              const boardMember = primaryRole === "board";
              const protectedRole = primaryRole === "admin" || primaryRole === "statistici";
              const operationalEditable = canEditOperationalRoles(primaryRole);
              const selfBoardRole = boardMember && member.id === viewerId;
              const boardRoleEditable = canManagePrimaryRole(
                viewerRole,
                primaryRole,
                boardMember ? null : "board",
              );
              return (
                <tr key={member.id}>
                  <td><strong>{member.fullName}</strong><span>{member.email}</span></td>
                  <td>{member.grade ?? "—"}</td>
                  <td>
                    {!protectedRole ? (
                      <fieldset className="staff-role-toggles" disabled={pendingId === member.id}>
                        <legend className="sr-only">Roluri pentru {member.fullName}</legend>
                        <label className="staff-role-toggle--board">
                          <input
                            type="checkbox"
                            checked={boardMember}
                            disabled={selfBoardRole || !boardRoleEditable}
                            onChange={(event) => toggleBoard(member, event.target.checked)}
                          />
                          <span>Membru Board</span>
                        </label>
                        <label className={boardMember ? "staff-role-toggle--included" : undefined}>
                          <input
                            type="checkbox"
                            checked={boardMember || assignedRoles.includes("scanner")}
                            disabled={!operationalEditable}
                            onChange={(event) => toggleRole(member, "scanner", event.target.checked)}
                          />
                          <span>Scanner bilete</span>
                        </label>
                        <label className={boardMember ? "staff-role-toggle--included" : undefined}>
                          <input
                            type="checkbox"
                            checked={boardMember || assignedRoles.includes("interviewer")}
                            disabled={!operationalEditable}
                            onChange={(event) => toggleRole(member, "interviewer", event.target.checked)}
                          />
                          <span>Intervievator</span>
                        </label>
                        {boardMember && (
                          <small>{selfBoardRole ? "Rolul tău este protejat." : "Scannerul și interviurile sunt incluse prin Board."}</small>
                        )}
                        {!boardRoleEditable && !boardMember && (
                          <small>Doar Super Admin poate acorda rolul Board.</small>
                        )}
                        {pendingId === member.id && <small>Se salvează…</small>}
                      </fieldset>
                    ) : (
                      <span className="dash-status">{roleLabels[primaryRole ?? ""] ?? "Rol protejat"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="dash-empty"><strong>Niciun membru găsit</strong>Schimbă termenul de căutare.</div>
        )}
      </div>
    </>
  );
}
