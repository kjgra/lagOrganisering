import { AppShell } from "@/components/shell/AppShell";
import { ScopeNote, TeamSettingsForm } from "@/components/training/forms";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { WeekdayPitches } from "@/components/training/WeekdayPitches";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { osloDate, osloParts, savedAt } from "@/lib/format";
import { currentRows, endingSoon, endingText, rowStatus, spanText } from "@/lib/plans/pitch-schedule";
import { pitchGroups } from "@/lib/plans/plan";
import { profileName } from "@/lib/proposal-view";
import { listWeekdayPitches } from "@/lib/store/pitch-schedule";
import { getTeamSettings, listPitches } from "@/lib/store/training";

/** «Laget»: age, session length, pitches and equipment, as the starting point for every session. */
export default async function TeamPage(props: PageProps<"/g/[groupId]/[sub]/trening/laget">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const sub = ctx.subgroup?.id ?? "";
  const [s, pitches, fixed] = await Promise.all([
    getTeamSettings(d, ctx.user.access, ctx.group.id, sub),
    listPitches(d),
    listWeekdayPitches(d, ctx.user.access, ctx.group.id, sub),
  ]);
  const today = osloDate(new Date());
  const ending = endingSoon(fixed.rows, today);
  const nameOf = new Map(pitches.map((p) => [p.id, p.name]));
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
          pitch: "",
          equipment: s.equipment,
        }}
        year={osloParts(new Date()).year}
      />
      {s.updated_by && s.updated_at ? (
        <p className="nm-hint">
          Sist endret av {profileName(ctx.group, s.updated_by)} {savedAt(s.updated_at)}.
        </p>
      ) : null}
      <h2 className="nm-section-label" id="faste-baner">
        Faste baner per ukedag
      </h2>
      {fixed.inherited && fixed.rows.length ? (
        <p className="nm-hint" style={{ marginTop: 0 }}>
          {ctx.label} følger {ctx.group.name}. Lagrer du, får {ctx.label} sine egne.
        </p>
      ) : null}
      <WeekdayPitches
        groupId={ctx.group.id}
        sub={sub}
        groups={pitchGroups(pitches, fixed.rows.flatMap((r) => r.pitch_ids))}
        rows={currentRows(fixed.rows, today)
          .filter((r) => !r.valid_to || r.valid_to >= today)
          // In force first by weekday, then the coming ones by start.
          .sort((a, b) => Number(a.valid_from > today) - Number(b.valid_from > today) || (a.valid_from > today ? a.valid_from.localeCompare(b.valid_from) : 0) || a.weekday - b.weekday)
          .map((r) => ({
            id: r.id,
            weekday: r.weekday,
            from: r.valid_from,
            to: r.valid_to,
            pitchIds: r.pitch_ids,
            pitchNames: r.pitch_ids.map((id) => nameOf.get(id) ?? "Ukjent bane"),
            span: spanText(r),
            status: rowStatus(r, today, ending) as "now" | "coming" | "ending",
          }))}
        today={today}
        ending={endingText(ending, today)}
      />
    </AppShell>
  );
}
