import { meanText } from "./feedback";
import { OBSERVATION_KINDS, OBSERVATION_PARTS, TREND_TEXT, type ExercisePattern, type Pattern } from "./observations";

/**
 * Proposals for better exercises, made from the patterns per exercise
 * without anyone asking. Which kind, and the reason shown to the trainer, are
 * decided here from the pattern; KI only writes the new version.
 */

export const PROPOSAL_KINDS = {
  ny_versjon: "Ny versjon",
  tilpasning: "Tilpasning",
  arkiver: "Arkiver",
} as const;
export type ProposalKind = keyof typeof PROPOSAL_KINDS;

export const PROPOSAL_STATUSES = {
  ny: "Venter",
  brukt: "Brukt",
  endret: "Brukt med endringer",
  avvist: "Avvist",
  utdatert: "Utdatert",
} as const;
export type ProposalStatus = keyof typeof PROPOSAL_STATUSES;

export const REJECTION_MAX = 300;
/** The same proposal is not made again this soon after it was handled. */
export const QUIET_DAYS = 60;
/** Archive: rated this low by at least this many. */
const ARCHIVE_BELOW = 1.6;
const ARCHIVE_MIN_RATINGS = 5;

export interface ProposalPlan {
  kind: ProposalKind;
  /** What it is about, so the same proposal is not made twice. */
  signature: string;
  problems: Pattern[];
}

/** Whether a pattern calls for a proposal, and of which kind; null when it does not. */
export function proposalPlan(p: ExercisePattern): ProposalPlan | null {
  const problems = p.patterns.filter((x) => x.pattern && !x.positive);
  const signature = (kind: string) => [kind, ...problems.map((x) => x.kind).sort(), p.trend].filter(Boolean).join(":");
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
  const ideas = [...new Set(plan.problems.flatMap((x) => x.suggestions))].slice(0, 3);
  if (ideas.length) lines.push(`Forslag fra trenerne: ${ideas.map((s) => `«${s}»`).join(", ")}.`);
  if (p.trend) lines.push(TREND_TEXT[p.trend]);
  if (plan.kind === "arkiver" && p.score !== null) lines.unshift(`Vektet snitt ${meanText(p.score)} av 3 fra ${p.ratings} vurderinger.`);
  return lines.join(" ").slice(0, 1000);
}

/** What KI is asked to change: the trainers' observations, and earlier proposals that were turned down. */
export function proposalWish(plan: ProposalPlan, rejections: string[], max = 1000): string {
  const head =
    plan.kind === "tilpasning"
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
