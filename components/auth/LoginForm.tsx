"use client";

import { CircleAlert, Eye, EyeOff, Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/(auth)/logg-inn/actions";
import { Icon } from "@/components/ui/icon";

/** Login with the Spond account (e-mail or mobile number + password). */
export function LoginForm({ notice, demoAccounts }: { notice?: string; demoAccounts?: { email: string; note: string }[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { status: "idle" });
  const [show, setShow] = useState(false);

  if (state.status === "no_role" || state.status === "no_app") {
    return (
      <div className="nm-login__card">
        <h2 style={{ margin: 0, fontSize: 26, lineHeight: "32px" }}>Ingen tilgang</h2>
        {state.status === "no_role" ? (
          <>
            <p style={{ margin: 0, fontSize: 18, lineHeight: "26px" }}>
              Du er logget inn som {state.firstName}, men har ingen rolle i Spond som gir tilgang til appen.
            </p>
            <p className="nm-muted" style={{ margin: 0 }}>
              Appen er for trenere og lagledere. Mener du at du burde hatt tilgang, be en administrator i klubben sjekke
              rollen din i Spond.
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 18, lineHeight: "26px" }}>
              Innloggingen i Spond var riktig, men du har ikke fått tilgang til denne appen.
            </p>
            <p className="nm-muted" style={{ margin: 0 }}>
              Appen er for trenere og lagledere i Nymark. Be en administrator i appen om å gi deg app-tilgang
              (Innstillinger → Trenere).
            </p>
          </>
        )}
        <a href="/logg-inn" className="nm-btn nm-btn--secondary nm-btn--block">
          Tilbake
        </a>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : notice;
  return (
    <form className="nm-login__card" action={action} noValidate>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: "32px" }}>Logg inn med Spond</h2>
      <p style={{ margin: 0, fontSize: 18, lineHeight: "26px" }}>Bruk samme e-post eller mobilnummer og passord som i Spond-appen.</p>
      {error ? (
        <div className="nm-alert" role="alert">
          <Icon icon={CircleAlert} />
          <span>{error}</span>
        </div>
      ) : null}
      <label className="nm-field">
        <span className="nm-field__label">E-post eller mobilnummer</span>
        <input
          className="nm-input"
          name="identifier"
          type="text"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="navn@eksempel.no"
          defaultValue={state.status === "error" ? state.identifier : ""}
          required
        />
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Passord</span>
        <span className="nm-input-wrap">
          <input className="nm-input" name="password" type={show ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="nm-iconbtn" aria-label={show ? "Skjul passord" : "Vis passord"} onClick={() => setShow(!show)}>
            <Icon icon={show ? EyeOff : Eye} />
          </button>
        </span>
      </label>
      <button className="nm-btn nm-btn--primary nm-btn--lg nm-btn--block" type="submit" aria-busy={pending} disabled={pending}>
        {pending ? "Logger inn …" : "Logg inn"}
      </button>
      <div className="nm-note">
        <Icon icon={Lock} />
        <span>Passordet ditt lagres ikke. Det sendes direkte til Spond én gang for å logge deg inn.</span>
      </div>
      {demoAccounts?.length ? (
        <div className="nm-note" style={{ flexDirection: "column", gap: 4 }}>
          <strong>Demo: passord «demo»</strong>
          {demoAccounts.map((a) => (
            <span key={a.email}>
              {a.email} – {a.note}
            </span>
          ))}
        </div>
      ) : null}
      <p className="nm-muted" style={{ margin: 0, fontSize: 14, lineHeight: "20px" }}>
        Uoffisielt verktøy for trenere i Nymark. Ikke laget eller støttet av Spond AS.
      </p>
    </form>
  );
}
