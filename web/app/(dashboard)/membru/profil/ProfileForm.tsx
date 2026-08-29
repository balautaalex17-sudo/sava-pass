"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save } from "lucide-react";
import { updateMemberProfile } from "./actions";

const schema = z.object({
  fullName: z.string().trim().min(2, "Numele este prea scurt.").max(100),
  phone: z.string().trim().max(30, "Numărul este prea lung."),
  grade: z.string().trim().max(30, "Clasa este prea lungă."),
});
type Values = z.infer<typeof schema>;

export function ProfileForm({ initial }: { initial: Values & { email: string } }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  function submit(values: Values) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberProfile(values);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <form className="dash-card dash-form" onSubmit={handleSubmit(submit)} noValidate>
      <div className="dash-form-grid">
        <div className="dash-field"><label htmlFor="profile-name">Nume complet</label><input id="profile-name" autoComplete="name" {...register("fullName")} />{errors.fullName && <p className="dash-field-error">{errors.fullName.message}</p>}</div>
        <div className="dash-field"><label htmlFor="profile-email">Email</label><input id="profile-email" value={initial.email} readOnly aria-describedby="profile-email-help" /><p id="profile-email-help" className="dash-field-error" style={{ color: "var(--dash-muted)" }}>Emailul de autentificare nu se schimbă aici.</p></div>
        <div className="dash-field"><label htmlFor="profile-phone">Telefon</label><input id="profile-phone" type="tel" autoComplete="tel" {...register("phone")} />{errors.phone && <p className="dash-field-error">{errors.phone.message}</p>}</div>
        <div className="dash-field"><label htmlFor="profile-grade">Clasa</label><input id="profile-grade" autoComplete="organization-title" {...register("grade")} />{errors.grade && <p className="dash-field-error">{errors.grade.message}</p>}</div>
      </div>
      {message && <p role="status" className={`dash-form-message dash-form-message--${message.ok ? "success" : "error"}`}>{message.text}</p>}
      <div><button className="dash-button" type="submit" disabled={isPending}><Save size={17} /> {isPending ? "Se salvează..." : "Salvează profilul"}</button></div>
    </form>
  );
}
