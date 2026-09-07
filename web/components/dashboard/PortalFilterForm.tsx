"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

/** GET filters update just the route, preserving the sidebar and browser history. */
export function PortalFilterForm({ action, className, children, submitLabel, disabled = false }: {
  action: string;
  className?: string;
  children: ReactNode;
  submitLabel: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Form action={action} className={className} aria-busy={pending} onSubmit={(event) => {
      event.preventDefault();
      if (pending || disabled) return;
      const query = new URLSearchParams();
      for (const [key, value] of new FormData(event.currentTarget)) {
        if (typeof value === "string") query.append(key, value);
      }
      startTransition(() => router.push(`${action}?${query}`, { scroll: false }));
    }}>
      {children}
      <button className="dash-button" type="submit" disabled={pending || disabled}>
        {pending ? "Se încarcă…" : submitLabel}
      </button>
      <span className="sr-only" role="status">{pending ? "Se actualizează rezultatele" : ""}</span>
    </Form>
  );
}
