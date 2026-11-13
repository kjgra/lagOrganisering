/**
 * Styrketagger (prepared, not shown in the app yet): what a player is good at
 * («strength») and what the player is working on («focus»). Both come from
 * fixed lists, so no free text is stored and everything reads well if the
 * child or the parents see it (GDPR art. 15). A player gets at most
 * MAX_STRENGTHS strengths, so the count never turns into a hidden level.
 *
 * The keys are stored; the labels can change. Adding a key needs no
 * migration (the database only checks the key's format).
 */

export type StrengthCategory = "spilleforstaelse" | "teknikk" | "fysisk" | "lagspill";

export const STRENGTH_CATEGORIES: Record<StrengthCategory, string> = {
  spilleforstaelse: "Spilleforståelse",
  teknikk: "Teknikk",
  fysisk: "Fysisk",
  lagspill: "Lagspill",
};

export const STRENGTHS = {
  "ser-medspillere": { label: "Ser medspillere", category: "spilleforstaelse" },
  "finner-rom": { label: "Finner rom", category: "spilleforstaelse" },
  "leser-spillet": { label: "Leser spillet", category: "spilleforstaelse" },
  "trygg-med-ball": { label: "Trygg med ball", category: "teknikk" },
  "gode-pasninger": { label: "Gode pasninger", category: "teknikk" },
  "dribler-godt": { label: "Dribler godt", category: "teknikk" },
  "gode-avslutninger": { label: "Gode avslutninger", category: "teknikk" },
  rask: { label: "Rask", category: "fysisk" },
  "sterk-i-duell": { label: "Sterk i duell", category: "fysisk" },
  "gir-seg-aldri": { label: "Gir seg aldri", category: "fysisk" },
  lagspiller: { label: "Lagspiller", category: "lagspill" },
  "hjelper-andre": { label: "Hjelper andre", category: "lagspill" },
  "snakker-pa-banen": { label: "Snakker på banen", category: "lagspill" },
} as const satisfies Record<string, { label: string; category: StrengthCategory }>;

export const FOCUS = {
  "blikk-for-mottak": "Ta blikk før mottak",
  "begge-bein": "Bruke begge bein",
  "vage-a-utfordre": "Våge å utfordre",
  "spille-videre": "Spille ballen videre",
  "hjelpe-i-forsvar": "Hjelpe til i forsvar",
  "snakke-med-medspillere": "Snakke med medspillere",
  "mottak-i-fart": "Ta imot ballen i fart",
} as const satisfies Record<string, string>;

export type StrengthKey = keyof typeof STRENGTHS;
export type FocusKey = keyof typeof FOCUS;

export const MAX_STRENGTHS = 3;
export const MAX_FOCUS = 2;

export const STRENGTH_KEYS = Object.keys(STRENGTHS) as StrengthKey[];
export const FOCUS_KEYS = Object.keys(FOCUS) as FocusKey[];

export const isStrength = (k: string): k is StrengthKey => Object.prototype.hasOwnProperty.call(STRENGTHS, k);
export const isFocus = (k: string): k is FocusKey => Object.prototype.hasOwnProperty.call(FOCUS, k);

export interface PlayerStrengths {
  strengths: StrengthKey[];
  focus: FocusKey[];
}
