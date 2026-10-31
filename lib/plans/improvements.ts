import { meanText } from "./feedback";
import { bandLabel, OBSERVATION_KINDS, OBSERVATION_PARTS, TREND_TEXT, type BandScore, type ExercisePattern, type Pattern } from "./observations";

/**
 * Proposals for better exercises, made from the patterns per exercise
 * without anyone asking. Which kind, and the reason shown to the trainer, are
 * decided here from the pattern; KI only writes the new version.
 */

export const PROPOSAL_KINDS = {
  ny_versjon: "Ny versjon",
  tilpasning: "Tilpasning",
  variant: "Variant",
  arkiver: "Arkiver",
  tilbakerulling: "Tilbakerulling",
} as const;
export type ProposalKind = keyof typeof PROPOSAL_KINDS;

export const PROPOSAL_STATUSES = {
  ny: "Venter",
  brukt: "Brukt",
  endret: "Brukt med endringer",
  avvist: "Avvist",
  utdatert: "Utdatert",
  auto: "Gjort automatisk",
} as const;
export type ProposalStatus = keyof typeof PROPOSAL_STATUSES;

export const REJECTION_MAX = 300;
/** The same proposal is not made again this soon after it was handled. */
export const QUIET_DAYS = 60;
/** Archive: rated this low by at least this many. */
const ARCHIVE_BELOW = 1.6;
const ARCHIVE_MIN_RATINGS = 5;
/** Variant: one age band rates it well and another poorly, each from enough ratings. */
const VARIANT_GOOD = 2.4;
const VARIANT_POOR = 1.7;
const VARIANT_MIN_RATINGS = 3;

export interface ProposalPlan {
  kind: ProposalKind;
  /** What it is about, so the same proposal is not made twice. */
  signature: string;
  problems: Pattern[];
  /** Variant: the band it is for, and the band it works well in. */
  band?: BandScore;
  goodBand?: BandScore;
}

/** The age bands that rate the exercise clearly differently: one well, one poorly. */
export function bandSplit(p: Pick<ExercisePattern, "bands">): { good: BandScore; poor: BandScore } | null {
  const enough = (p.bands ?? []).filter((b) => b.ratings >= VARIANT_MIN_RATINGS);
  const good = enough.filter((b) => b.mean >= VARIANT_GOOD).sort((a, b) => b.mean - a.mean)[0];
  const poor = enough.filter((b) => b.mean <= VARIANT_POOR).sort((a, b) => a.mean - b.mean)[0];
  return good && poor ? { good, poor } : null;
}

/**
 * Whether a pattern calls for a proposal, and of which kind; null when it does not.
 * `variantFor` are the bands that already have a variant of the exercise.
 */
export function proposalPlan(p: ExercisePattern, variantFor: string[] = []): ProposalPlan | null {
  const problems = p.patterns.filter((x) => x.pattern && !x.positive);
  const signature = (kind: string) => [kind, ...problems.map((x) => x.kind).sort(), p.trend].filter(Boolean).join(":");
  // Good for one age, poor for another: a variant for the one, rather than changing it for all.
  const split = bandSplit(p);
  if (split && !variantFor.includes(split.poor.band)) {
    const forBand = problems.filter((x) => !x.band || x.band === split.poor.band);
    return { kind: "variant", signature: `variant:${split.poor.band}`, problems: forBand, band: split.poor, goodBand: split.good };
  }
  if (p.score !== null && p.score < ARCHIVE_BELOW && p.ratings >= ARCHIVE_MIN_RATINGS) return { kind: "arkiver", signature: signature("arkiver"), problems };
  if (!problems.length) return null;
  const kind = problems.every((x) => x.context) ? "tilpasning" : "ny_versjon";
  return { kind, signature: signature(kind), problems };
}

const label = (k: string) => OBSERVATION_KINDS[k]?.label ?? k;

function problemLine(x: Pattern): string {
  const where = [OBSERVATION_PARTS[x.part] ?? "", x.context].filter(Boolean).join(", ");
  return `${x.sessions} ${x.sessions === 1 ? "økt" : "økter"} og ${x.trainers} ${x.trainers === 1 ? "trener" : "trenere"} nevnte ${label(x.kind)}${where ? ` (${where})` : ""}.`;
}

/** The reason at the top of the proposal: what the trainers said, in numbers. */
export function reasonText(p: ExercisePattern, plan: ProposalPlan): string {
  const lines = plan.problems.slice(0, 3).map(problemLine);
  if (plan.kind === "variant" && plan.band && plan.goodBand) lines.unshift(variantLine(plan.band, plan.goodBand));
  const ideas = [...new Set(plan.problems.flatMap((x) => x.suggestions))].slice(0, 3);
  if (ideas.length) lines.push(`Forslag fra trenerne: ${ideas.map((s) => `«${s}»`).join(", ")}.`);
  if (p.trend) lines.push(TREND_TEXT[p.trend]);
  if (plan.kind === "arkiver" && p.score !== null) lines.unshift(`Vektet snitt ${meanText(p.score)} av 3 fra ${p.ratings} vurderinger.`);
  return lines.join(" ").slice(0, 1000);
}

const scoreText = (b: BandScore) => `${meanText(b.mean)} av 3 (${b.ratings} vurderinger)`;

function variantLine(poor: BandScore, good: BandScore): string {
  return `Øvelsen fungerer for ${bandLabel(good.band)}, snitt ${scoreText(good)}, men ikke for ${bandLabel(poor.band)}, snitt ${scoreText(poor)}.`;
}

/** What KI is asked to change: the trainers' observations, and earlier proposals that were turned down. */
export function proposalWish(plan: ProposalPlan, rejections: string[], max = 1000): string {
  const head =
    plan.kind === "variant" && plan.band && plan.goodBand
      ? `${variantLine(plan.band, plan.goodBand)} Lag en variant av øvelsen for ${bandLabel(plan.band.band)} (NFF-båndet), tilpasset alderen: organisering, regler, banestørrelse og læringsmomenter. Den vanlige øvelsen beholdes for de andre.`
      : plan.kind === "tilpasning"
      ? "Trenerne har gitt innspill som bare gjelder i noen situasjoner. Legg til en tilpasning for situasjonen (i organiseringen, eller under enklere/vanskeligere), og la resten av øvelsen være som den er."
      : "Trenerne har gitt disse innspillene fra evalueringer. Lag en ny versjon som løser problemene, og endre ikke mer enn det trengs.";
  const problems = plan.problems.slice(0, 3).map((x) => {
    const ideas = x.suggestions.length ? ` Forslag fra trenerne: ${x.suggestions.map((s) => `«${s}»`).join(", ")}.` : "";
    return `- ${problemLine(x)}${ideas}`;
  });
  const turnedDown = rejections.slice(0, 2).map((r) => `- «${r}»`);
  const parts = [head, ...problems, ...(turnedDown.length ? ["Tidligere forslag ble avvist med denne begrunnelsen:", ...turnedDown] : [])];
  let out = "";
  for (const part of parts) {
    if ((out + part).length + 1 > max) break;
    out = out ? `${out}\n${part}` : part;
  }
  return out;
}
