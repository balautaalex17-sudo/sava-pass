"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail, Pencil, Plus, Search, X } from "lucide-react";
import { z } from "zod";
import { resendMemberInvitation, saveMember } from "./actions";
import type { StaffRole } from "@/lib/roles";
import { canManagePrimaryRole } from "@/lib/dashboard/role-hierarchy";
import styles from "./members-manager.module.css";

interface MemberRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  grade: string | null;
  membershipStatus: string;
  role: StaffRole | null;
  createdAt: string;
  department: string | null;
}

type DepartmentFilter = "all" | "hr" | "pr" | "unassigned";
type MemberSort = "name" | "hr" | "pr";

function departmentOf(member: MemberRow) {
  if (member.role === "board" || member.role === "admin") return null;
  return member.department === "hr" || member.department === "pr" ? member.department : null;
}

function hasUnassignedDepartment(member: MemberRow) {
  return member.membershipStatus === "active"
    && member.role !== "board" && member.role !== "admin" && !departmentOf(member);
}

const schema = z.object({
  fullName: z.string().trim().min(2, "Introdu numele complet (minimum 2 caractere).").max(100, "Numele poate avea cel mult 100 de caractere."),
  email: z.string().trim().email("Introdu o adresă de email validă."),
  phone: z.string().max(30),
  grade: z.string().max(30),
  membershipStatus: z.enum(["recruit", "active", "inactive", "suspended", "alumni"]),
  role: z.enum(["", "admin", "board", "statistici"]),
});

type Values = z.infer<typeof schema>;
type MessageTone = "success" | "warning" | "error";

const statusLabels: Record<string, string> = {
  recruit: "Recrut",
  active: "Membru activ",
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
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [sort, setSort] = useState<MemberSort>("name");
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

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ro");
    return members.filter((member) => {
      const department = departmentOf(member);
      const matchesDepartment = departmentFilter === "all"
        || (departmentFilter === "unassigned" ? hasUnassignedDepartment(member) : department === departmentFilter);
      return matchesDepartment && `${member.fullName} ${member.email ?? ""} ${department ?? ""}`
        .toLocaleLowerCase("ro").includes(query);
    }).sort((a, b) => {
      if (sort !== "name") {
        const rank = (member: MemberRow) => departmentOf(member) === sort ? 0 : departmentOf(member) ? 1 : 2;
        const difference = rank(a) - rank(b);
        if (difference) return difference;
      }
      return a.fullName.localeCompare(b.fullName, "ro", { sensitivity: "base" });
    });
  }, [members, search, departmentFilter, sort]);

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
    setMessage(null);
    startTransition(async () => {
      try {
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
          setSearch("");
        }
      } catch {
        setMessage({ tone: "error", text: "Conexiunea s-a întrerupt. Reîncarcă lista pentru a verifica dacă membrul a fost adăugat înainte să încerci din nou." });
      }
    });
  }

  function resend(member: MemberRow) {
    setResendingId(member.id);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await resendMemberInvitation({ id: member.id });
        setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      } catch {
        setMessage({ tone: "error", text: "Conexiunea s-a întrerupt. Verifică dacă emailul a ajuns înainte să încerci din nou." });
      } finally {
        setResendingId(null);
      }
    });
  }

  return (
    <>
      <div className={`members-toolbar ${styles.toolbar}`}>
        <label>
          <Search size={16} />
          <span className="sr-only">Caută membru</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută după nume sau email"
          />
        </label>
        <div className={styles.controls}>
          <div className={styles.control}>
            <label htmlFor="members-department-filter">Departament</label>
            <select id="members-department-filter" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value as DepartmentFilter)}>
              <option value="all">Toate</option>
              <option value="hr">HR</option>
              <option value="pr">PR</option>
              <option value="unassigned">Neales</option>
            </select>
          </div>
          <div className={styles.control}>
            <label htmlFor="members-sort">Ordonează</label>
            <select id="members-sort" value={sort} onChange={(event) => setSort(event.target.value as MemberSort)}>
              <option value="name">Nume (A-Z)</option>
              <option value="hr">HR mai întâi</option>
              <option value="pr">PR mai întâi</option>
            </select>
          </div>
        </div>
        {canAddMember && (
          <button className="dash-button" type="button" onClick={add} disabled={pending}>
            <Plus size={17} /> Adaugă membru
          </button>
        )}
      </div>

      {open && (
        <form className="dash-card dash-form member-admin-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={pending}>
          <div className="dash-section-head">
            <div>
              <h2>{editingId ? "Editează membrul" : "Adaugă membru"}</h2>
              {!editingId && <p>Adaugă numele și emailul. Persoana primește un cod de activare și își alege singură parola. Conturile deja activate își păstrează parola și nu primesc un cod nou.</p>}
            </div>
            <button type="button" className="meeting-close" onClick={() => setOpen(false)} disabled={pending} aria-label="Închide">
              <X size={18} />
            </button>
          </div>

          <fieldset className="dash-form-grid member-admin-fields" disabled={pending}>
            <Field label="Nume complet *" error={errors.fullName?.message}>
              <input autoComplete="name" required maxLength={100} aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
            </Field>
            <Field label="Email *" error={errors.email?.message}>
              <input type="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} readOnly={Boolean(editingId)} {...register("email")} />
            </Field>
            <Field label="Telefon (opțional)" error={errors.phone?.message}>
              <input type="tel" autoComplete="tel" maxLength={30} {...register("phone")} />
            </Field>
            <Field label="Clasa (opțional)" error={errors.grade?.message}>
              <input maxLength={30} {...register("grade")} />
            </Field>
            <Field label="Statut în club">
              <select {...register("membershipStatus")}>
                {Object.entries(statusLabels).filter(([value]) => editingId || ["active", "recruit"].includes(value)).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Rol principal">
              <select {...register("role")}>
                <option value="">Fără rol administrativ</option>
                {Object.entries(assignableRoleLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </Field>
          </fieldset>

          <p className="dash-form-message">
            Câmpurile marcate cu * sunt obligatorii. {" "}
            După acceptarea finală, candidații primesc statutul Recrut. Pentru promovare, alege „Membru activ” și salvează. {" "}
            Poți administra doar roluri aflate sub rolul tău. Scanner bilete și
            Intervievator se combină din pagina „Roluri operaționale”.
          </p>
          {message && <StatusMessage tone={message.tone} text={message.text} />}
          <div>
            <button className="dash-button" disabled={pending}>
              {!editingId && <Mail size={16} />}
              {pending ? editingId ? "Se salvează..." : "Se adaugă și se trimite..." : editingId ? "Salvează modificările" : "Adaugă și trimite codul"}
            </button>
          </div>
        </form>
      )}

      {!open && message && <StatusMessage tone={message.tone} text={message.text} />}

      <p className={styles.results} role="status">{filtered.length} din {members.length} persoane</p>
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
            {filtered.map((member) => {
              const department = departmentOf(member);
              return (
              <tr key={member.id}>
                <td className={styles.memberCell}>
                  <div className={styles.identity}>
                    <strong>{member.fullName}</strong>
                    {department ? <span className={`${styles.badge} ${department === "hr" ? styles.hr : styles.pr}`}
                      title={department === "hr" ? "Resurse umane" : "Relații publice"}
                      aria-label={`Departament ${department.toUpperCase()}`}>
                      {department.toUpperCase()}
                    </span> : hasUnassignedDepartment(member) ? <span className={`${styles.badge} ${styles.unassigned}`}
                      title="Membrul va alege HR sau PR când intră în portal" aria-label="Departament neales">Neales</span> : null}
                  </div>
                  <span>{member.email}</span>
                </td>
                <td>{member.grade ?? "—"}</td>
                <td>
                  <span className={member.membershipStatus === "active" ? "dash-status dash-status--success" : "dash-status dash-status--warning"}>
                    {statusLabels[member.membershipStatus] ?? member.membershipStatus}
                  </span>
                </td>
                <td>{member.role ? roleLabels[member.role] ?? member.role : member.membershipStatus === "recruit" ? "Recrut" : "Membru"}</td>
                <td>
                  <div className="members-table-actions">
                    <button
                      type="button"
                      onClick={() => resend(member)}
                      disabled={pending || !canManagePrimaryRole(viewerRole, member.role, member.role) || !["active", "recruit"].includes(member.membershipStatus) || !member.email}
                      title={!canManagePrimaryRole(viewerRole, member.role, member.role) ? "Nu poți administra un rol egal sau mai mare decât al tău" : ["active", "recruit"].includes(member.membershipStatus) ? "Trimite un cod nou. Codul anterior nu va mai funcționa." : "Contul trebuie să fie de recrut sau membru activ"}
                    >
                      <Mail size={15} /> {resendingId === member.id ? "Se trimite..." : "Retrimite codul"}
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
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="dash-empty"><strong>Niciun membru</strong>Schimbă căutarea sau filtrul de departament.</div>}
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
