"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { chooseMemberDepartment } from "@/app/conta/departament/actions";
import { MEMBER_DEPARTMENTS, departmentBlockedMessage, type DepartmentOptions } from "@/lib/dashboard/member-departments";
import styles from "./member-department-dialog.module.css";

export function MemberDepartmentDialog({ initialOptions }: { initialOptions: DepartmentOptions | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState(chooseMemberDepartment, { message: "" });
  const options = state.options ?? initialOptions;
  const blocked = options?.blockedDepartment;

  useEffect(() => {
    if (state.department) {
      dialogRef.current?.close();
      router.refresh();
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    titleRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [state.department, router]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="department-title"
      aria-describedby="department-description" onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")];
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}>
      <span className={styles.eyebrow}>Departamentul tău</span>
      <h2 id="department-title" ref={titleRef} tabIndex={-1}>Alege HR sau PR</h2>
      <p id="department-description" className={styles.description}>O singură alegere, înainte să continui în portal.</p>
      <form action={action} aria-busy={pending}>
        <div className={styles.options}>
          {MEMBER_DEPARTMENTS.map((department) => (
            <button key={department} type="submit" name="department" value={department}
              className={styles.option} aria-label={`Aleg ${department.toUpperCase()}`}
              aria-describedby={blocked === department ? "department-blocked" : undefined}
              disabled={pending || !options || blocked === department}>
              <strong>{department.toUpperCase()}</strong>
              <span>{department === "hr" ? "Resurse umane" : "Relații publice"}</span>
              {blocked === department && <small>Momentan indisponibil</small>}
            </button>
          ))}
        </div>
        {blocked && <p id="department-blocked" className={styles.reason}>{departmentBlockedMessage(blocked)}</p>}
        {!options && <p className={styles.reason}>Nu am putut încărca opțiunile. <button type="button" onClick={() => router.refresh()}>Încearcă din nou</button></p>}
        <p className={styles.message} role="status" aria-live="polite">
          {pending ? "Se salvează alegerea…" : state.message}
        </p>
      </form>
      <footer className={styles.footer}>
        <span>HR / PR va apărea în profilul tău.</span>
        <Link href="/">Înapoi la site</Link>
      </footer>
    </dialog>
  );
}
