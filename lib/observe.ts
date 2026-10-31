import "server-only";
import { callClaude } from "@/lib/ai/client";
import { OBSERVE_INSTRUCTIONS, OBSERVE_SCHEMA, observationsFromAnswer, observeText } from "@/lib/ai/observe-ai";
import { aiCost, budgetCheck } from "@/lib/ai/plan-ai";
import type { Db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { osloMonthStart } from "@/lib/format";
import { measureVersions, proposeImprovements } from "@/lib/improve";
import { analysePatterns, type Observation } from "@/lib/plans/observations";
import { aiSpend, getAiSettings, logAiUsage } from "@/lib/store/ai";
import { groupsWithFeedback, patternInputs, savePatterns, saveObservations, unobservedComments } from "@/lib/store/observations";

/**
 * Turns the trainers' evaluations into observations and patterns per
 * exercise: after each saved evaluation (for that group) and each night (for
 * all groups, which also catches up on comments KI could not take earlier).
 */

const MODEL = "claude-haiku-5-5";
/** Comments per KI call, and calls per group per run. */
const BATCH = 40;
const MAX_CALLS = 3;
/** Who the KI calls are logged on when no trainer is behind them. */
export const SYSTEM_ACTOR = "system";

export interface AnalyseResult {
  groupId: string;
  comments: number;
  observations: number;
  exercises: number;
  /** Why some comments wait until next time (budget, KI off or a failed call). */
  waiting: string;
  /** New proposals in «Forbedringer». */
  proposed: number;
  /** New versions that were clearly worse and went back to the one before. */
  rolledBack: number;
}

export async function analyseGroup(d: Db, groupId: string, opts: { actor?: string; now?: Date } = {}): Promise<AnalyseResult> {
  const now = opts.now ?? new Date();
  const access = { profileId: opts.actor ?? SYSTEM_ACTOR, groupIds: new Set([groupId]) };
  const settings = await getAiSettings(d);
  let comments = 0;
  let observations = 0;
  let waiting = "";

  for (let call = 0; call < MAX_CALLS; call++) {
    const items = await unobservedComments(d, groupId, BATCH);
    if (!items.length) break;
    if (aiMode() === "off") {
      waiting = "KI er ikke satt opp";
      break;
    }
    const budget = budgetCheck(await aiSpend(d, access, groupId, osloMonthStart(now)), settings);
    if (!budget.ok) {
      waiting = "KI-budsjettet er brukt opp";
      break;
    }
    const r = await callClaude({ model: MODEL, system: [OBSERVE_INSTRUCTIONS], user: observeText(items), schema: OBSERVE_SCHEMA, maxTokens: 8000, kind: "observations" });
    let found: Map<number, Observation[]> | null = null;
    let errorCode = r.errorCode;
    if (r.ok) {
      try {
        found = observationsFromAnswer(r.text, items.map((i) => i.id));
        // A comment KI skipped has nothing to count: it is gone through too.
        for (const i of items) if (!found.has(i.id)) found.set(i.id, []);
      } catch {
        errorCode = "ugyldig_svar";
      }
    }
    await logAiUsage(d, access, groupId, { kind: "observations", model: MODEL, ...r.usage, cost_usd: aiCost(r.usage, MODEL), duration_ms: r.durationMs, status: found ? "ok" : "error", error_code: errorCode }, null);
    if (!found) {
      waiting = "KI-kallet feilet";
      break;
    }
    observations += await saveObservations(d, groupId, found);
    comments += items.length;
    if (items.length < BATCH) break;
  }

  const input = await patternInputs(d, groupId);
  const patterns = analysePatterns(input.evaluations, input.observations, input.removed, { minSessions: settings.pattern_min_sessions, minTrainers: settings.pattern_min_trainers }, now);
  await savePatterns(d, groupId, patterns);
  const rolledBack = await measureVersions(d, access, groupId);
  const prop = await proposeImprovements(d, access, groupId, patterns, now);
  return { groupId, comments, observations, exercises: patterns.length, waiting: [waiting, prop.waiting].filter(Boolean).join("; "), proposed: prop.proposed, rolledBack };
}

/** The nightly run: every group with evaluations. One group failing does not stop the others. */
export async function analyseAll(d: Db, now = new Date()): Promise<AnalyseResult[]> {
  const out: AnalyseResult[] = [];
  for (const g of await groupsWithFeedback(d)) {
    try {
      out.push(await analyseGroup(d, g, { now }));
    } catch (err) {
      console.error("Analyse av innspill feilet:", (err as Error).message);
      out.push({ groupId: g, comments: 0, observations: 0, exercises: 0, waiting: "feilet", proposed: 0, rolledBack: 0 });
    }
  }
  return out;
}
