import { ChevronRight, MessageSquarePlus, Sparkles } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { Icon } from "@/components/ui/icon";
import { APP_VERSION } from "@/lib/changelog-file";
import { requireUser } from "@/lib/auth/current";
import { aiMode, env, envLabel } from "@/lib/env";
import { safeBack } from "@/lib/settings-nav";

export default async function SettingsPage(props: PageProps<"/innstillinger">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const back = safeBack(sp.fra);
  const theme = (await cookies()).get("theme")?.value ?? "light";
  const rights = user.rights;
  const e = env();
  return (
    <SettingsShell user={user} back={back} tab="generelt">
      <section className="nm-section">
        <h2 className="nm-h2">Tema</h2>
        <ThemePicker current={theme} />
        <p className="nm-muted">Lyst tema er best i sollys på banen.</p>
      </section>
      <section className="nm-section">
        <h2 className="nm-h2">Konto</h2>
        <p style={{ margin: "0 0 var(--space-3)" }}>
          Innlogget som <strong>{user.data.profile.firstName} {user.data.profile.lastName}</strong> med Spond.
          {rights.superadmin ? " Du er superadmin." : rights.admin ? " Du er administrator." : ""}
          {rights.ai ? " Du har tilgang til KI." : ""}
        </p>
        <a href="/logg-ut" className="nm-btn nm-btn--secondary">
          Logg ut
        </a>
      </section>
      <section className="nm-section">
        <h2 className="nm-h2">Om appen</h2>
        <ul className="nm-list nm-navlist" style={{ marginBottom: "var(--space-3)" }}>
          <li>
            <Link href={`/innstillinger/nytt?fra=${encodeURIComponent(back)}`}>
              <Icon icon={Sparkles} />
              <span className="nm-list__name" style={{ flex: 1 }}>
                Hva er nytt
              </span>
              <span className="nm-muted">Versjon {APP_VERSION}</span>
              <Icon icon={ChevronRight} />
            </Link>
          </li>
          <li>
            <Link href={`/innstillinger/tilbakemelding?fra=${encodeURIComponent(back)}`}>
              <Icon icon={MessageSquarePlus} />
              <span className="nm-list__name" style={{ flex: 1 }}>
                Gi tilbakemelding
              </span>
              <Icon icon={ChevronRight} />
            </Link>
          </li>
        </ul>
        <p style={{ margin: 0 }}>
          Nymark – Gruppeorganisering er et frivillig verktøy for trenere i Nymark. Det er ikke laget, godkjent eller støttet av
          Spond AS, og bruker Sponds uoffisielle API. Appen skriver aldri til Spond.
        </p>
        <p className="nm-muted">
          Passordet ditt lagres ikke. Databasen lagrer bare Spond-ID-er, tagger, lagforslag, treningsopplegg, kommentarer og tilbakemeldinger.
          Navn hentes fra Spond når de vises.
        </p>
        {envLabel() ? (
          <p className="nm-muted">
            Miljø: {envLabel()}
            {e.SPOND_MOCK ? " (simulert Spond med demodata)" : ""}
            {!e.DATABASE_URL ? " · simulert database" : ""}
            {aiMode() === "mock" ? " · simulert KI" : aiMode() === "off" ? " · KI er ikke satt opp" : ""}
          </p>
        ) : null}
      </section>
    </SettingsShell>
  );
}
