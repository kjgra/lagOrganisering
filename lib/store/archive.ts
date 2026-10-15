import "server-only";
import { strToU8, zipSync, type Zippable } from "fflate";
import type { Db } from "@/lib/db";
import { MAINTENANCE_RULES } from "@/lib/maintenance";
import { planPdf } from "@/lib/pdf/plan-pdf";
import { validatePlan } from "@/lib/plans/plan";
import { assertSuperadmin, UserError, type Access, type Rights } from "./access";

/**
 * Plans for trainings whose newest version is older than 12 months are
 * archived, not deleted automatically: the superadmin downloads a ZIP (one
 * folder per training with a PDF and data.json, no names), and then
 * confirms that they may be deleted. Comments and evaluations go with the
 * plans (ON DELETE CASCADE).
 */

export interface PendingTraining {
  spond_group_id: string;
  spond_event_id: string;
  last_at: Date;
  n_versions: number;
}

export async function archivePending(d: Db, access: Access, now: Date = new Date()): Promise<PendingTraining[]> {
  const ids = [...access.groupIds];
  if (!ids.length) return [];
  const rows = await d.query<PendingTraining>(
    `SELECT spond_group_id, spond_event_id, max(created_at) AS last_at, count(*)::int AS n_versions
       FROM training_plans WHERE spond_group_id = ANY($1::text[])
      GROUP BY spond_group_id, spond_event_id
     HAVING max(created_at) < $2::timestamptz - make_interval(days => $3::integer)
      ORDER BY last_at, spond_group_id, spond_event_id`,
    [ids, now.toISOString(), MAINTENANCE_RULES.archiveDays],
  );
  return rows.map((r) => ({ ...r, last_at: new Date(r.last_at) }));
}

export const archiveKey = (p: { spond_group_id: string; spond_event_id: string }) => `${p.spond_group_id}|${p.spond_event_id}`;

export async function archiveLog(d: Db) {
  const [m] = await d.query<{ last_run: Date | null; run_by: string | null; last_result: string | null }>(
    "SELECT last_run, run_by, last_result FROM maintenance WHERE id = 1",
  );
  const archives = await d.query<{ period_from: Date | null; period_to: Date | null; n_events: number; n_versions: number; confirmed_by: string; confirmed_at: Date }>(
    `SELECT period_from, period_to, n_events, n_versions, confirmed_by, confirmed_at
       FROM archive_log ORDER BY confirmed_at DESC LIMIT 10`,
  );
  return { maintenance: m ?? { last_run: null, run_by: null, last_result: null }, archives };
}

function slug(x: string): string {
  const s = x
    .normalize("NFKD")
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/[åÅ]/g, "a")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "lag";
}

const osloDate = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(d);

/** The ZIP: LES-MEG.txt, and per training `<lag>/<dato>-<arrangement>/` with data.json and a PDF. */
export async function buildArchive(d: Db, access: Access, rights: Rights, groupNames: Record<string, string>, now: Date = new Date()) {
  assertSuperadmin(rights);
  const pending = await archivePending(d, access, now);
  if (!pending.length) throw new UserError("Ingen opplegg venter på arkivering.");
  const keys = [pending.map((p) => p.spond_group_id), pending.map((p) => p.spond_event_id)];
  const sel = "(spond_group_id, spond_event_id) IN (SELECT * FROM unnest($1::text[], $2::text[]))";
  const plans = await d.query<{ id: number; spond_group_id: string; spond_event_id: string; version: number; status: string; source: string; model: string; cost_usd: number | null; plan: string; created_at: Date; approved_at: Date | null }>(
    `SELECT id, spond_group_id, spond_event_id, version, status, source, coalesce(model, '') AS model, cost_usd::float8 AS cost_usd,
            plan::text AS plan, created_at, approved_at
       FROM training_plans WHERE ${sel} ORDER BY spond_group_id, spond_event_id, version`,
    keys,
  );
  const comments = await d.query<{ spond_group_id: string; spond_event_id: string; version: number; exercise_no: number | null; body: string; created_at: Date }>(
    `SELECT c.spond_group_id, c.spond_event_id, p.version, c.exercise_no, c.body, c.created_at
       FROM training_plan_comments c JOIN training_plans p ON p.id = c.plan_id
      WHERE (c.spond_group_id, c.spond_event_id) IN (SELECT * FROM unnest($1::text[], $2::text[])) ORDER BY c.created_at, c.id`,
    keys,
  );
  const feedback = await d.query<{
    spond_group_id: string;
    spond_event_id: string;
    version: number;
    exercise_no: number | null;
    exercise_code: string;
    rating: number | null;
    tags: string[];
    actual_minutes: number | null;
    actual_players: number | null;
    registered_players: number | null;
    body: string;
    use_again: string;
    created_at: Date;
  }>(
    `SELECT f.spond_group_id, f.spond_event_id, p.version, f.exercise_no, coalesce(f.exercise_code, '') AS exercise_code, f.rating, f.tags,
            f.actual_minutes, f.actual_players, f.registered_players, coalesce(f.body, '') AS body, coalesce(f.use_again, '') AS use_again, f.created_at
       FROM exercise_feedback f JOIN training_plans p ON p.id = f.plan_id
      WHERE (f.spond_group_id, f.spond_event_id) IN (SELECT * FROM unnest($1::text[], $2::text[])) ORDER BY f.created_at, f.id`,
    keys,
  );
  const iso = (x: Date | null) => (x ? new Date(x).toISOString() : null);
  const files: Zippable = {};
  let pdfFailed = 0;
  for (const t of pending) {
    const g = t.spond_group_id;
    const ev = t.spond_event_id;
    const gname = groupNames[g] ?? g;
    const folder = `${slug(gname)}/${osloDate(t.last_at)}-${ev.replace(/[^A-Za-z0-9]/g, "")}`;
    const mine = <T extends { spond_group_id: string; spond_event_id: string }>(x: T[]) => x.filter((r) => r.spond_group_id === g && r.spond_event_id === ev);
    const pl = mine(plans);
    const json = {
      lag: gname,
      spond_gruppe_id: g,
      spond_arrangement_id: ev,
      arkivert: now.toISOString(),
      versjoner: pl.map((p) => ({
        versjon: p.version,
        status: p.status,
        kilde: p.source,
        modell: p.model,
        kostnad_usd: p.cost_usd,
        laget: iso(p.created_at),
        godkjent: iso(p.approved_at),
        opplegg: JSON.parse(p.plan),
      })),
      kommentarer: mine(comments).map((c) => ({ versjon: c.version, ovelse: c.exercise_no, tekst: c.body, tid: iso(c.created_at) })),
      evalueringer: mine(feedback).map((f) => ({
        versjon: f.version,
        ovelse: f.exercise_no,
        kode: f.exercise_code,
        vurdering: f.rating,
        stikkord: f.tags,
        faktisk_tid: f.actual_minutes,
        antall_kom: f.actual_players,
        antall_pameldt: f.registered_players,
        tekst: f.body,
        bruke_igjen: f.use_again,
        tid: iso(f.created_at),
      })),
    };
    files[`${folder}/data.json`] = strToU8(JSON.stringify(json, null, 2));
    const live = pl.filter((p) => p.status !== "deleted");
    const best = live.find((p) => p.status === "approved") ?? live[live.length - 1];
    if (best) {
      try {
        const plan = validatePlan(JSON.parse(best.plan));
        const buf = await planPdf({ plan, info: [`Arkivert ${now.toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo" })}`, gname], footer: gname, groups: [] });
        files[`${folder}/opplegg-versjon-${best.version}.pdf`] = [new Uint8Array(buf), { level: 0 }];
      } catch (err) {
        console.error("PDF i arkivet feilet:", (err as Error).message);
        pdfFailed++;
        files[`${folder}/pdf-mangler.txt`] = strToU8("PDF-en kunne ikke lages. Opplegget finnes i data.json.\n");
      }
    }
  }
  const when = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", dateStyle: "short", timeStyle: "short" }).format(now);
  files["LES-MEG.txt"] = strToU8(
    [
      "Arkiv fra Nymark - Gruppeorganisering",
      "",
      `Laget ${when}. ${pending.length} treninger og ${plans.length} versjoner av treningsopplegg.`,
      "",
      "Én mappe per trening: PDF av godkjent versjon (ellers den nyeste) og data.json med alle versjoner,",
      "kommentarer og evalueringer. Ingen navn på spillere eller trenere.",
      "",
      "Datoen i mappenavnet er dagen den nyeste versjonen ble laget.",
      "",
    ].join("\n"),
  );
  const zip = zipSync(files, { level: 6 });
  return { zip, keys: pending.map(archiveKey), nEvents: pending.length, nVersions: plans.length, pdfFailed };
}

/** Delete the archived trainings (still older than 12 months, and in `keys`), and log it. */
export async function confirmArchive(d: Db, access: Access, rights: Rights, keys: string[], actor: string, now: Date = new Date()) {
  assertSuperadmin(rights);
  const pending = (await archivePending(d, access, now)).filter((p) => keys.includes(archiveKey(p)));
  if (!pending.length) throw new UserError("Ingen av oppleggene i arkivet venter på sletting.");
  return d.tx(async (t) => {
    const gone = await t.query(
      "DELETE FROM training_plans WHERE (spond_group_id, spond_event_id) IN (SELECT * FROM unnest($1::text[], $2::text[])) RETURNING id",
      [pending.map((p) => p.spond_group_id), pending.map((p) => p.spond_event_id)],
    );
    const times = pending.map((p) => p.last_at.getTime());
    await t.query(
      `INSERT INTO archive_log (spond_group_ids, period_from, period_to, n_events, n_versions, confirmed_by)
       VALUES ($1::text[], $2::date, $3::date, $4, $5, $6)`,
      [[...new Set(pending.map((p) => p.spond_group_id))], osloDate(new Date(Math.min(...times))), osloDate(new Date(Math.max(...times))), pending.length, gone.length, actor],
    );
    return { nEvents: pending.length, nVersions: gone.length };
  });
}
