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
import { assertAdmin, assertGroup, UserError, type Access, type Rights } from "./access";

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

// Season plan (årshjul) -----------------------------------------------------------------

export interface SeasonRow {
  month: number;
  theme: string;
  description: string;
  updated_by: string;
  updated_at: Date;
}

export async function listSeason(d: Db, access: Access, groupId: string, year: number): Promise<SeasonRow[]> {
  assertGroup(access, groupId);
  return d.query<SeasonRow>(
    `SELECT month, theme, coalesce(description, '') AS description, updated_by, updated_at
       FROM season_themes WHERE spond_group_id = $1 AND year = $2 ORDER BY month`,
    [groupId, year],
  );
}

export async function saveSeason(d: Db, access: Access, rights: Rights, groupId: string, year: number, themes: string[], descriptions: string[]): Promise<void> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const rows = wrap(() => validateSeason(year, themes, descriptions));
  await d.tx(async (t) => {
    await t.query("DELETE FROM season_themes WHERE spond_group_id = $1 AND year = $2 AND NOT (month = ANY($3::int[]))", [groupId, year, rows.map((r) => r.month)]);
    for (const r of rows) {
      await t.query(
        `INSERT INTO season_themes (spond_group_id, year, month, theme, description, updated_by)
         VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6)
         ON CONFLICT (spond_group_id, year, month) DO UPDATE
           SET theme = EXCLUDED.theme, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = now()
           WHERE season_themes.theme IS DISTINCT FROM EXCLUDED.theme OR season_themes.description IS DISTINCT FROM EXCLUDED.description`,
        [groupId, year, r.month, r.theme, r.description, access.profileId],
      );
    }
  });
}

/** The theme for the month of `date` (Oslo), or null. */
export async function seasonTheme(d: Db, access: Access, groupId: string, year: number, month: number) {
  const rows = await listSeason(d, access, groupId, year);
  const hit = rows.find((r) => r.month === month);
  return hit ? { theme: hit.theme, description: hit.description } : null;
}

// Team settings -----------------------------------------------------------------------------

export interface StoredTeamSettings extends TeamSettings {
  updated_by: string | null;
  updated_at: Date | null;
}

export async function getTeamSettings(d: Db, access: Access, groupId: string): Promise<StoredTeamSettings> {
  assertGroup(access, groupId);
  const rows = await d.query<StoredTeamSettings>(
    `SELECT coalesce(age_group, '') AS age_group, session_minutes, pitch_id, coalesce(pitch, '') AS pitch,
            coalesce(equipment, '') AS equipment, coalesce(principles, '') AS principles, updated_by, updated_at
       FROM team_settings WHERE spond_group_id = $1`,
    [groupId],
  );
  return rows[0] ?? { age_group: "", session_minutes: null, pitch_id: null, pitch: "", equipment: "", principles: "", updated_by: null, updated_at: null };
}

export async function saveTeamSettings(d: Db, access: Access, rights: Rights, groupId: string, input: Record<string, unknown>): Promise<void> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const s = wrap(() => validateTeamSettings(input));
  if (s.pitch_id && !(await getPitch(d, s.pitch_id))) throw new UserError("Ukjent bane.");
  await d.query(
    `INSERT INTO team_settings (spond_group_id, age_group, session_minutes, pitch_id, pitch, equipment, principles, updated_by)
     VALUES ($1, NULLIF($2, ''), $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8)
     ON CONFLICT (spond_group_id) DO UPDATE
       SET age_group = EXCLUDED.age_group, session_minutes = EXCLUDED.session_minutes, pitch_id = EXCLUDED.pitch_id, pitch = EXCLUDED.pitch,
           equipment = EXCLUDED.equipment, principles = EXCLUDED.principles, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [groupId, s.age_group, s.session_minutes, s.pitch_id, s.pitch, s.equipment, s.principles, access.profileId],
  );
}

// Pitches (shared by all groups) ------------------------------------------------------------

const PITCH_COLUMNS = "id, parent_id, facility, name, surface, pitch_type, lighting, length_m, width_m, retired";

export async function listPitches(d: Db): Promise<Pitch[]> {
  return d.query<Pitch>(`SELECT ${PITCH_COLUMNS} FROM pitches ORDER BY facility, sort, id`);
}

export async function getPitch(d: Db, id: number): Promise<Pitch | null> {
  const rows = await d.query<Pitch>(`SELECT ${PITCH_COLUMNS} FROM pitches WHERE id = $1`, [id]);
  return rows[0] ?? null;
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
  fb_n: number;
  fb_sessions: number;
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
         coalesce(s.fb_n, 0) AS fb_n, coalesce(s.fb_sessions, 0) AS fb_sessions, coalesce(s.fb_good, 0) AS fb_good,
         coalesce(s.fb_ok, 0) AS fb_ok, coalesce(s.fb_bad, 0) AS fb_bad, coalesce(s.fb_yes, 0) AS fb_yes,
         coalesce(s.fb_changes, 0) AS fb_changes, coalesce(s.fb_no, 0) AS fb_no, s.fb_mean, s.fb_minutes, s.fb_last, t.fb_tags
    FROM exercises e
    LEFT JOIN (
      SELECT exercise_code, count(*)::int AS fb_n, count(DISTINCT spond_event_id)::int AS fb_sessions,
             avg(rating)::float8 AS fb_mean,
             (count(*) FILTER (WHERE rating = 3))::int AS fb_good, (count(*) FILTER (WHERE rating = 2))::int AS fb_ok,
             (count(*) FILTER (WHERE rating = 1))::int AS fb_bad,
             (count(*) FILTER (WHERE use_again = 'yes'))::int AS fb_yes, (count(*) FILTER (WHERE use_again = 'changes'))::int AS fb_changes,
             (count(*) FILTER (WHERE use_again = 'no'))::int AS fb_no,
             avg(actual_minutes)::float8 AS fb_minutes, max(updated_at) AS fb_last
        FROM exercise_feedback
       WHERE spond_group_id = $1 AND exercise_no IS NOT NULL AND exercise_code IS NOT NULL
       GROUP BY exercise_code) s ON s.exercise_code = e.code
    LEFT JOIN (
      SELECT exercise_code, string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag) AS fb_tags
        FROM (SELECT exercise_code, tag, count(*) AS n FROM exercise_feedback, unnest(tags) AS tag
               WHERE spond_group_id = $1 AND exercise_no IS NOT NULL AND exercise_code IS NOT NULL
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
  return { ...r, themes: r.themes ?? [], drawing, fb_tags: tags };
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

/** Create or update an exercise (admins). The code is made from the name once and never changes. */
export async function saveExercise(d: Db, access: Access, rights: Rights, groupId: string, input: Partial<ExerciseInput>, id: number | null): Promise<number> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const v = wrap(() => validateExercise(input));
  const drawing = v.drawing ? JSON.stringify(compactDrawing(v.drawing)) : null;
  const fields = [v.name, v.category, v.themes, v.min_players, v.max_players, v.duration_minutes, v.area, v.organisation, v.execution, v.learning_points, v.questions, v.easier, v.harder, v.nff_url, access.profileId, drawing, v.status];
  if (!id) {
    const taken = (await d.query<{ code: string }>("SELECT code FROM exercises WHERE spond_group_id = $1", [groupId])).map((r) => r.code);
    const [{ id: newId }] = await d.query<{ id: number }>(
      `INSERT INTO exercises (spond_group_id, code, name, category, themes, min_players, max_players, duration_minutes, area,
                              organisation, execution, learning_points, questions, easier, harder, nff_url, created_by, updated_by,
                              drawing, status)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''),
               NULLIF($13, ''), NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, ''), $17, $17, $18::jsonb, coalesce($19, 'active'))
       RETURNING id`,
      [groupId, exerciseCode(v.name, taken), ...fields],
    );
    return newId;
  }
  const n = await d.query(
    `UPDATE exercises SET name = $3, category = $4, themes = $5::text[], min_players = $6, max_players = $7, duration_minutes = $8,
            area = NULLIF($9, ''), organisation = NULLIF($10, ''), execution = NULLIF($11, ''), learning_points = NULLIF($12, ''),
            questions = NULLIF($13, ''), easier = NULLIF($14, ''), harder = NULLIF($15, ''), nff_url = NULLIF($16, ''),
            updated_by = $17, drawing = $18::jsonb, status = coalesce($19, status), updated_at = now()
      WHERE id = $1 AND spond_group_id = $2 RETURNING id`,
    [id, groupId, ...fields],
  );
  if (!n.length) throw new UserError("Fant ikke øvelsen.");
  return id;
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
 * Put one exercise from an approved plan into the bank, as a candidate. If
 * the bank has the code already, nothing changes. A variant of a variant
 * points to the base exercise, so families stay flat.
 */
export async function savePlanExercise(
  d: Db,
  access: Access,
  groupId: string,
  e: PlanExercise,
  themes: string[],
  source: "manual" | "ai",
): Promise<boolean> {
  assertGroup(access, groupId);
  const known = await d.query<{ code: string; based_on: string | null }>(
    "SELECT code, based_on FROM exercises WHERE spond_group_id = $1 AND code IN ($2, $3)",
    [groupId, e.kode, e.basert_pa],
  );
  if (known.some((k) => k.code === e.kode)) return false;
  const base = known.find((k) => k.code === e.basert_pa);
  const basedOn = !e.basert_pa || !base ? null : base.based_on || e.basert_pa;
  const taken = (await d.query<{ code: string }>("SELECT code FROM exercises WHERE spond_group_id = $1", [groupId])).map((r) => r.code);
  const code = CODE_RE.test(e.kode) && e.kode.length <= 60 ? e.kode : exerciseCode(e.navn, taken);
  const join = (x: string[]) => x.join("\n");
  await d.query(
    `INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, questions,
                            easier, harder, nff_url, drawing, source, created_by, updated_by, based_on, status)
     VALUES ($1, $2, $3, $4, $5::text[], NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''),
             NULLIF($11, ''), NULLIF($12, ''), $13::jsonb, $14, $15, $15, $16, 'candidate')`,
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
    ],
  );
  return true;
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
  opts: { source?: "manual" | "ai"; model?: string; costUsd?: number | null } = {},
): Promise<{ id: number; version: number }> {
  assertGroup(access, groupId);
  if (!eventId) throw new UserError("Mangler arrangement.");
  const json = planJson(wrap(() => validatePlan(plan)));
  const insert = () =>
    d.query<{ id: number; version: number }>(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, source, created_by, model, cost_usd)
       SELECT $1, $2, coalesce(max(version), 0) + 1, $3::jsonb, $4, $5, NULLIF($6, ''), $7
         FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2
       RETURNING id, version`,
      [groupId, eventId, json, opts.source ?? "manual", access.profileId, opts.model ?? "", opts.costUsd ?? null],
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
  plan_id: number;
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
export async function saveFeedback(d: Db, access: Access, planId: number, rows: FeedbackInput[], registered: number | null): Promise<string[]> {
  const pl = await getPlan(d, access, planId);
  if (!rows.length) throw new UserError("Vurder minst én øvelse eller hele økta.");
  return d.tx(async (t) => {
    await t.query("DELETE FROM exercise_feedback WHERE plan_id = $1 AND author = $2", [planId, access.profileId]);
    for (const r of rows) {
      await t.query(
        `INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, rating, tags,
                                        actual_minutes, actual_players, body, use_again, author, registered_players)
         VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7::text[], $8, $9, NULLIF($10, ''), NULLIF($11, ''), $12, $13)`,
        [pl.groupId, pl.eventId, planId, r.exercise_no, r.exercise_code, r.rating, r.tags, r.actual_minutes, r.actual_players, r.body, r.use_again, access.profileId, r.exercise_no === null ? registered : null],
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
     SELECT (SELECT count(*) FROM f WHERE exercise_no IS NOT NULL)::int AS n_eval,
            t.time_n, t.time_sessions, t.time_diff, a.att_sessions, a.att_ratio,
            (SELECT string_agg(tag || ':' || n, ',' ORDER BY n DESC, tag)
               FROM (SELECT tag, count(*) AS n FROM f, unnest(f.tags) AS tag WHERE f.exercise_no IS NOT NULL GROUP BY tag) g) AS tags
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

export async function learningState(d: Db, access: Access, groupId: string, n = 6) {
  assertGroup(access, groupId);
  const versions = await d.query<{ id: number; body: string; source: "manual" | "ai"; created_by: string; created_at: Date }>(
    "SELECT id, body, source, created_by, created_at FROM team_learnings WHERE spond_group_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2",
    [groupId, n],
  );
  const [{ since }] = await d.query<{ since: Date | null }>(
    "SELECT max(created_at) AS since FROM team_learnings WHERE spond_group_id = $1 AND source = 'ai'",
    [groupId],
  );
  const [{ n: nNew }] = await d.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM exercise_feedback WHERE spond_group_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)",
    [groupId, since ? new Date(since).toISOString() : null],
  );
  return { versions, nNew, since: since ? new Date(since) : null };
}

export async function latestLearning(d: Db, access: Access, groupId: string): Promise<string> {
  assertGroup(access, groupId);
  const r = await d.query<{ body: string }>("SELECT body FROM team_learnings WHERE spond_group_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1", [groupId]);
  return r[0]?.body ?? "";
}

export async function saveLearning(d: Db, access: Access, rights: Rights, groupId: string, body: string, source: "manual" | "ai"): Promise<void> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const b = body.trim();
  if (!b || b.length > LEARNING_MAX) throw new UserError(`Lærdommene må ha mellom 1 og ${LEARNING_MAX} tegn.`);
  if (isSensitive(b)) throw new UserError("Lærdommene skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  await d.query("INSERT INTO team_learnings (spond_group_id, body, source, created_by) VALUES ($1, $2, $3, $4)", [groupId, b, source, access.profileId]);
}

/** Evaluations saved or changed after `since`, with exercise name, planned minutes and theme. No authors. */
export async function feedbackSince(d: Db, access: Access, groupId: string, since: Date, max = 150) {
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
       SELECT f.spond_event_id, f.exercise_no,
              coalesce(p.plan->'ovelser'->(f.exercise_no - 1)->>'navn', '') AS exercise_name,
              coalesce(p.plan->>'tema', '') AS theme,
              CASE WHEN jsonb_typeof(p.plan->'tidsplan'->'stasjoner'->'minutter') = 'number'
                   THEN (p.plan->'tidsplan'->'stasjoner'->>'minutter')::int END AS planned_minutes,
              f.rating, f.tags, f.actual_minutes, f.actual_players, f.registered_players,
              coalesce(f.body, '') AS body, coalesce(f.use_again, '') AS use_again, f.created_at, f.updated_at, f.id
         FROM exercise_feedback f JOIN training_plans p ON p.id = f.plan_id
        WHERE f.spond_group_id = $1 AND f.updated_at > $2::timestamptz
        ORDER BY f.updated_at DESC, f.id DESC LIMIT $3) x
      ORDER BY created_at, spond_event_id, exercise_no NULLS FIRST, id`,
    [groupId, since.toISOString(), max],
  );
}

export { PlanError };
