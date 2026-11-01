import type { NffBand } from "@/lib/nff/bands";
import { meanText } from "@/lib/plans/feedback";
import { NEEDS, type NeedPattern } from "@/lib/plans/needs";
import { bandLabel, OBSERVATION_KINDS, type ExercisePattern } from "@/lib/plans/observations";
import type { BankExercise } from "@/lib/plans/plan";

type BandKey = NffBand["key"];

/**
 * «Erfaringer fra lignende økter»: what the analysis has learnt, picked for
 * the team's age band and sent with each KI order. Only what passed the
 * thresholds is used, always with the numbers behind it, so KI can weigh it;
 * nothing from another age band is used for this one. Exercise patterns are
 * from the shared bank (shown on each exercise already); needs from other
 * groups only when at least two groups are behind them (needsFor).
 */

/** A band's rating is used when this many ratings from this many trainers are behind it. */
export const BAND_MIN = { ratings: 3, trainers: 2 };
const GOOD = 2.4;
const POOR = 1.7;
const MAX = { good: 6, poor: 4, problems: 6, needs: 6 };

export interface LessonsInput {
  band: BandKey | null;
  bank: BankExercise[];
  patterns: ExercisePattern[];
  needs: NeedPattern[];
}

/** The rating of an exercise for one age band, when enough is behind it. */
export function bandScore(p: ExercisePattern | undefined, band: BandKey | null) {
  const s = band ? p?.bands.find((b) => b.band === band) : undefined;
  return s && s.ratings >= BAND_MIN.ratings && s.trainers >= BAND_MIN.trainers ? s : null;
}

export function lessonsText(x: LessonsInput): string {
  if (!x.band) return "";
  const band = x.band;
  const label = bandLabel(band);
  const live = new Map(x.bank.filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  const name = (code: string) => `${code} (${live.get(code)!.name})`;
  const scored = x.patterns
    .filter((p) => live.has(p.code))
    .map((p) => ({ p, s: bandScore(p, band) }))
    .filter((y) => y.s !== null);
  const out: string[] = [];

  const good = scored.filter((y) => y.s!.mean >= GOOD).sort((a, b) => b.s!.mean - a.s!.mean || b.s!.ratings - a.s!.ratings).slice(0, MAX.good);
  if (good.length) {
    out.push(
      `## Fungerer godt for ${label}\n\n` +
        good.map((y) => `- ${name(y.p.code)}: snitt ${meanText(y.s!.mean)}/3 (${y.s!.ratings} vurderinger, ${y.s!.trainers} trenere)`).join("\n"),
    );
  }
  const poor = scored.filter((y) => y.s!.mean <= POOR).sort((a, b) => a.s!.mean - b.s!.mean).slice(0, MAX.poor);
  if (poor.length) {
    out.push(
      `## Fungerer dårlig for ${label}\n\nBruk dem ikke som de er for denne aldersgruppen. Juster dem, eller velg noe annet.\n\n` +
        poor.map((y) => `- ${name(y.p.code)}: snitt ${meanText(y.s!.mean)}/3 (${y.s!.ratings} vurderinger, ${y.s!.trainers} trenere)`).join("\n"),
    );
  }

  // Problems that pass the thresholds, for this band or for every band (no context); not those that only happen in another band.
  const problems: string[] = [];
  for (const p of x.patterns) {
    if (!live.has(p.code)) continue;
    for (const q of p.patterns) {
      if (!q.pattern || q.positive || (q.band && q.band !== band) || (!q.band && q.context && /år$/.test(q.context))) continue;
      const where = [q.context, q.part ? `del: ${q.part}` : ""].filter(Boolean).join(", ");
      const hint = q.suggestions.length ? `; trenerne foreslår «${q.suggestions[0]}»` : "";
      problems.push(`- ${name(p.code)}: ${OBSERVATION_KINDS[q.kind]?.label ?? q.kind}${where ? ` (${where})` : ""}, ${q.sessions} økter, ${q.trainers} trenere${hint}`);
    }
    if (p.trend === "byttes_ut") problems.push(`- ${name(p.code)}: trenerne bytter den ofte ut etter KI-opplegg`);
  }
  if (problems.length) out.push(`## Problemer som går igjen\n\nUnngå dem når du bruker øvelsene, f.eks. med en justering.\n\n${problems.slice(0, MAX.problems).join("\n")}`);

  const needs = x.needs.filter((n) => n.band === band).slice(0, MAX.needs);
  if (needs.length) {
    out.push(
      `## Dette ber trenerne for ${label} ofte om\n\nTa hensyn til det uten at treneren må be om det, når det passer bestillingen.\n\n` +
        needs.map((n) => `- ${NEEDS[n.need]} (${n.sources} ganger, ${n.trainers} trenere)`).join("\n"),
    );
  }
  if (!out.length) return "";
  return `# Erfaringer fra lignende økter (${label})\n\nFra evalueringene og ønskene til trenere med lag i samme aldersgruppe. Tallene viser hvor mye som står bak. Dette er erfaringer, ikke regler: NFFs fagplan og trenerens ønsker går foran.\n\n${out.join("\n\n")}`;
}
