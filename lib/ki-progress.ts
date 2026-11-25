/**
 * Estimated progress while KI works. The answer comes in one piece, so the
 * bar is based on how long similar calls usually take: linear to 90 % at the
 * expected time, then creeping towards 97 % and never claiming «done».
 */
export function kiProgress(elapsedMs: number, expectedMs: number): number {
  const exp = Math.max(expectedMs, 5000);
  const t = Math.max(elapsedMs, 0);
  if (t <= exp) return 0.9 * (t / exp);
  return 0.97 - 0.07 * Math.exp(-(t - exp) / exp);
}

/** The step shown for a fraction of the steps (the last one stays until the answer is in). */
export function kiStep<T>(steps: readonly T[], fraction: number): T {
  const i = Math.min(steps.length - 1, Math.floor((fraction / 0.9) * steps.length));
  return steps[Math.max(0, i)];
}

/** What KI does while it makes a training plan, in order. */
export const PLAN_STEPS = ["Leser tema, lag og baner", "Velger øvelser fra banken", "Tilpasser til utstyr og antall", "Skriver opplegget"] as const;

/** Fallback when there are no earlier calls to measure. */
export const DEFAULT_KI_MS = 45_000;
