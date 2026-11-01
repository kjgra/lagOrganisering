import { Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ImprovementTabs } from "@/components/training/ImprovementTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { PROPOSAL_KINDS, PROPOSAL_STATUSES } from "@/lib/plans/improvements";
import { NEEDS, needPatterns } from "@/lib/plans/needs";
import { bandLabel } from "@/lib/plans/observations";
import { profileName } from "@/lib/proposal-view";
import { getAiSettings } from "@/lib/store/ai";
import { listProposals } from "@/lib/store/improvements";
import { needRows } from "@/lib/store/needs";

/** «Forbedringer»: proposals for better exercises, made from the trainers' evaluations. */
export default async function ImprovementsPage(props: PageProps<"/g/[groupId]/[sub]/trening/forbedringer">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const [{ open, auto, handled }, rows, settings] = await Promise.all([listProposals(d, ctx.user.access, ctx.group.id), needRows(d), getAiSettings(d)]);
  // Counts only, across all teams: what trainers keep asking KI for, per age band.
  const asked = needPatterns(rows, { minSessions: settings.pattern_min_sessions, minTrainers: settings.pattern_min_trainers });
  const askedBands = [...new Set(asked.map((x) => x.band))];
  const base = ctx.path("/trening/forbedringer");
  return (
    <AppShell ctx={ctx} title="Forbedringer" section="training" back={ctx.path("/trening/ovelser")}>
      <ImprovementTabs ctx={ctx} current="forslag" />
      <p style={{ marginTop: 0, maxWidth: 760 }}>
        Når flere trenere eller økter peker på det samme problemet med en øvelse, lager KI et forslag til en bedre versjon. Appen ser også over hele banken: nye øvelser der en
        aldersgruppe mangler gode øvelser for et hovedtema, nesten like øvelser og øvelser som mangler info. Se over forslaget og velg «Bruk», «Endre først» eller «Avvis».
      </p>
      {open.length ? (
        <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0, maxWidth: 760 }}>
          {open.map((p) => (
            <li key={p.id} className="nm-pick">
              <div>
                <Link href={`${base}/${p.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                  {p.exercise_name}
                </Link>
                <div className="nm-hint">
                  {PROPOSAL_KINDS[p.kind]} · {shortDate(p.created_at)}
                </div>
                <div className="nm-hint">{p.reason}</div>
              </div>
              <span className="nm-badge nm-badge--ikke-svart">
                <Icon icon={Sparkles} size={16} />
                {PROPOSAL_STATUSES.ny}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Sparkles} text="Ingen forslag venter. Nye forslag kommer når trenerne har evaluert nok." />
      )}
      {auto.length ? (
        <section className="nm-section" aria-labelledby="auto-h" style={{ maxWidth: 760 }}>
          <h2 id="auto-h" className="nm-section-label">
            Gjort automatisk
          </h2>
          <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {auto.map((p) => (
              <li key={p.id} className="nm-pick">
                <div>
                  <Link href={`${base}/${p.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                    {p.exercise_name}
                  </Link>
                  <div className="nm-hint">
                    {p.kind === "tilbakerulling" ? "Gått tilbake til forrige versjon" : "Liten forbedring brukt automatisk"} · {p.decided_at ? shortDate(p.decided_at) : ""}
                  </div>
                  <div className="nm-hint">{p.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {handled.length ? (
        <section className="nm-section" aria-labelledby="handled-h" style={{ maxWidth: 760 }}>
          <h2 id="handled-h" className="nm-section-label">
            Behandlet
          </h2>
          <ul className="nm-hint" style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
            {handled.map((p) => (
              <li key={p.id}>
                {p.exercise_name} · {PROPOSAL_KINDS[p.kind]} · {PROPOSAL_STATUSES[p.status]}
                {p.decided_at ? ` ${shortDate(p.decided_at)}` : ""}
                {p.decided_by ? ` av ${profileName(ctx.group, p.decided_by)}` : ""}
                {p.rejection ? ` («${p.rejection}»)` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="nm-section" aria-labelledby="asked-h" style={{ maxWidth: 760 }}>
        <h2 id="asked-h" className="nm-section-label">
          Dette ber trenerne KI om
        </h2>
        {askedBands.length ? (
          <>
            <p className="nm-hint" style={{ marginTop: 0 }}>
              Ønsker og kommentarer til KI-opplegg fra alle lagene, telt per aldersgruppe. Vises når minst {settings.pattern_min_sessions} ønsker fra {settings.pattern_min_trainers} trenere sier det samme.
            </p>
            {askedBands.map((band) => (
              <div key={band}>
                <h3 style={{ fontSize: "var(--fs-body)", margin: "var(--space-2) 0 var(--space-1)" }}>{bandLabel(band)}</h3>
                <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                  {asked
                    .filter((x) => x.band === band)
                    .map((x) => (
                      <li key={x.need}>
                        {NEEDS[x.need]} <span className="nm-hint">· {x.sources} ganger fra {x.trainers} trenere</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <p className="nm-hint" style={{ marginTop: 0 }}>
            Ingen ønsker går igjen ennå. Når flere trenere ber KI om det samme for en aldersgruppe, for eksempel mindre kø eller færre spillere per gruppe, vises det her.
          </p>
        )}
      </section>
    </AppShell>
  );
}
