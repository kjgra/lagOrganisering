import "server-only";
import { AiError } from "@/lib/ai/plan-ai";
import { prepareExerciseKi, reviseExerciseKi } from "@/lib/ai/service";
import type { Db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { osloParts } from "@/lib/format";
import { exerciseOrderContext } from "@/lib/plan-data";
import { exerciseChanges } from "@/lib/plans/exercise-edits";
import { adjustedValues, exerciseValues } from "@/lib/plans/exercise-values";
import { proposalPlan, proposalWish, reasonText } from "@/lib/plans/improvements";
import type { ExercisePattern } from "@/lib/plans/observations";
import { sendPush } from "@/lib/push";
import { ctxPath } from "@/lib/routes";
import { UserError, type Access } from "@/lib/store/access";
import { busyProposals, rejectionsFor, saveProposal, waitingPerGroup } from "@/lib/store/improvements";
import { groupPushSubscriptions } from "@/lib/store/reminders";
import { listExercises } from "@/lib/store/training";

/**
 * Proposals for better exercises, made by the app after each analysis: when
 * an exercise's pattern passes the thresholds, KI writes a new version (or
 * an adaptation for the situation), or the app proposes to archive it. They
 * wait in «Forbedringer» until a trainer uses, changes or turns them down.
 */

/** KI proposals per group per run: they use the stronger model. */
const MAX_KI = 2;

export interface ProposeResult {
  proposed: number;
  waiting: string;
}

export async function proposeImprovements(d: Db, access: Access, groupId: string, patterns: ExercisePattern[], now = new Date()): Promise<ProposeResult> {
  const bank = new Map((await listExercises(d, access, groupId)).filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  const busy = await busyProposals(d, groupId, now);
  // The worst first.
  const todo = patterns
    .map((p) => ({ p, plan: proposalPlan(p), b: bank.get(p.code) }))
    .filter((x) => x.plan && x.b && !busy.open.has(x.p.code) && !busy.recent.has(`${x.p.code}\n${x.plan.signature}`))
    .sort((a, b) => (a.p.score ?? 2) - (b.p.score ?? 2));
  let proposed = 0;
  let ki = 0;
  let waiting = "";
  for (const { p, plan, b } of todo) {
    const base = exerciseValues(b!);
    const common = { code: p.code, kind: plan!.kind, reason: reasonText(p, plan!), signature: plan!.signature, base };
    if (plan!.kind === "arkiver") {
      if (await saveProposal(d, groupId, { ...common, proposed: { ...base, status: "archived" }, model: null, costUsd: 0 })) proposed++;
      continue;
    }
    if (ki >= MAX_KI) {
      waiting = "flere forslag kommer neste natt";
      continue;
    }
    if (aiMode() === "off") {
      waiting = "KI er ikke satt opp";
      break;
    }
    ki++;
    try {
      const wish = proposalWish(plan!, await rejectionsFor(d, groupId, p.code));
      const order = await exerciseOrderContext(d, { access }, { id: groupId, members: [] }, { sub: "", theme: "", players: null, minutes: null, category: "", wish, link: "", pitchIds: [] }, now);
      const prep = await prepareExerciseKi(d, { access }, { ai: true }, { id: groupId }, order, { baseId: b!.id, now });
      const r = await reviseExerciseKi(d, { access }, prep);
      const values = adjustedValues(r.base, r.exercise, r.extra);
      // KI changed nothing: kept as handled, so it is not asked again for a while.
      const same = !Object.keys(exerciseChanges(base, values)).length;
      if (await saveProposal(d, groupId, { ...common, proposed: values, model: prep.model, costUsd: r.costUsd, status: same ? "utdatert" : "ny" })) if (!same) proposed++;
    } catch (err) {
      if (err instanceof AiError || err instanceof UserError) {
        // Budget used up, or KI failed: the same pattern is tried again next time.
        waiting = err.message;
        if (/budsjett|brukt/i.test(err.message)) break;
        continue;
      }
      throw err;
    }
  }
  return { proposed, waiting };
}

export const improvementsPath = (groupId: string) => ctxPath(groupId, null, "/trening/forbedringer");

/** Monday night: tell the trainers with push how many proposals are waiting. */
export async function weeklyDigest(d: Db, now = new Date()): Promise<number> {
  const t = osloParts(now);
  if (t.weekday !== 1 || t.hour >= 6) return 0;
  let sent = 0;
  for (const g of await waitingPerGroup(d)) {
    const subs = await groupPushSubscriptions(d, g.groupId);
    if (!subs.length) continue;
    const ok = await sendPush(d, subs, {
      title: "Forslag til bedre øvelser",
      body: `${g.n === 1 ? "Ett forslag venter" : `${g.n} forslag venter`} i Forbedringer, laget fra trenernes innspill.`,
      url: improvementsPath(g.groupId),
    });
    if (ok) sent++;
  }
  return sent;
}
