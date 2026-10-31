import "server-only";
import type { Db } from "@/lib/db";
import { osloParts } from "@/lib/format";
import { compactDrawing } from "@/lib/plans/drawing";
import { categoryKey, planJson, validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import { mockEvents } from "@/lib/spond/mock";

/**
 * Demo data for the simulated database (SPOND_MOCK=true without
 * DATABASE_URL): rights for the demo trainers, a few tags, and an exercise
 * shared exercise bank, and the season plan and team settings for G-FOTBALL. Each part runs once.
 * Ids match lib/spond/mock.ts.
 */
export async function seedDemo(d: Db): Promise<void> {
  await seedAccess(d);
  await seedTraining(d);
}

async function seedAccess(d: Db): Promise<void> {
  const done = await d.query("SELECT 1 FROM app_roles WHERE spond_profile_id = 'P-ANN'");
  if (done.length) return;
  await d.tx(async (t) => {
    await t.query(
      `INSERT INTO app_roles (spond_profile_id, can_use_app, can_use_ai, is_admin, updated_by) VALUES
         ('P-ANN', true, true, false, 'P-KJETIL'),
         ('P-PER', true, false, false, 'P-KJETIL'),
         ('P-LISE', true, false, false, 'P-KJETIL')`,
    );
    await t.query(
      `INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-2', 'Keeper', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-7', 'Keeper', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-3', 'Venstrebein', 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-5', 'Ny', 'P-ANN'),
         ('G-FOTBALL', 'M-S-G2016-9', 'Forsvar', 'P-ANN'),
         ('G-FOTBALL', 'M-S-G2016-12', 'Kaptein', 'P-ANN'),
         ('G-FOTBALL', 'M-S-J2016-1', 'Keeper', 'P-BEATE')`,
    );
    await t.query(
      `INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-1', 3, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-3', 3, 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-4', 2, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-6', 1, 'P-KJETIL'),
         ('G-FOTBALL', 'M-S-G2016-8', 2, 'P-KJETIL'), ('G-FOTBALL', 'M-S-G2016-10', 1, 'P-KJETIL')`,
    );
    await t.query(
      `INSERT INTO member_pairs (spond_group_id, member_a, member_b, created_by) VALUES
         ('G-FOTBALL', 'M-S-G2016-4', 'M-S-G2016-6', 'P-KJETIL')`,
    );
  });
}

const REF_CATEGORY: Record<string, string> = {
  "3-mot-1-alltid-to-alternativer": "pasning_mottak",
  "hjem-bak-ballen": "forsvar",
  "4-mot-4-med-endesoner": "smaaspill",
};

const EXTRA = [
  {
    code: "rondo-4-mot-1",
    name: "Rondo 4 mot 1",
    category: "pasning_mottak",
    themes: ["Samhandling"],
    organisation: "Rute 8 × 8 m\nFire på kantene, én i midten\nBytt midtspiller hvert minutt",
    execution: "Hold ballen i laget med maks to touch\nMidtspilleren prøver å vinne ballen",
    learning_points: "Åpen kropp mot banen\nSpill til foten lengst fra forsvareren",
  },
  {
    code: "smaaspill-3-mot-3",
    name: "Småspill 3 mot 3",
    category: "smaaspill",
    themes: [],
    organisation: "Bane 20 × 15 m med to småmål\nFire lag som bytter hvert tredje minutt",
    execution: "Fritt spill, innspark eller innføring ved sidelinjen",
    learning_points: "Bruk bredden\nHjem raskt når vi mister ballen",
  },
  {
    code: "sistemann-oppvarming",
    name: "Sistemann med ball",
    category: "oppvarming",
    themes: [],
    organisation: "Alle med ball i en rute 20 × 20 m",
    execution: "Før ballen rundt, trener roper øvelser: stopp, vend, sålen\nSiste mann som gjør riktig får en oppgave",
    learning_points: "Mange touch på ballen\nBlikket opp",
  },
];

async function seedTraining(d: Db): Promise<void> {
  const done = await d.query("SELECT 1 FROM exercises WHERE spond_group_id = 'felles' LIMIT 1");
  if (done.length) return;
  const ref = validatePlan(reference);
  const now = osloParts(new Date());
  await d.tx(async (t) => {
    for (const e of ref.ovelser) {
      await t.query(
        `INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, questions,
                                easier, harder, nff_url, drawing, created_by, updated_by)
         VALUES ('felles', $1, $2, $3, $4::text[], $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), $12::jsonb, 'P-KJETIL', 'P-KJETIL')`,
        [
          e.kode,
          e.navn,
          REF_CATEGORY[e.kode] ?? categoryKey(e.kategori),
          [ref.tema],
          e.organisering.join("\n"),
          e.gjennomforing.join("\n"),
          e.laeringsmomenter.join("\n"),
          e.sporsmal.join("\n"),
          e.enklere,
          e.vanskeligere,
          e.nff_url,
          e.tegning ? JSON.stringify(compactDrawing(e.tegning)) : null,
        ],
      );
    }
    for (const e of EXTRA) {
      await t.query(
        `INSERT INTO exercises (spond_group_id, code, name, category, themes, organisation, execution, learning_points, created_by, updated_by)
         VALUES ('felles', $1, $2, $3, $4::text[], $5, $6, $7, 'P-KJETIL', 'P-KJETIL')`,
        [e.code, e.name, e.category, e.themes, e.organisation, e.execution, e.learning_points],
      );
    }
    // The reference plan's exercises are tagged with NFF's fagplan, so tags and filters can be tried.
    await t.query(
      `UPDATE exercises SET bands = '{8-9,10-12}', nff_activity = 'med-og-mot',
              nff_tags = '{tema.spille-framover,delf.pasning,delf.mottak,lm.10-12.spille-framover.laget.2}'
        WHERE spond_group_id = 'felles' AND code = ANY($1::text[])`,
      [ref.ovelser.map((e) => e.kode)],
    );
    const next = now.month === 12 ? { year: now.year + 1, month: 1 } : { year: now.year, month: now.month + 1 };
    await t.query(
      `INSERT INTO season_themes (spond_group_id, year, month, theme, description, updated_by) VALUES
         ('G-FOTBALL', $1, $2, $3, 'Spille på lag: være spillbar, og hjem raskt når vi mister ballen.', 'P-KJETIL'),
         ('G-FOTBALL', $4, $5, 'Avslutning', 'Komme til avslutning og skyte med riktig del av foten.', 'P-KJETIL')`,
      [now.year, now.month, ref.tema || "Samhandling", next.year, next.month],
    );
    // An approved plan for the last training of Gutter 2016, so the evaluation can be tried.
    const last = mockEvents()
      .filter((e) => e.id.startsWith("E-S-G2016-") && !e.matchEvent && Date.parse(e.endTimestamp ?? "") < Date.now())
      .sort((a, b) => (b.startTimestamp ?? "").localeCompare(a.startTimestamp ?? ""))[0];
    if (last) {
      await t.query(
        `INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, source, status, created_by, approved_by, approved_at, event_start, event_end)
         VALUES ('G-FOTBALL', $1, 1, $2::jsonb, 'manual', 'approved', 'P-ANN', 'P-KJETIL', now(), $3::timestamptz, $4::timestamptz)`,
        [last.id, planJson(ref), last.startTimestamp ?? null, last.endTimestamp ?? null],
      );
    }
    await t.query(
      `INSERT INTO team_settings (spond_group_id, birth_year, gender, session_minutes, pitch, equipment, updated_by)
       VALUES ('G-FOTBALL', 2016, 'gutter', 75, 'Deler med G11 annenhver uke', 'Kjegler, vester i fire farger, 6 småmål, 20 baller', 'P-KJETIL')`,
    );
    await t.query("INSERT INTO team_principles (spond_group_id, body, created_by) VALUES ('G-FOTBALL', 'Mye ballkontakt, lite kø. Alle skal oppleve mestring.', 'P-KJETIL')");
    await t.query("INSERT INTO team_pitches (spond_group_id, pitch_id) VALUES ('G-FOTBALL', 8876), ('G-FOTBALL', 3985)");
  });
}
