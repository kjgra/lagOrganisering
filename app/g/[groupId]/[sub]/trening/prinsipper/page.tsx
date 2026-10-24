import { AppShell } from "@/components/shell/AppShell";
import { LearningForm, PrinciplesForm } from "@/components/training/forms";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { savedAt } from "@/lib/format";
import { profileName } from "@/lib/proposal-view";
import { getTeamSettings, learningState } from "@/lib/store/training";

/** «Slik trener vi»: the trainers' principles and the learnings from the evaluations. KI uses both. */
export default async function PrinciplesPage(props: PageProps<"/g/[groupId]/[sub]/trening/prinsipper">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const [team, st] = await Promise.all([getTeamSettings(d, ctx.user.access, ctx.group.id), learningState(d, ctx.user.access, ctx.group.id, 6)]);
  const current = st.versions[0];
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="prinsipper" />
      <p style={{ margin: "0 0 var(--space-4)" }}>Måter laget vil gjøre ting på, som ikke hører til én øvelse. KI bruker begge delene når den lager opplegg.</p>
      <section className="nm-section">
        <h2 className="nm-h2">Prinsipper</h2>
        <PrinciplesForm groupId={ctx.group.id} initial={team.principles} />
      </section>
      <section className="nm-section">
        <h2 className="nm-h2">Lærdommer</h2>
        <LearningForm key={current?.id ?? 0} groupId={ctx.group.id} initial={current?.body ?? ""} canKi={ctx.user.rights.ai} nNew={st.nNew} />
        {st.versions.length ? (
          <div style={{ marginTop: "var(--space-5)" }}>
            <h3 className="nm-h3" style={{ marginBottom: "var(--space-2)" }}>
              Historikk
            </h3>
            {st.versions.map((v) => (
              <details key={v.id} className="nm-exercise">
                <summary style={{ cursor: "pointer", minHeight: "var(--touch-min)" }}>
                  {savedAt(v.created_at)} · {v.source === "ai" ? "med KI" : "manuelt"} av {profileName(ctx.group, v.created_by)}
                </summary>
                <p style={{ whiteSpace: "pre-wrap" }}>{v.body}</p>
              </details>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
