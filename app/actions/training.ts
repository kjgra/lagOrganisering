"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { findGroup, requireUser } from "@/lib/auth/current";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import { estimateKi, prepareExerciseKi, reviseExerciseKi, runExerciseKi, updateLearningsWithKi } from "@/lib/ai/service";
import { db } from "@/lib/db";
import { exerciseOrderContext } from "@/lib/plan-data";
import { adjustedValues, type ExerciseValues } from "@/lib/plans/exercise-values";
import { UserError } from "@/lib/store/access";
import { deleteExercise, saveExercise, saveLearning, savePrinciples, saveSeason, saveTeamSettings, followMainGroup, type Part } from "@/lib/store/training";

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

export async function saveSeasonAction(groupId: string, sub: string, year: number, themes: string[], descriptions: string[]): Promise<ActionResult> {
  return runAction("Lagring av årshjul", async () => {
    const v = z
      .object({ groupId: sid, sub: subId, year: z.number().int().min(2020).max(2100), themes: z.array(z.string().max(200)).length(12), descriptions: z.array(z.string().max(1000)).length(12) })
      .parse({ groupId, sub, year, themes, descriptions });
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveSeason(d, user.access, v.groupId, v.sub, v.year, v.themes, v.descriptions);
    refresh();
    return { data: undefined, message: `Årshjulet for ${v.year} er lagret.` };
  });
}

export async function saveTeamSettingsAction(groupId: string, sub: string, input: Record<string, string>, pitchIds: number[]): Promise<ActionResult> {
  return runAction("Lagring av laget", async () => {
    const v = z
      .object({ groupId: sid, sub: subId, input: z.record(z.string().max(40), short), pitchIds: z.array(z.number().int().positive()).max(50) })
      .parse({ groupId, sub, input, pitchIds });
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveTeamSettings(d, user.access, v.groupId, v.sub, { ...v.input, pitch_ids: v.pitchIds });
    refresh();
    return { data: undefined, message: "Laget er lagret." };
  });
}

export async function savePrinciplesAction(groupId: string, sub: string, body: string): Promise<ActionResult> {
  return runAction("Lagring av prinsipper", async () => {
    const v = z.object({ groupId: sid, sub: subId, body: short }).parse({ groupId, sub, body });
    const { user, d } = await trainer(v.groupId, v.sub);
    await savePrinciples(d, user.access, v.groupId, v.sub, v.body);
    refresh();
    return { data: undefined, message: "Prinsippene er lagret." };
  });
}

export async function saveLearningAction(groupId: string, sub: string, body: string): Promise<ActionResult> {
  return runAction("Lagring av lærdommer", async () => {
    const v = z.object({ groupId: sid, sub: subId, body: short }).parse({ groupId, sub, body });
    const { user, d } = await trainer(v.groupId, v.sub);
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
): Promise<ActionResult<number>> {
  return runAction("Lagring av øvelse", async () => {
    const v = z
      .object({ groupId: sid, id: z.number().int().positive().nullable(), input: exerciseInput, kiDraft: kiDraftInput.optional() })
      .parse({ groupId, id, input, kiDraft });
    const { user, d } = await trainer(v.groupId);
    const newId = await saveExercise(d, user.access, v.groupId, v.input, v.id, { kiDraft: v.kiDraft as ExerciseValues | undefined });
    refresh();
    return { data: newId, message: `«${v.input.name.trim()}» er lagret.` };
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
    refresh();
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
