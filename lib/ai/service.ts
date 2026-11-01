import "server-only";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { osloMonthStart, shortDate } from "@/lib/format";
import type { BankExercise, Plan } from "@/lib/plans/plan";
import { FEEDBACK_TAGS, USE_AGAIN } from "@/lib/plans/feedback";
import { isSensitive, memberNames, namesProblem, redactNames } from "@/lib/sensitive";
import { UserError, type Rights } from "@/lib/store/access";
import { aiSpend, getAiSettings, logAiUsage, typicalOutput } from "@/lib/store/ai";
import {
  feedbackSince,
  learningState,
  listExercises,
  latestLearning,
  markCommentsUsed,
  saveLearning,
  savePlan,
  savePlanExercise,
  teamExperience,
} from "@/lib/store/training";
import type { Group } from "@/lib/spond/types";
import type { NffBand } from "@/lib/nff/bands";
import { insightsFor } from "@/lib/plans/insights";
import { needsFor } from "@/lib/plans/needs";
import { bandInsights } from "@/lib/store/insights";
import { needRows } from "@/lib/store/needs";
import { allPatterns } from "@/lib/store/observations";
import { callClaude, countTokens, type CallInput } from "./client";
import { lessonsText } from "./lessons";
import { FEEDBACK_FILL_INSTRUCTIONS, FEEDBACK_FILL_SCHEMA, feedbackFillText, feedbackFromAnswer, type FeedbackFillExercise } from "./feedback-ai";
import { LEARNING_INSTRUCTIONS } from "./prompts";
import {
  AI_MODELS,
  AiError,
  aiCost,
  budgetCheck,
  catalogue,
  checkLearning,
  EXERCISE_SCHEMA,
  exerciseFromAnswer,
  exerciseOrderText,
  exerciseRevisionText,
  experienceText,
  formatNok,
  orderText,
  PLAN_SCHEMA,
  planContext,
  planFromAnswer,
  revisionText,
  systemText,
  type AiSettings,
  type ExerciseOrderContext,
  type OrderContext,
  type PlanContext,
} from "./plan-ai";

type BandKey = NffBand["key"];

const MAX_TOKENS = 32000;
const EXERCISE_MAX_TOKENS = 8000;
const LEARNING_MODEL = "claude-haiku-5-5";

/** Who a KI call is for: a trainer, or the app itself (proposals at night) with an access for one group. */
export type KiActor = Pick<CurrentUser, "access">;

export interface KiPrep {
  groupId: string;
  kind: "draft" | "revision" | "exercise";
  model: string;
  settings: AiSettings;
  budget: ReturnType<typeof budgetCheck>;
  call: CallInput;
  answerCtx: { theme: string; minutes: number | null; maxNew: number; linkUrls: string[]; base: Plan | null };
  bank: Awaited<ReturnType<typeof listExercises>>;
  /** Stored with a KI plan, so later sessions can learn from it. */
  context?: PlanContext;
}

/** Players per group for the catalogue: the groups of the approved team proposal, or all who come in one. */
export function playersPerGroup(nPlayers: number, groupSizes: number[]): number | null {
  if (groupSizes.length) return Math.round(groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length);
  return nPlayers || null;
}

/** Rights, budget, the bank and the experience: what every KI call for exercises needs. */
async function kiBasis(
  d: Db,
  user: KiActor,
  rights: Pick<Rights, "ai">,
  group: Pick<Group, "id">,
  sub: string,
  wanted: string | undefined,
  now: Date,
  theme: string,
  fit: { band: BandKey | null; players: number | null } = { band: null, players: null },
) {
  if (!rights.ai) throw new AiError("Du har ikke tilgang til KI. Spør en administrator.");
  const settings = await getAiSettings(d);
  const model = wanted && wanted in AI_MODELS ? wanted : settings.model;
  const budget = budgetCheck(await aiSpend(d, user.access, group.id, osloMonthStart(now)), settings);
  if (!budget.ok) throw new AiError(budget.message);
  const bank = await listExercises(d, user.access, group.id);
  const exp = await teamExperience(d, user.access, group.id, new Date(now.getTime() - 365 * 86_400_000));
  const experience = experienceText(exp, bank, await latestLearning(d, user.access, group.id, sub));
  // What the analysis has learnt for the team's age band, from every team (see lib/ai/lessons.ts).
  const [patterns, needs, sessions] = await Promise.all([
    allPatterns(d),
    fit.band ? needRows(d) : Promise.resolve([]),
    fit.band ? bandInsights(d, group.id, fit.band) : Promise.resolve({ shared: [], own: [] }),
  ]);
  const lessons = lessonsText({
    band: fit.band,
    bank,
    patterns,
    needs: needsFor(needs, group.id, fit.band, { minSessions: settings.pattern_min_sessions, minTrainers: settings.pattern_min_trainers }),
    insights: insightsFor(sessions.shared, sessions.own, fit.band),
  });
  let cat = catalogue(bank, theme, 30, { band: fit.band, players: fit.players, patterns });
  if (experience) cat = `${cat}\n\n${experience}`;
  if (lessons) cat = `${cat}\n\n${lessons}`;
  return { settings, model, budget, bank, system: [systemText(), cat] };
}

/**
 * Step 1: check rights and budget, and build the request. Throws AiError
 * (shown to the user) when KI may not be used.
 */
export async function prepareKi(
  d: Db,
  user: CurrentUser,
  rights: Rights,
  group: Group,
  order: OrderContext,
  opts: { base?: Plan | null; model?: string; now?: Date; quick?: boolean } = {},
): Promise<KiPrep> {
  const { settings, model, budget, bank, system } = await kiBasis(d, user, rights, group, order.sub ?? "", opts.model, opts.now ?? new Date(), order.theme, {
    band: order.band ?? null,
    players: playersPerGroup(order.nPlayers, order.groupSizes),
  });
  const ctx: OrderContext = { ...order, maxNew: settings.max_new_exercises };
  const base = opts.base ?? null;
  const userText = base ? revisionText(base, ctx) : orderText(ctx);
  return {
    groupId: group.id,
    kind: base ? "revision" : "draft",
    model,
    settings,
    budget,
    bank,
    call: { model, system, user: userText, schema: PLAN_SCHEMA, maxTokens: MAX_TOKENS, kind: base ? "revision" : "draft" },
    answerCtx: { theme: base?.tema ?? order.theme, minutes: order.minutes, maxNew: settings.max_new_exercises, linkUrls: order.links.map((l) => l.url), base },
    context: planContext({ ...ctx, theme: base?.tema ?? order.theme }, base ? "revision" : opts.quick ? "hurtig" : "draft"),
  };
}

/** Price estimate per model: input counted by the API (free), output from earlier calls (or a typical length). */
export async function estimateKi(d: Db, prep: Pick<KiPrep, "call" | "kind" | "model" | "settings">): Promise<Record<string, string> | null> {
  const nIn = await countTokens(prep.call);
  if (nIn === null) return null;
  const nOut = (await typicalOutput(d, prep.kind, prep.model)) ?? (prep.kind === "exercise" ? 2000 : 6000);
  return Object.fromEntries(
    Object.keys(AI_MODELS).map((m) => [m, formatNok(aiCost({ input_tokens: nIn, output_tokens: nOut, cache_read_tokens: 0, cache_write_tokens: 0 }, m), prep.settings.usd_nok)]),
  );
}

/**
 * Step 2 and 3: call the model, log the call (also when it failed, since it
 * may have cost money), turn the answer into a plan and save it as a new version.
 */
export async function runKi(d: Db, user: CurrentUser, prep: KiPrep, eventId: string, commentIds: number[] = [], eventTime: { start: string | null; end: string | null } = { start: null, end: null }) {
  const r = await callClaude(prep.call);
  let result: ReturnType<typeof planFromAnswer> | null = null;
  let errorCode = r.errorCode;
  let message = r.message;
  if (r.ok) {
    try {
      result = planFromAnswer(r.text, prep.bank, prep.answerCtx);
    } catch (err) {
      errorCode = "ugyldig_svar";
      message = `KI-svaret kunne ikke brukes: ${(err as Error).message}`;
    }
  }
  const cost = aiCost(r.usage, prep.model);
  const usageId = await logAiUsage(
    d,
    user.access,
    prep.groupId,
    { kind: prep.kind, model: prep.model, ...r.usage, cost_usd: cost, duration_ms: r.durationMs, status: result ? "ok" : "error", error_code: errorCode },
    eventId,
  );
  if (!result) throw new AiError(message || "Noe gikk galt med KI. Prøv igjen om litt.");
  const saved = await savePlan(d, user.access, prep.groupId, eventId, result.plan, { source: "ai", model: prep.model, costUsd: cost, eventStart: eventTime.start, eventEnd: eventTime.end, context: prep.context });
  await d.query("UPDATE ai_usage SET plan_id = $2 WHERE id = $1", [usageId, saved.id]);
  if (commentIds.length) await markCommentsUsed(d, user.access, prep.groupId, commentIds, saved.id);
  return { ...saved, warnings: result.warnings, costText: formatNok(cost, prep.settings.usd_nok) };
}

// «Ny øvelse med KI»: one exercise for the bank, with the same instructions, bank and experience.
// «Juster med KI» on a bank exercise works the same way, with the exercise as `base`.

export interface ExerciseKiPrep extends Omit<KiPrep, "answerCtx"> {
  theme: string;
  linkUrls: string[];
  base: BankExercise | null;
}

export async function prepareExerciseKi(
  d: Db,
  user: KiActor,
  rights: Pick<Rights, "ai">,
  group: Pick<Group, "id">,
  order: ExerciseOrderContext,
  opts: { model?: string; now?: Date; baseId?: number } = {},
): Promise<ExerciseKiPrep> {
  const { settings, model, budget, bank, system } = await kiBasis(d, user, rights, group, order.sub ?? "", opts.model, opts.now ?? new Date(), order.theme, {
    band: order.band ?? null,
    players: order.players,
  });
  const base = opts.baseId === undefined ? null : (bank.find((b) => b.id === opts.baseId) ?? null);
  if (opts.baseId !== undefined && !base) throw new UserError("Fant ikke øvelsen.");
  return {
    groupId: group.id,
    kind: "exercise",
    model,
    settings,
    budget,
    bank,
    call: { model, system, user: base ? exerciseRevisionText(base, order) : exerciseOrderText(order), schema: EXERCISE_SCHEMA, maxTokens: EXERCISE_MAX_TOKENS, kind: "exercise" },
    theme: order.theme,
    linkUrls: order.links.map((l) => l.url),
    base,
  };
}

/** Call the model and log the call (also when it failed, since it may have cost money). */
async function callExerciseKi(d: Db, user: KiActor, prep: ExerciseKiPrep) {
  const r = await callClaude(prep.call);
  let result: ReturnType<typeof exerciseFromAnswer> | null = null;
  let errorCode = r.errorCode;
  let message = r.message;
  if (r.ok) {
    try {
      result = exerciseFromAnswer(r.text, prep.bank, { linkUrls: prep.linkUrls, base: prep.base });
    } catch (err) {
      errorCode = "ugyldig_svar";
      message = `KI-svaret kunne ikke brukes: ${(err as Error).message}`;
    }
  }
  const cost = aiCost(r.usage, prep.model);
  await logAiUsage(
    d,
    user.access,
    prep.groupId,
    { kind: "exercise", model: prep.model, ...r.usage, cost_usd: cost, duration_ms: r.durationMs, status: result ? "ok" : "error", error_code: errorCode },
    null,
  );
  if (!result) throw new AiError(message || "Noe gikk galt med KI. Prøv igjen om litt.");
  return { ...result, costUsd: cost, costText: formatNok(cost, prep.settings.usd_nok) };
}

/** «Ny øvelse med KI»: call the model and save the exercise in the bank as a candidate made with KI. */
export async function runExerciseKi(d: Db, user: CurrentUser, prep: ExerciseKiPrep) {
  const result = await callExerciseKi(d, user, prep);
  const id = await savePlanExercise(d, user.access, prep.groupId, result.exercise, [prep.theme], "ai", result.extra);
  if (id === null) throw new AiError("Øvelsen fantes allerede i banken. Prøv igjen.");
  return { id, name: result.exercise.navn, warnings: result.warnings, costText: result.costText };
}

/** «Juster med KI»: the adjusted exercise, not saved. The trainer looks it over in the form and saves it there. */
export async function reviseExerciseKi(d: Db, user: KiActor, prep: ExerciseKiPrep) {
  if (!prep.base) throw new UserError("Fant ikke øvelsen.");
  return { base: prep.base, ...(await callExerciseKi(d, user, prep)) };
}

// Learnings with KI: the old text and the evaluations since the last KI version give a new version.

function learningOrder(rows: Awaited<ReturnType<typeof feedbackSince>>, old: string, names: string[]): string {
  const words: Record<number, string> = { 3: "bra", 2: "ok", 1: "dårlig" };
  const again: Record<string, string> = { yes: "ja", changes: "med endringer", no: "nei" };
  const safe = (x: string) => {
    const t = x.replace(/\s+/g, " ").trim();
    return !t || isSensitive(t) || namesProblem(t, names) ? "" : ` «${t}»`;
  };
  // Evaluations from the bank have no event and come last, in a block of their own.
  const events = [...new Set(rows.map((r) => r.spond_event_id))].sort((a, b) => Number(!a) - Number(!b));
  const sessions = events.filter(Boolean).length;
  const blocks = events.map((ev, k) => {
    const list = rows.filter((r) => r.spond_event_id === ev);
    const first = new Date(Math.min(...list.map((r) => new Date(r.created_at).getTime())));
    const head = ev ? `## Økt ${k + 1}, evaluert ${shortDate(first)}${list[0].theme ? `, tema: ${list[0].theme}` : ""}` : "## Fra øvelsesbanken (ikke knyttet til en økt)";
    const lines = list.map((r) => {
      const what = !ev ? `Øvelse ${r.exercise_name}` : r.exercise_no === null ? "Hele økta" : `Øvelse ${r.exercise_no}${r.exercise_name ? `, ${r.exercise_name}` : ""}`;
      const parts = [
        r.rating ? words[r.rating] : "",
        r.tags.filter((t) => t in FEEDBACK_TAGS).map((t) => FEEDBACK_TAGS[t]).join(", "),
        r.actual_minutes !== null ? `${r.actual_minutes} min${r.planned_minutes !== null ? ` (plan ${r.planned_minutes})` : ""}` : "",
        r.use_again ? `bruke igjen: ${again[r.use_again] ?? USE_AGAIN[r.use_again]}` : "",
        r.actual_players !== null ? `${r.actual_players} spillere kom${r.registered_players !== null ? ` av ${r.registered_players} påmeldte` : ""}` : "",
      ].filter(Boolean);
      return `- ${what}: ${parts.join("; ")}${safe(r.body)}`;
    });
    return [head, ...lines].join("\n");
  });
  return `# Lærdommer nå\n\n${old || "Ingen ennå."}\n\n# Nye evalueringer (${rows.length} fra ${sessions} økter${sessions < events.length ? " og øvelsesbanken" : ""})\n\n${blocks.join("\n\n")}\n\nSkriv de oppdaterte lærdommene.`;
}

/** «Oppdater med KI» for the team's learnings (trainers with KI). Saves a new version. */
export async function updateLearningsWithKi(d: Db, user: CurrentUser, rights: Rights, group: Group, sub: string, baseText: string | null, now = new Date()) {
  if (!rights.ai) throw new AiError("Du har ikke tilgang til KI. Spør en administrator.");
  const settings = await getAiSettings(d);
  const budget = budgetCheck(await aiSpend(d, user.access, group.id, osloMonthStart(now)), settings);
  if (!budget.ok) throw new AiError(budget.message);
  const names = memberNames(group.members);
  const state = await learningState(d, user.access, group.id, sub, 1);
  const old = checkLearning(baseText ?? state.versions[0]?.body ?? "", names, true);
  const rows = await feedbackSince(d, user.access, group.id, sub, state.since ?? new Date(now.getTime() - 365 * 86_400_000));
  if (!rows.length) throw new AiError("Ingen nye evalueringer siden lærdommene sist ble oppdatert med KI.");
  const r = await callClaude({ model: LEARNING_MODEL, system: [LEARNING_INSTRUCTIONS], user: learningOrder(rows, old, names), maxTokens: 1500, kind: "learning" });
  let text: string | null = null;
  let errorCode = r.errorCode;
  let message = r.message;
  if (r.ok) {
    try {
      text = checkLearning(r.text.replace(/^\s*```[a-z]*\s*|\s*```\s*$/g, ""), names);
    } catch (err) {
      errorCode = "ugyldig_svar";
      message = `KI-svaret kunne ikke brukes: ${(err as Error).message}`;
    }
  }
  const cost = aiCost(r.usage, LEARNING_MODEL);
  await logAiUsage(d, user.access, group.id, { kind: "learning", model: LEARNING_MODEL, ...r.usage, cost_usd: cost, duration_ms: r.durationMs, status: text ? "ok" : "error", error_code: errorCode }, null);
  if (!text) throw new AiError(message);
  try {
    await saveLearning(d, user.access, group.id, sub, text, "ai");
  } catch (err) {
    if (err instanceof UserError) throw new AiError(err.message);
    throw err;
  }
  return { nRows: rows.length, costText: formatNok(cost, settings.usd_nok) };
}

// «Fortell om økta»: the trainer's own words fill in the evaluation form. Nothing is saved here.

/** KI's evaluation from the trainer's words, for the form. Names are taken out before the text goes to KI. */
export async function fillFeedbackWithKi(d: Db, user: CurrentUser, rights: Rights, group: Group, exercises: FeedbackFillExercise[], text: string, session: boolean, now = new Date()) {
  if (!rights.ai) throw new AiError("Du har ikke tilgang til KI. Spør en administrator.");
  if (!text.trim()) throw new AiError("Fortell litt om økta først.");
  if (isSensitive(text)) throw new AiError("Teksten skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  const settings = await getAiSettings(d);
  const budget = budgetCheck(await aiSpend(d, user.access, group.id, osloMonthStart(now)), settings);
  if (!budget.ok) throw new AiError(budget.message);
  const names = memberNames(group.members);
  const r = await callClaude({
    model: LEARNING_MODEL,
    system: [FEEDBACK_FILL_INSTRUCTIONS],
    user: feedbackFillText(exercises, redactNames(text, names), session),
    schema: FEEDBACK_FILL_SCHEMA,
    maxTokens: 2000,
    kind: "feedback",
  });
  let rows: ReturnType<typeof feedbackFromAnswer> | null = null;
  let errorCode = r.errorCode;
  let message = r.message;
  if (r.ok) {
    try {
      rows = feedbackFromAnswer(r.text, exercises, session, names);
    } catch (err) {
      errorCode = "ugyldig_svar";
      message = (err as Error).message;
    }
  }
  const cost = aiCost(r.usage, LEARNING_MODEL);
  await logAiUsage(d, user.access, group.id, { kind: "feedback", model: LEARNING_MODEL, ...r.usage, cost_usd: cost, duration_ms: r.durationMs, status: rows ? "ok" : "error", error_code: errorCode }, null);
  if (!rows) throw new AiError(message || "Noe gikk galt med KI. Prøv igjen om litt.");
  return { rows, costText: formatNok(cost, settings.usd_nok) };
}
