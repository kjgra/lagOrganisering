import "server-only";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import type { Group, Member } from "@/lib/spond/types";
import { playerData, trainerData, type PersonData } from "@/lib/store/personal-data";

/** What is shown and downloaded for one person: names from Spond, data from the database. */
export interface PersonSummary {
  name: string;
  group: string;
  isTrainer: boolean;
  player: PersonData;
  trainer: PersonData | null;
}

export async function personSummary(d: Db, user: CurrentUser, group: Group, member: Member): Promise<PersonSummary> {
  const isTrainer = member.kind === "coach" && !!member.profileId;
  const [player, trainer] = await Promise.all([
    playerData(d, user.access, user.rights, group.id, member.id),
    isTrainer ? trainerData(d, user.rights, member.profileId!) : Promise.resolve(null),
  ]);
  return { name: `${member.firstName} ${member.lastName}`.trim(), group: group.name, isTrainer, player, trainer };
}

export async function personExport(d: Db, user: CurrentUser, group: Group, member: Member) {
  const s = await personSummary(d, user, group, member);
  return {
    om: "Personopplysninger lagret i Nymark – Gruppeorganisering. Navn hentes fra Spond og lagres ikke i appen.",
    laget: new Date().toISOString(),
    navn: s.name,
    gruppe: s.group,
    spond_medlem_id: member.id,
    spond_profil_id: s.isTrainer ? member.profileId : undefined,
    som_spiller: s.player.rows,
    som_trener: s.trainer?.rows,
  };
}

/** Readable names for the tables, for the summary on screen. */
export const TABLE_LABELS: Record<string, string> = {
  member_levels: "Nivå",
  member_tags: "Tagger",
  member_pairs: "«Spiller godt sammen»",
  departed_members: "Merket som sluttet",
  group_proposal_members: "Plass i lagforslag",
  user_preferences: "Egne innstillinger",
  push_subscriptions: "Varsler på mobilen",
  evaluation_reminders: "Påminnelser",
  app_roles: "Tilganger",
  edit_locks: "Redigering pågår",
  ai_usage: "KI-bruk",
  app_role_log: "Logg over tilganger",
  proposal_comments: "Kommentarer på lagforslag",
  proposal_history: "Historikk på lagforslag",
  group_proposals: "Lagforslag laget",
  training_plan_comments: "Kommentarer på opplegg",
  training_plans: "Treningsopplegg",
  exercise_feedback: "Evalueringer",
  team_learnings: "Lærdommer",
  edit_log: "Endringer i øvelser",
  exercises: "Øvelser",
  exercise_versions: "Versjoner av øvelser",
  feedback_reports: "Tilbakemeldinger",
  ki_needs: "Behov fra KI-ønsker",
};

/** «Nivå: 1, Tagger: 2» per table (columns merged). */
export function summaryLines(p: PersonData): { label: string; n: number }[] {
  const per = new Map<string, number>();
  for (const [k, rows] of Object.entries(p.rows)) {
    const table = k.split(".")[0];
    const label = TABLE_LABELS[table] ?? table;
    per.set(label, (per.get(label) ?? 0) + rows.length);
  }
  return [...per].map(([label, n]) => ({ label, n }));
}
