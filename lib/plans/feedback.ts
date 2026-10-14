import { isSensitive, namesProblem } from "@/lib/sensitive";
import { txt, type BankExercise, type Plan } from "./plan";

/**
 * Evaluation after a training: each exercise gets a rating, fixed keywords,
 * actual time, free text and «Bruke igjen?»; the session gets a rating, how
 * many came and free text. Free text is checked for sensitive words and
 * member names (it may be summed up by KI later).
 */

export const RATINGS: Record<number, string> = { 3: "👍 Bra", 2: "👌 OK", 1: "👎 Dårlig" };

export const FEEDBACK_TAGS: Record<string, string> = {
  for_lett: "for lett",
  for_vanskelig: "for vanskelig",
  goy: "gøy",
  kjedelig: "kjedelig",
  ko: "mye venting/kø",
  hoy_intensitet: "høy intensitet",
  lav_intensitet: "lav intensitet",
  uklar: "uklar forklaring",
  bane_liten: "banen for liten",
  bane_stor: "banen for stor",
  for_lang: "for lang",
  for_kort: "for kort",
  tema_ja: "fikk fram temaet",
  tema_nei: "fikk ikke fram temaet",
};

export const USE_AGAIN: Record<string, string> = { yes: "Ja", changes: "Med endringer", no: "Nei" };
export const FEEDBACK_BODY_MAX = 300;

export class FeedbackError extends Error {}

export interface RawFeedback {
  exercise_no: number | null;
  rating?: string | number | null;
  tags?: string[];
  actual_minutes?: string | number | null;
  actual_players?: string | number | null;
  body?: string;
  use_again?: string;
}

function intIn(x: unknown, what: string, lo: number, hi: number): number | null {
  const t = txt(x);
  if (!t) return null;
  const v = Number(t);
  if (!Number.isInteger(v) || v < lo || v > hi) throw new FeedbackError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
  return v;
}

/** Check one trainer's evaluation; rows with nothing filled in are left out. */
export function validateFeedback(rows: RawFeedback[], plan: Plan, names: string[]) {
  const n = plan.ovelser.length;
  const out = rows.flatMap((r) => {
    const session = r.exercise_no === null;
    if (!session && (!Number.isInteger(r.exercise_no) || r.exercise_no! < 1 || r.exercise_no! > n)) throw new FeedbackError("Ukjent øvelse.");
    const what = session ? "Hele økta" : `Øvelse ${r.exercise_no}`;
    const rating = intIn(r.rating, `${what}: vurderingen`, 1, 3);
    const tags = session ? [] : [...new Set((r.tags ?? []).filter(Boolean))];
    if (tags.some((t) => !(t in FEEDBACK_TAGS))) throw new FeedbackError(`${what}: ukjent stikkord.`);
    const body = txt(r.body);
    if (body.length > FEEDBACK_BODY_MAX) throw new FeedbackError(`${what}: teksten kan ha maks ${FEEDBACK_BODY_MAX} tegn.`);
    if (isSensitive(body)) throw new FeedbackError(`${what}: teksten skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.`);
    const np = namesProblem(body, names, "Skriv uten navn, evalueringene kan oppsummeres av KI");
    if (np) throw new FeedbackError(`${what}: ${np}`);
    const useAgain = session ? "" : txt(r.use_again);
    if (useAgain && !(useAgain in USE_AGAIN)) throw new FeedbackError(`${what}: ugyldig svar på «Bruke igjen?».`);
    const minutes = session ? null : intIn(r.actual_minutes, `${what}: faktisk tid`, 0, 240);
    const players = session ? intIn(r.actual_players, "Antall spillere", 0, 200) : null;
    const filled = rating !== null || tags.length || body || useAgain || (session && players !== null);
    if (!filled) return [];
    if (rating === null && !session) throw new FeedbackError(`${what}: velg Bra, OK eller Dårlig.`);
    return [
      {
        exercise_no: session ? null : r.exercise_no,
        exercise_code: session ? "" : plan.ovelser[r.exercise_no! - 1].kode,
        rating,
        tags,
        actual_minutes: minutes,
        actual_players: players,
        body,
        use_again: useAgain,
      },
    ];
  });
  if (!out.length) throw new FeedbackError("Vurder minst én øvelse eller hele økta.");
  return out;
}

/** «👍 2 · 👌 1» from counts per rating. */
export function ratingsText(counts: Record<string, number>): string {
  const icons: Record<string, string> = { "3": "👍", "2": "👌", "1": "👎" };
  return ["3", "2", "1"].filter((k) => counts[k]).map((k) => `${icons[k]} ${counts[k]}`).join(" · ");
}

/** Exercises KI should not use: rated below OK on average, or most say «Bruke igjen: Nei». */
export function shouldAvoid(b: BankExercise): boolean {
  const again = b.fb_yes + b.fb_changes + b.fb_no;
  return b.fb_n > 0 && ((b.fb_mean !== null && b.fb_mean < 2) || (again > 0 && b.fb_no * 2 > again));
}

export const meanText = (x: number) => x.toFixed(1).replace(".", ",");
