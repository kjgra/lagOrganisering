import "server-only";
import { AiError } from "@/lib/ai/plan-ai";
import { prepareExerciseKi, reviseExerciseKi } from "@/lib/ai/service";
import type { Db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { osloParts } from "@/lib/format";
import { exerciseOrderContext } from "@/lib/plan-data";
import { exerciseChanges } from "@/lib/plans/exercise-edits";
import { adjustedValues, exerciseInputFrom, exerciseValues } from "@/lib/plans/exercise-values";
import { proposalPlan, proposalWish, reasonText } from "@/lib/plans/improvements";
import type { ExercisePattern } from "@/lib/plans/observations";
import { isSmallChange, rollbackDecision } from "@/lib/plans/versions";
import { sendPush } from "@/lib/push";
import { ctxPath } from "@/lib/routes";
import { UserError, type Access } from "@/lib/store/access";
import { getAiSettings } from "@/lib/store/ai";
import { busyProposals, decideProposal, rejectionsFor, saveProposal, waitingPerGroup } from "@/lib/store/improvements";
import { groupPushSubscriptions } from "@/lib/store/reminders";
import { listExercises, saveExercise } from "@/lib/store/training";
import { versionsToMeasure } from "@/lib/store/versions";

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
  const settings = await getAiSettings(d);
  const bank = new Map((await listExercises(d, access, groupId)).filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  const busy = await busyProposals(d, now);
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
      if (await saveProposal(d, { ...common, proposed: { ...base, status: "archived" }, model: null, costUsd: 0 })) proposed++;
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
      const wish = proposalWish(plan!, await rejectionsFor(d, p.code));
      const order = await exerciseOrderContext(d, { access }, { id: groupId, members: [] }, { sub: "", theme: "", players: null, minutes: null, category: "", wish, link: "", pitchIds: [] }, now);
      const prep = await prepareExerciseKi(d, { access }, { ai: true }, { id: groupId }, order, { baseId: b!.id, now });
      const r = await reviseExerciseKi(d, { access }, prep);
      const values = adjustedValues(r.base, r.exercise, r.extra);
      // KI changed nothing: kept as handled, so it is not asked again for a while.
      const same = !Object.keys(exerciseChanges(base, values)).length;
      const pid = await saveProposal(d, { ...common, proposed: values, model: prep.model, costUsd: r.costUsd, status: same ? "utdatert" : "ny" });
      if (!pid || same) continue;
      proposed++;
      // Only new lines under easier, harder, questions or learning points: used right away when that is turned on.
      if (settings.auto_approve_small && isSmallChange(base, values)) {
        await saveExercise(d, access, groupId, exerciseInputFrom(values), b!.id, { kiDraft: values, source: "automatisk", proposalId: pid });
        await decideProposal(d, access, groupId, pid, "auto");
      }
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

/**
 * A new version from Forbedringer that is clearly worse than the one before,
 * after enough ratings, goes back to the one before; it is told in «Forbedringer».
 */
export async function measureVersions(d: Db, access: Access, groupId: string): Promise<number> {
  let back = 0;
  for (const x of await versionsToMeasure(d)) {
    const r = rollbackDecision(x.stats, x.version);
    const target = r && x.stats.find((s) => s.version === r.to);
    const current = x.stats.find((s) => s.version === x.version);
    if (!r || !target || !current) continue;
    await saveExercise(d, access, groupId, exerciseInputFrom(target.vals), x.id, { source: "tilbakerulling" });
    await saveProposal(d, {
      code: x.code,
      kind: "tilbakerulling",
      reason: r.reason,
      signature: `tilbakerulling:${r.from}`,
      base: current.vals,
      proposed: target.vals,
      model: null,
      costUsd: 0,
      status: "auto",
    });
    back++;
  }
  return back;
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
