import { ClipboardList, Pencil, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { nffSummary } from "@/lib/nff/fagplan";
import { feedbackSummary, shouldAvoid } from "@/lib/plans/feedback";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";
import { listExercises } from "@/lib/store/training";

/** The team's exercise bank, for every trainer. */
export default async function ExercisesPage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser">) {
  const ctx = await contextFromParams(props.params);
  const bank = await listExercises(await db(), ctx.user.access, ctx.group.id);
  const cats = Object.keys(CATEGORIES).filter((c) => bank.some((b) => b.category === c));
  const status = (s: string) => (s === "active" ? "nm-badge--kommer" : s === "candidate" ? "nm-badge--ikke-svart" : "nm-badge--neutral");
  const base = ctx.path("/trening/ovelser");
  const buttons = (
    <div className="nm-row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
      <Link href={`${base}/ny`} className="nm-btn nm-btn--primary">
        <Icon icon={Plus} />
        Ny øvelse
      </Link>
      {ctx.user.rights.ai ? (
        <Link href={`${base}/ki`} className="nm-btn nm-btn--secondary">
          <Icon icon={Sparkles} />
          Ny øvelse med KI
        </Link>
      ) : null}
    </div>
  );
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="ovelser" />
      {ctx.subgroup ? (
        <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>
          Øvelsesbanken er felles for hele {ctx.group.name}.
        </p>
      ) : null}
      {bank.length ? (
        <>
          <p style={{ marginTop: 0 }}>
            Lagets øvelsesbank. Nye øvelser fra godkjente opplegg kommer inn som <em>kandidater</em>, og blir aktive når en trener gir 👍 og «Bruke igjen: Ja». Trykk på en øvelse for å evaluere den, også uten at den er brukt på en trening, eller på blyanten for å endre den.
          </p>
          {buttons}
          {cats.map((c) => (
            <section key={c} className="nm-section">
              <h3 className="nm-section-label">{CATEGORIES[c]}</h3>
              <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {bank
                  .filter((b) => b.category === c)
                  .map((b) => (
                    <li key={b.id} className="nm-pick">
                      <div>
                        <Link href={`${base}/${b.id}/evaluering`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                          {b.name}
                        </Link>
                        <div className="nm-hint">
                          {feedbackSummary(b)}
                          {b.fb_last ? ` · sist ${shortDate(b.fb_last)}` : ""}
                          {b.based_on ? ` · variant av ${bank.find((x) => x.code === b.based_on)?.name ?? b.based_on}` : ""}
                        </div>
                        {nffSummary(b) ? <div className="nm-hint">NFF: {nffSummary(b)}</div> : null}
                      </div>
                      {shouldAvoid(b) ? <span className="nm-badge nm-badge--kommer-ikke">Unngås av KI</span> : null}
                      <span className={`nm-badge ${status(b.status)}`}>{EXERCISE_STATUSES[b.status]}</span>
                      <Link href={`${base}/${b.id}`} className="nm-btn nm-btn--ghost" aria-label={`Endre ${b.name}`} title="Endre øvelsen">
                        <Icon icon={Pencil} />
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <EmptyState icon={ClipboardList} text="Banken er tom. Øvelser fra godkjente opplegg kommer hit, eller lag en selv.">
          {buttons}
        </EmptyState>
      )}
    </AppShell>
  );
}
