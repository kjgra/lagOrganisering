// NFF's age bands for barnefotball (Planverk 2026 on tiim.no, made by NFF). A team stores its
// birth year, so its band and match format move up by themselves each season. Bands stop at
// 12 for now; ungdom (13–19) can be added later.

export type Gender = "gutter" | "jenter" | "mix";

export const GENDERS: Record<Gender, string> = { gutter: "Gutter", jenter: "Jenter", mix: "Mix" };

export interface NffBand {
  key: "6-7" | "8-9" | "10-12";
  label: string;
  from: number;
  to: number;
}

export const NFF_BANDS: NffBand[] = [
  { key: "6-7", label: "6–7 år", from: 6, to: 7 },
  { key: "8-9", label: "8–9 år", from: 8, to: 9 },
  { key: "10-12", label: "10–12 år", from: 10, to: 12 },
];

export const BIRTH_YEAR_MIN = 2000;
export const BIRTH_YEAR_MAX = 2100;

/** Age in a season, counted as NFF does: the age the players turn that year. */
export function seasonAge(birthYear: number, year: number): number {
  return year - birthYear;
}

export function bandFor(age: number): NffBand | null {
  return NFF_BANDS.find((b) => age >= b.from && age <= b.to) ?? null;
}

/** NFF's match format at an age (treer 6–7, femmer 8–9, sjuer 10–11, nier 12). */
export function formatFor(age: number): string | null {
  if (age >= 6 && age <= 7) return "treerfotball";
  if (age >= 8 && age <= 9) return "femmerfotball";
  if (age >= 10 && age <= 11) return "sjuerfotball";
  if (age === 12) return "nierfotball";
  return null;
}

export interface TeamAge {
  /** «G10», «J8» or «10 år» (mix). */
  short: string;
  age: number;
  band: NffBand | null;
  format: string | null;
}

export function teamAge(birthYear: number, gender: Gender | null, year: number): TeamAge {
  const age = seasonAge(birthYear, year);
  const letter = gender === "gutter" ? "G" : gender === "jenter" ? "J" : "";
  return { short: letter ? `${letter}${age}` : `${age} år`, age, band: bandFor(age), format: formatFor(age) };
}

/** One line for the team and for KI: «G10 (født 2016) · NFF-bånd 10–12 år · sjuerfotball». */
export function teamAgeText(birthYear: number | null, gender: Gender | null, year: number, fallback = ""): string {
  if (birthYear === null) return fallback;
  const t = teamAge(birthYear, gender, year);
  const band = t.band ? `NFF-bånd ${t.band.label}` : "utenfor NFFs barnefotball (6–12 år)";
  return [`${t.short} (født ${birthYear})`, band, t.format].filter(Boolean).join(" · ");
}
