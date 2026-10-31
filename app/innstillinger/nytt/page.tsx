import { SettingsShell } from "@/components/settings/SettingsShell";
import { requireUser } from "@/lib/auth/current";
import { releaseDate, UNRELEASED } from "@/lib/changelog";
import { APP_VERSION, readChangelog } from "@/lib/changelog-file";
import { env } from "@/lib/env";
import { safeBack } from "@/lib/settings-nav";

/** «Hva er nytt»: the version log from CHANGELOG.md, newest first. */
export default async function WhatsNewPage(props: PageProps<"/innstillinger/nytt">) {
  const user = await requireUser();
  const back = safeBack((await props.searchParams).fra);
  // «Ikke utgitt» is shown only outside production, where it is already deployed.
  const releases = (await readChangelog()).filter((r) => r.version !== UNRELEASED || env().VERCEL_ENV !== "production");
  return (
    <SettingsShell user={user} back={back} tab="nytt">
      <h2 className="nm-h2">Hva er nytt</h2>
      <p className="nm-muted" style={{ margin: "0 0 var(--space-5)" }}>
        Du bruker versjon {APP_VERSION}.
      </p>
      {releases.length ? (
        releases.map((r) => (
          <section key={r.version} className="nm-section nm-changes" aria-labelledby={`v-${r.version}`}>
            <h3 id={`v-${r.version}`} className="nm-changes__title">
              {r.version === UNRELEASED ? "Kommer snart" : `Versjon ${r.version}`}
              {r.date ? <span className="nm-hint"> · {releaseDate(r.date)}</span> : null}
            </h3>
            {r.version === UNRELEASED ? <p className="nm-hint">Ligger i denne testversjonen, men ikke i appen trenerne bruker ennå.</p> : null}
            {r.summary ? <p className="nm-changes__summary">{r.summary}</p> : null}
            {r.groups.map((g) => (
              <div key={g.kind}>
                <h4 className="nm-h3">{g.kind}</h4>
                <ul className="nm-plan-list nm-changes__list">
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      ) : (
        <p>Versjonsloggen er ikke tilgjengelig akkurat nå.</p>
      )}
    </SettingsShell>
  );
}
