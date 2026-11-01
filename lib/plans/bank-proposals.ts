import { HOVEDTEMA, temaTag, type BandKey, type Hovedtema } from "@/lib/nff/fagplan";
import { meanText } from "./feedback";
import { EDIT_FIELDS } from "./exercise-edits";
import type { ExerciseValues } from "./exercise-values";
import { bandLabel, type ExercisePattern } from "./observations";
import { similarExercises, TOO_SIMILAR, type BankExercise, type PlanExercise } from "./plan";

/**
 * Proposals for the whole bank, not from what trainers said about one
 * exercise: a new exercise where an age band has too few good ones for a
 * main theme (ny_ovelse), archiving one of two exercises that are nearly the
 * same (overlapp, never merged by itself), and filling in what an exercise
 * lacks (metadata). Like the others they wait for «Bruk», «Endre først» or
 * «Avvis».
 */

/** Good exercises a band should have per main theme. */
export const GAP_MIN = 3;
/** Gaps are only trusted when the bank is mostly tagged with main themes: otherwise the missing tags come first. */
const GAP_MIN_BANK = 10;
const GAP_TAGGED_SHARE = 0.6;
/** Rated below this (weighted), an exercise does not count as a good one. */
const GOOD_SCORE = 1.8;

const scoreOf = (patterns: Map<string, ExercisePattern>, code: string) => patterns.get(code)?.score ?? null;
const live = (b: BankExercise) => b.status !== "archived";

export interface Gap {
  band: BandKey;
  tema: Hovedtema;
  /** Good exercises the band has for the theme now. */
  have: number;
}

/** Bands in use × main themes with fewer than GAP_MIN good exercises, the emptiest first. */
export function bankGaps(bank: BankExercise[], patterns: ExercisePattern[], bands: BandKey[]): Gap[] {
  const active = bank.filter((b) => b.status === "active");
  const tagged = active.filter((b) => b.nff_tags.some((t) => t.startsWith("tema.")));
  if (active.length < GAP_MIN_BANK || tagged.length < active.length * GAP_TAGGED_SHARE) return [];
  const by = new Map(patterns.map((p) => [p.code, p]));
  const good = (b: BankExercise) => live(b) && (scoreOf(by, b.code) ?? GOOD_SCORE) >= GOOD_SCORE;
  const out: Gap[] = [];
  for (const band of [...new Set(bands)])
    for (const tema of HOVEDTEMA.filter((t) => t.bands.includes(band))) {
      const have = bank.filter((b) => good(b) && b.nff_tags.includes(temaTag(tema.key)) && (!b.bands.length || b.bands.includes(band))).length;
      if (have < GAP_MIN) out.push({ band, tema, have });
    }
  return out.sort((a, b) => a.have - b.have);
}

/** The key the proposal is stored under, in place of an exercise code. */
export const gapCode = (g: Pick<Gap, "band" | "tema">) => `ny-${g.band}-${g.tema.key}`;

export function gapReason(g: Gap): string {
  const have = g.have === 0 ? "ingen gode øvelser" : `bare ${g.have} ${g.have === 1 ? "god øvelse" : "gode øvelser"}`;
  return `Banken har ${have} for ${bandLabel(g.band)} med hovedtemaet «${g.tema.label}». Lag med ${bandLabel(g.band)} bruker appen, så KI foreslår en ny.`;
}

/** What KI is asked for. */
export function gapWish(g: Gap, names: string[]): string {
  const known = names.length ? ` Banken har allerede ${names.slice(0, 5).map((n) => `«${n}»`).join(", ")} for temaet, så lag noe tydelig annerledes.` : "";
  return `Lag en ny øvelse for ${bandLabel(g.band)} (NFF-båndet) med hovedtemaet «${g.tema.label}», slik fagplanen beskriver det.${known}`.slice(0, 1000);
}

/** A new exercise from KI's answer, as the form shows it, tagged with the gap's band and theme. */
export function gapValues(
  e: PlanExercise,
  extra: { min_players: number | null; max_players: number | null; duration_minutes: number | null; area: string },
  g: Pick<Gap, "band" | "tema">,
  category: string,
  drawing: string,
): ExerciseValues {
  const n = (x: number | null) => (x === null ? "" : String(x));
  const lines = (x: string[]) => x.join("\n");
  return {
    name: e.navn.slice(0, 80),
    category,
    themes: g.tema.label,
    min_players: n(extra.min_players),
    max_players: n(extra.max_players),
    duration_minutes: n(extra.duration_minutes),
    area: extra.area,
    organisation: lines(e.organisering),
    execution: lines(e.gjennomforing),
    learning_points: lines(e.laeringsmomenter),
    questions: lines(e.sporsmal),
    easier: e.enklere,
    harder: e.vanskeligere,
    nff_url: e.nff_url,
    drawing,
    // Like «Ny øvelse med KI»: a candidate until it has been used.
    status: "candidate",
    bands: [g.band],
    nff_activity: e.aktivitet ?? "",
    nff_tags: [...new Set([temaTag(g.tema.key), ...(e.nff_tags ?? [])])],
  };
}

/** An empty exercise: the «before» of a new one. */
export function emptyValues(): ExerciseValues {
  return {
    name: "",
    category: "",
    themes: "",
    min_players: "",
    max_players: "",
    duration_minutes: "",
    area: "",
    organisation: "",
    execution: "",
    learning_points: "",
    questions: "",
    easier: "",
    harder: "",
    nff_url: "",
    drawing: "",
    status: "",
    bands: [],
    nff_activity: "",
    nff_tags: [],
  };
}

export interface Overlap {
  /** The one proposed archived. */
  weaker: BankExercise;
  stronger: BankExercise;
  score: number;
}

/** Variants are meant to be like what they are based on. */
const related = (a: BankExercise, b: BankExercise) => a.based_on === b.code || b.based_on === a.code || (!!a.based_on && a.based_on === b.based_on);

/**
 * Pairs of exercises that are nearly the same, each exercise in one pair at
 * most. The weaker is the one rated lower (a rated one beats an unrated one),
 * else the one with fewer ratings, else the newer.
 */
export function bankOverlaps(bank: BankExercise[], patterns: ExercisePattern[]): Overlap[] {
  const by = new Map(patterns.map((p) => [p.code, p]));
  const rank = (b: BankExercise): [number, number, number] => [scoreOf(by, b.code) ?? -1, by.get(b.code)?.ratings ?? 0, -b.id];
  const better = (a: BankExercise, b: BankExercise) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  };
  const list = bank.filter(live).sort((a, b) => a.id - b.id);
  const found: Overlap[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const rest = list.slice(i + 1).filter((b) => !related(a, b));
    const top = similarExercises({ ...a, drawing: a.drawing ?? null }, rest)[0];
    if (!top || top.score < TOO_SIMILAR) continue;
    const b = rest.find((x) => x.code === top.code)!;
    const [weaker, stronger] = better(a, b) >= 0 ? [b, a] : [a, b];
    found.push({ weaker, stronger, score: top.score });
  }
  const used = new Set<string>();
  return found
    .sort((a, b) => b.score - a.score)
    .filter((o) => {
      if (used.has(o.weaker.code) || used.has(o.stronger.code)) return false;
      used.add(o.weaker.code).add(o.stronger.code);
      return true;
    });
}

export function overlapReason(o: Overlap, patterns: ExercisePattern[]): string {
  const by = new Map(patterns.map((p) => [p.code, p]));
  const rated = (b: BankExercise) => {
    const p = by.get(b.code);
    return p?.score != null && p.ratings ? `snitt ${meanText(p.score)} av 3 fra ${p.ratings} vurderinger` : "ikke vurdert";
  };
  return `Øvelsen er ${Math.round(o.score * 100)} % lik «${o.stronger.name}». «${o.stronger.name}» er ${rated(o.stronger)}, denne er ${rated(o.weaker)}. To nesten like øvelser gjør banken vanskeligere å bruke, så forslaget er å arkivere denne. De slås ikke sammen.`;
}

/** The fields filled in by «Mangler info», in order. */
export const METADATA_FIELDS = ["min_players", "max_players", "duration_minutes", "area", "nff_activity", "nff_tags", "bands"] as const;
export type MetadataField = (typeof METADATA_FIELDS)[number];

/** What an exercise lacks. NFF tags count as missing without a main theme. */
export function missingFields(v: ExerciseValues): MetadataField[] {
  return METADATA_FIELDS.filter((k) => (k === "nff_tags" ? !v.nff_tags.some((t) => t.startsWith("tema.")) : k === "bands" ? !v.bands.length : !String(v[k]).trim()));
}

/**
 * The exercise with only what it lacked filled in. The bands come from where
 * trainers rate it well (at least 3 ratings, mean 2 or more), not from KI.
 */
export function fillMissing(base: ExerciseValues, ki: ExerciseValues, missing: MetadataField[], pattern?: ExercisePattern): ExerciseValues {
  const out = { ...base };
  for (const k of missing) {
    if (k === "bands") out.bands = (pattern?.bands ?? []).filter((b) => b.ratings >= 3 && b.mean >= 2).map((b) => b.band);
    else if (k === "nff_tags") out.nff_tags = [...new Set([...base.nff_tags, ...ki.nff_tags])];
    else out[k] = ki[k];
  }
  // Keep the players in order when only one end was missing.
  if (out.min_players && out.max_players && Number(out.max_players) < Number(out.min_players)) {
    if (missing.includes("max_players")) out.max_players = out.min_players;
    else out.min_players = out.max_players;
  }
  return out;
}

/** «min. spillere», but «NFF-tagger». */
const fieldName = (k: MetadataField) => (k === "nff_tags" ? EDIT_FIELDS[k] : EDIT_FIELDS[k].toLowerCase());

export function metadataReason(missing: MetadataField[]): string {
  return `Øvelsen mangler ${missing.map(fieldName).join(", ")}. Med dem finner KI og trenerne den lettere for riktig alder og gruppestørrelse. Forslaget fyller bare inn det som mangler.`;
}

export function metadataWish(missing: MetadataField[]): string {
  return `Fyll inn det øvelsen mangler: ${missing
    .filter((k) => k !== "bands")
    .map(fieldName)
    .join(", ")}. Hovedtema og aktivitet skal følge NFF-fagplanen. Behold resten av øvelsen som den er.`;
}
