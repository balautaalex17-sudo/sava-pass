"use client";

import { useActionState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { STAFF_TEST_ROLE_OPTIONS } from "@/lib/staff-test-roles";
import {
  signInAsStaffTest,
  type StaffTestLoginState,
} from "./staff-actions";

const INITIAL_STATE: StaffTestLoginState = {};

export function StaffTestLogin({ accessKey }: { accessKey: string }) {
  const [state, action, pending] = useActionState(
    signInAsStaffTest,
    INITIAL_STATE,
  );

  return (
    <section
      className="staff-test-login"
      aria-labelledby="staff-test-title"
      data-testid="staff-test-login"
    >
      <div className="staff-test-login__intro">
        <span className="staff-test-login__icon" aria-hidden="true">
          <ShieldCheck size={22} strokeWidth={1.8} />
        </span>
        <div>
          <span className="apply-eyebrow">Acces intern · test local</span>
          <h2 id="staff-test-title">Intră în spațiul staff</h2>
          <p>
            Alege rolul pe care vrei să-l testezi. Vei intra într-un cont real,
            cu exact permisiunile acelui rol.
          </p>
        </div>
      </div>

      <form action={action} className="staff-test-login__form">
        <input type="hidden" name="accessKey" value={accessKey} />

        <fieldset className="staff-test-login__roles">
          <legend>Tipul contului</legend>
          <div className="staff-test-login__role-grid">
            {STAFF_TEST_ROLE_OPTIONS.map((option, index) => (
              <label className="staff-test-role" key={option.value}>
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  defaultChecked={index === 0}
                />
                <span className="staff-test-role__surface">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="staff-test-login__controls">
          <label htmlFor="staff-test-code">
            <span>Cod secret</span>
            <span className="staff-test-login__input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="staff-test-code"
                name="accessCode"
                type="password"
                autoComplete="off"
                minLength={8}
                maxLength={128}
                required
                placeholder="Introdu codul de test"
              />
            </span>
          </label>
          <button type="submit" disabled={pending}>
            {pending ? "Se verifică…" : "Intră în contul de test"}
          </button>
        </div>

        <p className="staff-test-login__note">
          Disponibil numai pe localhost și pe versiunea Preview. Accesul este
          blocat automat în producție.
        </p>
        <p className="staff-test-login__error" role="alert" aria-live="assertive">
          {state.error ?? ""}
        </p>
      </form>
    </section>
  );
}
