import "server-only";
import { AiError, fagplanText } from "@/lib/ai/plan-ai";
import { draftExerciseKi, prepareExerciseKi, reviseExerciseKi } from "@/lib/ai/service";
import type { Db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { osloParts } from "@/lib/format";
import { exerciseOrderContext } from "@/lib/plan-data";
import { exerciseChanges } from "@/lib/plans/exercise-edits";
import { adjustedValues, exerciseInputFrom, exerciseValues } from "@/lib/plans/exercise-values";
import {
  bankGaps,
  bankOverlaps,
  emptyValues,
  fillMissing,
  gapCode,
  gapReason,
  gapValues,
  gapWish,
  metadataReason,
  metadataWish,
  missingFields,
  overlapReason,
} from "@/lib/plans/bank-proposals";
import { prettyDrawing } from "@/lib/plans/drawing";
import { proposalPlan, proposalWish, reasonText } from "@/lib/plans/improvements";
import { categoryKey, tooSimilar, type BankExercise } from "@/lib/plans/plan";
import { temaTag } from "@/lib/nff/fagplan";
import { bandLabel } from "@/lib/plans/observations";
import type { ExercisePattern } from "@/lib/plans/observations";
import { isSmallChange, rollbackDecision } from "@/lib/plans/versions";
import { sendPush } from "@/lib/push";
import { ctxPath } from "@/lib/routes";
import { UserError, type Access } from "@/lib/store/access";
import { getAiSettings } from "@/lib/store/ai";
import { bandsInUse, busyProposals, decideProposal, rejectionsFor, retireProposal, saveProposal, waitingPerGroup } from "@/lib/store/improvements";
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
/** Proposals for the whole bank per run. */
const MAX_OVERLAPS = 3;
const MAX_GAPS = 1;
const MAX_BANDS_ONLY = 3;

export interface ProposeResult {
  /** From the trainers' patterns per exercise. */
  proposed: number;
  /** For the whole bank: new exercises, overlaps and missing info. */
  bank: number;
  waiting: string;
}

/** One KI call at a time, within the limit per run; stops the run when KI is off or the budget is used. */
class KiTurns {
  used = 0;
  stopped = false;
  waiting = "";
  take(): boolean {
    if (this.stopped) return false;
    if (this.used >= MAX_KI) {
      this.waiting = "flere forslag kommer neste natt";
      return false;
    }
    if (aiMode() === "off") {
      this.waiting = "KI er ikke satt opp";
      this.stopped = true;
      return false;
    }
    this.used++;
    return true;
  }
  /** Budget used up, or KI failed: the same is tried again next time. */
  failed(err: unknown) {
    if (!(err instanceof AiError || err instanceof UserError)) throw err;
    this.waiting = err.message;
    if (/budsjett|brukt/i.test(err.message)) this.stopped = true;
  }
}

/** `bank`: also the proposals for the whole bank; only in the nightly run, not after each evaluation. */
export async function proposeImprovements(d: Db, access: Access, groupId: string, patterns: ExercisePattern[], now = new Date(), opts: { bank?: boolean } = {}): Promise<ProposeResult> {
  const settings = await getAiSettings(d);
  const all = await listExercises(d, access, groupId);
  const bank = new Map(all.filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  // The age bands that have a variant of each exercise already.
  const variantFor = (code: string) => all.filter((b) => b.based_on === code && b.status !== "archived").flatMap((b) => b.bands);
  const busy = await busyProposals(d, now);
  // A waiting «Mangler info» gives way to what the trainers point at.
  const free = (code: string) => !busy.open.has(code) || busy.filling.has(code);
  const makeRoom = async (code: string) => {
    const id = busy.filling.get(code);
    if (id) await retireProposal(d, id);
  };
  // The worst first.
  const todo = patterns
    .map((p) => ({ p, plan: proposalPlan(p, variantFor(p.code)), b: bank.get(p.code) }))
    .filter((x) => x.plan && x.b && free(x.p.code) && !busy.recent.has(`${x.p.code}\n${x.plan.signature}`))
    .sort((a, b) => (a.p.score ?? 2) - (b.p.score ?? 2));
  let proposed = 0;
  const turns = new KiTurns();
  for (const { p, plan, b } of todo) {
    const base = exerciseValues(b!);
    const common = { code: p.code, kind: plan!.kind, reason: reasonText(p, plan!), signature: plan!.signature, base };
    if (plan!.kind === "arkiver") {
      await makeRoom(p.code);
      if (await saveProposal(d, { ...common, proposed: { ...base, status: "archived" }, model: null, costUsd: 0 })) proposed++;
      busy.open.add(p.code);
      continue;
    }
    if (!turns.take()) {
      if (turns.stopped) break;
      continue;
    }
    try {
      const wish = proposalWish(plan!, await rejectionsFor(d, p.code));
      const order = await exerciseOrderContext(d, { access }, { id: groupId, members: [] }, { sub: "", theme: "", players: null, minutes: null, category: "", wish, link: "", pitchIds: [] }, now);
      const prep = await prepareExerciseKi(d, { access }, { ai: true }, { id: groupId }, order, { baseId: b!.id, now });
      const r = await reviseExerciseKi(d, { access }, prep);
      let values = adjustedValues(r.base, r.exercise, r.extra);
      if (plan!.kind === "variant" && plan!.band) {
        // A new exercise for one age band, based on this one.
        const label = bandLabel(plan!.band.band);
        const name = values.name.trim() === base.name.trim() ? `${base.name} (${label})` : values.name;
        values = { ...values, name: name.slice(0, 120), bands: [plan!.band.band] };
      }
      // KI changed nothing: kept as handled, so it is not asked again for a while.
      const same = !Object.keys(exerciseChanges(base, values)).length;
      if (!same) await makeRoom(p.code);
      const pid = await saveProposal(d, { ...common, proposed: values, model: prep.model, costUsd: r.costUsd, status: same ? "utdatert" : "ny" });
      if (!pid || same) continue;
      busy.open.add(p.code);
      proposed++;
      // Only new lines under easier, harder, questions or learning points: used right away when that is turned on.
      if (settings.auto_approve_small && plan!.kind !== "variant" && isSmallChange(base, values)) {
        await saveExercise(d, access, groupId, exerciseInputFrom(values), b!.id, { kiDraft: values, source: "automatisk", proposalId: pid });
        await decideProposal(d, access, groupId, pid, "auto");
      }
    } catch (err) {
      turns.failed(err);
      if (turns.stopped) break;
    }
  }
  const forBank = opts.bank ? await proposeForBank(d, access, groupId, patterns, all, busy, turns, now) : 0;
  return { proposed, bank: forBank, waiting: turns.waiting };
}

/**
 * Proposals for the whole bank, after those from the trainers' patterns:
 * archive one of two nearly equal exercises, a new exercise where an age band
 * in use lacks good ones for a main theme, and what exercises lack.
 */
async function proposeForBank(
  d: Db,
  access: Access,
  groupId: string,
  patterns: ExercisePattern[],
  all: BankExercise[],
  busy: Awaited<ReturnType<typeof busyProposals>>,
  turns: KiTurns,
  now: Date,
): Promise<number> {
  let made = 0;
  const quiet = (code: string, signature: string) => busy.open.has(code) || busy.recent.has(`${code}\n${signature}`);

  // Overlap: no KI, and never merged by itself.
  let overlaps = 0;
  for (const o of bankOverlaps(all, patterns)) {
    if (overlaps >= MAX_OVERLAPS) break;
    const signature = `overlapp:${o.stronger.code}`;
    if (quiet(o.weaker.code, signature)) continue;
    const base = exerciseValues(o.weaker);
    const id = await saveProposal(d, {
      code: o.weaker.code,
      kind: "overlapp",
      reason: overlapReason(o, patterns),
      signature,
      base,
      proposed: { ...base, status: "archived" },
      model: null,
      costUsd: 0,
    });
    if (!id) continue;
    busy.open.add(o.weaker.code);
    overlaps++;
    made++;
  }

  // Gaps: a new exercise from KI, for an age band that teams in the app have.
  let gaps = 0;
  for (const g of bankGaps(all, patterns, await bandsInUse(d, now))) {
    if (gaps >= MAX_GAPS || turns.stopped) break;
    const code = gapCode(g);
    if (quiet(code, "ny_ovelse")) continue;
    if (!turns.take()) break;
    gaps++;
    try {
      const names = all.filter((b) => b.status !== "archived" && b.nff_tags.includes(temaTag(g.tema.key))).map((b) => b.name);
      const turnedDown = (await rejectionsFor(d, code)).slice(0, 2);
      const wish = [gapWish(g, names), ...(turnedDown.length ? ["Tidligere forslag ble avvist med denne begrunnelsen:", ...turnedDown.map((r) => `- «${r}»`)] : [])].join("\n").slice(0, 1000);
      const order = await exerciseOrderContext(d, { access }, { id: groupId, members: [] }, { sub: "", theme: g.tema.label, players: null, minutes: null, category: "", wish, link: "", pitchIds: [] }, now);
      // For the whole bank: the age band's, not the analysing team's pitch, equipment and principles.
      const forBand = { ...order, band: g.band, fagplan: fagplanText(g.band, g.tema.label), team: { age_group: bandLabel(g.band), pitch: "", equipment: "", principles: "" } };
      const prep = await prepareExerciseKi(d, { access }, { ai: true }, { id: groupId }, forBand, { now });
      const r = await draftExerciseKi(d, { access }, prep);
      const values = gapValues(r.exercise, r.extra, g, categoryKey(r.exercise.kategori), r.exercise.tegning ? prettyDrawing(r.exercise.tegning) : "");
      // Too much like one the bank has: kept as handled, so it is not asked again for a while.
      const like = tooSimilar({ ...exerciseInputFrom(values), drawing: r.exercise.tegning ?? null }, all);
      const id = await saveProposal(d, {
        code,
        kind: "ny_ovelse",
        reason: gapReason(g),
        signature: "ny_ovelse",
        base: { ...emptyValues(), bands: [g.band] },
        proposed: values,
        model: prep.model,
        costUsd: r.costUsd,
        status: like ? "utdatert" : "ny",
      });
      if (id && !like) {
        busy.open.add(code);
        made++;
      }
    } catch (err) {
      turns.failed(err);
    }
  }

  // Missing info: the most used exercises first; only what is missing is filled in.
  const byCode = new Map(patterns.map((p) => [p.code, p]));
  let bandsOnly = 0;
  const lacking = all
    .filter((b) => b.status === "active")
    .map((b) => ({ b, base: exerciseValues(b), p: byCode.get(b.code) }))
    .map((x) => ({ ...x, missing: missingFields(x.base).filter((k) => k !== "bands" || fillMissing(x.base, x.base, ["bands"], x.p).bands.length) }))
    .filter((x) => x.missing.length)
    .sort((a, b) => b.b.fb_n - a.b.fb_n || a.b.id - b.b.id);
  for (const { b, base, p, missing } of lacking) {
    if (turns.stopped) break;
    const signature = `metadata:${missing.join(",")}`;
    if (quiet(b.code, signature)) continue;
    const needsKi = missing.some((k) => k !== "bands");
    if (!needsKi && bandsOnly >= MAX_BANDS_ONLY) continue;
    if (needsKi && !turns.take()) continue;
    try {
      let values = fillMissing(base, base, missing, p);
      let model: string | null = null;
      let cost = 0;
      if (needsKi) {
        const order = await exerciseOrderContext(d, { access }, { id: groupId, members: [] }, { sub: "", theme: "", players: null, minutes: null, category: "", wish: metadataWish(missing), link: "", pitchIds: [] }, now);
        const prep = await prepareExerciseKi(d, { access }, { ai: true }, { id: groupId }, order, { baseId: b.id, now });
        const r = await reviseExerciseKi(d, { access }, prep);
        values = fillMissing(base, adjustedValues(r.base, r.exercise, r.extra), missing, p);
        model = prep.model;
        cost = r.costUsd;
      } else bandsOnly++;
      // Nothing could be filled in: kept as handled, so it is not asked again for a while.
      const same = !Object.keys(exerciseChanges(base, values)).length;
      if (same && !needsKi) continue;
      const id = await saveProposal(d, { code: b.code, kind: "metadata", reason: metadataReason(missing), signature, base, proposed: values, model, costUsd: cost, status: same ? "utdatert" : "ny" });
      if (id && !same) {
        busy.open.add(b.code);
        busy.filling.set(b.code, id);
        made++;
      }
    } catch (err) {
      turns.failed(err);
    }
  }
  return made;
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
