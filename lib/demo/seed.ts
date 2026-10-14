import "server-only";
import type { Db } from "@/lib/db";

/**
 * Demo data for the simulated database (SPOND_MOCK=true without
 * DATABASE_URL): rights for the demo trainers and a few tags. Runs once.
 * Ids match lib/spond/mock.ts.
 */
export async function seedDemo(d: Db): Promise<void> {
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
  });
}
