"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { findGroup, requireUser } from "@/lib/auth/current";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import { estimateKi, linkThemesWithKi, prepareExerciseKi, reviseExerciseKi, runExerciseKi, updateLearningsWithKi } from "@/lib/ai/service";
import { teamBand } from "@/lib/nff/bands";
import { db } from "@/lib/db";
import { exerciseOrderContext } from "@/lib/plan-data";
import { adjustedValues, exerciseInputFrom, type ExerciseValues } from "@/lib/plans/exercise-values";
import { UserError } from "@/lib/store/access";
import { memberNames, storedNamesProblem } from "@/lib/sensitive";
import { decideProposal, getProposal } from "@/lib/store/improvements";
import { exerciseVersions } from "@/lib/store/versions";
import { importExercises, previewExerciseImport } from "@/lib/store/exercise-import";
import type { ImportRow } from "@/lib/plans/exercise-import";
import { deleteExercise, getExercise, getTeamSettings, saveExercise, saveLearning, savePrinciples, saveSeason, saveSeasonSetup, saveTeamSettings, saveThemeWord, followMainGroup, type Part } from "@/lib/store/training";

/** «Trening»: season plan, the team, principles, learnings and the exercise bank, for every trainer on the team. */

const sid = z.string().min(1).max(100);
const short = z.string().max(4000);

async function trainer(groupId: string, sub = "") {
  const user = await requireUser();
  const group = findGroup(user, groupId);
  if (sub && !group.subgroups.some((s) => s.id === sub)) throw new UserError("Fant ikke laget.");
  return { user, group, d: await db() };
}

const subId = z.string().max(100);
const PARTS = { season: "Årshjulet", team: "Laget", principles: "Prinsippene", learnings: "Lærdommene" } as const;

const focus = z
  .object({ hovedtemaId: z.string().max(80).nullable(), delferdighetId: z.string().max(80).nullable(), learningPointIds: z.array(z.string().max(100)).max(2) })
  .nullable();

/** `focus` (one per month) when the year uses NFF's terms: the picked hovedtema, delferdighet and learning points. */
export async function saveSeasonAction(
  groupId: string,
  sub: string,
  year: number,
  themes: string[],
  descriptions: string[],
  monthFocus?: (z.input<typeof focus> | null)[],
): Promise<ActionResult> {
  return runAction("Lagring av årshjul", async () => {
    const v = z
      .object({
        groupId: sid,
        sub: subId,
        year: z.number().int().min(2020).max(2100),
        themes: z.array(z.string().max(200)).length(12),
        descriptions: z.array(z.string().max(1000)).length(12),
        focus: z.array(focus).length(12).optional(),
      })
      .parse({ groupId, sub, year, themes, descriptions, focus: monthFocus });
    const { user, group, d } = await trainer(v.groupId, v.sub);
    await saveSeason(d, user.access, v.groupId, v.sub, v.year, v.themes, v.descriptions, v.focus);
    // With the team's own words: KI links the words the app does not know yet (one short call).
    let linked = 0;
    if (!v.focus) {
      const band = teamBand((await getTeamSettings(d, user.access, v.groupId, v.sub)).birth_year, v.year);
      if (band) linked = await linkThemesWithKi(d, user, user.rights, group, band, v.themes);
    }
    refresh();
    const more = linked ? ` KI foreslo kobling til NFF for ${linked === 1 ? "ett nytt ord" : `${linked} nye ord`}.` : "";
    return { data: undefined, message: `Årshjulet for ${v.year} er lagret.${more}` };
  });
}

/** Links a word from the årshjul to NFF's terms for the team (the word list). Nothing chosen removes the word. */
export async function saveThemeWordAction(
  groupId: string,
  sub: string,
  theme: string,
  input: { hovedtemaIds: string[]; delferdighetIds: string[]; learningPointIds: string[] },
): Promise<ActionResult> {
  return runAction("Kobling til NFF", async () => {
    const v = z
      .object({
        groupId: sid,
        sub: subId,
        theme: z.string().max(200),
        input: z.object({ hovedtemaIds: z.array(z.string().max(80)).max(4), delferdighetIds: z.array(z.string().max(80)).max(6), learningPointIds: z.array(z.string().max(100)).max(2) }),
      })
      .parse({ groupId, sub, theme, input });
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveThemeWord(d, user.access, v.groupId, v.theme, v.input);
    refresh();
    const none = !v.input.hovedtemaIds.length && !v.input.delferdighetIds.length && !v.input.learningPointIds.length;
    return { data: undefined, message: none ? `«${v.theme.trim()}» bruker appens kobling igjen.` : `«${v.theme.trim()}» er koblet til NFF.` };
  });
}

/** Sets up a year of the årshjul: NFF's terms or the team's own, and what is picked first. */
export async function saveSeasonSetupAction(
  groupId: string,
  sub: string,
  year: number,
  input: { mode: "nff" | "egne"; primaryLevel: "hovedtema" | "delferdighet" | "laeringsmoment"; copyFrom: number | null },
): Promise<ActionResult> {
  return runAction("Oppsett av årshjul", async () => {
    const v = z
      .object({
        groupId: sid,
        sub: subId,
        year: z.number().int().min(2020).max(2100),
        input: z.object({
          mode: z.enum(["nff", "egne"]),
          primaryLevel: z.enum(["hovedtema", "delferdighet", "laeringsmoment"]),
          copyFrom: z.number().int().min(2020).max(2100).nullable(),
        }),
      })
      .parse({ groupId, sub, year, input });
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveSeasonSetup(d, user.access, v.groupId, v.sub, v.year, v.input);
    refresh();
    return { data: undefined, message: `Årshjulet for ${v.year} er satt opp.` };
  });
}

export async function saveTeamSettingsAction(groupId: string, sub: string, input: Record<string, string>, equipment: Record<string, string> = {}): Promise<ActionResult> {
  return runAction("Lagring av laget", async () => {
    const v = z
      .object({ groupId: sid, sub: subId, input: z.record(z.string().max(40), short), equipment: z.record(z.string().max(40), z.string().max(4)) })
      .parse({ groupId, sub, input, equipment });
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveTeamSettings(d, user.access, v.groupId, v.sub, { ...v.input, equipment_counts: v.equipment });
    refresh();
    return { data: undefined, message: "Laget er lagret." };
  });
}

export async function savePrinciplesAction(groupId: string, sub: string, body: string): Promise<ActionResult> {
  return runAction("Lagring av prinsipper", async () => {
    const v = z.object({ groupId: sid, sub: subId, body: short }).parse({ groupId, sub, body });
    const { user, group, d } = await trainer(v.groupId, v.sub);
    const np = storedNamesProblem([v.body], memberNames(group.members));
    if (np) throw new UserError(np);
    await savePrinciples(d, user.access, v.groupId, v.sub, v.body);
    refresh();
    return { data: undefined, message: "Prinsippene er lagret." };
  });
}

export async function saveLearningAction(groupId: string, sub: string, body: string): Promise<ActionResult> {
  return runAction("Lagring av lærdommer", async () => {
    const v = z.object({ groupId: sid, sub: subId, body: short }).parse({ groupId, sub, body });
    const { user, group, d } = await trainer(v.groupId, v.sub);
    const np = storedNamesProblem([v.body], memberNames(group.members));
    if (np) throw new UserError(np);
    await saveLearning(d, user.access, v.groupId, v.sub, v.body, "manual");
    refresh();
    return { data: undefined, message: "Lærdommene er lagret." };
  });
}

export async function learningKiAction(groupId: string, sub: string, baseText: string): Promise<ActionResult> {
  return runAction("Oppdatering av lærdommer med KI", async () => {
    const v = z.object({ groupId: sid, sub: subId, baseText: short }).parse({ groupId, sub, baseText });
    const { user, group, d } = await trainer(v.groupId, v.sub);
    const r = await updateLearningsWithKi(d, user, user.rights, group, v.sub, v.baseText || null);
    refresh();
    return { data: undefined, message: `Lærdommene er oppdatert med ${r.nRows} evalueringer (${r.costText}).` };
  });
}

/** A subgroup goes back to the main group's season plan (one year), team, principles or learnings. */
export async function followMainGroupAction(groupId: string, sub: string, part: Part, year?: number): Promise<ActionResult> {
  return runAction("Tilbake til hovedgruppa", async () => {
    const v = z
      .object({ groupId: sid, sub: subId.min(1), part: z.enum(["season", "team", "principles", "learnings"]), year: z.number().int().min(2020).max(2100).optional() })
      .parse({ groupId, sub, part, year });
    const { user, group, d } = await trainer(v.groupId, v.sub);
    await followMainGroup(d, user.access, v.groupId, v.sub, v.part, v.year);
    refresh();
    return { data: undefined, message: `${PARTS[v.part]} følger ${group.name} igjen.` };
  });
}

const exerciseInput = z.object({
  name: z.string().max(200),
  category: z.string().max(40),
  themes: z.array(z.string().max(100)).max(20),
  min_players: z.string().max(5),
  max_players: z.string().max(5),
  duration_minutes: z.string().max(5),
  area: z.string().max(200),
  organisation: short,
  execution: short,
  learning_points: short,
  questions: short,
  easier: short,
  harder: short,
  nff_url: z.string().max(600),
  drawing: z.string().max(20000),
  status: z.string().max(20),
  bands: z.array(z.string().max(10)).max(5),
  nff_activity: z.string().max(40),
  nff_tags: z.array(z.string().max(80)).max(200),
});

// KI's version from «Juster med KI», as the form had it, so the trainer's changes to it can be logged.
const kiDraftInput = exerciseInput.extend({ themes: z.string().max(2000) });

export async function saveExerciseAction(
  groupId: string,
  id: number | null,
  input: z.input<typeof exerciseInput>,
  kiDraft?: z.input<typeof kiDraftInput>,
  /** A proposal from «Forbedringer» that the trainer changed before saving. */
  proposalId?: number,
): Promise<ActionResult<number>> {
  return runAction("Lagring av øvelse", async () => {
    const v = z
      .object({ groupId: sid, id: z.number().int().positive().nullable(), input: exerciseInput, kiDraft: kiDraftInput.optional(), proposalId: z.number().int().positive().optional() })
      .parse({ groupId, id, input, kiDraft, proposalId });
    const { user, d } = await trainer(v.groupId);
    const proposal = v.proposalId ? await getProposal(d, user.access, v.groupId, v.proposalId) : null;
    if (proposal && proposal.status !== "ny") throw new UserError("Forslaget er allerede behandlet.");
    // A variant is saved as a new exercise based on the one it came from; a proposed new exercise as a new one.
    const variant = proposal?.kind === "variant";
    const fresh = proposal?.kind === "ny_ovelse";
    const newId = await saveExercise(d, user.access, v.groupId, v.input, variant || fresh ? null : v.id, {
      kiDraft: fresh ? undefined : (v.kiDraft as ExerciseValues | undefined),
      ...(proposal && !fresh ? { source: "forbedring" as const, proposalId: proposal.id } : {}),
      ...(variant ? { basedOn: proposal.exercise_code } : {}),
      ...(fresh ? { madeByKi: true } : {}),
    });
    if (v.proposalId) await decideProposal(d, user.access, v.groupId, v.proposalId, "endret");
    refresh();
    return { data: newId, message: `«${v.input.name.trim()}» er lagret.` };
  });
}

/** Go back to an earlier version of an exercise: its content becomes a new version. */
export async function rollbackExerciseAction(groupId: string, id: number, version: number): Promise<ActionResult> {
  return runAction("Tilbake til versjon", async () => {
    const v = z.object({ groupId: sid, id: z.number().int().positive(), version: z.number().int().positive() }).parse({ groupId, id, version });
    const { user, d } = await trainer(v.groupId);
    const ex = await getExercise(d, user.access, v.groupId, v.id);
    const target = (await exerciseVersions(d, user.access, v.groupId, ex.code)).find((x) => x.version === v.version);
    if (!target) throw new UserError("Fant ikke versjonen.");
    if (target.version === ex.version) throw new UserError("Det er allerede denne versjonen.");
    await saveExercise(d, user.access, v.groupId, exerciseInputFrom(target.vals), ex.id, { source: "tilbakerulling" });
    refresh();
    return { data: undefined, message: `«${target.vals.name}» er tilbake til innholdet i versjon ${target.version}.` };
  });
}

export async function deleteExerciseAction(groupId: string, id: number): Promise<ActionResult> {
  return runAction("Sletting av øvelse", async () => {
    const v = z.object({ groupId: sid, id: z.number().int().positive() }).parse({ groupId, id });
    const { user, d } = await trainer(v.groupId);
    await deleteExercise(d, user.access, user.rights, v.groupId, v.id);
    return { data: undefined, message: "Øvelsen er slettet." };
  });
}

const exerciseKiInput = z.object({
  groupId: sid,
  sub: subId,
  theme: z.string().max(80),
  players: z.number().int().min(1).max(60).nullable(),
  minutes: z.number().int().min(1).max(120).nullable(),
  category: z.string().max(40),
  wish: z.string().max(1000),
  link: z.string().max(600),
  pitchIds: z.array(z.number().int().positive()).max(50),
  model: z.string().refine((m) => m in AI_MODELS),
});

async function exerciseKiPrep(input: z.input<typeof exerciseKiInput>) {
  const v = exerciseKiInput.parse(input);
  const { user, group, d } = await trainer(v.groupId, v.sub);
  const order = await exerciseOrderContext(d, user, group, v);
  return { d, user, prep: await prepareExerciseKi(d, user, user.rights, group, order, { model: v.model }) };
}

/** Price estimate per model for «Ny øvelse med KI». */
export async function exerciseKiEstimateAction(input: z.input<typeof exerciseKiInput>): Promise<ActionResult<Record<string, string> | null>> {
  return runAction("Prisoverslag", async () => {
    const { d, prep } = await exerciseKiPrep(input);
    return { data: await estimateKi(d, prep) };
  });
}

/** «Ny øvelse med KI»: the exercise is saved in the bank as a candidate. */
export async function exerciseKiRunAction(input: z.input<typeof exerciseKiInput>): Promise<ActionResult<number>> {
  return runAction("KI", async () => {
    const { d, user, prep } = await exerciseKiPrep(input);
    const r = await runExerciseKi(d, user, prep);
    // No refresh() here: the form goes straight on to the bank, which loads fresh. A refresh of this page at the
    // same time as that navigation left the iPhone on the loading page.
    const warn = r.warnings.length ? ` Merk: ${r.warnings.join(" ")}` : "";
    return { data: r.id, message: `«${r.name}» er laget med KI (${r.costText}) og lagt i banken som kandidat.${warn}` };
  });
}

const exerciseReviseInput = z.object({
  groupId: sid,
  sub: subId,
  id: z.number().int().positive(),
  players: z.number().int().min(1).max(60).nullable(),
  minutes: z.number().int().min(1).max(120).nullable(),
  wish: z.string().max(1000),
  link: z.string().max(600),
  pitchIds: z.array(z.number().int().positive()).max(50),
  model: z.string().refine((m) => m in AI_MODELS),
});

async function exerciseRevisePrep(input: z.input<typeof exerciseReviseInput>) {
  const v = exerciseReviseInput.parse(input);
  const { user, group, d } = await trainer(v.groupId, v.sub);
  const order = await exerciseOrderContext(d, user, group, { ...v, theme: "", category: "" });
  return { d, user, prep: await prepareExerciseKi(d, user, user.rights, group, order, { model: v.model, baseId: v.id }) };
}

/** Price estimate per model for «Juster med KI» on a bank exercise. */
export async function exerciseReviseEstimateAction(input: z.input<typeof exerciseReviseInput>): Promise<ActionResult<Record<string, string> | null>> {
  return runAction("Prisoverslag", async () => {
    const { d, prep } = await exerciseRevisePrep(input);
    return { data: await estimateKi(d, prep) };
  });
}

/** «Juster med KI» on a bank exercise: KI's version for the form. Nothing is saved until the trainer saves the form. */
export async function exerciseReviseRunAction(input: z.input<typeof exerciseReviseInput>): Promise<ActionResult<{ values: ExerciseValues; warnings: string[] }>> {
  return runAction("KI", async () => {
    const { d, user, prep } = await exerciseRevisePrep(input);
    const r = await reviseExerciseKi(d, user, prep);
    return {
      data: { values: adjustedValues(r.base, r.exercise, r.extra), warnings: r.warnings },
      message: `KI har justert «${r.exercise.navn}» (${r.costText}). Se over og lagre.`,
    };
  });
}

const importInput = z.object({ groupId: sid, text: z.string().min(1).max(1_000_000) });

/** «Importer øvelser»: what the file would add to the bank (superadmin). Nothing is saved. */
export async function previewExerciseImportAction(groupId: string, text: string): Promise<ActionResult<ImportRow[]>> {
  return runAction("Import av øvelser", async () => {
    const v = importInput.parse({ groupId, text });
    const { user, d } = await trainer(v.groupId);
    return { data: (await previewExerciseImport(d, user.access, user.rights, v.groupId, v.text)).map((r) => ({ ...r, input: null, change: null })) };
  });
}

/** «Importer øvelser»: save the new exercises in the file in the bank (superadmin). */
export async function importExercisesAction(groupId: string, text: string): Promise<ActionResult<number>> {
  return runAction("Import av øvelser", async () => {
    const v = importInput.parse({ groupId, text });
    const { user, d } = await trainer(v.groupId);
    const r = await importExercises(d, user.access, user.rights, v.groupId, v.text);
    refresh();
    const n = r.imported.length;
    const p = r.proposed.length;
    const added = n || !p ? `${n === 1 ? "Én øvelse" : `${n} øvelser`} er lagt i banken.` : "";
    const proposals = p ? ` ${p === 1 ? "Ett forslag" : `${p} forslag`} venter i Forbedringer.` : "";
    const skipped = r.skipped.length ? ` ${r.skipped.length} hoppet over.` : "";
    return { data: n + p, message: `${added}${proposals}${skipped}`.trim() };
  });
}
