import { AppShell } from "@/components/shell/AppShell";
import { ScopeNote, TeamSettingsForm, type PitchGroup } from "@/components/training/forms";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { osloParts, savedAt } from "@/lib/format";
import { pitchFacts, pitchTree, type Pitch } from "@/lib/plans/plan";
import { profileName } from "@/lib/proposal-view";
import { getTeamSettings, listPitches } from "@/lib/store/training";

/** Main pitches with their sub-pitches; retired pitches only when the team has them. */
function pitchGroups(pitches: Pitch[], chosen: number[]): PitchGroup[] {
  const groups: PitchGroup[] = [];
  for (const { pitch: p, depth } of pitchTree(pitches)) {
    if (depth === 0) groups.push({ title: p.name, pitches: [] });
    if (p.retired && !chosen.includes(p.id)) continue;
    groups.at(-1)?.pitches.push({ id: p.id, depth, name: p.name, facts: pitchFacts(p) });
  }
  return groups.filter((g) => g.pitches.length);
}

/** «Laget»: age, session length, pitches and equipment, as the starting point for every session. */
export default async function TeamPage(props: PageProps<"/g/[groupId]/[sub]/trening/laget">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const sub = ctx.subgroup?.id ?? "";
  const [s, pitches] = await Promise.all([getTeamSettings(d, ctx.user.access, ctx.group.id, sub), listPitches(d)]);
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="laget" />
      <p style={{ marginTop: 0 }}>Det som gjelder for laget hver gang. Brukes som utgangspunkt i opplegg og av KI.</p>
      <ScopeNote groupId={ctx.group.id} sub={sub} subName={ctx.label} mainName={ctx.group.name} inherited={s.inherited} part="team" />
      <TeamSettingsForm
        key={String(s.inherited)}
        groupId={ctx.group.id}
        sub={sub}
        initial={{
          age_group: s.age_group,
          birth_year: s.birth_year ? String(s.birth_year) : "",
          gender: s.gender ?? "",
          session_minutes: s.session_minutes ? String(s.session_minutes) : "",
          pitch: s.pitch,
          equipment: s.equipment,
        }}
        initialPitches={s.pitch_ids}
        pitchGroups={pitchGroups(pitches, s.pitch_ids)}
        year={osloParts(new Date()).year}
      />
      {s.updated_by && s.updated_at ? (
        <p className="nm-hint">
          Sist endret av {profileName(ctx.group, s.updated_by)} {savedAt(s.updated_at)}.
        </p>
      ) : null}
    </AppShell>
  );
}
