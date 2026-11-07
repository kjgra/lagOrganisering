import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { testDb } from "../helpers/db";
import { setDbForTests, type Db } from "@/lib/db";
import { BANK_VIEWS, asBankReader, isBankReader, readBank } from "@/lib/bank-read";
import { PERSON_COLUMNS } from "@/lib/store/personal-data";

let d: Db;

beforeAll(async () => {
  d = await testDb();
  await d.query(
    `INSERT INTO exercises (spond_group_id, code, name, category, created_by, updated_by)
     VALUES ('felles', 'rondo', 'Rondo', 'annet', 'P-1', 'P-1'), ('G1', 'egen', 'Lagets egen', 'annet', 'P-1', 'P-1')`,
  );
  const [p] = await d.query<{ id: number }>("INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, created_by) VALUES ('G1', 'E1', 1, '{}', 'P-1') RETURNING id");
  await d.query(
    `INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, rating, body, author)
     VALUES ('G1', 'E1', $1, 1, 'rondo', 3, 'Bra tempo', 'P-1'), ('G1', 'E1', $1, 2, 'egen', 1, 'Lagets egen', 'P-1')`,
    [p.id],
  );
  await d.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ('G1', 'M-1', 'Keeper', 'P-1')");
  await d.query("INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES ('G1', 'M-1', 3, 'P-1')");
  setDbForTests(d);
});
afterAll(async () => {
  setDbForTests(undefined);
  await d.close();
});

const asReader = <T>(fn: (t: Db) => Promise<T>) =>
  d.tx(async (t) => {
    await t.query("SET LOCAL ROLE claude_les");
    return fn(t);
  });

describe("øvelsesbank (lesetilgang for Claude)", () => {
  it("the role is read-only, cannot log in until a password is set, and cannot do more", async () => {
    const [r] = await d.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean; rolcreatedb: boolean; rolcanlogin: boolean; rolconfig: string[] }>(
      "SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolcanlogin, rolconfig FROM pg_roles WHERE rolname = 'claude_les'",
    );
    expect(r).toMatchObject({ rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false, rolcanlogin: false });
    expect(r.rolconfig).toContain("default_transaction_read_only=on");
  });

  it("reads the views, and nothing in public", async () => {
    const ex = await asReader((t) => t.query<{ code: string }>("SELECT code FROM ovelsesbank.ovelser"));
    expect(ex.map((e) => e.code)).toEqual(["rondo"]);
    for (const table of ["member_tags", "member_levels", "exercises", "exercise_feedback", "group_proposal_members"]) {
      await expect(asReader((t) => t.query(`SELECT 1 FROM public.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(asReader((t) => t.query("DELETE FROM ovelsesbank.ovelser"))).rejects.toThrow(/permission denied/);
    await expect(asReader((t) => t.query("CREATE TABLE ovelsesbank.x (id int)"))).rejects.toThrow(/permission denied/);
  });

  it("the app's own role and PUBLIC have no rights in the schema", async () => {
    const admin = await testDb({ admin: true });
    const [r] = await admin.query<{ app: boolean; pub: boolean }>(
      "SELECT has_schema_privilege('nymark_app', 'ovelsesbank', 'USAGE') AS app, has_schema_privilege('public', 'ovelsesbank', 'USAGE') AS pub",
    );
    expect(r).toEqual({ app: false, pub: false });
    await admin.close();
  });

  it("no view has a column with a person id, a team or an event", async () => {
    const admin = await testDb({ admin: true });
    const cols = await admin.query<{ t: string; c: string }>(
      "SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'ovelsesbank'",
    );
    expect(new Set(cols.map((c) => c.t))).toEqual(new Set(BANK_VIEWS));
    const banned = new Set([...PERSON_COLUMNS, "spond_group_id", "spond_subgroup_id", "spond_subgroup_ids", "spond_event_id", "plan_id"]);
    expect(cols.filter((c) => banned.has(c.c)).map((c) => `${c.t}.${c.c}`)).toEqual([]);
    await admin.close();
  });

  it("the schema holds only views, so nothing is stored there", async () => {
    const admin = await testDb({ admin: true });
    const kinds = await admin.query<{ relkind: string }>("SELECT DISTINCT relkind FROM pg_class WHERE relnamespace = 'ovelsesbank'::regnamespace");
    expect(kinds.map((k) => k.relkind)).toEqual(["v"]);
    await admin.close();
  });

  it("evaluations come only for bank exercises, without trainer", async () => {
    const r = await asBankReader((t) => readBank(t, ["evalueringer"]));
    expect(r!.evalueringer).toEqual([expect.objectContaining({ exercise_code: "rondo", rating: 3, body: "Bra tempo" })]);
    expect(Object.keys(r!.evalueringer[0] as object)).not.toContain("author");
  });

  it("reads every view as claude_les in simulation", async () => {
    const r = await asBankReader((t) => readBank(t, BANK_VIEWS));
    expect(Object.keys(r!)).toEqual([...BANK_VIEWS]);
  });

  it("checks the token in constant time, and only a full match passes", () => {
    const token = "t".repeat(40);
    expect(isBankReader(`Bearer ${token}`, token)).toBe(true);
    expect(isBankReader(`Bearer ${token}x`, token)).toBe(false);
    expect(isBankReader(null, token)).toBe(false);
    expect(isBankReader(`Bearer ${token}`, null)).toBe(false);
  });
});

describe("GET /api/ovelsesbank", () => {
  const call = async (vars: Record<string, string>, init: { auth?: string; del?: string } = {}) => {
    vi.resetModules();
    for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
    (await import("@/lib/db")).setDbForTests(d);
    const { GET } = await import("@/app/api/ovelsesbank/route");
    const url = `http://x/api/ovelsesbank${init.del ? `?del=${init.del}` : ""}`;
    const res = await GET(new Request(url, { headers: init.auth ? { authorization: init.auth } : {} }));
    vi.unstubAllEnvs();
    return res;
  };
  const token = "k".repeat(40);

  it("is off without a token, and refuses a wrong one", async () => {
    expect((await call({ BANK_READ_TOKEN: "" })).status).toBe(404);
    expect((await call({ BANK_READ_TOKEN: "kort" }, { auth: "Bearer kort" })).status).toBe(404);
    expect((await call({ BANK_READ_TOKEN: token }, { auth: "Bearer feil" })).status).toBe(401);
  });

  it("answers the chosen views, and refuses unknown ones", async () => {
    const ok = await call({ BANK_READ_TOKEN: token, DATABASE_URL: "" }, { auth: `Bearer ${token}`, del: "ovelser,monstre" });
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(Object.keys(body)).toEqual(["ovelser", "monstre"]);
    expect(body.ovelser.map((e: { code: string }) => e.code)).toEqual(["rondo"]);
    expect((await call({ BANK_READ_TOKEN: token, DATABASE_URL: "" }, { auth: `Bearer ${token}`, del: "member_tags" })).status).toBe(400);
  });
});
