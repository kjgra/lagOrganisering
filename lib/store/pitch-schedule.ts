import type { Db } from "@/lib/db";
import {
  currentRows,
  eventPitches,
  samePitches,
  validateWeekdayPitches,
  type EventPitches,
  type WeekdayPitches,
  type WeekdayPitchesInput,
} from "@/lib/plans/pitch-schedule";
import { assertGroup, UserError, type Access } from "./access";

/**
 * Faste baner per ukedag (weekday_pitches) and the pitches for one training
 * (event_pitches). See lib/plans/pitch-schedule.ts for the rules.
 */

const COLS = "id, weekday, valid_from::text AS valid_from, valid_to::text AS valid_to, pitch_ids, updated_by, updated_at";

const ids = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((x) => Number.isInteger(x)) : []);

function rowOf(r: WeekdayPitches): WeekdayPitches {
  return { ...r, id: Number(r.id), weekday: Number(r.weekday), pitch_ids: ids(r.pitch_ids) };
}

async function rowsOf(d: Db, groupId: string, sub: string): Promise<WeekdayPitches[]> {
  const rows = await d.query<WeekdayPitches>(
    `SELECT ${COLS} FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY weekday, valid_from`,
    [groupId, sub],
  );
  return rows.map(rowOf);
}

/** The scope's fixed pitches; a subgroup without its own uses the main group's. */
export async function listWeekdayPitches(d: Db, access: Access, groupId: string, sub: string): Promise<{ rows: WeekdayPitches[]; inherited: boolean }> {
  assertGroup(access, groupId);
  if (sub) {
    const own = await rowsOf(d, groupId, sub);
    if (own.length) return { rows: own, inherited: false };
    return { rows: await rowsOf(d, groupId, ""), inherited: true };
  }
  return { rows: await rowsOf(d, groupId, ""), inherited: false };
}

/** The pitches must be at the facility (all of them can be chosen). */
async function checkPitches(d: Db, pitchIds: number[]) {
  if (!pitchIds.length) return;
  const known = await d.query<{ id: number }>("SELECT id FROM pitches WHERE id = ANY($1::int[])", [pitchIds]);
  if (known.length !== new Set(pitchIds).size) throw new UserError("Ukjent bane.");
}

/** Pitches the scope uses now or later: the fixed ones in force or coming, for all weekdays. */
export async function fixedPitchIds(d: Db, access: Access, groupId: string, sub: string, today: string): Promise<number[]> {
  const { rows } = await listWeekdayPitches(d, access, groupId, sub);
  const ids = currentRows(rows, today)
    .filter((r) => !r.valid_to || r.valid_to >= today)
    .flatMap((r) => r.pitch_ids);
  return [...new Set(ids)];
}

/**
 * Save fixed pitches from a date for the weekdays chosen; other weekdays are
 * left as they are. A subgroup that followed the main group first gets a copy
 * of the main group's rows, so its other weekdays keep their pitches.
 */
export async function saveWeekdayPitches(d: Db, access: Access, groupId: string, sub: string, input: WeekdayPitchesInput): Promise<void> {
  assertGroup(access, groupId);
  const problem = validateWeekdayPitches(input);
  if (problem) throw new UserError(problem);
  await checkPitches(d, [...new Set(input.days.flatMap((x) => x.pitch_ids))]);
  await d.tx(async (t) => {
    if (sub) {
      const own = await t.query<{ n: number }>("SELECT count(*)::int AS n FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
      if (!own[0]?.n) {
        await t.query(
          `INSERT INTO weekday_pitches (spond_group_id, spond_subgroup_id, weekday, valid_from, valid_to, pitch_ids, updated_by, updated_at)
           SELECT spond_group_id, $2, weekday, valid_from, valid_to, pitch_ids, updated_by, updated_at
             FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = ''`,
          [groupId, sub],
        );
      }
    }
    for (const day of input.days) {
      await t.query(
        `INSERT INTO weekday_pitches (spond_group_id, spond_subgroup_id, weekday, valid_from, valid_to, pitch_ids, updated_by)
         VALUES ($1, $2, $3, $4::date, $5::date, $6::int[], $7)
         ON CONFLICT (spond_group_id, spond_subgroup_id, weekday, valid_from) DO UPDATE
           SET valid_to = EXCLUDED.valid_to, pitch_ids = EXCLUDED.pitch_ids, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [groupId, sub, day.weekday, input.from, input.to, [...new Set(day.pitch_ids)], access.profileId],
      );
    }
  });
}

/** Delete one row of the scope's own fixed pitches. */
export async function deleteWeekdayPitches(d: Db, access: Access, groupId: string, sub: string, id: number): Promise<void> {
  assertGroup(access, groupId);
  const gone = await d.query("DELETE FROM weekday_pitches WHERE id = $1 AND spond_group_id = $2 AND spond_subgroup_id = $3 RETURNING id", [id, groupId, sub]);
  if (!gone.length) throw new UserError("Fant ikke de faste banene.");
}

/** Subgroup back to the main group's fixed pitches. */
export async function clearWeekdayPitches(d: Db, groupId: string, sub: string): Promise<void> {
  await d.query("DELETE FROM weekday_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
}

// One training ---------------------------------------------------------------------------------

/** Pitches set for single trainings, by event id. */
export async function eventOverrides(d: Db, access: Access, groupId: string, eventIds: string[]): Promise<Map<string, number[]>> {
  assertGroup(access, groupId);
  if (!eventIds.length) return new Map();
  const rows = await d.query<{ spond_event_id: string; pitch_ids: unknown }>(
    "SELECT spond_event_id, pitch_ids FROM event_pitches WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[])",
    [groupId, eventIds],
  );
  return new Map(rows.map((r) => [r.spond_event_id, ids(r.pitch_ids)]));
}

/** A training as the pitch rules need it. */
export interface PitchEvent {
  id: string;
  /** The subgroup the training is for, '' for the main group. */
  sub: string;
  /** Oslo date «YYYY-MM-DD», or null without a start time. */
  date: string | null;
}

/** The pitches for one training: its own, else the weekday's fixed ones. */
export async function pitchesForEvent(d: Db, access: Access, groupId: string, e: PitchEvent): Promise<EventPitches> {
  const [{ rows }, over] = await Promise.all([listWeekdayPitches(d, access, groupId, e.sub), eventOverrides(d, access, groupId, [e.id])]);
  return eventPitches(rows, over.get(e.id) ?? null, e.date);
}

/**
 * Set the pitches for one training. The weekday's fixed pitches (or none)
 * remove the override, so later changes to the fixed pitches apply again.
 */
export async function setEventPitches(d: Db, access: Access, groupId: string, e: PitchEvent, pitchIds: number[]): Promise<void> {
  assertGroup(access, groupId);
  const list = [...new Set(pitchIds)];
  if (list.length > 12) throw new UserError("Velg maks 12 baner.");
  await checkPitches(d, list);
  const now = await pitchesForEvent(d, access, groupId, e);
  if (!list.length || (now.fixed && samePitches(list, now.fixed.pitch_ids))) {
    await d.query("DELETE FROM event_pitches WHERE spond_group_id = $1 AND spond_event_id = $2", [groupId, e.id]);
    return;
  }
  await d.query(
    `INSERT INTO event_pitches (spond_group_id, spond_event_id, pitch_ids, updated_by) VALUES ($1, $2, $3::int[], $4)
     ON CONFLICT (spond_group_id, spond_event_id) DO UPDATE SET pitch_ids = EXCLUDED.pitch_ids, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [groupId, e.id, list, access.profileId],
  );
}

/** The pitches for many trainings at once (the events list), by event id. */
export async function pitchesForEvents(d: Db, access: Access, groupId: string, events: PitchEvent[]): Promise<Map<string, EventPitches>> {
  assertGroup(access, groupId);
  if (!events.length) return new Map();
  const all = (
    await d.query<WeekdayPitches & { spond_subgroup_id: string }>(
      `SELECT spond_subgroup_id, ${COLS} FROM weekday_pitches WHERE spond_group_id = $1 ORDER BY weekday, valid_from`,
      [groupId],
    )
  ).map((r) => ({ ...rowOf(r), spond_subgroup_id: r.spond_subgroup_id }));
  const rowsFor = (sub: string) => {
    const own = all.filter((r) => r.spond_subgroup_id === sub);
    return own.length || !sub ? own : all.filter((r) => r.spond_subgroup_id === "");
  };
  const over = await eventOverrides(d, access, groupId, events.map((e) => e.id));
  return new Map(events.map((e) => [e.id, eventPitches(rowsFor(e.sub), over.get(e.id) ?? null, e.date)]));
}
