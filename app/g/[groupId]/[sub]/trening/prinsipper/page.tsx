import { AppShell } from "@/components/shell/AppShell";
import { LearningForm, PrinciplesForm, ScopeNote } from "@/components/training/forms";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { savedAt } from "@/lib/format";
import { profileName } from "@/lib/proposal-view";
import { learningState, principlesState } from "@/lib/store/training";

/** «Slik trener vi»: the trainers' principles and the learnings from the evaluations. KI uses both. */
export default async function PrinciplesPage(props: PageProps<"/g/[groupId]/[sub]/trening/prinsipper">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const sub = ctx.subgroup?.id ?? "";
  const [pr, st] = await Promise.all([principlesState(d, ctx.user.access, ctx.group.id, sub, 6), learningState(d, ctx.user.access, ctx.group.id, sub, 6)]);
  const current = st.versions[0];
  const scope = { groupId: ctx.group.id, sub, subName: ctx.label, mainName: ctx.group.name };
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="prinsipper" />
      <p style={{ margin: "0 0 var(--space-4)" }}>Måter laget vil gjøre ting på, som ikke hører til én øvelse. KI bruker begge delene når den lager opplegg.</p>
      <section className="nm-section">
        <h2 className="nm-h2">Prinsipper</h2>
        <ScopeNote {...scope} inherited={pr.inherited} part="principles" />
        <PrinciplesForm key={pr.versions[0]?.id ?? 0} groupId={ctx.group.id} sub={sub} initial={pr.versions[0]?.body ?? ""} />
        {pr.versions[0] ? (
          <p className="nm-hint">
            Sist endret av {profileName(ctx.group, pr.versions[0].created_by)} {savedAt(pr.versions[0].created_at)}.
          </p>
        ) : null}
      </section>
      <section className="nm-section">
        <h2 className="nm-h2">Lærdommer</h2>
        <ScopeNote {...scope} inherited={st.inherited} part="learnings" />
        <LearningForm key={current?.id ?? 0} groupId={ctx.group.id} sub={sub} initial={current?.body ?? ""} canKi={ctx.user.rights.ai} nNew={st.nNew} />
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
