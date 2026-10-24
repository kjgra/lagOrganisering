"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { trainers } from "@/lib/admin";
import { findGroup, requireAdmin } from "@/lib/auth/current";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import { estimateKi, prepareExerciseKi, runExerciseKi, updateLearningsWithKi } from "@/lib/ai/service";
import { db } from "@/lib/db";
import { maintenanceResultText, runMaintenanceNow } from "@/lib/maintenance";
import { exerciseOrderContext } from "@/lib/plan-data";
import { assertSuperadmin, UserError } from "@/lib/store/access";
import { saveAiSettings } from "@/lib/store/ai";
import { confirmArchive } from "@/lib/store/archive";
import { setRole } from "@/lib/store/roles";
import { deleteExercise, saveExercise, saveLearning, saveSeason, saveTeamSettings } from "@/lib/store/training";

const sid = z.string().min(1).max(100);
const short = z.string().max(4000);

async function admin(groupId: string) {
  const user = await requireAdmin();
  const group = findGroup(user, groupId);
  return { user, group, d: await db() };
}

export async function setRoleAction(groupId: string, profileId: string, role: "app" | "ai" | "admin" | "tags", granted: boolean): Promise<ActionResult> {
  return runAction("Endring av rettighet", async () => {
    const v = z.object({ groupId: sid, profileId: sid, role: z.enum(["app", "ai", "admin", "tags"]), granted: z.boolean() }).parse({ groupId, profileId, role, granted });
    const { user, group, d } = await admin(v.groupId);
    if (v.profileId === user.session.profileId && v.role !== "ai" && v.role !== "tags") throw new UserError("Du kan ikke endre din egen tilgang her.");
    await setRole(d, user.rights, user.session.profileId, v.profileId, v.role, v.granted, trainers(group).map((t) => t.profileId));
    refresh();
    return { data: undefined };
  });
}

export async function saveAiSettingsAction(input: Record<string, string>): Promise<ActionResult> {
  return runAction("Lagring av KI-innstillinger", async () => {
    const v = z.record(z.string().max(40), z.string().max(1000)).parse(input);
    const user = await requireAdmin();
    await saveAiSettings(await db(), user.rights, user.session.profileId, v);
    refresh();
    return { data: undefined, message: "KI-innstillingene er lagret." };
  });
}

export async function saveSeasonAction(groupId: string, year: number, themes: string[], descriptions: string[]): Promise<ActionResult> {
  return runAction("Lagring av årshjul", async () => {
    const v = z
      .object({ groupId: sid, year: z.number().int().min(2020).max(2100), themes: z.array(z.string().max(200)).length(12), descriptions: z.array(z.string().max(1000)).length(12) })
      .parse({ groupId, year, themes, descriptions });
    const { user, d } = await admin(v.groupId);
    await saveSeason(d, user.access, user.rights, v.groupId, v.year, v.themes, v.descriptions);
    refresh();
    return { data: undefined, message: `Årshjulet for ${v.year} er lagret.` };
  });
}

export async function saveTeamSettingsAction(groupId: string, input: Record<string, string>, pitchIds: number[]): Promise<ActionResult> {
  return runAction("Lagring av lagets standard", async () => {
    const v = z
      .object({ groupId: sid, input: z.record(z.string().max(40), short), pitchIds: z.array(z.number().int().positive()).max(50) })
      .parse({ groupId, input, pitchIds });
    const { user, d } = await admin(v.groupId);
    await saveTeamSettings(d, user.access, user.rights, v.groupId, { ...v.input, pitch_ids: v.pitchIds });
    refresh();
    return { data: undefined, message: "Lagets standard er lagret." };
  });
}

export async function saveLearningAction(groupId: string, body: string): Promise<ActionResult> {
  return runAction("Lagring av lærdommer", async () => {
    const v = z.object({ groupId: sid, body: short }).parse({ groupId, body });
    const { user, d } = await admin(v.groupId);
    await saveLearning(d, user.access, user.rights, v.groupId, v.body, "manual");
    refresh();
    return { data: undefined, message: "Lærdommene er lagret." };
  });
}

export async function learningKiAction(groupId: string, baseText: string): Promise<ActionResult> {
  return runAction("Oppdatering av lærdommer med KI", async () => {
    const v = z.object({ groupId: sid, baseText: short }).parse({ groupId, baseText });
    const { user, group, d } = await admin(v.groupId);
    const r = await updateLearningsWithKi(d, user, user.rights, group, v.baseText || null);
    refresh();
    return { data: undefined, message: `Lærdommene er oppdatert med ${r.nRows} evalueringer (${r.costText}).` };
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

export async function saveExerciseAction(groupId: string, id: number | null, input: z.input<typeof exerciseInput>): Promise<ActionResult<number>> {
  return runAction("Lagring av øvelse", async () => {
    const v = z.object({ groupId: sid, id: z.number().int().positive().nullable(), input: exerciseInput }).parse({ groupId, id, input });
    const { user, d } = await admin(v.groupId);
    const newId = await saveExercise(d, user.access, user.rights, v.groupId, v.input, v.id);
    refresh();
    return { data: newId, message: `«${v.input.name.trim()}» er lagret.` };
  });
}

export async function deleteExerciseAction(groupId: string, id: number): Promise<ActionResult> {
  return runAction("Sletting av øvelse", async () => {
    const v = z.object({ groupId: sid, id: z.number().int().positive() }).parse({ groupId, id });
    const { user, d } = await admin(v.groupId);
    await deleteExercise(d, user.access, user.rights, v.groupId, v.id);
    return { data: undefined, message: "Øvelsen er slettet." };
  });
}

const exerciseKiInput = z.object({
  groupId: sid,
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
  const { user, group, d } = await admin(v.groupId);
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

export async function runMaintenanceAction(): Promise<ActionResult> {
  return runAction("Vedlikehold", async () => {
    const user = await requireAdmin();
    assertSuperadmin(user.rights);
    const r = await runMaintenanceNow(await db(), user.session.profileId, true);
    refresh();
    return { data: undefined, message: r ? maintenanceResultText(r) : "Vedlikeholdet kjører allerede." };
  });
}

export async function confirmArchiveAction(keys: string[]): Promise<ActionResult> {
  return runAction("Sletting av arkiverte opplegg", async () => {
    const v = z.array(z.string().max(220)).min(1).max(5000).parse(keys);
    const user = await requireAdmin();
    const r = await confirmArchive(await db(), user.access, user.rights, v, user.session.profileId);
    refresh();
    return { data: undefined, message: `${r.nEvents} treninger med ${r.nVersions} versjoner er slettet.` };
  });
}
