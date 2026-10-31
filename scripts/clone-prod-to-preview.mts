/**
 * Kloner prod-databasen til preview-databasen: tømmer alle tabeller i preview
 * og kopierer alle rader fra prod, med de samme ID-ene.
 *
 *   SOURCE_DATABASE_URL=<prod> TARGET_DATABASE_URL=<preview> pnpm clone:prod-to-preview
 *   ... pnpm clone:prod-to-preview --apply
 *
 * Uten --apply er det en prøvekjøring: alt skjer i en transaksjon som rulles
 * tilbake, og scriptet viser hvor mange rader hver tabell ville fått.
 *
 * Kilden leses bare. Målet må ha alle migreringene kilden har (det kan ha
 * flere, f.eks. fra en åpen PR); kolonner og tabeller som bare finnes i målet,
 * får standardverdien eller blir tomme. Redigeringslåser kopieres ikke.
 *
 * Til forskjell fra copy-test-to-prod slår dette ikke sammen noe: alt i målet
 * erstattes. Bruk det aldri med prod som mål.
 */
import { pathToFileURL } from "node:url";
import postgres from "postgres";

/** The part of lib/db's Db the clone needs, so tests can pass PGlite. */
export interface CloneDb {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (db: CloneDb) => Promise<T>): Promise<T>;
}

export interface CloneResult {
  table: string;
  rows: number;
  /** The table is not in the source database. */
  missing?: boolean;
  /** Not copied on purpose. */
  skipped?: boolean;
  /** Columns not in the source database; the target gives them their default. */
  missingColumns?: string[];
}

/** Short-lived editing state, and push subscriptions (tied to the prod VAPID keys), never copied. */
const SKIP = new Set(["edit_locks", "push_subscriptions"]);
const BATCH = 500;

class DryRun extends Error {}

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

async function tables(d: CloneDb): Promise<string[]> {
  const rows = await d.query<{ name: string }>(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY 1",
  );
  return rows.map((r) => r.name);
}

/** Tables with parents before children, so foreign keys hold while inserting. */
async function ordered(d: CloneDb, names: string[]): Promise<string[]> {
  const fks = await d.query<{ child: string; parent: string }>(
    `SELECT c.relname AS child, p.relname AS parent
       FROM pg_constraint k
       JOIN pg_class c ON c.oid = k.conrelid
       JOIN pg_class p ON p.oid = k.confrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE k.contype = 'f' AND n.nspname = current_schema() AND c.oid <> p.oid`,
  );
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (t: string, path: Set<string>) => {
    if (seen.has(t)) return;
    if (path.has(t)) throw new Error(`Sirkulære fremmednøkler ved ${t}.`);
    path.add(t);
    for (const fk of fks) if (fk.child === t) visit(fk.parent, path);
    path.delete(t);
    seen.add(t);
    out.push(t);
  };
  for (const t of names) visit(t, new Set());
  return out.filter((t) => names.includes(t));
}

/** Columns that can be written (not generated). */
async function columns(d: CloneDb, table: string): Promise<string[]> {
  const rows = await d.query<{ name: string }>(
    `SELECT column_name AS name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1 AND is_generated = 'NEVER'
      ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.name);
}

/** Applied Supabase migrations, or null when the database has no history (PGlite). */
async function migrations(d: CloneDb): Promise<string[] | null> {
  const [has] = await d.query<{ ok: boolean }>("SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS ok");
  if (!has?.ok) return null;
  const rows = await d.query<{ version: string }>("SELECT version FROM supabase_migrations.schema_migrations");
  return rows.map((r) => r.version);
}

/** Replaces everything in `dst` with the rows in `src`, in one transaction. Rolled back unless `apply`. */
export async function cloneDatabase(src: CloneDb, dst: CloneDb, opts: { apply: boolean }): Promise<CloneResult[]> {
  const [have, need] = await Promise.all([migrations(dst), migrations(src)]);
  if (have && need) {
    const lacking = need.filter((v) => !have.includes(v)).sort();
    if (lacking.length) throw new Error(`Målet mangler migreringer: ${lacking.join(", ")}. Kjør migreringene mot målet først.`);
  }

  const srcTables = new Set(await tables(src));
  const order = await ordered(dst, await tables(dst));
  let results: CloneResult[] = [];
  try {
    await dst.tx(async (t) => {
      results = [];
      await t.query(`TRUNCATE ${order.map(ident).join(", ")} RESTART IDENTITY`);
      for (const table of order) {
        if (SKIP.has(table)) {
          results.push({ table, rows: 0, skipped: true });
          continue;
        }
        if (!srcTables.has(table)) {
          results.push({ table, rows: 0, missing: true });
          continue;
        }
        const from = new Set(await columns(src, table));
        const to = await columns(t, table);
        const common = to.filter((c) => from.has(c));
        const res: CloneResult = { table, rows: 0 };
        const lacking = to.filter((c) => !from.has(c));
        if (lacking.length) res.missingColumns = lacking;
        const list = common.map(ident).join(", ");
        // Rows travel as JSON text, so timestamps, numerics and arrays keep full precision.
        for (let offset = 0; ; offset += BATCH) {
          const [batch] = await src.query<{ rows: string | null; n: number }>(
            `SELECT json_agg(r)::text AS rows, count(*)::int AS n
               FROM (SELECT ${list} FROM ${ident(table)} ORDER BY ctid LIMIT ${BATCH} OFFSET ${offset}) r`,
          );
          if (!batch?.n) break;
          await t.query(
            `INSERT INTO ${ident(table)} (${list}) OVERRIDING SYSTEM VALUE
             SELECT ${list} FROM json_populate_recordset(NULL::${ident(table)}, $1::text::json)`,
            [batch.rows],
          );
          res.rows += batch.n;
          if (batch.n < BATCH) break;
        }
        results.push(res);
      }
      // Identity columns continue after the highest copied id.
      const ids = await t.query<{ tbl: string; col: string }>(
        `SELECT table_name AS tbl, column_name AS col FROM information_schema.columns
          WHERE table_schema = current_schema() AND is_identity = 'YES'`,
      );
      for (const { tbl, col } of ids) {
        await t.query(
          `SELECT setval(pg_get_serial_sequence($1, $2), coalesce(max(${ident(col)}), 0) + 1, false) FROM ${ident(tbl)}`,
          [ident(tbl), col],
        );
      }
      if (!opts.apply) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return results;
}

type Sql = postgres.Sql | postgres.TransactionSql;

function wrap(sql: Sql, root: postgres.Sql): CloneDb {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[];
    },
    async tx<T>(fn: (db: CloneDb) => Promise<T>) {
      return root.begin((t) => fn(wrap(t, root))) as Promise<T>;
    },
  };
}

function connect(url: string): postgres.Sql {
  return postgres(url, { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
}

/** User, host and database, never the password. On Supabase's pooler the user carries the project ref. */
function describeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.username}@${u.hostname}${u.pathname}`;
  } catch {
    return "(ugyldig URL)";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const unknown = args.filter((a) => a !== "--apply");
  if (unknown.length) throw new Error(`Ukjent argument: ${unknown.join(" ")}`);

  const srcUrl = process.env.SOURCE_DATABASE_URL ?? "";
  const dstUrl = process.env.TARGET_DATABASE_URL ?? "";
  if (!srcUrl || !dstUrl) throw new Error("Sett SOURCE_DATABASE_URL (prod) og TARGET_DATABASE_URL (preview).");
  if (srcUrl === dstUrl || describeUrl(srcUrl) === describeUrl(dstUrl)) throw new Error("Kilde og mål er samme database.");

  console.log(`Fra: ${describeUrl(srcUrl)}`);
  console.log(`Til: ${describeUrl(dstUrl)} (alt her erstattes)`);
  console.log(apply ? "Skriver til målet." : "Prøvekjøring (ingenting lagres). Legg til --apply for å skrive.");

  const src = connect(srcUrl);
  const dst = connect(dstUrl);
  try {
    const results = await cloneDatabase(wrap(src, src), wrap(dst, dst), { apply });
    console.table(
      results.map((r) => ({
        tabell: r.table,
        rader: r.rows,
        merknad: r.skipped
          ? "kopieres ikke"
          : r.missing
            ? "finnes ikke i kilden"
            : r.missingColumns
              ? `mangler i kilden: ${r.missingColumns.join(", ")}`
              : "",
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
