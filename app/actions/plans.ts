"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { findGroup, requireUser } from "@/lib/auth/current";
import { estimateKi, fillFeedbackWithKi, prepareKi, runKi } from "@/lib/ai/service";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { orderContext } from "@/lib/plan-data";
import { FEEDBACK_TEXT_MAX, validateBankFeedback, validateFeedback, type FeedbackFill } from "@/lib/plans/feedback";
import { bankCandidates, buildPlan, exerciseFromBank, type PlanExercise } from "@/lib/plans/plan";
import { memberNames, namesProblem } from "@/lib/sensitive";
import { eventIsPast } from "@/lib/spond/events";
import { UserError } from "@/lib/store/access";
import {
  addPlanComment,
  approvePlan,
  deletePlanComment,
  getExercise,
  getPlan,
  listExercises,
  saveBankFeedback,
  saveFeedback,
  savePlan,
  savePlanExercise,
  unapprovePlan,
} from "@/lib/store/training";

const id = z.number().int().positive();
const sid = z.string().min(1).max(100);

async function eventFor(groupId: string, eventId: string) {
  const user = await requireUser();
  const group = findGroup(user, groupId);
  const event = await findEvent(user, group.id, eventId);
  if (!event) throw new UserError("Fant ikke arrangementet.");
  return { user, group, event };
}

// Manual plans ---------------------------------------------------------------------------

const settingsInput = z.object({
  tittel: z.string().max(120),
  tema: z.string().max(80),
  undertittel: z.string().max(200),
  forsvar: z.string().max(300),
  angrep: z.string().max(300),
  stikkord: z.array(z.object({ tittel: z.string().max(60), tekst: z.string().max(200) })).max(5),
  oppvarming: z.number().int().min(0).max(60),
  oppvarming_tekst: z.string().max(300),
  stasjon: z.number().int().min(1).max(60),
  bytte: z.number().int().min(0).max(10),
  rotasjon: z.boolean(),
  avslutning: z.number().int().min(0).max(60),
  avslutning_tekst: z.string().max(300),
  sporsmal: z.string().max(1500),
  merknad: z.string().max(600),
});

const planInput = z.object({
  groupId: sid,
  eventId: sid,
  baseId: id.nullable(),
  /** In order: a bank exercise by code, or an exercise kept from the base version by its number. */
  exercises: z
    .array(z.union([z.object({ bank: z.string().max(60) }), z.object({ keep: z.number().int().min(1).max(20) })]))
    .min(1)
    .max(8),
  settings: settingsInput,
});

/** Save the editor's plan as a new version. */
export async function savePlanAction(input: z.input<typeof planInput>): Promise<ActionResult<{ id: number; version: number }>> {
  return runAction("Lagring av opplegg", async () => {
    const v = planInput.parse(input);
    const { user, group, event } = await eventFor(v.groupId, v.eventId);
    const d = await db();
    const bank = await listExercises(d, user.access, group.id);
    const base = v.baseId ? await getPlan(d, user.access, v.baseId) : null;
    // A base from another event of the group is a copy of an earlier session.
    if (base && base.groupId !== group.id) throw new UserError("Opplegget hører til en annen gruppe.");
    const ex: PlanExercise[] = v.exercises.map((x) => {
      if ("bank" in x) {
        const b = bank.find((e) => e.code === x.bank && e.status !== "archived");
        if (!b) throw new UserError("En av øvelsene finnes ikke lenger i banken.");
        return exerciseFromBank(b);
      }
      const e = base?.plan.ovelser[x.keep - 1];
      if (!e) throw new UserError("Ukjent øvelse i forrige versjon.");
      return e;
    });
    const plan = buildPlan(ex, v.settings, base ? { kilde: base.plan.kilde, stikkord_merknad: base.plan.stikkord_merknad } : {});
    const saved = await savePlan(d, user.access, group.id, event.id, plan, { source: "manual", eventStart: event.start, eventEnd: event.end });
    refresh();
    return { data: saved, message: `Versjon ${saved.version} er lagret.` };
  });
}

// Approval -------------------------------------------------------------------------------

const approveInput = z.object({
  planId: id,
  /** Per bank candidate (by exercise number): save as new, save as a variant of the similar one, or skip. */
  bank: z.array(z.object({ index: z.number().int().min(1).max(20), choice: z.enum(["save", "variant", "skip"]) })).max(20),
});

export async function approvePlanAction(input: z.input<typeof approveInput>): Promise<ActionResult> {
  return runAction("Godkjenning av opplegg", async () => {
    const v = approveInput.parse(input);
    const user = await requireUser();
    const d = await db();
    const pl = await approvePlan(d, user.access, v.planId);
    const bank = await listExercises(d, user.access, pl.groupId);
    const candidates = bankCandidates(pl.plan, bank);
    let saved = 0;
    for (const c of candidates) {
      const choice = v.bank.find((b) => b.index === c.index)?.choice ?? c.default;
      if (choice === "skip") continue;
      const e = pl.plan.ovelser[c.index - 1];
      const ex = choice === "variant" && c.match ? { ...e, basert_pa: c.match.code } : e;
      if ((await savePlanExercise(d, user.access, pl.groupId, ex, [pl.plan.tema], pl.source)) !== null) saved++;
    }
    refresh();
    const bankText = saved ? ` ${saved} ${saved === 1 ? "øvelse er lagt" : "øvelser er lagt"} i øvelsesbanken som kandidat.` : "";
    return { data: undefined, message: `Versjon ${pl.version} er godkjent.${bankText}` };
  });
}

export async function unapprovePlanAction(planId: number): Promise<ActionResult> {
  return runAction("Angring av godkjenning", async () => {
    const v = id.parse(planId);
    const user = await requireUser();
    await unapprovePlan(await db(), user.access, v);
    refresh();
    return { data: undefined, message: "Godkjenningen er angret." };
  });
}

// Comments -------------------------------------------------------------------------------

const commentInput = z.object({ planId: id, body: z.string().min(1).max(1000), exerciseNo: z.number().int().min(1).max(20).nullable() });

export async function planCommentAction(input: z.input<typeof commentInput>): Promise<ActionResult> {
  return runAction("Lagring av kommentar", async () => {
    const v = commentInput.parse(input);
    const user = await requireUser();
    const d = await db();
    const pl = await getPlan(d, user.access, v.planId);
    const group = findGroup(user, pl.groupId);
    const np = namesProblem(v.body, memberNames(group.members), "Skriv uten navn, kommentarene kan sendes til KI");
    if (np) throw new UserError(np);
    await addPlanComment(d, user.access, v.planId, v.body, v.exerciseNo);
    refresh();
    return { data: undefined };
  });
}

export async function deletePlanCommentAction(groupId: string, commentId: number): Promise<ActionResult> {
  return runAction("Sletting av kommentar", async () => {
    const v = z.object({ groupId: sid, commentId: id }).parse({ groupId, commentId });
    const user = await requireUser();
    await deletePlanComment(await db(), user.access, v.groupId, v.commentId);
    refresh();
    return { data: undefined };
  });
}

// KI -------------------------------------------------------------------------------------

const kiInput = z.object({
  groupId: sid,
  eventId: sid,
  baseId: id.nullable(),
  theme: z.string().max(80),
  minutes: z.number().int().min(15).max(240).nullable(),
  wish: z.string().max(1000),
  links: z.string().max(1000),
  commentIds: z.array(id).max(50),
  pitchIds: z.array(id).max(50),
  model: z.string().refine((m) => m in AI_MODELS),
});

async function kiPrep(input: z.input<typeof kiInput>) {
  const v = kiInput.parse(input);
  const { user, group, event } = await eventFor(v.groupId, v.eventId);
  if (eventIsPast(event)) throw new UserError("Arrangementet er over.");
  const d = await db();
  const base = v.baseId ? await getPlan(d, user.access, v.baseId) : null;
  if (base && (base.groupId !== group.id || base.eventId !== event.id)) throw new UserError("Opplegget hører til et annet arrangement.");
  const { order, commentIds } = await orderContext(d, user, group, event, v);
  const prep = await prepareKi(d, user, user.rights, group, order, { base: base?.plan ?? null, model: v.model });
  return { d, user, event, prep, commentIds };
}

/** Price estimate per model, before the trainer starts KI. */
export async function kiEstimateAction(input: z.input<typeof kiInput>): Promise<ActionResult<Record<string, string> | null>> {
  return runAction("Prisoverslag", async () => {
    const { d, prep } = await kiPrep(input);
    return { data: await estimateKi(d, prep) };
  });
}

export async function kiRunAction(input: z.input<typeof kiInput>): Promise<ActionResult<{ id: number; version: number }>> {
  return runAction("KI", async () => {
    const { d, user, event, prep, commentIds } = await kiPrep(input);
    const r = await runKi(d, user, prep, event.id, commentIds, event);
    refresh();
    const warn = r.warnings.length ? ` Merk: ${r.warnings.join(" ")}` : "";
    return { data: { id: r.id, version: r.version }, message: `Versjon ${r.version} er laget med KI (${r.costText}).${warn}` };
  });
}

// Evaluation -----------------------------------------------------------------------------

const feedbackInput = z.object({
  planId: id,
  registered: z.number().int().min(0).max(500).nullable(),
  rows: z
    .array(
      z.object({
        exercise_no: z.number().int().min(1).max(20).nullable(),
        rating: z.number().int().min(1).max(3).nullable(),
        tags: z.array(z.string().max(30)).max(20),
        actual_minutes: z.string().max(5),
        actual_players: z.string().max(5),
        body: z.string().max(300),
        use_again: z.string().max(10),
      }),
    )
    .max(21),
});

export async function feedbackAction(input: z.input<typeof feedbackInput>): Promise<ActionResult> {
  return runAction("Lagring av evaluering", async () => {
    const v = feedbackInput.parse(input);
    const user = await requireUser();
    const d = await db();
    const pl = await getPlan(d, user.access, v.planId);
    const group = findGroup(user, pl.groupId);
    const rows = validateFeedback(v.rows, pl.plan, memberNames(group.members));
    // Which subgroups the session was for, so each team's learnings build on its own evaluations.
    const event = await findEvent(user, group.id, pl.eventId);
    const activated = await saveFeedback(d, user.access, pl.id, rows, v.registered, event?.subgroupIds ?? []);
    refresh();
    const act = activated.length ? ` ${activated.length === 1 ? "Én øvelse" : `${activated.length} øvelser`} er nå aktive i banken.` : "";
    return { data: undefined, message: `Evalueringen er lagret.${act}` };
  });
}

const feedbackRow = feedbackInput.shape.rows.element;
const bankFeedbackInput = z.object({ groupId: sid, exerciseId: id, row: feedbackRow.omit({ exercise_no: true, actual_players: true }) });

/** A trainer's evaluation of an exercise from the bank. Empty removes it. */
export async function bankFeedbackAction(input: z.input<typeof bankFeedbackInput>): Promise<ActionResult> {
  return runAction("Lagring av evaluering", async () => {
    const v = bankFeedbackInput.parse(input);
    const user = await requireUser();
    const group = findGroup(user, v.groupId);
    const d = await db();
    const ex = await getExercise(d, user.access, group.id, v.exerciseId);
    const row = validateBankFeedback({ ...v.row, exercise_no: null }, ex.code, memberNames(group.members));
    const activated = await saveBankFeedback(d, user.access, group.id, ex.id, row);
    refresh();
    if (!row) return { data: undefined, message: "Evalueringen din er fjernet." };
    return { data: undefined, message: `Evalueringen er lagret.${activated ? " Øvelsen er nå aktiv i banken." : ""}` };
  });
}

const feedbackFillInput = z.object({
  target: z.union([z.object({ planId: id }), z.object({ groupId: sid, exerciseId: id })]),
  text: z.string().max(FEEDBACK_TEXT_MAX),
});

/** «Fortell om økta»: KI fills in the evaluation form from the trainer's own words. Nothing is saved. */
export async function feedbackFillAction(input: z.input<typeof feedbackFillInput>): Promise<ActionResult<FeedbackFill[]>> {
  return runAction("KI", async () => {
    const v = feedbackFillInput.parse(input);
    const user = await requireUser();
    const d = await db();
    if ("planId" in v.target) {
      const pl = await getPlan(d, user.access, v.target.planId);
      const group = findGroup(user, pl.groupId);
      const planned = pl.plan.tidsplan.stasjoner.minutter;
      const exercises = pl.plan.ovelser.map((e, i) => ({ no: i + 1, name: e.navn, planned }));
      const r = await fillFeedbackWithKi(d, user, user.rights, group, exercises, v.text, true);
      return { data: r.rows, message: `KI har fylt ut evalueringen (${r.costText}). Se over og lagre.` };
    }
    const group = findGroup(user, v.target.groupId);
    const ex = await getExercise(d, user.access, group.id, v.target.exerciseId);
    const r = await fillFeedbackWithKi(d, user, user.rights, group, [{ no: 1, name: ex.name, planned: ex.duration_minutes }], v.text, false);
    return { data: r.rows, message: `KI har fylt ut evalueringen (${r.costText}). Se over og lagre.` };
  });
}
