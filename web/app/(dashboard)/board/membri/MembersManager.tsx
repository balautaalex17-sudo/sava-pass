"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail, Pencil, Plus, Search, X } from "lucide-react";
import { z } from "zod";
import { resendMemberInvitation, saveMember } from "./actions";
import type { StaffRole } from "@/lib/roles";
import { canManagePrimaryRole } from "@/lib/dashboard/role-hierarchy";

interface MemberRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  grade: string | null;
  membershipStatus: string;
  role: StaffRole | null;
  createdAt: string;
}

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email("Email invalid."),
  phone: z.string().max(30),
  grade: z.string().max(30),
  membershipStatus: z.enum(["active", "inactive", "suspended", "alumni"]),
  role: z.enum(["", "admin", "board", "statistici"]),
});

type Values = z.infer<typeof schema>;
type MessageTone = "success" | "warning" | "error";

const statusLabels: Record<string, string> = {
  active: "Activ",
  inactive: "Inactiv",
  suspended: "Suspendat",
  alumni: "Alumni",
};

const roleLabels: Record<string, string> = {
  admin: "Super admin",
  board: "Board",
  scanner: "Scanner bilete",
  statistici: "Statistici",
  interviewer: "Intervievator",
};

const allAssignableRoleLabels = {
  admin: "Super admin",
  board: "Board",
  statistici: "Statistici",
} as const;

export function MembersManager({
  members,
  viewerRole,
}: {
  members: MemberRow[];
  viewerRole: StaffRole | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ tone: MessageTone; text: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const assignableRoleLabels = viewerRole === "admin"
    ? allAssignableRoleLabels
    : { statistici: allAssignableRoleLabels.statistici };
  const canAddMember = canManagePrimaryRole(viewerRole, null, null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      grade: "",
      membershipStatus: "active",
      role: "",
    },
  });

  const filtered = useMemo(
    () => members.filter((member) =>
      `${member.fullName} ${member.email ?? ""}`
        .toLocaleLowerCase("ro")
        .includes(search.toLocaleLowerCase("ro"))),
    [members, search],
  );

  function add() {
    setEditingId(null);
    setOpen(true);
    setMessage(null);
    reset({
      fullName: "",
      email: "",
      phone: "",
      grade: "",
      membershipStatus: "active",
      role: "",
    });
  }

  function edit(member: MemberRow) {
    const primaryRole = member.role && member.role in assignableRoleLabels ? member.role : "";
    setEditingId(member.id);
    setOpen(true);
    setMessage(null);
    reset({
      fullName: member.fullName,
      email: member.email ?? "",
      phone: member.phone ?? "",
      grade: member.grade ?? "",
      membershipStatus: member.membershipStatus as Values["membershipStatus"],
      role: primaryRole as Values["role"],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(values: Values) {
    startTransition(async () => {
      const result = await saveMember({
        id: editingId ?? undefined,
        ...values,
        role: values.role || null,
      });
      setMessage({ tone: result.tone, text: result.message });
      if (result.ok) {
        setOpen(false);
        setEditingId(null);
        reset();
      }
    });
  }

  function resend(member: MemberRow) {
    setResendingId(member.id);
    setMessage(null);
    startTransition(async () => {
      const result = await resendMemberInvitation({ id: member.id });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      setResendingId(null);
    });
  }

  return (
    <>
      <div className="members-toolbar">
        <label>
          <Search size={16} />
          <span className="sr-only">Caută membru</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută după nume sau email"
          />
        </label>
        {canAddMember && (
          <button className="dash-button" type="button" onClick={add}>
            <Plus size={17} /> Membru nou
          </button>
        )}
      </div>

      {open && (
        <form className="dash-card dash-form member-admin-form" onSubmit={handleSubmit(submit)} noValidate>
          <div className="dash-section-head">
            <div>
              <h2>{editingId ? "Editează membrul" : "Adaugă membru"}</h2>
              {!editingId && <p>Contul este creat acum, iar membrul primește pe email un cod numeric de activare.</p>}
            </div>
            <button type="button" className="meeting-close" onClick={() => setOpen(false)} aria-label="Închide">
              <X size={18} />
            </button>
          </div>

          <div className="dash-form-grid">
            <Field label="Nume complet" error={errors.fullName?.message}>
              <input {...register("fullName")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" autoComplete="email" readOnly={Boolean(editingId)} {...register("email")} />
            </Field>
            <Field label="Telefon" error={errors.phone?.message}>
              <input type="tel" {...register("phone")} />
            </Field>
            <Field label="Clasa" error={errors.grade?.message}>
              <input {...register("grade")} />
            </Field>
            <Field label="Statut membru">
              <select {...register("membershipStatus")}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Rol principal">
              <select {...register("role")}>
                <option value="">Membru normal</option>
                {Object.entries(assignableRoleLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          <p className="dash-form-message">
            Poți administra doar roluri aflate sub rolul tău. Scanner bilete și
            Intervievator se combină din pagina „Roluri operaționale”.
          </p>
          {message && <StatusMessage tone={message.tone} text={message.text} />}
          <div>
            <button className="dash-button" disabled={pending}>
              {pending ? "Se salvează..." : "Salvează membrul"}
            </button>
          </div>
        </form>
      )}

      {!open && message && <StatusMessage tone={message.tone} text={message.text} />}

      <div className="dash-card members-table">
        <table>
          <thead>
            <tr>
              <th>Membru</th>
              <th>Clasa</th>
              <th>Statut</th>
              <th>Rol</th>
              <th><span className="sr-only">Acțiuni</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.fullName}</strong><span>{member.email}</span></td>
                <td>{member.grade ?? "—"}</td>
                <td>
                  <span className={member.membershipStatus === "active" ? "dash-status dash-status--success" : "dash-status dash-status--warning"}>
                    {statusLabels[member.membershipStatus] ?? member.membershipStatus}
                  </span>
                </td>
                <td>{member.role ? roleLabels[member.role] ?? member.role : "Membru"}</td>
                <td>
                  <div className="members-table-actions">
                    <button
                      type="button"
                      onClick={() => resend(member)}
                      disabled={pending || member.membershipStatus !== "active" || !member.email}
                      title={member.membershipStatus === "active" ? "Trimite un cod nou" : "Membrul trebuie să fie activ"}
                    >
                      <Mail size={15} /> {resendingId === member.id ? "Se trimite..." : "Cod nou"}
                    </button>
                    <button
                      type="button"
                      onClick={() => edit(member)}
                      disabled={pending || !canManagePrimaryRole(viewerRole, member.role, member.role)}
                      title={canManagePrimaryRole(viewerRole, member.role, member.role)
                        ? "Editează membrul"
                        : "Nu poți administra un rol egal sau mai mare decât al tău"}
                    >
                      <Pencil size={15} /> Editează
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="dash-empty"><strong>Niciun membru</strong>Schimbă termenul de căutare.</div>}
      </div>
    </>
  );
}

function StatusMessage({ tone, text }: { tone: MessageTone; text: string }) {
  return <p role="status" className={`dash-form-message dash-form-message--${tone}`}>{text}</p>;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="dash-field">
      <span>{label}</span>
      {children}
      {error && <p className="dash-field-error">{error}</p>}
    </label>
  );
}
