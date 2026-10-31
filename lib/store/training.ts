import type { Db } from "@/lib/db";
import { isSensitive, commentProblem } from "@/lib/sensitive";
import {
  exerciseCode,
  planJson,
  validateExercise,
  validatePlan,
  validateSeason,
  validateTeamSettings,
  categoryKey,
  CODE_RE,
  PlanError,
  type BankExercise,
  type ExerciseInput,
  type Plan,
  type PlanExercise,
  type Pitch,
  type TeamSettings,
} from "@/lib/plans/plan";
import { compactDrawing, validateDrawing } from "@/lib/plans/drawing";
import { osloParts } from "@/lib/format";
import { teamBand } from "@/lib/nff/bands";
import type { BandKey } from "@/lib/nff/fagplan";
import { exerciseChanges, type ExerciseChanges } from "@/lib/plans/exercise-edits";
import { exerciseValues, type ExerciseValues } from "@/lib/plans/exercise-values";
import { assertAdmin, assertGroup, UserError, type Access, type Rights } from "./access";
import { hasEdits, logEdit } from "./edits";

/**
 * Season plan, team settings, the exercise bank, training plans with
 * versions, comments, evaluations and the team's learnings. Only Spond ids
 * and the trainers' own text are stored; no names.
 */

const wrap = <T>(f: () => T): T => {
  try {
    return f();
  } catch (err) {
    if (err instanceof PlanError) throw new UserError(err.message);
    throw err;
  }
};

// Scopes: a main group, or one of its subgroups ------------------------------------------

/**
 * The season plan, the team settings, the principles and the learnings belong
 * to a scope: the main group (sub '') or one of its subgroups. A subgroup
 * without its own uses the main group's («inherited»). The exercise bank is
 * the main group's.
 */
export type Part = "season" | "team" | "principles" | "learnings";

/** Evaluations that count for a scope: all for the main group; for a subgroup, its own and those for the whole group. */
const FEEDBACK_IN_SCOPE = "($2 = '' OR cardinality(f.spond_subgroup_ids) = 0 OR $2 = ANY(f.spond_subgroup_ids))";

/** Make a subgroup use the main group's again: its own rows for that part are deleted. */
export async function followMainGroup(d: Db, access: Access, groupId: string, sub: string, part: Part, year?: number): Promise<void> {
  assertGroup(access, groupId);
  if (!sub) throw new UserError("Hovedgruppa har ikke noe å arve fra.");
  await d.tx(async (t) => {
    if (part === "season") await t.query("DELETE FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND year = $3", [groupId, sub, year ?? 0]);
    if (part === "team") {
      await t.query("DELETE FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
      await t.query("DELETE FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
    }
    if (part === "principles") await t.query("DELETE FROM team_principles WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
    if (part === "learnings") await t.query("DELETE FROM team_learnings WHERE spond_group_id = $1 AND spond_subgroup_id = $2", [groupId, sub]);
  });
}

// Season plan (årshjul) -----------------------------------------------------------------

export interface SeasonRow {
  month: number;
  theme: string;
  description: string;
  updated_by: string;
  updated_at: Date;
}

/** A year of the season plan: the subgroup's own if it has one that year, else the main group's. */
export async function listSeason(d: Db, access: Access, groupId: string, sub: string, year: number): Promise<{ rows: SeasonRow[]; inherited: boolean }> {
  assertGroup(access, groupId);
  const rows = await d.query<SeasonRow & { spond_subgroup_id: string }>(
    `SELECT spond_subgroup_id, month, theme, coalesce(description, '') AS description, updated_by, updated_at
       FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '') AND year = $3 ORDER BY month`,
    [groupId, sub, year],
  );
  const inherited = !!sub && !rows.some((r) => r.spond_subgroup_id === sub);
  const scope = inherited ? "" : sub;
  const own = rows.filter((r) => r.spond_subgroup_id === scope);
  return { rows: own.map((r) => ({ month: r.month, theme: r.theme, description: r.description, updated_by: r.updated_by, updated_at: r.updated_at })), inherited };
}

/** Save a year of the season plan for the scope. A subgroup with no themes left uses the main group's again. */
export async function saveSeason(d: Db, access: Access, groupId: string, sub: string, year: number, themes: string[], descriptions: string[]): Promise<void> {
  assertGroup(access, groupId);
  const rows = wrap(() => validateSeason(year, themes, descriptions));
  await d.tx(async (t) => {
    await t.query(
      "DELETE FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND year = $3 AND NOT (month = ANY($4::int[]))",
      [groupId, sub, year, rows.map((r) => r.month)],
    );
    for (const r of rows) {
      await t.query(
        `INSERT INTO season_themes (spond_group_id, spond_subgroup_id, year, month, theme, description, updated_by)
         VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7)
         ON CONFLICT (spond_group_id, spond_subgroup_id, year, month) DO UPDATE
           SET theme = EXCLUDED.theme, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = now()
           WHERE season_themes.theme IS DISTINCT FROM EXCLUDED.theme OR season_themes.description IS DISTINCT FROM EXCLUDED.description`,
        [groupId, sub, year, r.month, r.theme, r.description, access.profileId],
      );
    }
  });
}

/** The theme for a month (Oslo), or null. */
export async function seasonTheme(d: Db, access: Access, groupId: string, sub: string, year: number, month: number) {
  const { rows } = await listSeason(d, access, groupId, sub, year);
  const hit = rows.find((r) => r.month === month);
  return hit ? { theme: hit.theme, description: hit.description } : null;
}

// Team settings -----------------------------------------------------------------------------

export interface StoredTeamSettings extends TeamSettings {
  updated_by: string | null;
  updated_at: Date | null;
  /** A subgroup without its own settings: these are the main group's. */
  inherited: boolean;
}

export async function getTeamSettings(d: Db, access: Access, groupId: string, sub: string): Promise<StoredTeamSettings> {
  assertGroup(access, groupId);
  const rows = await d.query<Omit<StoredTeamSettings, "pitch_ids" | "inherited"> & { spond_subgroup_id: string }>(
    `SELECT spond_subgroup_id, coalesce(age_group, '') AS age_group, birth_year, gender, session_minutes, coalesce(pitch, '') AS pitch,
            coalesce(equipment, '') AS equipment, updated_by, updated_at
       FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '')`,
    [groupId, sub],
  );
  const inherited = !!sub && !rows.some((r) => r.spond_subgroup_id === sub);
  const scope = inherited ? "" : sub;
  const pitches = await d.query<{ pitch_id: number }>(
    "SELECT pitch_id FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY pitch_id",
    [groupId, scope],
  );
  const pitch_ids = pitches.map((p) => p.pitch_id);
  const row = rows.find((r) => r.spond_subgroup_id === scope);
  if (!row) return { age_group: "", birth_year: null, gender: null, session_minutes: null, pitch_ids, pitch: "", equipment: "", updated_by: null, updated_at: null, inherited };
  const { age_group, birth_year, gender, session_minutes, pitch, equipment, updated_by, updated_at } = row;
  return { age_group, birth_year, gender, session_minutes, pitch, equipment, updated_by, updated_at, pitch_ids, inherited };
}

/** «Laget»: age, session length, pitches and equipment for the scope. */
export async function saveTeamSettings(d: Db, access: Access, groupId: string, sub: string, input: Record<string, unknown>): Promise<void> {
  assertGroup(access, groupId);
  const s = wrap(() => validateTeamSettings(input));
  const known = await d.query<{ id: number }>("SELECT id FROM pitches WHERE id = ANY($1::int[])", [s.pitch_ids]);
  if (known.length !== s.pitch_ids.length) throw new UserError("Ukjent bane.");
  await d.tx(async (t) => {
    await t.query(
      `INSERT INTO team_settings (spond_group_id, spond_subgroup_id, age_group, birth_year, gender, session_minutes, pitch, equipment, updated_by)
       VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, NULLIF($7, ''), NULLIF($8, ''), $9)
       ON CONFLICT (spond_group_id, spond_subgroup_id) DO UPDATE
         SET age_group = EXCLUDED.age_group, birth_year = EXCLUDED.birth_year, gender = EXCLUDED.gender, session_minutes = EXCLUDED.session_minutes, pitch = EXCLUDED.pitch,
             equipment = EXCLUDED.equipment, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [groupId, sub, s.age_group, s.birth_year, s.gender, s.session_minutes, s.pitch, s.equipment, access.profileId],
    );
    await t.query("DELETE FROM team_pitches WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND NOT (pitch_id = ANY($3::int[]))", [groupId, sub, s.pitch_ids]);
    await t.query(
      "INSERT INTO team_pitches (spond_group_id, spond_subgroup_id, pitch_id) SELECT $1, $2, unnest($3::int[]) ON CONFLICT DO NOTHING",
      [groupId, sub, s.pitch_ids],
    );
  });
}

// Principles («Slik trener vi») ----------------------------------------------------------

export const PRINCIPLES_MAX = 2000;

interface Version {
  id: number;
  body: string;
  created_by: string;
  created_at: Date;
}

/** The latest versions in the scope, or the main group's when a subgroup has none. */
async function versions<T extends Version>(d: Db, table: "team_principles" | "team_learnings", cols: string, groupId: string, sub: string, n: number) {
  const own = await d.query<T>(
    `SELECT ${cols} FROM ${table} WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY created_at DESC, id DESC LIMIT $3`,
    [groupId, sub, n],
  );
  if (own.length || !sub) return { versions: own, inherited: false };
  const main = await d.query<T>(
    `SELECT ${cols} FROM ${table} WHERE spond_group_id = $1 AND spond_subgroup_id = '' ORDER BY created_at DESC, id DESC LIMIT $2`,
    [groupId, n],
  );
  return { versions: main, inherited: true };
}

export async function principlesState(d: Db, access: Access, groupId: string, sub: string, n = 6) {
  assertGroup(access, groupId);
  return versions<Version>(d, "team_principles", "id, body, created_by, created_at", groupId, sub, n);
}

export async function latestPrinciples(d: Db, access: Access, groupId: string, sub: string): Promise<string> {
  return (await principlesState(d, access, groupId, sub, 1)).versions[0]?.body ?? "";
}

/** A new version of the principles for the scope (also when emptied). Unchanged text saves nothing. */
export async function savePrinciples(d: Db, access: Access, groupId: string, sub: string, text: string): Promise<void> {
  assertGroup(access, groupId);
  const b = text.trim();
  if (b.length > PRINCIPLES_MAX) throw new UserError(`Prinsippene kan ha maks ${PRINCIPLES_MAX} tegn.`);
  if (isSensitive(b)) throw new UserError("Prinsippene skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  const last = await d.query<{ body: string }>(
    "SELECT body FROM team_principles WHERE spond_group_id = $1 AND spond_subgroup_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1",
    [groupId, sub],
  );
  if (last[0]?.body === b) return;
  await d.query("INSERT INTO team_principles (spond_group_id, spond_subgroup_id, body, created_by) VALUES ($1, $2, $3, $4)", [groupId, sub, b, access.profileId]);
}

// Pitches (shared by all groups) ------------------------------------------------------------

const PITCH_COLUMNS = "id, parent_id, facility, name, surface, pitch_type, lighting, length_m, width_m, retired";

export async function listPitches(d: Db): Promise<Pitch[]> {
  return d.query<Pitch>(`SELECT ${PITCH_COLUMNS} FROM pitches ORDER BY facility, sort, id`);
}

/** The team's pitches, in list order. */
/** The scope's pitches; a subgroup without its own team settings has the main group's. */
export async function teamPitches(d: Db, access: Access, groupId: string, sub: string): Promise<Pitch[]> {
  assertGroup(access, groupId);
  return d.query<Pitch>(
    `SELECT ${PITCH_COLUMNS.split(", ").map((c) => `p.${c}`).join(", ")}
       FROM team_pitches tp JOIN pitches p ON p.id = tp.pitch_id
      WHERE tp.spond_group_id = $1
        AND tp.spond_subgroup_id = CASE WHEN EXISTS (SELECT 1 FROM team_settings WHERE spond_group_id = $1 AND spond_subgroup_id = $2) THEN $2 ELSE '' END
      ORDER BY p.facility, p.sort, p.id`,
    [groupId, sub],
  );
}

// The exercise bank -------------------------------------------------------------------------

interface ExerciseRow {
  id: number;
  code: string;
  name: string;
  category: string;
  themes: string[];
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  area: string;
  organisation: string;
  execution: string;
  learning_points: string;
  questions: string;
  easier: string;
  harder: string;
  nff_url: string;
  drawing: string | null;
  source: "manual" | "ai";
  based_on: string;
  status: "active" | "candidate" | "archived";
  updated_at: Date;
  bands: BandKey[];
  nff_activity: string;
  nff_tags: string[];
  fb_n: number;
  fb_sessions: number;
  fb_bank: number;
  fb_good: number;
  fb_ok: number;
  fb_bad: number;
  fb_yes: number;
  fb_changes: number;
  fb_no: number;
  fb_mean: number | null;
  fb_minutes: number | null;
  fb_last: Date | null;
  fb_tags: string | null;
}

const EXERCISE_SELECT = `
  SELECT e.id, e.code, e.name, e.category, e.themes, e.min_players, e.max_players, e.duration_minutes,
         coalesce(e.area, '') AS area, coalesce(e.organisation, '') AS organisation, coalesce(e.execution, '') AS execution,
         coalesce(e.learning_points, '') AS learning_points, coalesce(e.questions, '') AS questions,
         coalesce(e.easier, '') AS easier, coalesce(e.harder, '') AS harder, coalesce(e.nff_url, '') AS nff_url,
         e.drawing::text AS drawing, e.source, coalesce(e.based_on, '') AS based_on, e.status, e.updated_at,
         e.bands, coalesce(e.nff_activity, '') AS nff_activity, e.nff_tags,
         coalesce(s.fb_n, 0) AS fb_n, coalesce(s.fb_sessions, 0) AS fb_sessions, coalesce(s.fb_bank, 0) AS fb_bank, coalesce(s.fb_good, 0) AS fb_good,
         coalesce(s.fb_ok, 0) AS fb_ok, coalesce(s.fb_bad, 0) AS fb_bad, coalesce(s.fb_yes, 0) AS fb_yes,
         coalesce(s.fb_changes, 0) AS fb_changes, coalesce(s.fb_no, 0) AS fb_no, s.fb_mean, s.fb_minutes, s.fb_last, t.fb_tags
    FROM exercises e
    LEFT JOIN (
      SELECT exercise_code, count(*)::int AS fb_n, count(DISTINCT spond_event_id)::int AS fb_sessions,
             (count(*) FILTER (WHERE plan_id IS NULL))::int AS fb_bank,
             avg(rating)::float8 AS fb_mean,
             (count(*) FILTER (WHERE rating = 3))::int AS fb_good, (count(*) FILTER (WHERE rating = 2))::int AS fb_ok,
             (count(*) FILTER (WHERE rating = 1))::int AS fb_bad,
             (count(*) FILTER (WHERE use_again = 'yes'))::int AS fb_yes, (count(*) FILTER (WHERE use_again = 'changes'))::int AS fb_changes,
             (count(*) FILTER (WHERE use_again = 'no'))::int AS fb_no,
             avg(actual_minutes)::float8 AS fb_minutes, max(updated_at) AS fb_last
        FROM exercise_feedback
       WHERE spond_group_id = $1 AND (exercise_no IS NOT NULL OR plan_id IS NULL) AND exercise_code IS NOT NULL
       GROUP BY exercise_code) s ON s.exercise_code = e.code
    LEFT JOIN (
      SELECT exercise_code, string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag) AS fb_tags
        FROM (SELECT exercise_code, tag, count(*) AS n FROM exercise_feedback, unnest(tags) AS tag
               WHERE spond_group_id = $1 AND (exercise_no IS NOT NULL OR plan_id IS NULL) AND exercise_code IS NOT NULL
               GROUP BY exercise_code, tag) t0
       GROUP BY exercise_code) t ON t.exercise_code = e.code
   WHERE e.spond_group_id = $1`;

function toBank(r: ExerciseRow): BankExercise {
  let drawing = null;
  try {
    drawing = r.drawing ? validateDrawing(JSON.parse(r.drawing)) : null;
  } catch {
    drawing = null;
  }
  const tags: Record<string, number> = {};
  for (const part of (r.fb_tags ?? "").split(",").filter(Boolean)) {
    const [k, n] = part.split(":");
    tags[k] = Number(n);
  }
  return { ...r, themes: r.themes ?? [], bands: r.bands ?? [], nff_tags: r.nff_tags ?? [], drawing, fb_tags: tags };
}

/** The bank of a main group with the trainers' evaluations summed up per code. */
export async function listExercises(d: Db, access: Access, groupId: string): Promise<BankExercise[]> {
  assertGroup(access, groupId);
  const rows = await d.query<ExerciseRow>(`${EXERCISE_SELECT} ORDER BY e.category, lower(e.name), e.id`, [groupId]);
  return rows.map(toBank);
}

export async function getExercise(d: Db, access: Access, groupId: string, id: number): Promise<BankExercise> {
  assertGroup(access, groupId);
  const rows = await d.query<ExerciseRow>(`${EXERCISE_SELECT} AND e.id = $2`, [groupId, id]);
  if (!rows.length) throw new UserError("Fant ikke øvelsen.");
  return toBank(rows[0]);
}

/**
 * Create or update an exercise (any trainer on the team). The code is made from the name once and never changes.
 * A change is logged (edit_log); `kiDraft` is KI's version from «Juster med KI», so both what KI suggested and
 * what the trainer changed in it are logged.
 */
export async function saveExercise(
  d: Db,
  access: Access,
  groupId: string,
  input: Partial<ExerciseInput>,
  id: number | null,
  opts: { kiDraft?: ExerciseValues } = {},
): Promise<number> {
  assertGroup(access, groupId);
  const v = wrap(() => validateExercise(input));
  const before = id ? await getExercise(d, access, groupId, id) : null;
  const drawing = v.drawing ? JSON.stringify(compactDrawing(v.drawing)) : null;
  const fields = [v.name, v.category, v.themes, v.min_players, v.max_players, v.duration_minutes, v.area, v.organisation, v.execution, v.learning_points, v.questions, v.easier, v.harder, v.nff_url, access.profileId, drawing, v.status, v.bands, v.nff_activity, v.nff_tags];
  if (!id) {
    const taken = (await d.query<{ code: string }>("SELECT code FROM exercises WHERE spond_group_id = $1", [groupId])).map((r) => r.code);
    const [{ id: newId }] = await d.query<{ id: number }>(
      `INSERT INTO exercises (spond_group_id, code, name, category, themes, min_players, max_players, duration_minutes, area,
                              organisation, execution, learning_points, questions, easier, harder, nff_url, created_by, updated_by,
                              drawing, status, bands, nff_activity, nff_tags)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''),
               NULLIF($13, ''), NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, ''), $17, $17, $18::jsonb, coalesce($19, 'active'),
               $20::text[], NULLIF($21, ''), $22::text[])
       RETURNING id`,
      [groupId, exerciseCode(v.name, taken), ...fields],
    );
    return newId;
  }
  const n = await d.query(
    `UPDATE exercises SET name = $3, category = $4, themes = $5::text[], min_players = $6, max_players = $7, duration_minutes = $8,
            area = NULLIF($9, ''), organisation = NULLIF($10, ''), execution = NULLIF($11, ''), learning_points = NULLIF($12, ''),
            questions = NULLIF($13, ''), easier = NULLIF($14, ''), harder = NULLIF($15, ''), nff_url = NULLIF($16, ''),
            updated_by = $17, drawing = $18::jsonb, status = coalesce($19, status), bands = $20::text[],
            nff_activity = NULLIF($21, ''), nff_tags = $22::text[], updated_at = now()
      WHERE id = $1 AND spond_group_id = $2 RETURNING id`,
    [id, groupId, ...fields],
  );
  if (!n.length) throw new UserError("Fant ikke øvelsen.");
  if (before) await logExerciseChange(d, access, groupId, before, input, opts.kiDraft);
  return id;
}

async function logExerciseChange(d: Db, access: Access, groupId: string, b: BankExercise, input: Partial<ExerciseInput>, kiDraft?: ExerciseValues) {
  const old = exerciseValues(b);
  const saved = { ...old, ...input, status: input.status || old.status } as ExerciseValues;
  const log = (kind: "ki_forslag" | "retting_av_ki" | "manuell", changes: ExerciseChanges) =>
    Object.keys(changes).length ? logEdit(d, access, groupId, { kind, exerciseCode: b.code, changes }) : Promise.resolve();
  if (kiDraft) {
    await log("ki_forslag", exerciseChanges(old, kiDraft));
    await log("retting_av_ki", exerciseChanges(kiDraft, saved));
    return;
  }
  // The first change of an exercise KI made is a correction of KI.
  const kind = b.source === "ai" && !(await hasEdits(d, groupId, b.code)) ? "retting_av_ki" : "manuell";
  await log(kind, exerciseChanges(old, saved));
}

export async function deleteExercise(d: Db, access: Access, rights: Rights, groupId: string, id: number): Promise<void> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  // Variants of the deleted exercise become exercises of their own.
  await d.tx(async (t) => {
    const gone = await t.query<{ code: string }>("DELETE FROM exercises WHERE id = $1 AND spond_group_id = $2 RETURNING code", [id, groupId]);
    if (gone.length) await t.query("UPDATE exercises SET based_on = NULL WHERE spond_group_id = $1 AND based_on = $2", [groupId, gone[0].code]);
  });
}

/**
 * Put one exercise from an approved plan (or «Ny øvelse med KI») into the
 * bank, as a candidate. If the bank has the code already, nothing changes
 * (null). A variant of a variant points to the base exercise, so families stay flat.
 */
export async function savePlanExercise(
  d: Db,
  access: Access,
  groupId: string,
  e: PlanExercise,
  themes: string[],
  source: "manual" | "ai",
  extra: { min_players?: number | null; max_players?: number | null; duration_minutes?: number | null; area?: string; bands?: BandKey[] } = {},
): Promise<number | null> {
  assertGroup(access, groupId);
  const known = await d.query<{ code: string; based_on: string | null }>(
    "SELECT code, based_on FROM exercises WHERE spond_group_id = $1 AND code IN ($2, $3)",
    [groupId, e.kode, e.basert_pa],
  );
  if (known.some((k) => k.code === e.kode)) return null;
  const base = known.find((k) => k.code === e.basert_pa);
  const basedOn = !e.basert_pa || !base ? null : base.based_on || e.basert_pa;
  const taken = (await d.query<{ code: string }>("SELECT code FROM exercises WHERE spond_group_id = $1", [groupId])).map((r) => r.code);
  const code = CODE_RE.test(e.kode) && e.kode.length <= 60 ? e.kode : exerciseCode(e.navn, taken);
  const bands = extra.bands ?? (await teamBands(d, groupId));
  const join = (x: string[]) => x.join("\n");
  const [{ id }] = await d.query<{ id: number }>(
    `INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, questions,
                            easier, harder, nff_url, drawing, source, created_by, updated_by, based_on, status,
                            min_players, max_players, duration_minutes, area, bands, nff_activity, nff_tags)
     VALUES ($1, $2, $3, $4, $5::text[], NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''),
             NULLIF($11, ''), NULLIF($12, ''), $13::jsonb, $14, $15, $15, $16, 'candidate', $17, $18, $19, NULLIF($20, ''),
             $21::text[], NULLIF($22, ''), $23::text[])
     RETURNING id`,
    [
      groupId,
      code,
      e.navn.slice(0, 80),
      categoryKey(e.kategori),
      themes.filter(Boolean).slice(0, 10),
      join(e.organisering).slice(0, 2000),
      join(e.gjennomforing).slice(0, 2000),
      join(e.laeringsmomenter).slice(0, 2000),
      join(e.sporsmal).slice(0, 2000),
      e.enklere.slice(0, 1000),
      e.vanskeligere.slice(0, 1000),
      e.nff_url,
      e.tegning ? JSON.stringify(compactDrawing(e.tegning)) : null,
      source,
      access.profileId,
      basedOn,
      extra.min_players ?? null,
      extra.max_players ?? null,
      extra.duration_minutes ?? null,
      (extra.area ?? "").slice(0, 60),
      bands,
      e.aktivitet ?? "",
      e.nff_tags ?? [],
    ],
  );
  return id;
}

/** The NFF band the team is in this year, from its birth year (none if unknown or over 12). */
async function teamBands(d: Db, groupId: string): Promise<BandKey[]> {
  const [row] = await d.query<{ birth_year: number | null }>("SELECT birth_year FROM team_settings WHERE spond_group_id = $1", [groupId]);
  const band = teamBand(row?.birth_year ?? null, osloParts(new Date()).year);
  return band ? [band] : [];
}

// Training plans ----------------------------------------------------------------------------

export interface PlanVersion {
  id: number;
  version: number;
  status: "draft" | "approved" | "deleted" | "pending" | "rejected";
  source: "manual" | "ai";
  title: string;
  created_by: string;
  created_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
}

export async function planVersions(d: Db, access: Access, groupId: string, eventId: string): Promise<PlanVersion[]> {
  assertGroup(access, groupId);
  return d.query<PlanVersion>(
    `SELECT id, version, status, source, plan->>'tittel' AS title, created_by, created_at, approved_by, approved_at
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2 AND status <> 'deleted'
      ORDER BY version DESC`,
    [groupId, eventId],
  );
}

/** The latest version per event, for event lists. */
export async function latestPlans(d: Db, access: Access, groupId: string, eventIds: string[]) {
  assertGroup(access, groupId);
  if (!eventIds.length) return [];
  return d.query<{ spond_event_id: string; version: number; approved: boolean }>(
    `SELECT spond_event_id, max(version)::int AS version, bool_or(status = 'approved') AS approved
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[]) AND status <> 'deleted'
      GROUP BY spond_event_id`,
    [groupId, eventIds],
  );
}

/**
 * The plan to reuse from earlier events (newest first): the first event that
 * has one, and its approved version, else its newest.
 */
export async function previousPlan(d: Db, access: Access, groupId: string, eventIds: string[]): Promise<{ id: number; eventId: string; title: string } | null> {
  assertGroup(access, groupId);
  if (!eventIds.length) return null;
  const rows = await d.query<{ id: number; spond_event_id: string; title: string }>(
    `SELECT DISTINCT ON (spond_event_id) id, spond_event_id, plan->>'tittel' AS title
       FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = ANY($2::text[]) AND status <> 'deleted'
      ORDER BY spond_event_id, (status = 'approved') DESC, version DESC`,
    [groupId, eventIds],
  );
  for (const eventId of eventIds) {
    const r = rows.find((x) => x.spond_event_id === eventId);
    if (r) return { id: r.id, eventId, title: r.title };
  }
  return null;
}

export interface StoredPlan {
  id: number;
  groupId: string;
  eventId: string;
  version: number;
  status: PlanVersion["status"];
  source: "manual" | "ai";
  model: string;
  costUsd: number | null;
  createdBy: string;
  createdAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  plan: Plan;
}

export async function getPlan(d: Db, access: Access, id: number): Promise<StoredPlan> {
  const rows = await d.query<{
    id: number;
    spond_group_id: string;
    spond_event_id: string;
    version: number;
    status: PlanVersion["status"];
    source: "manual" | "ai";
    model: string | null;
    cost_usd: number | null;
    created_by: string;
    created_at: Date;
    approved_by: string | null;
    approved_at: Date | null;
    plan: string;
  }>(
    `SELECT id, spond_group_id, spond_event_id, version, status, source, model, cost_usd::float8 AS cost_usd,
            created_by, created_at, approved_by, approved_at, plan::text AS plan
       FROM training_plans WHERE id = $1 AND status <> 'deleted'`,
    [id],
  );
  if (!rows.length) throw new UserError("Fant ikke opplegget.");
  const r = rows[0];
  assertGroup(access, r.spond_group_id);
  return {
    id: r.id,
    groupId: r.spond_group_id,
    eventId: r.spond_event_id,
    version: r.version,
    status: r.status,
    source: r.source,
    model: r.model ?? "",
    costUsd: r.cost_usd,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    approvedBy: r.approved_by,
    approvedAt: r.approved_at ? new Date(r.approved_at) : null,
    plan: wrap(() => validatePlan(JSON.parse(r.plan))),
  };
}

/** Save a plan as the next version for an event. Tries once more if two trainers save at once. */
export async function savePlan(
  d: Db,
  access: Access,
  groupId: string,
  eventId: string,
  plan: Plan,
  opts: { source?: "manual" | "ai"; model?: string; costUsd?: number | null; eventStart?: string | null; eventEnd?: string | null } = {},
): Promise<{ id: number; version: number }> {
  assertGroup(access, groupId);
  if (!eventId) throw new UserError("Mangler arrangement.");
  const json = planJson(wrap(() => validatePlan(plan)));
  // The event's time, so a reminder to evaluate can be sent after it (without Spond).
  const insert = () =>
    d.query<{ id: number; version: number }>(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, source, created_by, model, cost_usd, event_start, event_end)
       SELECT $1, $2, coalesce(max(version), 0) + 1, $3::jsonb, $4, $5, NULLIF($6, ''), $7, $8::timestamptz, $9::timestamptz
         FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2
       RETURNING id, version`,
      [groupId, eventId, json, opts.source ?? "manual", access.profileId, opts.model ?? "", opts.costUsd ?? null, opts.eventStart ?? null, opts.eventEnd ?? null],
    );
  try {
    return (await insert())[0];
  } catch (err) {
    if (!/duplicate key|unique/i.test((err as Error).message)) throw err;
    return (await insert())[0];
  }
}

/** Approve one version; another approved version for the event goes back to draft. */
export async function approvePlan(d: Db, access: Access, id: number): Promise<StoredPlan> {
  const pl = await getPlan(d, access, id);
  await d.tx(async (t) => {
    await t.query(
      `UPDATE training_plans SET status = 'draft', approved_by = NULL, approved_at = NULL
        WHERE spond_group_id = $1 AND spond_event_id = $2 AND status = 'approved' AND id <> $3`,
      [pl.groupId, pl.eventId, id],
    );
    await t.query(
      "UPDATE training_plans SET status = 'approved', approved_by = $2, approved_at = now() WHERE id = $1 AND status IN ('draft', 'approved')",
      [id, access.profileId],
    );
  });
  return pl;
}

export async function unapprovePlan(d: Db, access: Access, id: number): Promise<void> {
  await getPlan(d, access, id);
  await d.query("UPDATE training_plans SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = $1 AND status = 'approved'", [id]);
}

// Comments on plans ----------------------------------------------------------------------------

export interface PlanComment {
  id: number;
  plan_id: number;
  version: number;
  exercise_no: number | null;
  exercise_code: string;
  author: string;
  body: string;
  created_at: Date;
  used_in_plan_id: number | null;
  used_in_version: number | null;
}

export async function listPlanComments(d: Db, access: Access, groupId: string, eventId: string): Promise<PlanComment[]> {
  assertGroup(access, groupId);
  return d.query<PlanComment>(
    `SELECT c.id, c.plan_id, p.version, c.exercise_no, coalesce(c.exercise_code, '') AS exercise_code, c.author, c.body,
            c.created_at, c.used_in_plan_id, u.version AS used_in_version
       FROM training_plan_comments c
       JOIN training_plans p ON p.id = c.plan_id
       LEFT JOIN training_plans u ON u.id = c.used_in_plan_id
      WHERE c.spond_group_id = $1 AND c.spond_event_id = $2 AND p.status <> 'deleted'
      ORDER BY c.created_at, c.id`,
    [groupId, eventId],
  );
}

export async function addPlanComment(d: Db, access: Access, planId: number, body: string, exerciseNo: number | null): Promise<void> {
  const pl = await getPlan(d, access, planId);
  const problem = commentProblem(body, 1000);
  if (problem) throw new UserError(problem);
  let code = "";
  if (exerciseNo !== null) {
    if (exerciseNo < 1 || exerciseNo > pl.plan.ovelser.length) throw new UserError("Ukjent øvelse.");
    code = pl.plan.ovelser[exerciseNo - 1].kode;
  }
  await d.query(
    `INSERT INTO training_plan_comments (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, author, body)
     VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)`,
    [pl.groupId, pl.eventId, planId, exerciseNo, code, access.profileId, body.trim()],
  );
}

/** Delete one's own comment, as long as KI has not used it. */
export async function deletePlanComment(d: Db, access: Access, groupId: string, commentId: number): Promise<void> {
  assertGroup(access, groupId);
  const n = await d.query(
    "DELETE FROM training_plan_comments WHERE id = $1 AND spond_group_id = $2 AND author = $3 AND used_in_plan_id IS NULL RETURNING id",
    [commentId, groupId, access.profileId],
  );
  if (!n.length) throw new UserError("Kan bare slette egne kommentarer som ikke er brukt av KI.");
}

export async function markCommentsUsed(d: Db, access: Access, groupId: string, ids: number[], planId: number): Promise<void> {
  assertGroup(access, groupId);
  if (!ids.length) return;
  await d.query(
    "UPDATE training_plan_comments SET used_in_plan_id = $3 WHERE spond_group_id = $1 AND id = ANY($2::int[]) AND used_in_plan_id IS NULL",
    [groupId, ids, planId],
  );
}

// Evaluations --------------------------------------------------------------------------------

export interface FeedbackRow {
  id: number;
  plan_id: number | null;
  exercise_no: number | null;
  exercise_code: string;
  rating: number | null;
  tags: string[];
  actual_minutes: number | null;
  actual_players: number | null;
  body: string;
  use_again: "" | "yes" | "changes" | "no";
  author: string;
  updated_at: Date;
}

export async function listFeedback(d: Db, access: Access, groupId: string, eventId: string): Promise<FeedbackRow[]> {
  assertGroup(access, groupId);
  return d.query<FeedbackRow>(
    `SELECT id, plan_id, exercise_no, coalesce(exercise_code, '') AS exercise_code, rating, tags, actual_minutes, actual_players,
            coalesce(body, '') AS body, coalesce(use_again, '') AS use_again, author, updated_at
       FROM exercise_feedback WHERE spond_group_id = $1 AND spond_event_id = $2
      ORDER BY plan_id, exercise_no NULLS FIRST, updated_at, id`,
    [groupId, eventId],
  );
}

export interface FeedbackInput {
  exercise_no: number | null;
  exercise_code: string;
  rating: number | null;
  tags: string[];
  actual_minutes: number | null;
  actual_players: number | null;
  body: string;
  use_again: string;
}

/**
 * Replace one trainer's evaluation of a plan version. A candidate in the bank
 * that gets 👍 with «Bruke igjen: Ja» becomes active.
 * @returns codes that became active.
 */
export async function saveFeedback(
  d: Db,
  access: Access,
  planId: number,
  rows: FeedbackInput[],
  registered: number | null,
  /** The subgroups the event was sent to in Spond; none is the whole group. */
  subgroupIds: string[] = [],
): Promise<string[]> {
  const pl = await getPlan(d, access, planId);
  if (!rows.length) throw new UserError("Vurder minst én øvelse eller hele økta.");
  return d.tx(async (t) => {
    await t.query("DELETE FROM exercise_feedback WHERE plan_id = $1 AND author = $2", [planId, access.profileId]);
    for (const r of rows) {
      await t.query(
        `INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, rating, tags,
                                        actual_minutes, actual_players, body, use_again, author, registered_players, spond_subgroup_ids)
         VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7::text[], $8, $9, NULLIF($10, ''), NULLIF($11, ''), $12, $13, $14::text[])`,
        [pl.groupId, pl.eventId, planId, r.exercise_no, r.exercise_code, r.rating, r.tags, r.actual_minutes, r.actual_players, r.body, r.use_again, access.profileId, r.exercise_no === null ? registered : null, subgroupIds],
      );
    }
    const good = [...new Set(rows.filter((r) => r.exercise_no !== null && r.rating === 3 && r.use_again === "yes" && r.exercise_code).map((r) => r.exercise_code))];
    if (!good.length) return [];
    const act = await t.query<{ code: string }>(
      `UPDATE exercises SET status = 'active', updated_by = $3, updated_at = now()
        WHERE spond_group_id = $1 AND code = ANY($2::text[]) AND status = 'candidate' RETURNING code`,
      [pl.groupId, good, access.profileId],
    );
    return act.map((a) => a.code);
  });
}

/** One trainer's evaluation of an exercise from the bank, if any. */
export async function myBankFeedback(d: Db, access: Access, groupId: string, exerciseCode: string): Promise<FeedbackRow | null> {
  assertGroup(access, groupId);
  const r = await d.query<FeedbackRow>(
    `SELECT id, plan_id, exercise_no, exercise_code, rating, tags, actual_minutes, actual_players,
            coalesce(body, '') AS body, coalesce(use_again, '') AS use_again, author, updated_at
       FROM exercise_feedback WHERE spond_group_id = $1 AND exercise_code = $2 AND author = $3 AND plan_id IS NULL`,
    [groupId, exerciseCode, access.profileId],
  );
  return r[0] ?? null;
}

/**
 * Replace (or with null remove) one trainer's evaluation of an exercise from
 * the bank. It counts like an evaluation after a training, so 👍 with «Bruke
 * igjen: Ja» makes a candidate active.
 * @returns whether the exercise became active.
 */
export async function saveBankFeedback(d: Db, access: Access, groupId: string, exerciseId: number, row: FeedbackInput | null): Promise<boolean> {
  assertGroup(access, groupId);
  const ex = await d.query<{ code: string }>("SELECT code FROM exercises WHERE id = $1 AND spond_group_id = $2", [exerciseId, groupId]);
  if (!ex.length) throw new UserError("Fant ikke øvelsen.");
  const code = ex[0].code;
  return d.tx(async (t) => {
    await t.query("DELETE FROM exercise_feedback WHERE spond_group_id = $1 AND exercise_code = $2 AND author = $3 AND plan_id IS NULL", [groupId, code, access.profileId]);
    if (!row) return false;
    await t.query(
      `INSERT INTO exercise_feedback (spond_group_id, exercise_code, rating, tags, actual_minutes, body, use_again, author)
       VALUES ($1, $2, $3, $4::text[], $5, NULLIF($6, ''), NULLIF($7, ''), $8)`,
      [groupId, code, row.rating, row.tags, row.actual_minutes, row.body, row.use_again, access.profileId],
    );
    if (row.rating !== 3 || row.use_again !== "yes") return false;
    const act = await t.query(
      `UPDATE exercises SET status = 'active', updated_by = $3, updated_at = now()
        WHERE id = $1 AND spond_group_id = $2 AND status = 'candidate' RETURNING id`,
      [exerciseId, groupId, access.profileId],
    );
    return act.length > 0;
  });
}

/** What the trainers' evaluations say about the team (counts only, no text or names). */
export async function teamExperience(d: Db, access: Access, groupId: string, since: Date) {
  assertGroup(access, groupId);
  const [row] = await d.query<{
    n_eval: number;
    time_n: number;
    time_sessions: number;
    time_diff: number | null;
    att_sessions: number;
    att_ratio: number | null;
    tags: string | null;
  }>(
    `WITH f AS (SELECT * FROM exercise_feedback WHERE spond_group_id = $1 AND created_at > $2::timestamptz)
     SELECT (SELECT count(*) FROM f WHERE exercise_no IS NOT NULL OR plan_id IS NULL)::int AS n_eval,
            t.time_n, t.time_sessions, t.time_diff, a.att_sessions, a.att_ratio,
            (SELECT string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag)
               FROM (SELECT tag, count(*) AS n FROM f, unnest(f.tags) AS tag WHERE f.exercise_no IS NOT NULL OR f.plan_id IS NULL GROUP BY tag) g) AS tags
       FROM (SELECT count(*)::int AS time_n, count(DISTINCT f.spond_event_id)::int AS time_sessions,
                    avg(f.actual_minutes - (p.plan->'tidsplan'->'stasjoner'->>'minutter')::int)::float8 AS time_diff
               FROM f JOIN training_plans p ON p.id = f.plan_id
              WHERE f.exercise_no IS NOT NULL AND f.actual_minutes IS NOT NULL
                AND jsonb_typeof(p.plan->'tidsplan'->'stasjoner'->'minutter') = 'number') t,
            (SELECT count(*)::int AS att_sessions, avg(r)::float8 AS att_ratio
               FROM (SELECT spond_event_id, avg(actual_players::float8 / registered_players) AS r
                       FROM f WHERE exercise_no IS NULL AND actual_players IS NOT NULL AND registered_players > 0
                      GROUP BY spond_event_id) e) a`,
    [groupId, since.toISOString()],
  );
  const tags: Record<string, number> = {};
  for (const part of (row.tags ?? "").split(",").filter(Boolean)) {
    const [k, n] = part.split(":");
    tags[k] = Number(n);
  }
  return { ...row, tags };
}

// Learnings (lærdommer) ----------------------------------------------------------------------

export const LEARNING_MAX = 3000;

export async function learningState(d: Db, access: Access, groupId: string, sub: string, n = 6) {
  assertGroup(access, groupId);
  const { versions: v, inherited } = await versions<Version & { source: "manual" | "ai" }>(d, "team_learnings", "id, body, source, created_by, created_at", groupId, sub, n);
  const [{ since }] = await d.query<{ since: Date | null }>(
    "SELECT max(created_at) AS since FROM team_learnings WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND source = 'ai'",
    [groupId, inherited ? "" : sub],
  );
  const [{ n: nNew }] = await d.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM exercise_feedback f
      WHERE f.spond_group_id = $1 AND ${FEEDBACK_IN_SCOPE} AND ($3::timestamptz IS NULL OR f.updated_at > $3::timestamptz)`,
    [groupId, sub, since ? new Date(since).toISOString() : null],
  );
  return { versions: v, inherited, nNew, since: since ? new Date(since) : null };
}

export async function latestLearning(d: Db, access: Access, groupId: string, sub: string): Promise<string> {
  return (await learningState(d, access, groupId, sub, 1)).versions[0]?.body ?? "";
}

export async function saveLearning(d: Db, access: Access, groupId: string, sub: string, body: string, source: "manual" | "ai"): Promise<void> {
  assertGroup(access, groupId);
  const b = body.trim();
  if (!b || b.length > LEARNING_MAX) throw new UserError(`Lærdommene må ha mellom 1 og ${LEARNING_MAX} tegn.`);
  if (isSensitive(b)) throw new UserError("Lærdommene skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  await d.query("INSERT INTO team_learnings (spond_group_id, spond_subgroup_id, body, source, created_by) VALUES ($1, $2, $3, $4, $5)", [
    groupId,
    sub,
    b,
    source,
    access.profileId,
  ]);
}

/**
 * Evaluations in the scope saved or changed after `since`, with exercise name, planned minutes and theme. No authors.
 * Evaluations from the bank have an empty event id.
 */
export async function feedbackSince(d: Db, access: Access, groupId: string, sub: string, since: Date, max = 150) {
  assertGroup(access, groupId);
  return d.query<{
    spond_event_id: string;
    exercise_no: number | null;
    exercise_name: string;
    theme: string;
    planned_minutes: number | null;
    rating: number | null;
    tags: string[];
    actual_minutes: number | null;
    actual_players: number | null;
    registered_players: number | null;
    body: string;
    use_again: string;
    created_at: Date;
  }>(
    `SELECT * FROM (
       SELECT coalesce(f.spond_event_id, '') AS spond_event_id, f.exercise_no,
              coalesce(p.plan->'ovelser'->(f.exercise_no - 1)->>'navn', e.name, '') AS exercise_name,
              coalesce(p.plan->>'tema', '') AS theme,
              CASE WHEN jsonb_typeof(p.plan->'tidsplan'->'stasjoner'->'minutter') = 'number'
                   THEN (p.plan->'tidsplan'->'stasjoner'->>'minutter')::int END AS planned_minutes,
              f.rating, f.tags, f.actual_minutes, f.actual_players, f.registered_players,
              coalesce(f.body, '') AS body, coalesce(f.use_again, '') AS use_again, f.created_at, f.updated_at, f.id
         FROM exercise_feedback f LEFT JOIN training_plans p ON p.id = f.plan_id
         LEFT JOIN exercises e ON f.plan_id IS NULL AND e.spond_group_id = f.spond_group_id AND e.code = f.exercise_code
        WHERE f.spond_group_id = $1 AND ${FEEDBACK_IN_SCOPE} AND f.updated_at > $3::timestamptz
        ORDER BY f.updated_at DESC, f.id DESC LIMIT $4) x
      ORDER BY created_at, spond_event_id, exercise_no NULLS FIRST, id`,
    [groupId, sub, since.toISOString(), max],
  );
}

export { PlanError };
