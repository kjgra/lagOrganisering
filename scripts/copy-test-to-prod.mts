/**
 * Kopierer alt trenerne har lagt inn i test-databasen (den gamle appen) til
 * prod-databasen: øvelser, tilganger, årshjul, lagets standard, tagger,
 * lagforslag, treningsopplegg med kommentarer og evaluering, lærdommer og
 * KI-forbruk.
 *
 *   SOURCE_DATABASE_URL=<test> TARGET_DATABASE_URL=<prod> pnpm copy:test-to-prod
 *   ... pnpm copy:test-to-prod --apply
 *   ... pnpm copy:test-to-prod --apply --group <spond-gruppe-id>
 *
 * Uten --apply er det en prøvekjøring: alt skrives i en transaksjon som rulles
 * tilbake, og scriptet viser hva som ville blitt endret.
 *
 * Kan kjøres flere ganger. En rad som finnes i prod fra før, oppdateres bare
 * når raden i test er nyere (updated_at), så endringer gjort i prod beholdes.
 * Rader uten updated_at (tagger, opplegg, lagene i et forslag) legges bare til.
 * Loggrader legges bare til når en helt lik rad ikke finnes i prod. Det eneste
 * som slettes, er lagene og spillerne i et lagforslag som er nyere i test; de
 * erstattes med versjonen fra test.
 *
 * Lagforslag og opplegg får nye ID-er i prod. Et forslag kjennes igjen på
 * gruppe, oppretter og tidspunkt, et opplegg på gruppe, arrangement og versjon.
 * Har prod et annet opplegg med samme versjon, eller et annet godkjent opplegg
 * for arrangementet, hoppes opplegget over (med kommentarer og evaluering).
 *
 * Tagger som bare er et tall fra 1 til 5, blir nivå (member_levels), som i
 * migrasjonen 20261024000000_tag_types. Har en spiller flere, gjelder den
 * nyeste, og et nivå i prod overskrives bare av en nyere tagg.
 *
 * Tabeller som ikke finnes i test, hoppes over, og kolonner som mangler i test,
 * får standardverdien i prod. Redigeringslåser og vedlikeholdsstatus kopieres
 * ikke. Superadmin står i SUPERADMIN_PROFILE_ID og kopieres ikke. Bare Spond-ID-er
 * kopieres; tabellene har ingen navn.
 */
import { pathToFileURL } from "node:url";
import postgres from "postgres";

/** The part of lib/db's Db the copy needs, so tests can pass PGlite. */
export interface CopyDb {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (db: CopyDb) => Promise<T>): Promise<T>;
}

export interface TableResult {
  table: string;
  read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  /** Rows not copied: their parent was skipped, or they clash with a row in prod. */
  skipped: number;
  /** The table is not in the source database. */
  missing?: boolean;
  /** Columns not in the source database; prod gives them their default. */
  missingColumns?: string[];
}

interface Table {
  name: string;
  /** Shown in the result when it is not `name`. */
  label?: string;
  /** Read from another source table, through a subquery with the target's columns. */
  from?: { table: string; sql: string };
  /** Only source rows matching this condition. */
  filter?: string;
  columns: string[];
  /** Identifies a row in both databases. For a table with `id`, a natural key. */
  key: string[];
  /** ON CONFLICT target when it is not `key` (an expression index). */
  conflict?: string;
  /** A log without a key: a row is added when no equal row exists, never updated. */
  log?: boolean;
  /** No updated_at: a row is added when its key is free, never updated. */
  insertOnly?: boolean;
  /**
   * Identity column. Prod gives the row a new id, and children map their
   * reference through it.
   */
  id?: string;
  /** Columns that must also match for a row found by `key` to be the same row; else it is skipped. */
  same?: string[];
  /** Children replaced when this row is updated: table and its reference column. */
  owns?: { table: string; column: string }[];
  /** References to a table with `id`. A row whose required parent was not copied is skipped. */
  refs?: Record<string, { table: string; optional?: boolean }>;
  /** Returns true when inserting the row would break a constraint in prod. */
  blocked?: (dst: CopyDb, row: Record<string, unknown>) => Promise<boolean>;
  /**
   * Columns read as text and cast back on insert. Timestamps go as text so no
   * microseconds are lost (JS Date has milliseconds). The parameter is typed
   * text first, or postgres.js would encode the string again as JSON or a Date.
   */
  casts: Record<string, string>;
  /** Limits the table to one Spond main group for --group: a column, or a column referring to a parent table. */
  group?: string | { column: string; parent: string };
}

const TS = "timestamptz";

const TABLES: Table[] = [
  {
    name: "exercises",
    columns: [
      "spond_group_id", "code", "name", "category", "themes", "min_players", "max_players",
      "duration_minutes", "area", "organisation", "execution", "learning_points", "questions",
      "easier", "harder", "nff_url", "drawing", "source", "based_on", "status",
      "created_by", "created_at", "updated_by", "updated_at",
    ],
    key: ["spond_group_id", "code"],
    casts: { themes: "text[]", drawing: "jsonb", created_at: TS, updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "app_roles",
    columns: ["spond_profile_id", "can_use_ai", "is_admin", "can_use_app", "can_see_tags", "updated_by", "updated_at"],
    key: ["spond_profile_id"],
    casts: { updated_at: TS },
  },
  {
    name: "app_role_log",
    columns: ["spond_profile_id", "role", "granted", "actor", "created_at"],
    key: ["created_at", "spond_profile_id", "role", "granted", "actor"],
    log: true,
    casts: { created_at: TS },
  },
  {
    name: "season_themes",
    columns: ["spond_group_id", "year", "month", "theme", "description", "updated_by", "updated_at"],
    key: ["spond_group_id", "year", "month"],
    // Test has no subgroups: everything is the main group's (spond_subgroup_id '').
    conflict: "spond_group_id, spond_subgroup_id, year, month",
    casts: { updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "team_settings",
    // The principles moved to team_principles (migration 20261025000000_training_per_subgroup).
    columns: ["spond_group_id", "age_group", "birth_year", "gender", "session_minutes", "pitch", "equipment", "updated_by", "updated_at"],
    key: ["spond_group_id"],
    conflict: "spond_group_id, spond_subgroup_id",
    casts: { updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "user_preferences",
    columns: ["spond_profile_id", "favorites", "recent", "last_group", "updated_at"],
    key: ["spond_profile_id"],
    casts: { favorites: "text[]", recent: "text[]", updated_at: TS },
  },
  {
    name: "member_tags",
    columns: ["spond_group_id", "spond_member_id", "tag", "created_by", "created_at"],
    key: ["spond_group_id", "spond_member_id", "tag"],
    insertOnly: true,
    filter: "btrim(tag) !~ '^[1-5]$'",
    casts: { created_at: TS },
    group: "spond_group_id",
  },
  {
    name: "member_levels",
    columns: ["spond_group_id", "spond_member_id", "level", "updated_by", "updated_at"],
    key: ["spond_group_id", "spond_member_id"],
    casts: { updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "member_levels",
    label: "member_levels (fra tagger)",
    from: {
      table: "member_tags",
      sql: `(SELECT DISTINCT ON (spond_group_id, spond_member_id) spond_group_id, spond_member_id, btrim(tag)::smallint AS level,
                    created_by AS updated_by, created_at AS updated_at
               FROM member_tags WHERE btrim(tag) ~ '^[1-5]$'
              ORDER BY spond_group_id, spond_member_id, created_at DESC) AS level_tags`,
    },
    columns: ["spond_group_id", "spond_member_id", "level", "updated_by", "updated_at"],
    key: ["spond_group_id", "spond_member_id"],
    casts: { updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "member_pairs",
    columns: ["spond_group_id", "member_a", "member_b", "created_by", "created_at"],
    key: ["spond_group_id", "member_a", "member_b"],
    insertOnly: true,
    casts: { created_at: TS },
    group: "spond_group_id",
  },
  {
    name: "group_proposals",
    columns: [
      "spond_group_id", "spond_subgroup_id", "spond_event_id", "name", "status", "created_by", "created_at", "updated_at",
    ],
    key: ["spond_group_id", "created_by", "created_at"],
    id: "id",
    owns: [{ table: "group_proposal_labels", column: "proposal_id" }],
    casts: { created_at: TS, updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "group_proposal_labels",
    columns: ["proposal_id", "label", "sort_order"],
    key: ["proposal_id", "label"],
    insertOnly: true,
    refs: { proposal_id: { table: "group_proposals" } },
    casts: {},
    group: { column: "proposal_id", parent: "group_proposals" },
  },
  {
    name: "group_proposal_members",
    columns: ["proposal_id", "spond_member_id", "label"],
    key: ["proposal_id", "spond_member_id"],
    insertOnly: true,
    refs: { proposal_id: { table: "group_proposals" } },
    casts: {},
    group: { column: "proposal_id", parent: "group_proposals" },
  },
  {
    name: "proposal_history",
    columns: ["proposal_id", "actor", "decision", "created_at"],
    key: ["proposal_id", "created_at", "actor", "decision"],
    log: true,
    refs: { proposal_id: { table: "group_proposals" } },
    casts: { created_at: TS },
    group: { column: "proposal_id", parent: "group_proposals" },
  },
  {
    name: "proposal_comments",
    columns: ["proposal_id", "author", "body", "created_at"],
    key: ["proposal_id", "created_at", "author", "body"],
    log: true,
    refs: { proposal_id: { table: "group_proposals" } },
    casts: { created_at: TS },
    group: { column: "proposal_id", parent: "group_proposals" },
  },
  {
    name: "training_plans",
    columns: [
      "spond_group_id", "spond_event_id", "version", "status", "plan", "source", "model", "cost_usd",
      "created_by", "created_at", "approved_by", "approved_at",
    ],
    key: ["spond_group_id", "spond_event_id", "version"],
    id: "id",
    insertOnly: true,
    same: ["created_at"],
    blocked: async (dst, row) =>
      row.status === "approved" &&
      (
        await dst.query(
          "SELECT 1 FROM training_plans WHERE spond_group_id = $1 AND spond_event_id = $2 AND status = 'approved'",
          [row.spond_group_id, row.spond_event_id],
        )
      ).length > 0,
    casts: { plan: "jsonb", cost_usd: "numeric", created_at: TS, approved_at: TS },
    group: "spond_group_id",
  },
  {
    name: "training_plan_comments",
    columns: [
      "spond_group_id", "spond_event_id", "plan_id", "exercise_no", "exercise_code", "author", "body", "created_at", "used_in_plan_id",
    ],
    key: ["plan_id", "created_at", "author", "exercise_no", "exercise_code", "body", "spond_group_id", "spond_event_id", "used_in_plan_id"],
    log: true,
    refs: { plan_id: { table: "training_plans" }, used_in_plan_id: { table: "training_plans", optional: true } },
    casts: { created_at: TS },
    group: "spond_group_id",
  },
  {
    name: "exercise_feedback",
    columns: [
      "spond_group_id", "spond_event_id", "plan_id", "exercise_no", "exercise_code", "rating", "tags", "actual_minutes",
      "actual_players", "registered_players", "body", "use_again", "author", "created_at", "updated_at",
    ],
    key: ["plan_id", "exercise_no", "author"],
    conflict: "plan_id, (coalesce(exercise_no, 0)), author",
    refs: { plan_id: { table: "training_plans" } },
    casts: { tags: "text[]", created_at: TS, updated_at: TS },
    group: "spond_group_id",
  },
  {
    name: "team_learnings",
    columns: ["spond_group_id", "body", "source", "created_by", "created_at"],
    key: ["spond_group_id", "created_at", "created_by", "source", "body"],
    log: true,
    casts: { created_at: TS },
    group: "spond_group_id",
  },
  {
    name: "ai_settings",
    columns: [
      "id", "model", "group_limit_nok", "total_limit_usd", "max_new_exercises", "usd_nok", "link_domains", "updated_by", "updated_at",
    ],
    key: ["id"],
    casts: { group_limit_nok: "numeric", total_limit_usd: "numeric", usd_nok: "numeric", link_domains: "text[]", updated_at: TS },
  },
  {
    name: "ai_usage",
    columns: [
      "created_at", "spond_profile_id", "spond_group_id", "spond_event_id", "plan_id", "kind", "model", "input_tokens",
      "output_tokens", "cache_read_tokens", "cache_write_tokens", "cost_usd", "duration_ms", "status", "error_code",
    ],
    key: [
      "created_at", "spond_profile_id", "spond_group_id", "spond_event_id", "plan_id", "kind", "model", "input_tokens",
      "output_tokens", "cache_read_tokens", "cache_write_tokens", "cost_usd", "duration_ms", "status", "error_code",
    ],
    log: true,
    refs: { plan_id: { table: "training_plans", optional: true } },
    casts: { cost_usd: "numeric", created_at: TS },
    group: "spond_group_id",
  },
  {
    name: "ai_usage_monthly",
    columns: [
      "month", "spond_group_id", "kind", "model", "n", "n_error", "input_tokens", "output_tokens",
      "cache_read_tokens", "cache_write_tokens", "cost_usd",
    ],
    key: ["month", "spond_group_id", "kind", "model"],
    insertOnly: true,
    casts: { month: "date", input_tokens: "bigint", output_tokens: "bigint", cache_read_tokens: "bigint", cache_write_tokens: "bigint", cost_usd: "numeric" },
    group: "spond_group_id",
  },
  {
    name: "archive_log",
    columns: ["spond_group_ids", "period_from", "period_to", "n_events", "n_versions", "confirmed_by", "confirmed_at"],
    key: ["confirmed_at", "confirmed_by", "spond_group_ids", "period_from", "period_to", "n_events", "n_versions"],
    log: true,
    casts: { spond_group_ids: "text[]", period_from: "date", period_to: "date", confirmed_at: TS },
  },
];

class DryRun extends Error {}

/** Source id -> target id, per table with `id`. */
type IdMaps = Map<string, Map<string, unknown>>;

async function sourceColumns(src: CopyDb, table: string): Promise<Set<string>> {
  const rows = await src.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

async function copyTable(src: CopyDb, dst: CopyDb, t: Table, ids: IdMaps, group?: string): Promise<TableResult> {
  const res: TableResult = { table: t.label ?? t.name, read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0 };
  const found = await sourceColumns(src, t.from?.table ?? t.name);
  if (!found.size) return { ...res, missing: true };
  const have = t.from ? new Set(t.columns) : found;
  const needed = [...t.key, ...(t.id ? [t.id] : []), ...Object.keys(t.refs ?? {})];
  const lacking = needed.filter((c) => !have.has(c));
  if (lacking.length) throw new Error(`${t.name} i kilden mangler ${lacking.join(", ")}.`);
  const columns = t.columns.filter((c) => have.has(c));
  const missingColumns = t.columns.filter((c) => !have.has(c));
  if (missingColumns.length) res.missingColumns = missingColumns;
  if (t.id) ids.set(t.name, new Map());

  const read = [...(t.id ? [t.id] : []), ...columns];
  const select = read.map((c) => (t.casts[c] ? `${c}::text AS ${c}` : c)).join(", ");
  const g = t.group;
  const conds = t.filter ? [t.filter] : [];
  if (group && g) {
    conds.push(typeof g === "string" ? `${g} = $1` : `${g.column} IN (SELECT id FROM ${g.parent} WHERE spond_group_id = $1)`);
  }
  const where = conds.length ? ` WHERE ${conds.join(" AND ")}` : "";
  const rows = await src.query<Record<string, unknown>>(
    `SELECT ${select} FROM ${t.from?.sql ?? t.name}${where} ORDER BY ${[...t.key, ...(t.id ? [t.id] : [])].join(", ")}`,
    group && g ? [group] : [],
  );
  res.read = rows.length;

  const param = (c: string, i: number) => `$${i + 1}${t.casts[c] ? `::text::${t.casts[c]}` : ""}`;
  const values = columns.map(param).join(", ");
  const match = (cs: string[], cmp = "=") =>
    cs.map((c) => `${c} ${cmp} ${param(c, columns.indexOf(c))}`).join(" AND ");
  const rest = columns.filter((c) => !t.key.includes(c));
  const set = rest.map((c) => `${c} = EXCLUDED.${c}`).join(", ");

  for (const row of rows) {
    const values_ = columns.map((c) => row[c]);
    // Map references to the ids the parents got in prod.
    let orphan = false;
    for (const [c, ref] of Object.entries(t.refs ?? {})) {
      if (row[c] === null || row[c] === undefined) continue;
      const to = ids.get(ref.table)?.get(String(row[c]));
      if (to !== undefined) values_[columns.indexOf(c)] = to;
      else if (ref.optional) values_[columns.indexOf(c)] = null;
      else orphan = true;
    }
    if (orphan) {
      res.skipped++;
      continue;
    }

    if (t.id) {
      const outcome = await copyWithId(dst, t, columns, row, values_, ids.get(t.name)!, values);
      res[outcome]++;
      continue;
    }

    if (t.blocked && (await t.blocked(dst, row))) {
      res.skipped++;
      continue;
    }
    const sql = t.log
      ? `INSERT INTO ${t.name} (${columns.join(", ")}) SELECT ${values}
         WHERE NOT EXISTS (SELECT 1 FROM ${t.name} WHERE ${match(columns, "IS NOT DISTINCT FROM")})
         RETURNING true AS inserted`
      : t.insertOnly
        ? `INSERT INTO ${t.name} (${columns.join(", ")}) VALUES (${values})
           ON CONFLICT (${t.conflict ?? t.key.join(", ")}) DO NOTHING
           RETURNING true AS inserted`
        : `INSERT INTO ${t.name} (${columns.join(", ")}) VALUES (${values})
           ON CONFLICT (${t.conflict ?? t.key.join(", ")}) DO UPDATE SET ${set}
           WHERE ${t.name}.updated_at < EXCLUDED.updated_at
           RETURNING (xmax = 0) AS inserted`;
    const [r] = await dst.query<{ inserted: boolean }>(sql, values_);
    if (!r) res.unchanged++;
    else if (r.inserted) res.inserted++;
    else res.updated++;
  }
  return res;
}

/** A row that gets a new id in prod: found by its natural key, or inserted. */
async function copyWithId(
  dst: CopyDb,
  t: Table,
  columns: string[],
  row: Record<string, unknown>,
  values_: unknown[],
  map: Map<string, unknown>,
  values: string,
): Promise<"inserted" | "updated" | "unchanged" | "skipped"> {
  const id = t.id!;
  // Statements that use only some columns number their parameters from $1.
  const bind = (cs: string[]) => ({
    p: (c: string) => `$${cs.indexOf(c) + 1}${t.casts[c] ? `::text::${t.casts[c]}` : ""}`,
    params: cs.map((c) => values_[columns.indexOf(c)]),
  });
  const same = (t.same ?? []).filter((c) => columns.includes(c));
  const look = bind([...t.key, ...same]);
  const [found] = await dst.query<{ id: unknown; same: boolean }>(
    `SELECT ${id} AS id, ${same.length ? same.map((c) => `${c} IS NOT DISTINCT FROM ${look.p(c)}`).join(" AND ") : "true"} AS same
       FROM ${t.name} WHERE ${t.key.map((c) => `${c} = ${look.p(c)}`).join(" AND ")} ORDER BY ${id} LIMIT 1`,
    look.params,
  );
  if (found) {
    if (!found.same) return "skipped";
    map.set(String(row[id]), found.id);
    if (t.insertOnly) return "unchanged";
    const rest = columns.filter((c) => !t.key.includes(c));
    const up = bind(rest);
    const updated = await dst.query(
      `UPDATE ${t.name} SET ${rest.map((c) => `${c} = ${up.p(c)}`).join(", ")}
        WHERE ${id} = $${rest.length + 1} AND updated_at < ${up.p("updated_at")}
        RETURNING 1`,
      [...up.params, found.id],
    );
    if (!updated.length) return "unchanged";
    for (const child of t.owns ?? []) await dst.query(`DELETE FROM ${child.table} WHERE ${child.column} = $1`, [found.id]);
    return "updated";
  }
  if (t.blocked && (await t.blocked(dst, row))) return "skipped";
  const [inserted] = await dst.query<{ id: unknown }>(
    `INSERT INTO ${t.name} (${columns.join(", ")}) VALUES (${values}) RETURNING ${id} AS id`,
    values_,
  );
  map.set(String(row[id]), inserted.id);
  return "inserted";
}

/** Copies all tables in one transaction on the target. Rolled back unless `apply`. */
export async function copyTestToProd(
  src: CopyDb,
  dst: CopyDb,
  opts: { apply: boolean; group?: string },
): Promise<TableResult[]> {
  let results: TableResult[] = [];
  try {
    await dst.tx(async (t) => {
      results = [];
      const ids: IdMaps = new Map();
      for (const table of TABLES) results.push(await copyTable(src, t, table, ids, opts.group));
      if (!opts.apply) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return results;
}

type Sql = postgres.Sql | postgres.TransactionSql;

function wrap(sql: Sql, root: postgres.Sql): CopyDb {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[];
    },
    async tx<T>(fn: (db: CopyDb) => Promise<T>) {
      return root.begin((t) => fn(wrap(t, root))) as Promise<T>;
    },
  };
}

function connect(url: string): postgres.Sql {
  return postgres(url, { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
}

/** Host and database only, never the password. */
function describeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(ugyldig URL)";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const gi = args.indexOf("--group");
  const group = gi >= 0 ? args[gi + 1] : undefined;
  if (gi >= 0 && !group) throw new Error("--group trenger en Spond-gruppe-ID.");
  const unknown = args.filter((a, i) => a !== "--apply" && a !== "--group" && i !== gi + 1);
  if (unknown.length) throw new Error(`Ukjent argument: ${unknown.join(" ")}`);

  const srcUrl = process.env.SOURCE_DATABASE_URL ?? "";
  const dstUrl = process.env.TARGET_DATABASE_URL ?? "";
  if (!srcUrl || !dstUrl) throw new Error("Sett SOURCE_DATABASE_URL (test) og TARGET_DATABASE_URL (prod).");
  if (srcUrl === dstUrl) throw new Error("Kilde og mål er samme database.");

  console.log(`Fra: ${describeUrl(srcUrl)}`);
  console.log(`Til: ${describeUrl(dstUrl)}`);
  if (group) console.log(`Bare gruppe: ${group}`);
  console.log(apply ? "Skriver til prod." : "Prøvekjøring (ingenting lagres). Legg til --apply for å skrive.");

  const src = connect(srcUrl);
  const dst = connect(dstUrl);
  try {
    const results = await copyTestToProd(wrap(src, src), wrap(dst, dst), { apply, group });
    console.table(
      results.map((r) => ({
        tabell: r.table,
        lest: r.read,
        nye: r.inserted,
        oppdatert: r.updated,
        uendret: r.unchanged,
        "hoppet over": r.skipped,
        merknad: r.missing ? "finnes ikke i test" : r.missingColumns ? `mangler i test: ${r.missingColumns.join(", ")}` : "",
      })),
    );
    console.log(apply ? "Ferdig." : "Prøvekjøring ferdig, rullet tilbake.");
  } finally {
    await Promise.all([src.end({ timeout: 5 }), dst.end({ timeout: 5 })]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
