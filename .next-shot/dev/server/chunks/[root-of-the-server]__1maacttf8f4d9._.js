module.exports = [
(()=>{"use strict";return[
"[project]/lib/changelog-file.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APP_VERSION",
    ()=>APP_VERSION,
    "readChangelog",
    ()=>readChangelog
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs/promises [external] (node:fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$package$2e$json$2e5b$json$5d2e$cjs__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/package.json.[json].cjs [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/changelog.ts [instrumentation] (ecmascript)");
;
;
;
;
;
const APP_VERSION = __TURBOPACK__imported__module__$5b$project$5d2f$package$2e$json$2e5b$json$5d2e$cjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["default"].version;
async function readChangelog() {
    try {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["parseChangelog"])(await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["readFile"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "CHANGELOG.md"), "utf8"));
    } catch  {
        return [];
    }
}
}),
"[project]/lib/changelog.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UNRELEASED",
    ()=>UNRELEASED,
    "latestVersion",
    ()=>latestVersion,
    "parseChangelog",
    ()=>parseChangelog,
    "plainText",
    ()=>plainText,
    "releaseDate",
    ()=>releaseDate
]);
// The version log (CHANGELOG.md, Keep a Changelog format) parsed for «Hva er nytt».
// Only the subset we write is understood: «## [versjon] – dato», a short summary,
// «### Type» and «- punkt». PR numbers and Markdown markup are removed for the trainers.
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/format.ts [instrumentation] (ecmascript)");
;
const UNRELEASED = "Ikke utgitt";
function plainText(s) {
    return s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/`([^`]*)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\s*\((?:#\d+(?:[–-]#\d+)?(?:,\s*)?)+\)/g, "").trim();
}
function parseChangelog(md) {
    const releases = [];
    let release = null;
    let group = null;
    for (const raw of md.split(/\r?\n/)){
        const line = raw.trim();
        const head = /^##\s+\[([^\]]+)\](?:\s*[–—-]\s*(\d{4}-\d{2}-\d{2}))?/.exec(line);
        if (head) {
            release = {
                version: head[1],
                date: head[2] ?? null,
                summary: "",
                groups: []
            };
            releases.push(release);
            group = null;
            continue;
        }
        if (!release) continue;
        const kind = /^###\s+(.+)$/.exec(line);
        if (kind) {
            group = {
                kind: kind[1],
                items: []
            };
            release.groups.push(group);
            continue;
        }
        const item = /^[-*]\s+(.+)$/.exec(line);
        if (item && group) {
            group.items.push(plainText(item[1]));
            continue;
        }
        if (line && !group) release.summary = [
            release.summary,
            plainText(line)
        ].filter(Boolean).join(" ");
    }
    return releases.map((r)=>({
            ...r,
            groups: r.groups.filter((g)=>g.items.length)
        })).filter((r)=>r.groups.length);
}
function latestVersion(releases) {
    return releases.find((r)=>r.version !== UNRELEASED)?.version ?? null;
}
function releaseDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d}. ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$format$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["MONTH_NAMES"][m - 1].toLowerCase()} ${y}`;
}
}),
"[project]/lib/db/index.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "db",
    ()=>db,
    "setDbForTests",
    ()=>setDbForTests
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$pglite$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/pglite.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$postgres$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/postgres.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$pglite$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$postgres$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$pglite$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$postgres$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
const g = globalThis;
function db() {
    if (!g.__nymarkDb) {
        const e = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["env"])();
        g.__nymarkDb = e.DATABASE_URL ? Promise.resolve((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$postgres$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["createPostgresDb"])(e.DATABASE_URL)) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$pglite$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["createPgliteDb"])(e.PGLITE_DIR || undefined).then(async (d)=>{
            if (e.SPOND_MOCK) await (await __turbopack_context__.A("[project]/lib/demo/seed.ts [instrumentation] (ecmascript, async loader)")).seedDemo(d);
            return d;
        });
        // A failed start is not cached, so the next request tries again.
        g.__nymarkDb.catch(()=>{
            g.__nymarkDb = undefined;
        });
    }
    return g.__nymarkDb;
}
function setDbForTests(d) {
    g.__nymarkDb = d ? Promise.resolve(d) : undefined;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/db/migrations.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "migrationFiles",
    ()=>migrationFiles
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs/promises [external] (node:fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
async function migrationFiles(dir = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "supabase", "migrations")) {
    const names = (await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["readdir"])(/* turbopackIgnore: true */ dir)).filter((n)=>n.endsWith(".sql")).sort();
    return Promise.all(names.map(async (name)=>({
            name,
            sql: await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["readFile"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(/* turbopackIgnore: true */ dir, name), "utf8")
        })));
}
}),
"[project]/lib/db/pglite.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "createPgliteDb",
    ()=>createPgliteDb,
    "migrate",
    ()=>migrate
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs/promises [external] (node:fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$electric$2d$sql$2f$pglite__$5b$external$5d$__$2840$electric$2d$sql$2f$pglite$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$electric$2d$sql$2b$pglite$40$0$2e$5$2e$9$2f$node_modules$2f40$electric$2d$sql$2f$pglite$29$__ = __turbopack_context__.i("[externals]/@electric-sql/pglite [external] (@electric-sql/pglite, esm_import, [project]/node_modules/.pnpm/@electric-sql+pglite@0.5.9/node_modules/@electric-sql/pglite)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$migrations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/migrations.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$electric$2d$sql$2f$pglite__$5b$external$5d$__$2840$electric$2d$sql$2f$pglite$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$electric$2d$sql$2b$pglite$40$0$2e$5$2e$9$2f$node_modules$2f40$electric$2d$sql$2f$pglite$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$electric$2d$sql$2f$pglite__$5b$external$5d$__$2840$electric$2d$sql$2f$pglite$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$electric$2d$sql$2b$pglite$40$0$2e$5$2e$9$2f$node_modules$2f40$electric$2d$sql$2f$pglite$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
function wrap(conn, root) {
    const self = {
        async query (text, params = []) {
            // Several statements without parameters (migrations) go through exec.
            if (params.length === 0 && /;\s*\S/.test(text)) {
                const res = await conn.exec(text);
                return res.at(-1)?.rows ?? [];
            }
            return (await conn.query(text, params)).rows;
        },
        async tx (fn) {
            if (conn !== root) return fn(self);
            return root.transaction((t)=>fn(wrap(t, root)));
        },
        async close () {
            await root.close();
        }
    };
    return self;
}
async function createPgliteDb(dir) {
    if (dir) await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["mkdir"])(dir, {
        recursive: true
    });
    const root = dir ? new __TURBOPACK__imported__module__$5b$externals$5d2f40$electric$2d$sql$2f$pglite__$5b$external$5d$__$2840$electric$2d$sql$2f$pglite$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$electric$2d$sql$2b$pglite$40$0$2e$5$2e$9$2f$node_modules$2f40$electric$2d$sql$2f$pglite$29$__["PGlite"](dir) : new __TURBOPACK__imported__module__$5b$externals$5d2f40$electric$2d$sql$2f$pglite__$5b$external$5d$__$2840$electric$2d$sql$2f$pglite$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$electric$2d$sql$2b$pglite$40$0$2e$5$2e$9$2f$node_modules$2f40$electric$2d$sql$2f$pglite$29$__["PGlite"]();
    await root.waitReady;
    const d = wrap(root, root);
    await migrate(d);
    // Run as the app's own role, as in production: rows only, no schema changes.
    await d.query("SET ROLE nymark_app");
    return d;
}
async function migrate(d) {
    await d.query("CREATE TABLE IF NOT EXISTS local_migrations (name text PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await d.query("SELECT name FROM local_migrations")).map((r)=>r.name));
    const ran = [];
    for (const m of (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$migrations$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["migrationFiles"])())){
        if (done.has(m.name)) continue;
        await d.tx(async (t)=>{
            await t.query(m.sql);
            await t.query("INSERT INTO local_migrations (name) VALUES ($1)", [
                m.name
            ]);
        });
        ran.push(m.name);
    }
    return ran;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/db/postgres.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "QUERY_TIMEOUT_MS",
    ()=>QUERY_TIMEOUT_MS,
    "createPostgresDb",
    ()=>createPostgresDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$pg$40$8$2e$23$2e$1$2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/.pnpm/pg@8.23.1/node_modules/pg)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$pg$40$8$2e$23$2e$1$2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$pg$40$8$2e$23$2e$1$2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const QUERY_TIMEOUT_MS = 25_000;
/**
 * Results as the store expects them (as with postgres.js before):
 * `date` as a Date at UTC midnight (not local midnight), `interval` as text.
 * Everything else uses node-postgres' parsers (jsonb → object, timestamptz →
 * Date, arrays → arrays, int8 and numeric → text).
 */ const types = {
    getTypeParser (oid, format) {
        if (oid === 1082) return (x)=>new Date(`${x}T00:00:00Z`);
        if (oid === 1186) return (x)=>x;
        return __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$pg$40$8$2e$23$2e$1$2f$node_modules$2f$pg$29$__["default"].types.getTypeParser(oid, format);
    }
};
function handle(run, tx, close) {
    return {
        async query (text, params = []) {
            return (await run(text, params)).rows;
        },
        tx,
        close
    };
}
function createPostgresDb(url, opts = {}) {
    const u = new URL(url);
    // TLS is set below; a `sslmode` in the URL would override it.
    u.searchParams.delete("sslmode");
    const pool = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$pg$40$8$2e$23$2e$1$2f$node_modules$2f$pg$29$__["default"].Pool({
        connectionString: u.toString(),
        ssl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isLocalDb"])(url) ? false : {
            rejectUnauthorized: false
        },
        max: 3,
        idleTimeoutMillis: 20_000,
        connectionTimeoutMillis: 15_000,
        query_timeout: opts.queryTimeoutMs ?? QUERY_TIMEOUT_MS,
        types
    });
    // A connection that breaks while idle must not take the server down.
    pool.on("error", (err)=>console.error("Databasetilkobling feilet:", err.message));
    const close = async ()=>{
        await pool.end();
    };
    const tx = async (fn)=>{
        const client = await pool.connect();
        let broken;
        try {
            await client.query("BEGIN");
            const inner = handle((t, p)=>client.query(t, p), (f)=>f(inner), close);
            const res = await fn(inner);
            await client.query("COMMIT");
            return res;
        } catch (err) {
            // After a timeout the query may still run; the connection is closed instead.
            if (err.message === "Query read timeout") broken = err;
            else {
                try {
                    await client.query("ROLLBACK");
                } catch (e) {
                    broken = e;
                }
            }
            throw err;
        } finally{
            // A broken connection (or one that timed out) is closed, not reused.
            client.release(broken);
        }
    };
    return handle((t, p)=>pool.query(t, p), tx, close);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/env.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DB_REGION",
    ()=>DB_REGION,
    "DEMO_SUPERADMIN",
    ()=>DEMO_SUPERADMIN,
    "aiMode",
    ()=>aiMode,
    "appTitle",
    ()=>appTitle,
    "env",
    ()=>env,
    "envLabel",
    ()=>envLabel,
    "isDbInRegion",
    ()=>isDbInRegion,
    "isDemo",
    ()=>isDemo,
    "isLocalDb",
    ()=>isLocalDb,
    "superadminId",
    ()=>superadminId,
    "vapid",
    ()=>vapid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/external.js [instrumentation] (ecmascript) <export * as z .string>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/external.js [instrumentation] (ecmascript) <export * as z .object>");
;
;
/**
 * Environment variables, checked once. Secrets are never logged.
 *
 * Simulation: with SPOND_MOCK=true the app uses a fake Spond with demo data,
 * without DATABASE_URL it uses PGlite (Postgres in the process), and with
 * AI_MOCK=true (and no ANTHROPIC_API_KEY) KI answers with a canned plan.
 * Production (VERCEL_ENV=production) refuses all three, except in a demo
 * deployment (APP_ENV=DEMO, see isDemo). SPOND_MOCK with a remote
 * DATABASE_URL is refused everywhere: the public demo logins would give
 * superadmin on real data.
 */ const list = (fallback)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().transform((s)=>s && s.trim() ? s.split(",").map((x)=>x.trim()).filter(Boolean) : fallback);
const flag = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().transform((s)=>s === "true" || s === "1");
const schema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    APP_ENV: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    SESSION_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    DATABASE_URL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    PGLITE_DIR: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    SPOND_MOCK: flag,
    SUPERADMIN_PROFILE_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    ANTHROPIC_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    AI_MOCK: flag,
    ACCESS_ROLE_NAMES: list([
        "Teamleder",
        "Trener",
        "Lagleder",
        "Hovedlagleder"
    ]),
    COACH_ROLE_NAMES: list([
        "Teamleder",
        "Trener",
        "Lagleder",
        "Hovedlagleder",
        "Hjelpetrener",
        "Keepertrener",
        "Hjelper"
    ]),
    TAG_SUGGESTIONS: list([
        "Keeper",
        "Kaptein",
        "Forsvar",
        "Midtbane",
        "Angrep",
        "Ny"
    ]),
    VAPID_PUBLIC_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    VAPID_PRIVATE_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    VAPID_SUBJECT: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    CRON_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    PRIVACY_CONTROLLER: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    PRIVACY_CONTACT: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    GITHUB_FEEDBACK_TOKEN: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    GITHUB_FEEDBACK_REPO: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().transform((s)=>s && /^[\w.-]+\/[\w.-]+$/.test(s.trim()) ? s.trim() : "kjgra/lagOrganisering"),
    VERCEL_ENV: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default(""),
    NODE_ENV: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$4$2e$6$2e$7$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional().default("development")
});
let cached = null;
// A fixed key for local simulation only. Production must set SESSION_SECRET.
const DEV_SECRET = "dev-only-secret-not-for-production-use-0123456789";
const DB_REGION = "eu-west-1";
function isDbInRegion(url, region = DB_REGION) {
    try {
        const host = new URL(url).hostname.toLowerCase();
        return new RegExp(`^aws-\\d+-${region.replace(/[^a-z0-9-]/g, "")}\\.pooler\\.supabase\\.com$`).test(host);
    } catch  {
        return false;
    }
}
function isLocalDb(url) {
    try {
        return [
            "localhost",
            "127.0.0.1",
            "[::1]"
        ].includes(new URL(url).hostname);
    } catch  {
        return false;
    }
}
function env() {
    if (cached) return cached;
    const parsed = schema.parse(process.env);
    const prod = parsed.VERCEL_ENV === "production";
    if (prod && isDemo(parsed.APP_ENV)) {
        // A separate Vercel project that runs main fully simulated: fake Spond,
        // canned KI and the in-memory database, never a real database or key.
        const problems = [
            !parsed.SPOND_MOCK && "SPOND_MOCK=true mangler",
            parsed.DATABASE_URL && "DATABASE_URL kan ikke brukes i demo",
            parsed.ANTHROPIC_API_KEY && "ANTHROPIC_API_KEY kan ikke brukes i demo",
            parsed.GITHUB_FEEDBACK_TOKEN && "GITHUB_FEEDBACK_TOKEN kan ikke brukes i demo",
            parsed.SESSION_SECRET.length < 32 && "SESSION_SECRET må ha minst 32 tegn"
        ].filter(Boolean);
        if (problems.length) throw new Error(`Feil i miljøvariabler (demo): ${problems.join("; ")}.`);
    } else if (prod) {
        const problems = [
            parsed.SPOND_MOCK && "SPOND_MOCK kan ikke brukes i produksjon",
            parsed.AI_MOCK && "AI_MOCK kan ikke brukes i produksjon",
            !parsed.DATABASE_URL && "DATABASE_URL mangler",
            parsed.DATABASE_URL && !isDbInRegion(parsed.DATABASE_URL) && `DATABASE_URL må gå til Supabase-pooleren i ${DB_REGION} (Irland)`,
            parsed.SESSION_SECRET.length < 32 && "SESSION_SECRET må ha minst 32 tegn"
        ].filter(Boolean);
        if (problems.length) throw new Error(`Feil i miljøvariabler: ${problems.join("; ")}.`);
    }
    if (parsed.SPOND_MOCK && parsed.DATABASE_URL && !isLocalDb(parsed.DATABASE_URL)) {
        throw new Error("Feil i miljøvariabler: SPOND_MOCK kan ikke brukes med en ekstern DATABASE_URL (demokontoene ville fått tilgang til ekte data).");
    }
    if (!parsed.SESSION_SECRET) {
        if (parsed.NODE_ENV === "production" && !parsed.SPOND_MOCK) {
            throw new Error("Feil i miljøvariabler: SESSION_SECRET mangler.");
        }
        parsed.SESSION_SECRET = DEV_SECRET;
    }
    cached = parsed;
    return parsed;
}
function isDemo(appEnv) {
    return appEnv.trim().toUpperCase() === "DEMO";
}
function envLabel() {
    const e = env();
    const label = e.APP_ENV.trim().toUpperCase();
    if (label && label !== "PROD" && label !== "PRODUCTION") return label.replace(/[^A-Z0-9 _-]/g, "").slice(0, 12);
    if (e.SPOND_MOCK) return "DEMO";
    return "";
}
function appTitle() {
    const name = "Nymark – Gruppeorganisering";
    const label = envLabel();
    return label ? `${name} (${label})` : name;
}
const DEMO_SUPERADMIN = "P-KJETIL";
function superadminId() {
    const e = env();
    return e.SPOND_MOCK ? DEMO_SUPERADMIN : e.SUPERADMIN_PROFILE_ID.trim();
}
function aiMode() {
    const e = env();
    if (e.ANTHROPIC_API_KEY) return "real";
    if (e.AI_MOCK) return "mock";
    return "off";
}
function vapid() {
    const e = env();
    const subject = e.VAPID_SUBJECT.trim();
    if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY || !/^(mailto:|https:)/.test(subject)) return null;
    return {
        publicKey: e.VAPID_PUBLIC_KEY.trim(),
        privateKey: e.VAPID_PRIVATE_KEY.trim(),
        subject
    };
}
}),
"[project]/lib/error-report.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ERROR_ISSUES_PER_DAY",
    ()=>ERROR_ISSUES_PER_DAY,
    "ERROR_KEEP_DAYS",
    ()=>ERROR_KEEP_DAYS,
    "ERROR_LABEL",
    ()=>ERROR_LABEL,
    "errorInfo",
    ()=>errorInfo,
    "errorIssueBody",
    ()=>errorIssueBody,
    "errorIssueTitle",
    ()=>errorIssueTitle,
    "fingerprint",
    ()=>fingerprint,
    "scrub",
    ()=>scrub
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/feedback.ts [instrumentation] (ecmascript)");
;
;
const ERROR_LABEL = "auto-feil";
const ERROR_ISSUES_PER_DAY = 5;
const ERROR_KEEP_DAYS = 90;
const cut = (s, n)=>s.length > n ? s.slice(0, n - 1) + "…" : s;
function errorInfo(area, err, opts = {}) {
    const e = err instanceof Error ? err : null;
    const name = e && e.name && e.name !== "Error" ? `${e.name}: ` : "";
    const message = e ? `${name}${e.message}` : typeof err === "string" ? err : (()=>{
        try {
            return JSON.stringify(err) ?? String(err);
        } catch  {
            return String(err);
        }
    })();
    const stack = (e?.stack ?? "").split("\n").map((l)=>l.trim()).filter((l)=>l.startsWith("at ")).slice(0, 12).join("\n");
    const route = opts.route ? opts.route.includes("[") ? opts.route : (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$feedback$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["cleanPage"])(opts.route) : "";
    return {
        area: cut(area.trim() || "Ukjent", 100),
        source: opts.source ?? "server",
        message: cut(message.trim() || "(uten melding)", 1000),
        stack: cut(stack, 4000),
        route: cut(route, 200)
    };
}
function scrub(s) {
    return (s ?? "").replace(/=\([^)]*\)/g, "=(…)").replace(/\b(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/g, "$1?<…>").replace(/\b(Bearer|Basic)\s+\S+/g, "$1 <skjult>").replace(/\b(token|api[_-]?key|key|secret|password|passord)(\s*[:=]\s*)\S+/gi, "$1$2<skjult>").replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, "<e-post>").replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>").replace(/\b(?=[0-9A-F]*\d)(?=[0-9A-F]*[A-F])[0-9A-F]{16,}\b/gi, "<id>").replace(/\+?\d[\d -]{5,}\d/g, "<tall>").replace(/"[^"\n]{0,200}"/g, '"…"').replace(/'[^'\n]{0,200}'/g, "'…'").replace(/«[^»\n]{0,200}»/g, "«…»").replace(/@(?=[\w-])/g, "@​");
}
function fingerprint(i) {
    const normal = scrub(i.message).replace(/\d+/g, "N").toLowerCase();
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${i.source}\n${i.area}\n${normal}`).digest("hex").slice(0, 16);
}
function errorIssueTitle(i) {
    const first = scrub(i.message).split("\n")[0].replace(/\s+/g, " ");
    return cut(`Feil i ${scrub(i.area)}: ${first}`, 120);
}
const fence = (s)=>[
        "~~~",
        s.replace(/~~~/g, "~ ~ ~"),
        "~~~"
    ].join("\n");
function errorIssueBody(i) {
    const stack = scrub(i.stack);
    return [
        i.previous ? `Feilen kom tilbake etter at #${i.previous} ble lukket.\n` : "",
        fence(scrub(i.message)),
        "",
        "| | |",
        "|---|---|",
        `| Område | ${scrub(i.area)} |`,
        `| Kilde | ${i.source} |`,
        `| Side | \`${i.route || "ukjent"}\` |`,
        `| Versjon | ${i.appVersion} |`,
        `| Først sett | ${i.firstSeen.toISOString().slice(0, 16).replace("T", " ")} UTC |`,
        `| Antall | ${i.count} |`,
        "",
        stack ? `<details><summary>Stack</summary>\n\n${fence(stack)}\n\n</details>\n` : "",
        `_Opprettet automatisk av feilvakten i appen. Fingeravtrykk \`${i.fingerprint}\`. Detaljer i Admin → Feillogg._`
    ].filter((l, n)=>l !== "" || n > 0).join("\n");
}
}),
"[project]/lib/errors.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "reportError",
    ()=>reportError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2d$file$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/changelog-file.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/index.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/error-report.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$github$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/github.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$errors$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/errors.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
async function reportError(area, err, opts = {}) {
    const info = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["errorInfo"])(area, err, opts);
    console.error(`${info.area} feilet:`, info.message);
    if (process.env.VITEST) return;
    try {
        await Promise.race([
            record(info),
            new Promise((_, reject)=>setTimeout(()=>reject(new Error("tidsavbrudd")), 8000))
        ]);
    } catch (e) {
        console.error("Feillogging feilet:", e.message);
    }
}
async function record(info) {
    const d = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"])();
    const fp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["fingerprint"])(info);
    const row = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$errors$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["recordError"])(d, fp, info, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2d$file$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["APP_VERSION"]);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$github$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["githubMode"])() !== "real" || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["env"])().VERCEL_ENV !== "production") return;
    const claim = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$errors$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["claimIssue"])(d, row.id, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2d$file$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["APP_VERSION"]);
    if (!claim) return;
    let previous;
    if (claim === "sjekk") {
        if (row.issue_number === null || await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$github$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["issueState"])(row.issue_number) !== "closed" || !await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$errors$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["mayReopen"])(d)) return;
        previous = row.issue_number;
    }
    const issue = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$github$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["createIssue"])({
        title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["errorIssueTitle"])(info),
        body: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["errorIssueBody"])({
            ...info,
            fingerprint: fp,
            appVersion: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2d$file$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["APP_VERSION"],
            firstSeen: row.first_seen,
            count: row.count,
            previous
        }),
        labels: [
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["ERROR_LABEL"],
            info.source
        ]
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$errors$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["setIssue"])(d, row.id, issue, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$changelog$2d$file$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["APP_VERSION"]);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/feedback.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FEEDBACK_DAILY_LIMIT",
    ()=>FEEDBACK_DAILY_LIMIT,
    "FEEDBACK_KINDS",
    ()=>FEEDBACK_KINDS,
    "FEEDBACK_LABEL",
    ()=>FEEDBACK_LABEL,
    "FEEDBACK_MAX",
    ()=>FEEDBACK_MAX,
    "cleanPage",
    ()=>cleanPage,
    "clientSummary",
    ()=>clientSummary,
    "feedbackProblem",
    ()=>feedbackProblem,
    "issueBody",
    ()=>issueBody,
    "issueLabels",
    ()=>issueLabels,
    "issueTitle",
    ()=>issueTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sensitive.ts [instrumentation] (ecmascript)");
;
const FEEDBACK_KINDS = [
    {
        key: "feil",
        label: "Noe virker ikke",
        issue: "Feil"
    },
    {
        key: "forslag",
        label: "Forslag",
        issue: "Forslag"
    }
];
const FEEDBACK_MAX = 2000;
const FEEDBACK_DAILY_LIMIT = 5;
const FEEDBACK_LABEL = "tilbakemelding";
function feedbackProblem(text, names) {
    const t = (text ?? "").trim();
    if (t.length < 5) return "Skriv litt mer, så vi forstår hva det gjelder.";
    if (t.length > FEEDBACK_MAX) return `Tilbakemeldingen kan ha maks ${FEEDBACK_MAX} tegn.`;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["isSensitive"])(t)) return "Ikke skriv helseopplysninger eller andre sensitive opplysninger. Teksten kan bli offentlig.";
    if (/\S+@\S+\.\S+/.test(t) || /\d[\d ]{6,}\d/.test(t)) return "Ikke skriv e-post eller telefonnummer. Teksten kan bli offentlig.";
    const found = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sensitive$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["namesFound"])(t, names);
    if (found.length) {
        return `Teksten nevner ${found.slice(0, 3).map((n)=>`«${n}»`).join(", ")}. Skriv uten navn, teksten kan bli offentlig: f.eks. «en spiller» eller «en trener».`;
    }
    return null;
}
function cleanPage(path) {
    const p = (path ?? "").split(/[?#]/)[0];
    if (!p.startsWith("/") || p.startsWith("//")) return "";
    const parts = p.split("/").filter(Boolean).map((s)=>/^[a-zæøå]+(-[a-zæøå]+)*$/.test(s) ? s : "…");
    return ("/" + parts.join("/")).slice(0, 200);
}
function clientSummary(userAgent, width) {
    const ua = userAgent ?? "";
    const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
    const browser = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "";
    const w = width && Number.isFinite(width) && width > 0 ? Math.round(width) : null;
    const device = w === null ? "" : w < 768 ? "mobil" : w < 1024 ? "nettbrett" : "PC";
    return [
        device && `${device} (${w} px)`,
        os,
        browser
    ].filter(Boolean).join(", ");
}
/** Stops @mentions in the public issue from notifying anyone on GitHub. */ const noMentions = (s)=>s.replace(/@(?=[\w-])/g, "@\u200b");
function issueTitle(r) {
    const label = FEEDBACK_KINDS.find((k)=>k.key === r.kind)?.issue ?? "Tilbakemelding";
    const first = noMentions(r.body.trim().replace(/\s+/g, " "));
    return `${label}: ${first.length > 70 ? first.slice(0, 69).trimEnd() + "…" : first}`;
}
function issueBody(r) {
    const quoted = noMentions(r.body.trim()).split(/\r?\n/).map((l)=>`> ${l}`).join("\n");
    const date = r.createdAt.toISOString().slice(0, 10);
    return [
        quoted,
        "",
        "| | |",
        "|---|---|",
        `| Type | ${FEEDBACK_KINDS.find((k)=>k.key === r.kind)?.issue ?? r.kind} |`,
        `| Side | \`${r.page || "/"}\` |`,
        `| Versjon | ${r.appVersion} |`,
        `| Enhet | ${r.client || "ukjent"} |`,
        `| Rolle | ${r.role} |`,
        `| Sendt | ${date} |`,
        "",
        "_Sendt fra tilbakemeldingsknappen i appen og godkjent av admin før publisering._"
    ].join("\n");
}
function issueLabels(kind) {
    return [
        FEEDBACK_LABEL,
        kind
    ];
}
}),
"[project]/lib/format.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Norwegian dates and numbers, always in Oslo time (the server may run in UTC).
 * Style from the design system: «Tor 15. okt», «17:30–18:45».
 */ __turbopack_context__.s([
    "MONTH_NAMES",
    ()=>MONTH_NAMES,
    "TZ",
    ()=>TZ,
    "clock",
    ()=>clock,
    "dayLabel",
    ()=>dayLabel,
    "decimal",
    ()=>decimal,
    "longDate",
    ()=>longDate,
    "osloDate",
    ()=>osloDate,
    "osloMidnight",
    ()=>osloMidnight,
    "osloMonthStart",
    ()=>osloMonthStart,
    "osloParts",
    ()=>osloParts,
    "pastSection",
    ()=>pastSection,
    "plural",
    ()=>plural,
    "savedAt",
    ()=>savedAt,
    "shortDate",
    ()=>shortDate,
    "timeRange",
    ()=>timeRange,
    "weekSection",
    ()=>weekSection,
    "weekStart",
    ()=>weekStart,
    "weekdayShort",
    ()=>weekdayShort
]);
const TZ = "Europe/Oslo";
const WEEKDAYS = [
    "Søn",
    "Man",
    "Tir",
    "Ons",
    "Tor",
    "Fre",
    "Lør"
];
const WEEKDAYS_LONG = [
    "søndag",
    "mandag",
    "tirsdag",
    "onsdag",
    "torsdag",
    "fredag",
    "lørdag"
];
const MONTHS = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "des"
];
const MONTH_NAMES = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember"
];
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short"
});
const WD = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};
function osloParts(d) {
    const date = typeof d === "string" ? new Date(d) : d;
    const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x)=>[
            x.type,
            x.value
        ]));
    return {
        year: Number(p.year),
        month: Number(p.month),
        day: Number(p.day),
        weekday: WD[p.weekday] ?? 0,
        hour: Number(p.hour),
        minute: Number(p.minute)
    };
}
const pad = (n)=>String(n).padStart(2, "0");
function clock(d) {
    const p = osloParts(d);
    return `${pad(p.hour)}:${pad(p.minute)}`;
}
function weekdayShort(d) {
    return WEEKDAYS[osloParts(d).weekday];
}
function dayLabel(d, now = new Date()) {
    const p = osloParts(d);
    const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
    return `${WEEKDAYS[p.weekday]} ${p.day}. ${MONTHS[p.month - 1]}${y}`;
}
function longDate(d) {
    const p = osloParts(d);
    return `${WEEKDAYS_LONG[p.weekday]} ${p.day}. ${MONTH_NAMES[p.month - 1].toLowerCase()} ${p.year} kl. ${clock(d)}`;
}
function timeRange(start, end, now = new Date()) {
    if (!start) return "Tid ikke satt";
    if (!end) return clock(start);
    const sameDay = osloDate(start) === osloDate(end);
    return `${clock(start)}–${sameDay ? "" : `${dayLabel(end, now)} `}${clock(end)}`;
}
function osloDate(d) {
    const p = osloParts(d);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
function savedAt(d, now = new Date()) {
    const day = osloDate(d);
    const today = osloDate(now);
    const yesterday = osloDate(new Date(now.getTime() - 86_400_000));
    const when = day === today ? "i dag" : day === yesterday ? "i går" : shortDate(d, now);
    return `${when} kl. ${clock(d)}`;
}
function shortDate(d, now = new Date()) {
    const p = osloParts(d);
    const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
    return `${p.day}. ${MONTHS[p.month - 1]}${y}`;
}
function weekStart(d) {
    const p = osloParts(d);
    const mondayOffset = (p.weekday + 6) % 7;
    const noon = Date.UTC(p.year, p.month - 1, p.day, 12) - mondayOffset * 86_400_000;
    const x = new Date(noon);
    return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}
function weekSection(d, now = new Date()) {
    const w = weekStart(d);
    const thisWeek = weekStart(now);
    const nextWeek = weekStart(new Date(now.getTime() + 7 * 86_400_000));
    if (w === thisWeek) return "Denne uken";
    if (w === nextWeek) return "Neste uke";
    const p = osloParts(d);
    return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}
function pastSection(d, now = new Date()) {
    const w = weekStart(d);
    if (w === weekStart(now)) return "Denne uken";
    if (w === weekStart(new Date(now.getTime() - 7 * 86_400_000))) return "Forrige uke";
    const p = osloParts(d);
    return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}
function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
}
function decimal(x, digits = 2) {
    return x.toFixed(digits).replace(".", ",");
}
function osloMonthStart(now = new Date(), monthsBack = 0) {
    const p = osloParts(now);
    const m = p.year * 12 + (p.month - 1) - monthsBack;
    return osloMidnight(Math.floor(m / 12), m % 12 + 1, 1);
}
/** Minutes Oslo is ahead of UTC at the instant `d` (60 or 120). */ function osloOffsetMinutes(d) {
    const p = osloParts(d);
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    return Math.round((local - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
}
function osloMidnight(year, month, day) {
    const guess = Date.UTC(year, month - 1, day);
    let t = guess - osloOffsetMinutes(new Date(guess)) * 60_000;
    t = guess - osloOffsetMinutes(new Date(t)) * 60_000;
    return new Date(t);
}
}),
"[project]/lib/github.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GithubError",
    ()=>GithubError,
    "createIssue",
    ()=>createIssue,
    "feedbackRepo",
    ()=>feedbackRepo,
    "githubMode",
    ()=>githubMode,
    "issueState",
    ()=>issueState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [instrumentation] (ecmascript)");
;
;
function githubMode() {
    const e = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["env"])();
    if (e.SPOND_MOCK) return "mock";
    return e.GITHUB_FEEDBACK_TOKEN ? "real" : "off";
}
function feedbackRepo() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["env"])().GITHUB_FEEDBACK_REPO;
}
class GithubError extends Error {
    constructor(message){
        super(message);
        this.name = "GithubError";
    }
}
const headers = ()=>({
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["env"])().GITHUB_FEEDBACK_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "lagorganisering"
    });
async function issueState(n) {
    if (githubMode() !== "real") return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${feedbackRepo()}/issues/${n}`, {
            headers: headers(),
            signal: AbortSignal.timeout(10_000)
        });
        if (!res.ok) return null;
        const j = await res.json();
        return j.state === "open" || j.state === "closed" ? j.state : null;
    } catch  {
        return null;
    }
}
async function createIssue(issue) {
    const mode = githubMode();
    const repo = feedbackRepo();
    if (mode === "mock") return {
        number: 0,
        url: `https://github.com/${repo}/issues`
    };
    if (mode === "off") throw new GithubError("GitHub er ikke satt opp (GITHUB_FEEDBACK_TOKEN mangler).");
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers: {
            ...headers(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(issue),
        signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) {
        // The status only: the answer could echo the request.
        console.error("GitHub-issue feilet:", res.status);
        if (res.status === 401 || res.status === 403) throw new GithubError("GitHub avviste nøkkelen. Sjekk GITHUB_FEEDBACK_TOKEN.");
        if (res.status === 404) throw new GithubError(`Fant ikke repoet ${repo}, eller nøkkelen har ikke tilgang til det.`);
        throw new GithubError("GitHub svarte ikke som ventet. Prøv igjen om litt.");
    }
    const j = await res.json();
    if (typeof j.number !== "number" || typeof j.html_url !== "string") throw new GithubError("GitHub svarte ikke som ventet.");
    return {
        number: j.number,
        url: j.html_url
    };
}
}),
"[project]/lib/sensitive.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clean",
    ()=>clean,
    "commentProblem",
    ()=>commentProblem,
    "isSensitive",
    ()=>isSensitive,
    "memberNames",
    ()=>memberNames,
    "namesFound",
    ()=>namesFound,
    "namesProblem",
    ()=>namesProblem,
    "redactNames",
    ()=>redactNames,
    "storedNamesProblem",
    ()=>storedNamesProblem,
    "tagProblem",
    ()=>tagProblem
]);
/**
 * Tags, comments and free text must not hold health or other sensitive
 * information (GDPR art. 9), nor contact details. The app refuses obvious
 * words; the list is a help, not a guarantee. Matched at the start of a
 * word, case-insensitive: "skad" catches "skadet", "skade", "skadeavbrekk".
 */ const SENSITIVE = [
    /(?<![\p{L}\p{N}])skad/iu,
    /(?<![\p{L}\p{N}])syk(e|t|dom|dommen|meldt|emeldt)?(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])diagnos/iu,
    /(?<![\p{L}\p{N}])allergi/iu,
    /(?<![\p{L}\p{N}])astma/iu,
    /(?<![\p{L}\p{N}])adhd(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])autis/iu,
    /(?<![\p{L}\p{N}])epilep/iu,
    /(?<![\p{L}\p{N}])diabet/iu,
    /(?<![\p{L}\p{N}])medisin/iu,
    /(?<![\p{L}\p{N}])hjernerystelse/iu,
    /(?<![\p{L}\p{N}])brudd(?![\p{L}\p{N}])/iu,
    /(?<![\p{L}\p{N}])brukket/iu,
    /(?<![\p{L}\p{N}])operer/iu,
    /(?<![\p{L}\p{N}])smert/iu,
    /(?<![\p{L}\p{N}])dysleksi/iu,
    /(?<![\p{L}\p{N}])spiseforstyrr/iu,
    /(?<![\p{L}\p{N}])angst/iu,
    /(?<![\p{L}\p{N}])depre/iu,
    /(?<![\p{L}\p{N}])psyk/iu,
    /(?<![\p{L}\p{N}])gravid/iu,
    /(?<![\p{L}\p{N}])fysioterap/iu,
    /(?<![\p{L}\p{N}])rehab/iu,
    /(?<![\p{L}\p{N}])sykehus/iu,
    /(?<![\p{L}\p{N}])barnevern/iu,
    /(?<![\p{L}\p{N}])relig/iu,
    /(?<![\p{L}\p{N}])etnisk/iu,
    /(?<![\p{L}\p{N}])funksjonshem/iu
];
function isSensitive(...texts) {
    const t = texts.filter(Boolean).join(" ");
    return !!t && SENSITIVE.some((re)=>re.test(t));
}
const clean = (x)=>typeof x === "string" ? x.trim().replace(/\s+/g, " ") : "";
function tagProblem(tag) {
    const t = clean(tag);
    if (!t) return "Skriv inn en tag.";
    if (t.length > 40) return "En tag kan ha maks 40 tegn.";
    if (isSensitive(t)) return "Tagger skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
    if (t.includes("@") || /\d[\d ]{6,}\d/.test(t)) return "Tagger skal ikke inneholde kontaktinformasjon.";
    return null;
}
function commentProblem(text, max = 2000) {
    const t = (text ?? "").trim();
    if (!t) return "Skriv en kommentar først.";
    if (t.length > max) return `En kommentar kan ha maks ${max} tegn.`;
    if (isSensitive(t)) return "Kommentarer skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
    return null;
}
// Names in free text. Names are never sent to KI, so text that goes there is
// checked against the team's member names. Full names are always caught; a
// first name alone only with at least 3 letters and when it is not a common word.
const COMMON = new Set([
    "per",
    "dag",
    "liv",
    "sol",
    "ask",
    "stein",
    "kai",
    "mai",
    "vår",
    "var",
    "tor",
    "rom",
    "lin",
    "even",
    "hans",
    "frank",
    "storm",
    "fred",
    "rune",
    "ulv",
    "ørn",
    "vill",
    "siv"
]);
function memberNames(members) {
    const out = new Set();
    for (const m of members){
        const full = `${m.firstName} ${m.lastName}`.trim();
        if (full.includes(" ")) out.add(full);
        for (const f of [
            m.firstName.trim(),
            ...m.firstName.split(/[\s-]+/)
        ]){
            if (f.length >= 3 && !COMMON.has(f.toLowerCase())) out.add(f);
        }
    }
    return [
        ...out
    ].filter(Boolean);
}
const esc = (s)=>s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function namesFound(text, names) {
    if (!text.trim() || !names.length) return [];
    return names.filter((n)=>new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "iu").test(text));
}
function namesProblem(text, names, reason = "Navn sendes ikke til KI") {
    const found = namesFound(text, names);
    if (!found.length) return null;
    return `Teksten nevner ${found.slice(0, 3).map((n)=>`«${n}»`).join(", ")}. ${reason}: skriv f.eks. «en av keeperne» i stedet.`;
}
function redactNames(text, names) {
    return [
        ...names
    ].sort((a, b)=>b.length - a.length).reduce((t, n)=>t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "giu"), "en spiller"), text);
}
function storedNamesProblem(texts, names) {
    for (const t of texts){
        const p = t ? namesProblem(t, names, "Navn lagres ikke i appen") : null;
        if (p) return p;
    }
    return null;
}
}),
"[project]/lib/store/access.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Who may read and write what. Every store function takes an `Access` (built
 * from the user's Spond data on the server, never from the browser) and
 * checks the group before touching the database.
 */ __turbopack_context__.s([
    "NO_RIGHTS",
    ()=>NO_RIGHTS,
    "UserError",
    ()=>UserError,
    "assertAdmin",
    ()=>assertAdmin,
    "assertGroup",
    ()=>assertGroup,
    "assertSuperadmin",
    ()=>assertSuperadmin,
    "assertTags",
    ()=>assertTags,
    "userRights",
    ()=>userRights
]);
class UserError extends Error {
    constructor(message){
        super(message);
        this.name = "UserError";
    }
}
function assertGroup(access, groupId) {
    if (!access.groupIds.has(groupId)) throw new UserError("Du har ikke tilgang til denne gruppen.");
}
const NO_RIGHTS = {
    superadmin: false,
    admin: false,
    ai: false,
    app: false,
    tags: false
};
function userRights(profileId, role, superadminId) {
    const sa = !!superadminId.trim() && profileId === superadminId.trim();
    const admin = sa || !!role?.is_admin;
    return {
        superadmin: sa,
        admin,
        ai: sa || !!role?.can_use_ai,
        app: admin || !!role?.can_use_app,
        tags: sa || (role?.can_see_tags ?? true)
    };
}
function assertAdmin(rights) {
    if (!rights.admin) throw new UserError("Bare administratorer kan endre dette.");
}
function assertTags(rights) {
    if (!rights.tags) throw new UserError("Du har ikke tilgang til tagger.");
}
function assertSuperadmin(rights) {
    if (!rights.superadmin) throw new UserError("Bare superadmin kan endre dette.");
}
}),
"[project]/lib/store/errors.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "claimIssue",
    ()=>claimIssue,
    "deleteOldErrors",
    ()=>deleteOldErrors,
    "listErrors",
    ()=>listErrors,
    "mayReopen",
    ()=>mayReopen,
    "recordError",
    ()=>recordError,
    "setIssue",
    ()=>setIssue
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/error-report.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store/access.ts [instrumentation] (ecmascript)");
;
;
const COLS = "id, fingerprint, area, source, message, stack, route, app_version, count, first_seen, last_seen, issue_number, issue_url, issue_version, issue_created_at";
async function recordError(d, fp, i, appVersion) {
    const [row] = await d.query(`INSERT INTO error_events (fingerprint, area, source, message, stack, route, app_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (fingerprint) DO UPDATE
       SET count = error_events.count + 1, last_seen = now(), message = EXCLUDED.message,
           stack = CASE WHEN EXCLUDED.stack <> '' THEN EXCLUDED.stack ELSE error_events.stack END,
           route = CASE WHEN EXCLUDED.route <> '' THEN EXCLUDED.route ELSE error_events.route END,
           app_version = EXCLUDED.app_version
     RETURNING ${COLS}`, [
        fp,
        i.area,
        i.source,
        i.message,
        i.stack,
        i.route,
        appVersion.slice(0, 20)
    ]);
    return row;
}
async function underDailyLimit(d) {
    const [{ n }] = await d.query("SELECT count(*)::int AS n FROM error_events WHERE issue_created_at > now() - interval '24 hours' OR issue_claimed_at > now() - interval '10 minutes'");
    return n < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["ERROR_ISSUES_PER_DAY"];
}
async function claimIssue(d, id, appVersion) {
    const [row] = await d.query("SELECT issue_number, issue_version FROM error_events WHERE id = $1", [
        id
    ]);
    if (!row) return null;
    if (row.issue_number === null) {
        if (!await underDailyLimit(d)) return null;
        const got = await d.query(`UPDATE error_events SET issue_claimed_at = now()
        WHERE id = $1 AND issue_number IS NULL AND (issue_claimed_at IS NULL OR issue_claimed_at < now() - interval '10 minutes')
       RETURNING id`, [
            id
        ]);
        return got.length ? "ny" : null;
    }
    if (row.issue_version === appVersion) return null;
    const got = await d.query("UPDATE error_events SET issue_version = $2 WHERE id = $1 AND issue_version IS DISTINCT FROM $2 RETURNING id", [
        id,
        appVersion
    ]);
    return got.length ? "sjekk" : null;
}
async function mayReopen(d) {
    return underDailyLimit(d);
}
async function setIssue(d, id, issue, appVersion) {
    await d.query("UPDATE error_events SET issue_number = $2, issue_url = $3, issue_version = $4, issue_created_at = now(), issue_claimed_at = NULL WHERE id = $1", [
        id,
        issue.number,
        issue.url,
        appVersion
    ]);
}
async function listErrors(d, rights, limit = 50) {
    if (!rights.superadmin) throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2f$access$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["UserError"]("Bare superadmin kan se feilloggen.");
    return d.query(`SELECT ${COLS} FROM error_events ORDER BY last_seen DESC, id DESC LIMIT $1::int`, [
        limit
    ]);
}
async function deleteOldErrors(d, now = new Date()) {
    const rows = await d.query("DELETE FROM error_events WHERE last_seen < $1::timestamptz - make_interval(days => $2::integer) RETURNING id", [
        now.toISOString(),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$error$2d$report$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["ERROR_KEEP_DAYS"]
    ]);
    return rows.length;
}
}),
]})(),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:fs/promises [external] (node:fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:fs/promises", () => require("node:fs/promises"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[project]/package.json.[json].cjs [instrumentation] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "name": "lag-organisering",
    "version": "1.23.0",
    "private": true,
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "eslint",
        "typecheck": "next typegen && tsc --noEmit",
        "test": "vitest run",
        "test:e2e": "playwright test",
        "clone:prod-to-preview": "node scripts/clone-prod-to-preview.mts",
        "copy:test-to-prod": "node scripts/copy-test-to-prod.mts"
    },
    "dependencies": {
        "@anthropic-ai/sdk": "^0.133.0",
        "@dnd-kit/core": "^6.3.1",
        "@electric-sql/pglite": "^0.5.9",
        "@react-pdf/renderer": "^4.9.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "fflate": "^0.8.3",
        "jose": "^6.2.12",
        "lucide-react": "^1.56.0",
        "next": "16.4.3",
        "node-html-parser": "^9.0.4",
        "pg": "^8.23.1",
        "postgres": "^3.4.9",
        "radix-ui": "^1.8.1",
        "react": "19.3.0",
        "react-dom": "19.3.0",
        "server-only": "^0.0.1",
        "sonner": "^2.0.8",
        "tailwind-merge": "^3.7.0",
        "vaul": "^1.1.2",
        "web-push": "3.6.7",
        "zod": "^4.6.7"
    },
    "devDependencies": {
        "@playwright/test": "1.56.1",
        "@tailwindcss/turbopack": "^4",
        "@testing-library/dom": "^10.4.2",
        "@testing-library/react": "^16.3.3",
        "@types/node": "^20",
        "@types/pg": "^8.23.1",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "@types/web-push": "3.6.4",
        "@vitejs/plugin-react": "^6.1.2",
        "eslint": "^9",
        "eslint-config-next": "16.4.3",
        "jsdom": "^30.1.3",
        "tailwindcss": "^4",
        "typescript": "^5",
        "vitest": "^5.0.4"
    },
    "packageManager": "pnpm@10.28.0"
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1maacttf8f4d9._.js.map