import "server-only";
import { callClaude } from "@/lib/ai/client";
import { NEEDS_INSTRUCTIONS, NEEDS_SCHEMA, needsFromAnswer, needsText } from "@/lib/ai/needs-ai";
import { OBSERVE_INSTRUCTIONS, OBSERVE_SCHEMA, observationsFromAnswer, observeText } from "@/lib/ai/observe-ai";
import { aiCost, budgetCheck } from "@/lib/ai/plan-ai";
import type { Db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { osloMonthStart } from "@/lib/format";
import { measureVersions, proposeImprovements } from "@/lib/improve";
import { sessionInsights, type Insight } from "@/lib/plans/insights";
import { analysePatterns, type Observation } from "@/lib/plans/observations";
import { BANK } from "@/lib/store/bank";
import { aiSpend, getAiSettings, logAiUsage } from "@/lib/store/ai";
import { saveInsights, sessionRows } from "@/lib/store/insights";
import { markEmptyNeeds, saveNeeds, unclassifiedNeeds } from "@/lib/store/needs";
import { patternInputs, savePatterns, saveObservations, unobservedComments } from "@/lib/store/observations";

/**
 * Turns the trainers' evaluations into observations and patterns per
 * exercise in the shared bank, with evaluations from every team: after each
 * saved evaluation and each night (which also catches up on comments KI could
 * not take earlier).
 */

const MODEL = "claude-haiku-5-5";
/** Comments per KI call, and calls per run. */
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
  /** Wishes and comments to KI gone through, and needs found in them. */
  wishes: number;
  needs: number;
  /** Session patterns found (lib/plans/insights.ts), for every team together and per group. */
  insights: number;
}

type Access = { profileId: string; groupIds: Set<string> };

/**
 * The trainers' wishes in KI plans and comments on plans, turned into fixed
 * needs (lib/plans/needs.ts) so they can be counted per age band.
 */
async function classifyNeeds(d: Db, access: Access, now: Date): Promise<{ wishes: number; needs: number; waiting: string }> {
  const settings = await getAiSettings(d);
  let wishes = 0;
  let needs = 0;
  for (let call = 0; call < MAX_CALLS; call++) {
    const all = await unclassifiedNeeds(d, BATCH);
    if (!all.length) break;
    await markEmptyNeeds(d, all);
    const items = all.filter((x) => x.text);
    if (!items.length) continue;
    if (aiMode() === "off") return { wishes, needs, waiting: "KI er ikke satt opp" };
    const budget = budgetCheck(await aiSpend(d, access, BANK, osloMonthStart(now)), settings);
    if (!budget.ok) return { wishes, needs, waiting: "KI-budsjettet er brukt opp" };
    const r = await callClaude({ model: MODEL, system: [NEEDS_INSTRUCTIONS], user: needsText(items), schema: NEEDS_SCHEMA, maxTokens: 4000, kind: "needs" });
    let found: Map<string, string[]> | null = null;
    let errorCode = r.errorCode;
    if (r.ok) {
      try {
        found = needsFromAnswer(r.text, items.map((i) => i.id));
      } catch {
        errorCode = "ugyldig_svar";
      }
    }
    await logAiUsage(d, access, BANK, { kind: "needs", model: MODEL, ...r.usage, cost_usd: aiCost(r.usage, MODEL), duration_ms: r.durationMs, status: found ? "ok" : "error", error_code: errorCode }, null);
    if (!found) return { wishes, needs, waiting: "KI-kallet feilet" };
    needs += await saveNeeds(d, items, found);
    wishes += items.length;
    if (all.length < BATCH) break;
  }
  return { wishes, needs, waiting: "" };
}

export async function analyseBank(d: Db, opts: { actor?: string; now?: Date } = {}): Promise<AnalyseResult> {
  const groupId = BANK;
  const now = opts.now ?? new Date();
  const access = { profileId: opts.actor ?? SYSTEM_ACTOR, groupIds: new Set([groupId]) };
  const settings = await getAiSettings(d);
  let comments = 0;
  let observations = 0;
  let waiting = "";

  for (let call = 0; call < MAX_CALLS; call++) {
    const items = await unobservedComments(d, BATCH);
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
    observations += await saveObservations(d, found);
    comments += items.length;
    if (items.length < BATCH) break;
  }

  const asked = await classifyNeeds(d, access, now);

  const input = await patternInputs(d);
  const patterns = analysePatterns(input.evaluations, input.observations, input.removed, { minSessions: settings.pattern_min_sessions, minTrainers: settings.pattern_min_trainers }, now);
  await savePatterns(d, patterns);
  const insights = await analyseSessions(d, { minSessions: settings.pattern_min_sessions, minTrainers: settings.pattern_min_trainers });
  const rolledBack = await measureVersions(d, access, groupId);
  const prop = await proposeImprovements(d, access, groupId, patterns, now);
  return {
    groupId,
    comments,
    observations,
    exercises: patterns.length,
    waiting: [...new Set([waiting, asked.waiting, prop.waiting].filter(Boolean))].join("; "),
    proposed: prop.proposed,
    rolledBack,
    wishes: asked.wishes,
    needs: asked.needs,
    insights,
  };
}

/** Session patterns from the ratings of whole sessions: for every team together, and for each group on its own. */
async function analyseSessions(d: Db, t: { minSessions: number; minTrainers: number }): Promise<number> {
  const rows = await sessionRows(d);
  const byGroup = new Map<string, Insight[]>([["", sessionInsights(rows, t)]]);
  for (const g of new Set(rows.map((r) => r.groupId))) {
    const own = sessionInsights(
      rows.filter((r) => r.groupId === g),
      t,
    );
    if (own.length) byGroup.set(g, own);
  }
  return saveInsights(d, byGroup);
}

/** The nightly run. A failure is logged and reported, not thrown. */
export async function analyseAll(d: Db, now = new Date()): Promise<AnalyseResult[]> {
  try {
    return [await analyseBank(d, { now })];
  } catch (err) {
    console.error("Analyse av innspill feilet:", (err as Error).message);
    return [{ groupId: BANK, comments: 0, observations: 0, exercises: 0, waiting: "feilet", proposed: 0, rolledBack: 0, wishes: 0, needs: 0, insights: 0 }];
  }
}
