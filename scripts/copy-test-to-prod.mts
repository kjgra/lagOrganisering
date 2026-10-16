/**
 * Kopierer øvelsesbanken, trenertilganger (med logg), årshjulet og lagets
 * standard fra test-databasen
 * (den gamle appen) til prod-databasen.
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
 * Loggrader legges bare til når en helt lik rad ikke finnes i prod.
 * Ingenting slettes. Bare Spond-ID-er kopieres; tabellene har ingen navn.
 *
 * Tabeller: exercises (alle statuser), app_roles, app_role_log, season_themes
 * og team_settings.
 * Superadmin står i SUPERADMIN_PROFILE_ID og kopieres ikke.
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
}

interface Table {
  name: string;
  columns: string[];
  key: string[];
  /** A log without a key: a row is added when no equal row exists, never updated. */
  log?: boolean;
  /**
   * Columns read as text and cast back on insert. Timestamps go as text so no
   * microseconds are lost (JS Date has milliseconds). The parameter is typed
   * text first, or postgres.js would encode the string again as JSON or a Date.
   */
  casts: Record<string, string>;
  /** Column holding the Spond main group, for --group. */
  group?: string;
}

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
    casts: { themes: "text[]", drawing: "jsonb", created_at: "timestamptz", updated_at: "timestamptz" },
    group: "spond_group_id",
  },
  {
    name: "app_roles",
    columns: ["spond_profile_id", "can_use_ai", "is_admin", "can_use_app", "updated_by", "updated_at"],
    key: ["spond_profile_id"],
    casts: { updated_at: "timestamptz" },
  },
  {
    name: "app_role_log",
    columns: ["spond_profile_id", "role", "granted", "actor", "created_at"],
    key: ["created_at", "spond_profile_id", "role", "granted", "actor"],
    log: true,
    casts: { spond_profile_id: "text", role: "text", granted: "boolean", actor: "text", created_at: "timestamptz" },
  },
  {
    name: "season_themes",
    columns: ["spond_group_id", "year", "month", "theme", "description", "updated_by", "updated_at"],
    key: ["spond_group_id", "year", "month"],
    casts: { updated_at: "timestamptz" },
    group: "spond_group_id",
  },
  {
    name: "team_settings",
    columns: ["spond_group_id", "age_group", "session_minutes", "pitch", "equipment", "principles", "updated_by", "updated_at"],
    key: ["spond_group_id"],
    casts: { updated_at: "timestamptz" },
    group: "spond_group_id",
  },
];

class DryRun extends Error {}

async function copyTable(src: CopyDb, dst: CopyDb, t: Table, group?: string): Promise<TableResult> {
  const select = t.columns.map((c) => (t.casts[c] ? `${c}::text AS ${c}` : c)).join(", ");
  const where = group && t.group ? ` WHERE ${t.group} = $1` : "";
  const rows = await src.query<Record<string, unknown>>(
    `SELECT ${select} FROM ${t.name}${where} ORDER BY ${t.key.join(", ")}`,
    where ? [group] : [],
  );
  const param = (c: string, i: number) => `$${i + 1}${t.casts[c] ? `::text::${t.casts[c]}` : ""}`;
  const values = t.columns.map(param).join(", ");
  const set = t.columns.filter((c) => !t.key.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(", ");
  const upsert = t.log
    ? `INSERT INTO ${t.name} (${t.columns.join(", ")}) SELECT ${values}
       WHERE NOT EXISTS (SELECT 1 FROM ${t.name} WHERE ${t.columns.map((c, i) => `${c} = ${param(c, i)}`).join(" AND ")})
       RETURNING true AS inserted`
    : `INSERT INTO ${t.name} (${t.columns.join(", ")}) VALUES (${values})
       ON CONFLICT (${t.key.join(", ")}) DO UPDATE SET ${set}
       WHERE ${t.name}.updated_at < EXCLUDED.updated_at
       RETURNING (xmax = 0) AS inserted`;
  const res: TableResult = { table: t.name, read: rows.length, inserted: 0, updated: 0, unchanged: 0 };
  for (const row of rows) {
    const [r] = await dst.query<{ inserted: boolean }>(upsert, t.columns.map((c) => row[c]));
    if (!r) res.unchanged++;
    else if (r.inserted) res.inserted++;
    else res.updated++;
  }
  return res;
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
      for (const table of TABLES) results.push(await copyTable(src, t, table, opts.group));
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
      results.map((r) => ({ tabell: r.table, lest: r.read, nye: r.inserted, oppdatert: r.updated, uendret: r.unchanged })),
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
