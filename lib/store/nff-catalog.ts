import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { BAND_KEYS, type BandKey } from "@/lib/nff/fagplan";
import { assertAdmin, assertGroup, UserError, type Access, type Rights } from "./access";

/**
 * NFF-katalogen i databasen (migrering 20261112000000_nff_katalog.sql):
 * hovedtema, delferdigheter og læringsmomenter. NFF-radene er felles; et lag
 * (hovedgruppe) kan legge til egne og skjule hva som helst. Skjult er det nye
 * «slettet»: raden blir, så øvelser og årshjul som viser til den, beholder teksten.
 *
 * Appen bruker fortsatt lib/nff/fagplan.ts i UI og KI. Dette er grunnlaget for
 * nedtrekk når trenerne har bestemt hvordan årshjulet skal se ut.
 */

export type TopicKind = "hovedtema" | "delferdighet";
export type TopicSide = "angrep" | "forsvar" | "omstilling";
export type Role = "ballforer" | "laget" | "1f";

export interface CatalogTopic {
  id: string;
  kind: TopicKind;
  label: string;
  side: TopicSide;
  bands: BandKey[];
  source: "nff" | "egen";
  hidden: boolean;
}

export interface CatalogLearningPoint {
  id: string;
  topic_id: string;
  band: BandKey;
  role: Role | null;
  phase: string;
  text: string;
  source: "nff" | "egen";
  hidden: boolean;
}

export interface Catalog {
  topics: CatalogTopic[];
  learningPoints: CatalogLearningPoint[];
}

/**
 * The catalog as the team sees it: NFF's rows and the team's own. Hidden rows
 * are left out unless `withHidden` (for a «vis skjulte» list). With `band`,
 * only topics in that band and its learning points.
 */
export async function listCatalog(d: Db, access: Access, groupId: string, opts: { band?: BandKey; withHidden?: boolean } = {}): Promise<Catalog> {
  assertGroup(access, groupId);
  const band = opts.band ?? null;
  const topics = await d.query<CatalogTopic>(
    `SELECT t.id, t.kind, t.label, t.side, t.bands, t.source, (h.item_id IS NOT NULL) AS hidden
       FROM nff_topics t
       LEFT JOIN nff_hidden h ON h.spond_group_id = $1 AND h.item_id = t.id
      WHERE (t.spond_group_id IS NULL OR t.spond_group_id = $1) AND ($2::text IS NULL OR $2 = ANY (t.bands))
      ORDER BY t.kind, t.source DESC, t.sort, t.created_at, t.id`,
    [groupId, band],
  );
  const learningPoints = await d.query<CatalogLearningPoint>(
    `SELECT p.id, p.topic_id, p.band, p.role, p.phase, p.text, p.source,
            (h.item_id IS NOT NULL OR ht.item_id IS NOT NULL) AS hidden
       FROM nff_learning_points p
       LEFT JOIN nff_hidden h ON h.spond_group_id = $1 AND h.item_id = p.id
       LEFT JOIN nff_hidden ht ON ht.spond_group_id = $1 AND ht.item_id = p.topic_id
      WHERE (p.spond_group_id IS NULL OR p.spond_group_id = $1) AND ($2::text IS NULL OR p.band = $2)
      ORDER BY p.source DESC, p.sort, p.created_at, p.id`,
    [groupId, band],
  );
  const show = <T extends { hidden: boolean }>(rows: T[]) => (opts.withHidden ? rows : rows.filter((r) => !r.hidden));
  return { topics: show(topics), learningPoints: show(learningPoints) };
}

const bandSchema = z.enum(BAND_KEYS as [BandKey, ...BandKey[]]);
const text = (max: number) => z.string().trim().min(1).max(max);

const topicInput = z.object({
  kind: z.enum(["hovedtema", "delferdighet"]),
  label: text(120),
  side: z.enum(["angrep", "forsvar", "omstilling"]),
  bands: z.array(bandSchema).min(1).max(BAND_KEYS.length),
});

const pointInput = z.object({
  topicId: z.string().min(1).max(80),
  band: bandSchema,
  role: z.enum(["ballforer", "laget", "1f"]).nullable().default(null),
  phase: z.string().trim().max(80).default(""),
  text: text(300),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new UserError("Ugyldig verdi i katalogen.");
  return r.data;
}

const newId = (prefix: string) => `${prefix}.egen.${randomBytes(5).toString("hex")}`;

/** Adds the team's own hovedtema or delferdighet (e.g. «Omstilling»). Admins only. */
export async function addTopic(d: Db, access: Access, rights: Rights, groupId: string, input: z.input<typeof topicInput>): Promise<string> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const t = parse(topicInput, input);
  const id = newId(t.kind === "hovedtema" ? "tema" : "delf");
  await d.query(
    `INSERT INTO nff_topics (id, kind, label, side, bands, source, spond_group_id, sort, created_by)
     VALUES ($1, $2, $3, $4, $5, 'egen', $6, 1000, $7)`,
    [id, t.kind, t.label, t.side, [...new Set(t.bands)], groupId, access.profileId],
  );
  return id;
}

/** Adds the team's own learning point under an NFF topic or one of the team's own. Admins only. */
export async function addLearningPoint(d: Db, access: Access, rights: Rights, groupId: string, input: z.input<typeof pointInput>): Promise<string> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const p = parse(pointInput, input);
  const [topic] = await d.query<{ kind: TopicKind; bands: string[] }>(
    "SELECT kind, bands FROM nff_topics WHERE id = $1 AND (spond_group_id IS NULL OR spond_group_id = $2)",
    [p.topicId, groupId],
  );
  if (!topic) throw new UserError("Fant ikke hovedtemaet eller delferdigheten.");
  if (!topic.bands.includes(p.band)) throw new UserError("Aldersbåndet passer ikke til temaet.");
  const role = topic.kind === "hovedtema" ? p.role : null;
  const id = newId("lm");
  await d.query(
    `INSERT INTO nff_learning_points (id, topic_id, band, role, phase, text, source, spond_group_id, sort, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'egen', $7, 1000, $8)`,
    [id, p.topicId, p.band, role, p.phase, p.text, groupId, access.profileId],
  );
  return id;
}

/** Hides (deletes for the team) or shows again a topic or learning point. Admins only. */
export async function setHidden(d: Db, access: Access, rights: Rights, groupId: string, itemId: string, hidden: boolean): Promise<void> {
  assertGroup(access, groupId);
  assertAdmin(rights);
  const table = itemId.startsWith("lm.") ? "nff_learning_points" : "nff_topics";
  const [found] = await d.query(`SELECT 1 FROM ${table} WHERE id = $1 AND (spond_group_id IS NULL OR spond_group_id = $2)`, [itemId, groupId]);
  if (!found) throw new UserError("Fant ikke punktet i katalogen.");
  if (hidden) {
    await d.query("INSERT INTO nff_hidden (spond_group_id, item_id, hidden_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [groupId, itemId, access.profileId]);
  } else {
    await d.query("DELETE FROM nff_hidden WHERE spond_group_id = $1 AND item_id = $2", [groupId, itemId]);
  }
}

export interface SeasonFocus {
  month: number;
  hovedtema_id: string | null;
  learning_point_ids: string[];
}

/** Hovedtema and learning points per month of the season plan, for the same scope as listSeason (own, else the main group's). */
export async function listSeasonFocus(d: Db, access: Access, groupId: string, sub: string, year: number): Promise<SeasonFocus[]> {
  assertGroup(access, groupId);
  const rows = await d.query<SeasonFocus & { spond_subgroup_id: string }>(
    `SELECT spond_subgroup_id, month, hovedtema_id, learning_point_ids
       FROM season_themes WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '') AND year = $3 ORDER BY month`,
    [groupId, sub, year],
  );
  const scope = sub && rows.some((r) => r.spond_subgroup_id === sub) ? sub : "";
  return rows.filter((r) => r.spond_subgroup_id === scope).map(({ month, hovedtema_id, learning_point_ids }) => ({ month, hovedtema_id, learning_point_ids }));
}

const focusInput = z.object({
  month: z.number().int().min(1).max(12),
  hovedtemaId: z.string().max(80).nullable(),
  learningPointIds: z.array(z.string().max(100)).max(2),
});

/**
 * Sets hovedtema and up to two learning points (from the hovedtema or any
 * delferdighet) for a month that already has a theme in the scope's season
 * plan. The free-text theme the app shows today is left as it is.
 */
export async function saveSeasonFocus(d: Db, access: Access, groupId: string, sub: string, year: number, input: z.input<typeof focusInput>): Promise<void> {
  assertGroup(access, groupId);
  const f = parse(focusInput, input);
  const ids = [...new Set(f.learningPointIds)];
  if (f.hovedtemaId) {
    const [t] = await d.query(
      "SELECT 1 FROM nff_topics WHERE id = $1 AND kind = 'hovedtema' AND (spond_group_id IS NULL OR spond_group_id = $2)",
      [f.hovedtemaId, groupId],
    );
    if (!t) throw new UserError("Fant ikke hovedtemaet.");
  }
  if (ids.length) {
    const found = await d.query("SELECT id FROM nff_learning_points WHERE id = ANY ($1::text[]) AND (spond_group_id IS NULL OR spond_group_id = $2)", [ids, groupId]);
    if (found.length !== ids.length) throw new UserError("Fant ikke læringsmomentet.");
  }
  const updated = await d.query(
    `UPDATE season_themes SET hovedtema_id = $5, learning_point_ids = $6, updated_by = $7, updated_at = now()
      WHERE spond_group_id = $1 AND spond_subgroup_id = $2 AND year = $3 AND month = $4 RETURNING 1`,
    [groupId, sub, year, f.month, f.hovedtemaId, ids, access.profileId],
  );
  if (!updated.length) throw new UserError("Måneden har ikke noe tema i årshjulet ennå.");
}
