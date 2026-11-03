import type { Drawing } from "./drawing";

/**
 * Filters for the exercise bank's grid on a wide screen. The page sends slim items
 * (no exercise texts) to the browser, and the filters work there, without a round trip.
 */

export type Rating = "bra" | "ok" | "darlig" | "ingen";

export const RATING_FILTERS: Record<Rating, string> = {
  bra: "👍 Bra (snitt 2,5 eller mer)",
  ok: "👌 OK (snitt 2–2,4)",
  darlig: "👎 Dårlig (snitt under 2)",
  ingen: "Ikke evaluert",
};

/** The rating bucket of an exercise from its evaluations: average of 3 = 👍, 2 = 👌, 1 = 👎. */
export function ratingOf(b: { fb_n: number; fb_mean: number | null }): Rating {
  if (!b.fb_n || b.fb_mean === null) return "ingen";
  return b.fb_mean >= 2.5 ? "bra" : b.fb_mean >= 2 ? "ok" : "darlig";
}

export interface BankItem {
  id: number;
  name: string;
  category: string;
  status: string;
  /** «2 økter · snitt 2,5 av 3 · sist 3. nov. · variant av …». */
  summary: string;
  /** «8–9 år · Spille med og mot · …», or empty. */
  nff: string;
  avoid: boolean;
  bands: string[];
  activity: string;
  /** NFF tags: `tema.<key>`, `delf.<key>` and learning points. */
  tags: string[];
  rating: Rating;
  /** The first sketch of the exercise's drawing, for the thumbnail. */
  drawing: Drawing | null;
  /** «12 min · 6–10 spillere» for the generated thumbnail. */
  facts: string;
}

export interface BankFilters {
  q: string;
  alder: string;
  tema: string;
  aktivitet: string;
  delf: string;
  kategori: string;
  vurdering: string;
}

export const NO_FILTERS: BankFilters = { q: "", alder: "", tema: "", aktivitet: "", delf: "", kategori: "", vurdering: "" };
export const FILTER_KEYS = Object.keys(NO_FILTERS) as (keyof BankFilters)[];

/** Filters from the URL (?alder=8-9&tema=…), so «Tilbake» from an exercise keeps them. */
export function filtersFrom(params: { get(name: string): string | null }): BankFilters {
  const f = { ...NO_FILTERS };
  for (const k of FILTER_KEYS) f[k] = (params.get(k) ?? "").slice(0, 80);
  return f;
}

export const hasFilters = (f: BankFilters) => FILTER_KEYS.some((k) => f[k].trim() !== "");

const norm = (x: string) => x.toLocaleLowerCase("nb");

export function matches(b: BankItem, f: BankFilters): boolean {
  const q = norm(f.q.trim());
  return (
    (!q || norm(b.name).includes(q)) &&
    (!f.alder || b.bands.includes(f.alder)) &&
    (!f.tema || b.tags.includes(`tema.${f.tema}`)) &&
    (!f.aktivitet || b.activity === f.aktivitet) &&
    (!f.delf || b.tags.includes(`delf.${f.delf}`)) &&
    (!f.kategori || b.category === f.kategori) &&
    (!f.vurdering || b.rating === f.vurdering)
  );
}

export function filterBank(items: BankItem[], f: BankFilters): BankItem[] {
  return items.filter((b) => matches(b, f));
}
