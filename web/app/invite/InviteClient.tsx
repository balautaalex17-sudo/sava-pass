"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/types";
import { activateMemberAccount } from "./actions";
import styles from "./invite.module.css";

type ActivationStage = "code" | "password";
type VerificationType = "invite" | "magiclink" | "recovery";
const MEMBER_ACTIVATION_CODE_LENGTH = 12;

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function pageShell(content: React.ReactNode) {
  return (
    <main className={`${styles.shell} sp-light`}>
      <div className={styles.frame}>
        <header className={styles.brand}>
          <span className={styles.club}>Interact Sf. Sava</span>
        </header>
        {content}
      </div>
    </main>
  );
}

export function InviteLoading() {
  return pageShell(
    <section className={styles.panel} aria-busy="true" aria-label="Se verifică invitația">
      <div className={styles.skeletonStep} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonField} />
      <div className={styles.skeletonButton} />
    </section>,
  );
}

export function InviteClient({ initiallyVerified }: { initiallyVerified: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedType = params.get("type");
  const verificationType: VerificationType | null = requestedType === "invite"
    || requestedType === "magiclink"
    || requestedType === "recovery"
    ? requestedType
    : null;
  const isRecovery = verificationType === "recovery";
  const isLegacyInvitation = verificationType === "invite" || verificationType === "magiclink";
  const usesSupabaseOtp = isRecovery || isLegacyInvitation;
  const [stage, setStage] = useState<ActivationStage>(initiallyVerified ? "password" : "code");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error")
      ? isRecovery
        ? "Linkul pentru parolă este invalid sau a expirat. Cere unul nou din pagina de login."
        : "Invitația este invalidă sau a expirat. Cere un cod nou unui membru Board."
      : null,
  );
  const [pending, setPending] = useState(false);

  if (isRecovery && !initiallyVerified) {
    return pageShell(
      <section className={styles.panel}>
        <p className={styles.sectionLabel}>Resetare parolă</p>
        <h1>Linkul a expirat</h1>
        <p className={styles.intro}>
          Cere un link nou din pagina de autentificare. Cel vechi nu mai poate fi folosit.
        </p>
        <div className={styles.recoveryActions}>
          <Link className="btn btn--navy pressable hover-dim" href="/login">
            Cere un link nou
          </Link>
        </div>
      </section>,
    );
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLocaleLowerCase("ro");
    const expectedCode = usesSupabaseOtp ? /^\d{6,10}$/ : /^\d{12}$/;
    if (!expectedCode.test(code)) {
      setError(usesSupabaseOtp
        ? "Introdu codul numeric complet din email."
        : "Introdu toate cele 12 cifre ale codului din invitație.");
      return;
    }

    setPending(true);
    if (!usesSupabaseOtp) {
      const result = await activateMemberAccount({ email: normalizedEmail, code });
      setPending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStage("password");
      return;
    }

    if (!verificationType) {
      setPending(false);
      setError("Tipul codului nu este valid.");
      return;
    }

    const { error: verifyError } = await getSupabase().auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: verificationType,
    });
    setPending(false);

    if (verifyError) {
      setError(isRecovery
        ? "Emailul și codul nu se potrivesc sau codul a expirat. Cere o resetare nouă."
        : "Acest cod vechi nu mai este valid. Cere un cod nou din dashboard-ul Board.");
      return;
    }

    setStage("password");
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Cele două parole nu sunt identice.");
      return;
    }

    setPending(true);
    const supabase = getSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError("Parola nu a putut fi salvată. Reîncearcă.");
      return;
    }

    router.replace("/membru");
  }

  return pageShell(
    <section className={styles.panel}>
      <div className={styles.step} aria-label={`Pasul ${stage === "code" ? 1 : 2} din 2`}>
        <span>{isRecovery ? "Resetare parolă" : "Cont de membru"}</span>
        <span>Pasul {stage === "code" ? "1" : "2"} din 2</span>
      </div>

      <h1>{stage === "code" ? (isRecovery ? "Confirmă emailul" : "Activează contul") : "Creează parola"}</h1>
      <p className={styles.intro}>
        {stage === "code"
          ? isRecovery
            ? "Introdu emailul și codul primit pentru resetarea parolei."
            : "Introdu emailul și codul din invitație."
          : isRecovery
            ? "Emailul este confirmat. Setează acum parola contului tău."
            : "Codul este confirmat. Setează acum parola contului tău."}
      </p>

      {stage === "code" ? (
        <form className={styles.form} onSubmit={verifyCode} noValidate>
          <label className={styles.field}>
            <span>Adresa de email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="nume@exemplu.ro"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Codul din email</span>
            <input
              className={styles.codeInput}
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(
                0,
                usesSupabaseOtp ? 10 : MEMBER_ACTIVATION_CODE_LENGTH,
              ))}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern={usesSupabaseOtp ? "[0-9]{6,10}" : "[0-9]{12}"}
              placeholder={usesSupabaseOtp ? "12345678" : "123456789012"}
              aria-describedby="code-help"
              maxLength={usesSupabaseOtp ? 10 : MEMBER_ACTIVATION_CODE_LENGTH}
              required
            />
            <small id="code-help">
              {usesSupabaseOtp
                ? "Codul este temporar și poate fi folosit o singură dată."
                : "Codul nu expiră și poate fi folosit o singură dată."}
            </small>
          </label>

          {error && <ErrorMessage message={error} />}
          <Button type="submit" variant="navy" full loading={pending}>Continuă</Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={savePassword} noValidate>
          <label className={styles.field}>
            <span>Parolă</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <small>Cel puțin 8 caractere.</small>
          </label>

          <label className={styles.field}>
            <span>Confirmă parola</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error && <ErrorMessage message={error} />}
          <Button type="submit" variant="navy" full loading={pending}>Salvează parola</Button>
        </form>
      )}
    </section>,
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className={styles.error} role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
