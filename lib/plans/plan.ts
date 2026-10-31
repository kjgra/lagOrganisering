import { isSensitive } from "@/lib/sensitive";
import { compactDrawing, DrawingError, validateDrawing, type Drawing } from "./drawing";
import { BIRTH_YEAR_MAX, BIRTH_YEAR_MIN, GENDERS, type Gender } from "@/lib/nff/bands";
import { AKTIVITETER, BAND_KEYS, isKnownTag, learningPoint, type BandKey } from "@/lib/nff/fagplan";

/**
 * Training plans (treningsopplegg), ported from the old app (fct_plan.R and
 * fct_training.R). A plan is stored as JSON; it never contains player names.
 * Text may use **double asterisks** for bold; nothing else is markup.
 */

export class PlanError extends Error {}

export const CATEGORIES: Record<string, string> = {
  oppvarming: "Oppvarming",
  ballmestring: "Ballmestring",
  pasning_mottak: "Pasning og mottak",
  vending: "Vending",
  avslutning: "Avslutning",
  angrep: "Angrep",
  forsvar: "Forsvar",
  smaaspill: "Småspill",
  annet: "Annet",
};

export const EXERCISE_STATUSES: Record<string, string> = { active: "Aktiv", candidate: "Kandidat", archived: "Arkivert" };

export type ExerciseSource = "bank" | "justert" | "ny";

export interface PlanExercise {
  kode: string;
  navn: string;
  kategori: string;
  fokus: string;
  organisering: string[];
  gjennomforing: string[];
  tilpasning: string[];
  laeringsmomenter: string[];
  sporsmal: string[];
  enklere: string;
  vanskeligere: string;
  nff_url: string;
  kilde: ExerciseSource;
  basert_pa: string;
  naermeste_kode: string;
  hvorfor_ny: string;
  tegning: Drawing | null;
  /** NFF aktivitetskategori (AKTIVITETER key), from KI. Optional, so older plans stay valid. */
  aktivitet?: string;
  /** NFF tags (tema.*, delf.*), from KI. */
  nff_tags?: string[];
}

export interface Plan {
  versjon: 1;
  tittel: string;
  undertittel: string;
  tema: string;
  fokus: { forsvar: string; angrep: string };
  stikkord: { tittel: string; tekst: string }[];
  stikkord_merknad: string;
  tidsplan: {
    oppvarming: { minutter: number; tekst: string };
    stasjoner: { minutter: number; bytte: number; grupper: number };
    avslutning: { minutter: number; tekst: string };
    merknad: string;
  };
  avslutning_sporsmal: string[];
  kilde: string;
  ovelser: PlanExercise[];
}

const TEXT_LISTS = ["organisering", "gjennomforing", "tilpasning", "laeringsmomenter", "sporsmal"] as const;
const LIST_LABEL: Record<(typeof TEXT_LISTS)[number], string> = {
  organisering: "Organisering",
  gjennomforing: "Gjennomføring",
  tilpasning: "Tilpasning",
  laeringsmomenter: "Læringsmomenter",
  sporsmal: "Spørsmål",
};

export const txt = (x: unknown): string => (x === null || x === undefined ? "" : String(x).trim());

function str(x: unknown, what: string, max: number, required = false): string {
  const t = txt(x);
  if (required && !t) throw new PlanError(`${what} mangler.`);
  if (t.length > max) throw new PlanError(`${what} kan ha maks ${max} tegn.`);
  return t;
}

function strs(x: unknown, what: string, maxItems = 12, maxChars = 400): string[] {
  const list = (Array.isArray(x) ? x : []).map(txt).filter(Boolean);
  if (list.length > maxItems) throw new PlanError(`${what} kan ha maks ${maxItems} punkter.`);
  if (list.some((t) => t.length > maxChars)) throw new PlanError(`Et punkt i ${what.toLowerCase()} kan ha maks ${maxChars} tegn.`);
  return list;
}

function int(x: unknown, what: string, lo: number, hi: number, fallback: number): number {
  if (x === null || x === undefined || x === "") return fallback;
  const v = Number(x);
  if (!Number.isInteger(v) || v < lo || v > hi) throw new PlanError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
  return v;
}

/**
 * A stable code from the name: "3 mot 1 i to ruter" -> "3-mot-1-i-to-ruter".
 * Evaluations are collected per code, so it does not change with the name.
 */
export function exerciseCode(name: string, taken: string[] = []): string {
  let x = txt(name).toLowerCase().replace(/æ/g, "ae");
  x = x.replace(/[øöó]/g, "o").replace(/[åáàä]/g, "a").replace(/[éè]/g, "e").replace(/ü/g, "u");
  x = x.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
  if (!x) x = "ovelse";
  let code = x;
  for (let i = 2; taken.includes(code); i++) code = `${x}-${i}`;
  return code;
}

export const CODE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Check a plan and return it clean and complete. Throws PlanError. */
export function validatePlan(input: unknown): Plan {
  let p = input;
  if (typeof p === "string") {
    try {
      p = JSON.parse(p);
    } catch {
      throw new PlanError("Opplegget er ikke gyldig JSON.");
    }
  }
  if (!p || typeof p !== "object") throw new PlanError("Opplegget må være et JSON-objekt.");
  const o = p as Record<string, unknown>;
  const ex = Array.isArray(o.ovelser) ? o.ovelser : [];
  if (ex.length < 1 || ex.length > 6) throw new PlanError("Et opplegg må ha 1 til 6 øvelser.");
  const tp = (o.tidsplan ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const fokus = (o.fokus ?? {}) as Record<string, unknown>;
  const stikkord = (Array.isArray(o.stikkord) ? o.stikkord : []).map((s: Record<string, unknown>) => ({
    tittel: str(s?.tittel, "Et stikkord", 60, true),
    tekst: str(s?.tekst, "Stikkordteksten", 160),
  }));
  if (stikkord.length > 4) throw new PlanError("Maks 4 stikkord.");
  const grupper = int(tp.stasjoner?.grupper, "Antall grupper", 1, 6, 1);
  if (grupper > 1 && grupper !== ex.length) {
    throw new PlanError(`Med ${grupper} grupper som roterer må opplegget ha ${grupper} øvelser (én per stasjon).`);
  }
  return {
    versjon: 1,
    tittel: str(o.tittel, "Tittelen", 80, true),
    undertittel: str(o.undertittel, "Undertittelen", 160),
    tema: str(o.tema, "Temaet", 80),
    fokus: { forsvar: str(fokus.forsvar, "Fokus i forsvar", 300), angrep: str(fokus.angrep, "Fokus i angrep", 300) },
    stikkord,
    stikkord_merknad: str(o.stikkord_merknad, "Merknaden til stikkordene", 300),
    tidsplan: {
      oppvarming: { minutter: int(tp.oppvarming?.minutter, "Oppvarmingen", 0, 60, 0), tekst: str(tp.oppvarming?.tekst, "Oppvarmingsteksten", 200) },
      stasjoner: {
        minutter: int(tp.stasjoner?.minutter, "Tid per øvelse", 1, 90, 15),
        bytte: int(tp.stasjoner?.bytte, "Byttetiden", 0, 10, 0),
        grupper,
      },
      avslutning: { minutter: int(tp.avslutning?.minutter, "Avslutningen", 0, 60, 0), tekst: str(tp.avslutning?.tekst, "Avslutningsteksten", 200) },
      merknad: str((tp as Record<string, unknown>).merknad, "Merknaden til tidsplanen", 500),
    },
    avslutning_sporsmal: strs(o.avslutning_sporsmal, "Spørsmål til avslutningen", 6, 200),
    kilde: str(o.kilde, "Kildelinjen", 500),
    ovelser: ex.map((raw: Record<string, unknown>, i: number) => {
      const e = raw ?? {};
      const w = `Øvelse ${i + 1}: `;
      const navn = str(e.navn, `${w}Navnet`, 80, true);
      const nff = str(e.nff_url, `${w}Lenken`, 500);
      if (nff && !/^https:\/\/\S+$/.test(nff)) throw new PlanError(`${w}Lenken må starte med https://.`);
      const kilde = txt(e.kilde || "ny") as ExerciseSource;
      if (!["bank", "justert", "ny"].includes(kilde)) throw new PlanError(`${w}Kilden må være bank, justert eller ny.`);
      let tegning: Drawing | null = null;
      try {
        tegning = validateDrawing(e.tegning ?? null);
      } catch (err) {
        if (err instanceof DrawingError) throw new PlanError(w + err.message);
        throw err;
      }
      const lists = Object.fromEntries(TEXT_LISTS.map((k) => [k, strs(e[k], `${w}${LIST_LABEL[k]}`)])) as Record<(typeof TEXT_LISTS)[number], string[]>;
      return {
        kode: str(e.kode, `${w}Koden`, 60) || exerciseCode(navn),
        navn,
        kategori: str(e.kategori, `${w}Kategorien`, 60),
        fokus: str(e.fokus, `${w}Fokus`, 300),
        ...lists,
        enklere: str(e.enklere, `${w}Enklere`, 400),
        vanskeligere: str(e.vanskeligere, `${w}Vanskeligere`, 400),
        nff_url: nff,
        kilde,
        basert_pa: str(e.basert_pa, `${w}basert_pa`, 60),
        naermeste_kode: str(e.naermeste_kode, `${w}naermeste_kode`, 60),
        hvorfor_ny: str(e.hvorfor_ny, `${w}hvorfor_ny`, 300),
        tegning,
        ...planNff(e),
      };
    }),
  };
}

/** NFF activity and tags on a plan exercise, only when present and known. */
function planNff(e: Record<string, unknown>): Pick<PlanExercise, "aktivitet" | "nff_tags"> {
  const out: Pick<PlanExercise, "aktivitet" | "nff_tags"> = {};
  const a = txt(e.aktivitet);
  if (AKTIVITETER.some((x) => x.key === a)) out.aktivitet = a;
  const tags = Array.isArray(e.nff_tags) ? [...new Set(e.nff_tags.map(txt))].filter(isKnownTag).slice(0, 20) : [];
  if (tags.length) out.nff_tags = tags;
  return out;
}

/** For the database: drawings without defaults. */
export function planJson(p: Plan): string {
  return JSON.stringify({ ...p, ovelser: p.ovelser.map((e) => ({ ...e, tegning: e.tegning ? compactDrawing(e.tegning) : null })) });
}

export interface ScheduleRow {
  tid: string;
  felles: boolean;
  tekst?: string;
  celler?: string[];
}

/**
 * The schedule with the rotation: with several groups, group j does exercise
 * ((j + k - 2) mod n) + 1 in round k, so every group does every exercise.
 */
export function schedule(p: Plan, groupNames: string[] = []): { columns: string[]; rows: ScheduleRow[]; total: number } {
  const tp = p.tidsplan;
  const n = p.ovelser.length;
  const g = tp.stasjoner.grupper;
  const span = (a: number, b: number) => `${a}–${b}`;
  const rows: ScheduleRow[] = [];
  let t = 0;
  if (tp.oppvarming.minutter > 0) {
    rows.push({ tid: span(t, t + tp.oppvarming.minutter), felles: true, tekst: tp.oppvarming.tekst || "Felles oppvarming" });
    t += tp.oppvarming.minutter;
  }
  for (let k = 1; k <= n; k++) {
    if (k > 1) t += tp.stasjoner.bytte;
    const cells = g > 1 ? Array.from({ length: g }, (_, j) => `Øvelse ${((j + k - 1) % n) + 1}`) : [`Øvelse ${k}: ${p.ovelser[k - 1].navn}`];
    rows.push({ tid: span(t, t + tp.stasjoner.minutter), felles: false, celler: cells });
    t += tp.stasjoner.minutter;
  }
  if (tp.avslutning.minutter > 0) {
    rows.push({ tid: span(t, t + tp.avslutning.minutter), felles: true, tekst: tp.avslutning.tekst || "Felles avslutning" });
    t += tp.avslutning.minutter;
  }
  const cols = g > 1 && groupNames.length === g ? groupNames : g > 1 ? Array.from({ length: g }, (_, j) => `Gruppe ${j + 1}`) : ["Alle"];
  return { columns: ["Tid", ...cols], rows, total: t };
}

/** Lines of a text field as list items, without "- ", "• " or "1. ". */
export function textLines(x: unknown): string[] {
  return txt(x)
    .split("\n")
    .map((l) => l.replace(/^\s*([-•*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export interface BankExercise {
  id: number;
  code: string;
  name: string;
  category: string;
  themes: string[];
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  area: string;
  organisation: string;
  execution: string;
  learning_points: string;
  questions: string;
  easier: string;
  harder: string;
  nff_url: string;
  drawing: Drawing | null;
  source: "manual" | "ai";
  based_on: string;
  status: "active" | "candidate" | "archived";
  updated_at: Date;
  /** Each change is a new version (lib/plans/versions.ts); from the bank always set. */
  version?: number;
  /** NFF bands the exercise suits, and its NFF tags (lib/nff/fagplan.ts). */
  bands: BandKey[];
  nff_activity: string;
  nff_tags: string[];
  // Evaluations summed up per code.
  fb_n: number;
  fb_sessions: number;
  /** Evaluations made from the bank, not after a training. */
  fb_bank: number;
  fb_good: number;
  fb_ok: number;
  fb_bad: number;
  fb_yes: number;
  fb_changes: number;
  fb_no: number;
  fb_mean: number | null;
  fb_minutes: number | null;
  fb_last: Date | null;
  fb_tags: Record<string, number>;
}

/** A bank exercise as a plan exercise: a full copy, so later bank changes do not change the plan. */
export function exerciseFromBank(b: BankExercise): PlanExercise {
  return {
    kode: b.code,
    navn: b.name,
    kategori: CATEGORIES[b.category] ?? b.category,
    fokus: "",
    organisering: textLines(b.organisation),
    gjennomforing: textLines(b.execution),
    tilpasning: [],
    laeringsmomenter: textLines(b.learning_points),
    sporsmal: textLines(b.questions),
    enklere: b.easier,
    vanskeligere: b.harder,
    nff_url: b.nff_url,
    kilde: "bank",
    basert_pa: "",
    naermeste_kode: "",
    hvorfor_ny: "",
    tegning: b.drawing,
  };
}

export const categoryKey = (label: string) =>
  Object.keys(CATEGORIES).find((k) => CATEGORIES[k].toLowerCase() === txt(label).toLowerCase() || k === txt(label)) ?? "annet";

export interface PlanSettings {
  tittel: string;
  tema: string;
  undertittel: string;
  forsvar: string;
  angrep: string;
  stikkord: { tittel: string; tekst: string }[];
  oppvarming: number;
  oppvarming_tekst: string;
  stasjon: number;
  bytte: number;
  rotasjon: boolean;
  avslutning: number;
  avslutning_tekst: string;
  sporsmal: string;
  merknad: string;
}

export function defaultSettings(theme = ""): PlanSettings {
  return {
    tittel: theme || "Treningsøkt",
    tema: theme,
    undertittel: "",
    forsvar: "",
    angrep: "",
    stikkord: [],
    oppvarming: 10,
    oppvarming_tekst: "Felles oppvarming",
    stasjon: 15,
    bytte: 2,
    rotasjon: true,
    avslutning: 8,
    avslutning_tekst: "Felles avslutning",
    sporsmal: "",
    merknad: "",
  };
}

export function settingsFromPlan(p: Plan): PlanSettings {
  const tp = p.tidsplan;
  return {
    tittel: p.tittel,
    tema: p.tema,
    undertittel: p.undertittel,
    forsvar: p.fokus.forsvar,
    angrep: p.fokus.angrep,
    stikkord: p.stikkord,
    oppvarming: tp.oppvarming.minutter,
    oppvarming_tekst: tp.oppvarming.tekst,
    stasjon: tp.stasjoner.minutter,
    bytte: tp.stasjoner.bytte,
    rotasjon: tp.stasjoner.grupper > 1,
    avslutning: tp.avslutning.minutter,
    avslutning_tekst: tp.avslutning.tekst,
    sporsmal: p.avslutning_sporsmal.join("\n"),
    merknad: tp.merknad,
  };
}

/** A plan from exercises and the editor's settings. */
export function buildPlan(ex: PlanExercise[], s: PlanSettings, keep: Partial<Plan> = {}): Plan {
  if (!ex.length) throw new PlanError("Velg minst én øvelse.");
  const texts = [s.tittel, s.tema, s.forsvar, s.angrep, s.sporsmal, s.merknad, s.oppvarming_tekst, s.avslutning_tekst, ...s.stikkord.flatMap((k) => [k.tittel, k.tekst])];
  if (isSensitive(...texts)) throw new PlanError("Opplegget skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  const n = ex.length;
  const rot = s.rotasjon && n > 1;
  const p = validatePlan({
    ...keep,
    tittel: s.tittel,
    undertittel: s.undertittel,
    tema: s.tema,
    fokus: { forsvar: s.forsvar, angrep: s.angrep },
    stikkord: s.stikkord.filter((k) => txt(k.tittel)),
    tidsplan: {
      oppvarming: { minutter: s.oppvarming, tekst: s.oppvarming_tekst },
      stasjoner: { minutter: s.stasjon, bytte: n > 1 ? s.bytte : 0, grupper: rot ? n : 1 },
      avslutning: { minutter: s.avslutning, tekst: s.avslutning_tekst },
      merknad: s.merknad,
    },
    avslutning_sporsmal: textLines(s.sporsmal),
    ovelser: ex,
  });
  if (!p.undertittel) {
    const total = schedule(p).total;
    p.undertittel = `${rot ? `${n} stasjoner, ${n} grupper` : `${n} ${n === 1 ? "øvelse" : "øvelser"}`} · ca. ${total} min`;
  }
  return p;
}

// Rules for the bank, the season plan and the team settings --------------------------------

export interface ExerciseInput {
  name: string;
  category: string;
  themes: string[];
  min_players: string;
  max_players: string;
  duration_minutes: string;
  area: string;
  organisation: string;
  execution: string;
  learning_points: string;
  questions: string;
  easier: string;
  harder: string;
  nff_url: string;
  drawing: string;
  status: string;
  bands: string[];
  nff_activity: string;
  nff_tags: string[];
}

/** NFF bands, activity and tags, cleaned. Unknown tags (e.g. removed from the catalog) are dropped, as are learning points for other bands. */
export function validateNff(e: { bands?: unknown; nff_activity?: unknown; nff_tags?: unknown }) {
  const raw = Array.isArray(e.bands) ? e.bands.map(txt) : [];
  if (raw.some((b) => !BAND_KEYS.includes(b as BandKey))) throw new PlanError("Ukjent aldersbånd.");
  const bands = BAND_KEYS.filter((b) => raw.includes(b));
  const nff_activity = txt(e.nff_activity);
  if (nff_activity && !AKTIVITETER.some((a) => a.key === nff_activity)) throw new PlanError("Ukjent aktivitetskategori.");
  const tags = [...new Set((Array.isArray(e.nff_tags) ? e.nff_tags : []).map(txt))].filter((t) => {
    if (!isKnownTag(t)) return false;
    const lp = learningPoint(t);
    return !lp || !bands.length || bands.includes(lp.band);
  });
  if (tags.length > 60) throw new PlanError("En øvelse kan ha maks 60 NFF-tagger.");
  return { bands, nff_activity, nff_tags: tags };
}

type TextField = "area" | "organisation" | "execution" | "learning_points" | "questions" | "easier" | "harder" | "nff_url";
const TEXT_MAX: Record<TextField, number> = { area: 60, organisation: 2000, execution: 2000, learning_points: 2000, questions: 2000, easier: 1000, harder: 1000, nff_url: 500 };

function intOrNull(x: unknown, what: string, lo: number, hi: number): number | null {
  const t = txt(x);
  if (!t) return null;
  if (!/^\d+$/.test(t) || Number(t) < lo || Number(t) > hi) throw new PlanError(`${what} må være et helt tall fra ${lo} til ${hi}.`);
  return Number(t);
}

/** Clean and check an exercise before it is saved. */
export function validateExercise(e: Partial<ExerciseInput>) {
  const name = txt(e.name).replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new PlanError("Navnet må ha mellom 1 og 80 tegn.");
  const category = txt(e.category);
  if (!(category in CATEGORIES)) throw new PlanError("Velg en kategori.");
  const themes: string[] = [];
  for (const t of (e.themes ?? []).map((x) => txt(x).replace(/\s+/g, " ")).filter(Boolean)) {
    if (!themes.some((x) => x.toLowerCase() === t.toLowerCase())) themes.push(t);
  }
  if (themes.length > 10) throw new PlanError("En øvelse kan ha maks 10 temaer.");
  if (themes.some((t) => t.length > 40)) throw new PlanError("Et tema kan ha maks 40 tegn.");
  const min = intOrNull(e.min_players, "Minste antall spillere", 1, 60);
  const max = intOrNull(e.max_players, "Største antall spillere", 1, 60);
  if (min !== null && max !== null && max < min) throw new PlanError("Største antall spillere kan ikke være mindre enn minste antall.");
  const texts = Object.fromEntries(
    Object.entries(TEXT_MAX).map(([k, m]) => {
      const v = txt((e as Record<string, unknown>)[k]);
      if (v.length > m) throw new PlanError(`Feltet «${k}» kan ha maks ${m} tegn.`);
      return [k, v];
    }),
  ) as Record<TextField, string>;
  if (texts.nff_url && !/^https:\/\/\S+$/.test(texts.nff_url)) throw new PlanError("Lenken må starte med https://.");
  let drawing: Drawing | null = null;
  try {
    drawing = validateDrawing(e.drawing ?? null);
  } catch (err) {
    if (err instanceof DrawingError) throw new PlanError(`Tegning: ${err.message}`);
    throw err;
  }
  const status = txt(e.status);
  if (status && !(status in EXERCISE_STATUSES)) throw new PlanError("Ugyldig status.");
  if (isSensitive(name, ...Object.values(texts))) throw new PlanError("Øvelsen skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  return {
    name,
    category,
    themes,
    min_players: min,
    max_players: max,
    duration_minutes: intOrNull(e.duration_minutes, "Tid", 1, 120),
    ...texts,
    drawing,
    status: (status || null) as "active" | "candidate" | "archived" | null,
    ...validateNff(e),
  };
}

export const MONTHS = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

/** Twelve months; an empty theme means none that month. */
export function validateSeason(year: number, themes: string[], descriptions: string[]) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new PlanError("Ugyldig år.");
  const out: { month: number; theme: string; description: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const t = txt(themes[i]).replace(/\s+/g, " ");
    const d = txt(descriptions[i]);
    if (t.length > 80) throw new PlanError("Et tema kan ha maks 80 tegn.");
    if (d.length > 500) throw new PlanError("En beskrivelse kan ha maks 500 tegn.");
    if (!t && d) throw new PlanError(`Skriv et tema for ${MONTHS[i].toLowerCase()}, eller fjern beskrivelsen.`);
    if (t) out.push({ month: i + 1, theme: t, description: d });
  }
  if (isSensitive(...out.flatMap((x) => [x.theme, x.description]))) {
    throw new PlanError("Årshjulet skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  }
  return out;
}

export interface TeamSettings {
  /** Old free text («G10»), kept only where the migration could not read it. */
  age_group: string;
  birth_year: number | null;
  gender: Gender | null;
  session_minutes: number | null;
  /** The pitches the team uses (`pitches.id`, the fiksId on fotball.no). */
  pitch_ids: number[];
  /** Free-text note about the pitches, e.g. «deler med G12». */
  pitch: string;
  equipment: string;
}

/** Pitch ids from a list or «1,2,3»: whole numbers, no duplicates, at most 50. */
export function pitchIds(x: unknown): number[] {
  const list = Array.isArray(x) ? x : txt(x).split(",");
  const ids = [...new Set(list.map(txt).filter(Boolean))];
  if (ids.length > 50 || ids.some((t) => !/^\d{1,9}$/.test(t))) throw new PlanError("Ukjent bane.");
  return ids.map(Number);
}

function genderOrNull(x: unknown): Gender | null {
  const g = txt(x);
  if (!g) return null;
  if (!(g in GENDERS)) throw new PlanError("Ukjent kjønn.");
  return g as Gender;
}

export function validateTeamSettings(s: Record<string, unknown>): TeamSettings {
  const out: TeamSettings = {
    age_group: txt(s.age_group),
    birth_year: intOrNull(s.birth_year, "Fødselsår", BIRTH_YEAR_MIN, BIRTH_YEAR_MAX),
    gender: genderOrNull(s.gender),
    session_minutes: intOrNull(s.session_minutes, "Øktlengde", 15, 240),
    pitch_ids: pitchIds(s.pitch_ids),
    pitch: txt(s.pitch),
    equipment: txt(s.equipment),
  };
  const max = { age_group: 40, pitch: 200, equipment: 1000 };
  for (const [k, m] of Object.entries(max)) {
    if (out[k as keyof typeof max].length > m) throw new PlanError(`Feltet «${k}» kan ha maks ${m} tegn.`);
  }
  if (isSensitive(out.age_group, out.pitch, out.equipment)) {
    throw new PlanError("Laget skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  }
  return out;
}

// Pitches -----------------------------------------------------------------------------------

export interface Pitch {
  id: number;
  parent_id: number | null;
  facility: string;
  name: string;
  /** Underlag, e.g. «Kunstgress m/plastholdig innfyll». */
  surface: string | null;
  /** Banetype, e.g. «7er». */
  pitch_type: string | null;
  /** E.g. «150 lux»; null is no lighting. */
  lighting: string | null;
  length_m: number | null;
  width_m: number | null;
  retired: boolean;
}

/** «7er · Kunstgress m/plastholdig innfyll · 48 × 30 m · lys 150 lux», for the picker and for KI. */
export function pitchFacts(p: Pitch): string {
  const size = p.length_m && p.width_m ? `${p.length_m} × ${p.width_m} m` : "";
  const light = p.lighting ? `lys ${p.lighting}` : "uten lys";
  return [p.pitch_type, p.surface, size, light].filter(Boolean).join(" · ");
}

/** «Nymark idrettsanlegg, Nymark Kunstgress 04 7er A (7er · …)», for the order. */
export function pitchLabel(p: Pitch): string {
  return `${p.facility}, ${p.name} (${pitchFacts(p)})`;
}

/** The pitch line in the order: the chosen pitches, then the team's note. */
export function pitchText(pitches: Pitch[], note: string): string {
  return [pitches.map(pitchLabel).join("; "), txt(note)].filter(Boolean).join(". ");
}

/** Pitches in list order with their depth below the main pitch (0 for a main pitch). */
export function pitchTree(pitches: Pitch[]): { pitch: Pitch; depth: number }[] {
  const byId = new Map(pitches.map((p) => [p.id, p]));
  const depth = (p: Pitch, seen = 0): number => {
    const parent = p.parent_id === null ? undefined : byId.get(p.parent_id);
    return parent && seen < 10 ? 1 + depth(parent, seen + 1) : 0;
  };
  return pitches.map((pitch) => ({ pitch, depth: depth(pitch) }));
}

// Similarity, so the bank does not fill up with nearly identical exercises ------------------

/** Similar enough to point out when a plan is approved. */
export const SIMILARITY_THRESHOLD = 0.6;
/** So similar that a new exercise is not saved as one of its own (a variant of it is fine). */
export const TOO_SIMILAR = 0.75;
const STOP = new Set(["og", "med", "som", "til", "den", "det", "der", "for", "fra", "har", "ikke", "kan", "men", "når", "seg", "sin", "skal", "slik", "the", "eller", "etter", "før", "hver", "inn", "mot", "opp", "over", "også", "alle", "blir", "dem", "deg", "din", "dere", "han", "hun", "meg", "mer", "noe", "nye", "ved", "vil", "være", "spiller", "spillere", "ballen", "ball"]);

function words(...x: unknown[]): Set<string> {
  const t = x.flat().map((v) => (Array.isArray(v) ? v.join(" ") : txt(v))).join(" ").toLowerCase();
  return new Set(t.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)));
}

function shape(d: Drawing | null) {
  if (!d) return null;
  const s = d.skisser[0];
  return { players: s.objekter.filter((o) => o.type === "spiller").length, area: s.bane.bredde * s.bane.lengde };
}

/** What similarity looks at: the bank's fields, for a plan exercise or one from the form. */
export interface SimilarInput {
  name: string;
  category: string;
  themes: string[];
  organisation: string | string[];
  execution: string | string[];
  drawing: Drawing | null;
}

export interface SimilarMatch {
  code: string;
  name: string;
  score: number;
}

const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** How similar an exercise is to each bank exercise (0–1), most similar first. The same name counts as 1. */
export function similarExercises(x: SimilarInput, bank: BankExercise[], except = ""): SimilarMatch[] {
  const w1 = words(x.name, x.organisation, x.execution);
  const sh1 = shape(x.drawing);
  const themes = new Set(x.themes.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const ratio = (a: number, b: number) => (a <= 0 || b <= 0 ? Number(a === b) : Math.min(a, b) / Math.max(a, b));
  return bank
    .filter((b) => b.status !== "archived" && b.code !== except)
    .map((b) => {
      if (norm(b.name) && norm(b.name) === norm(x.name)) return { code: b.code, name: b.name, score: 1 };
      const w2 = words(b.name, b.organisation, b.execution);
      const union = new Set([...w1, ...w2]);
      const inter = [...w1].filter((w) => w2.has(w)).length;
      const wordsScore = union.size ? inter / union.size : 0;
      const cat = Number(x.category === b.category);
      const th = Number(b.themes.some((t) => themes.has(t.toLowerCase().trim())));
      const sh2 = shape(b.drawing);
      const shp = !sh1 || !sh2 ? 0.5 : (ratio(sh1.players, sh2.players) + ratio(sh1.area, sh2.area)) / 2;
      return { code: b.code, name: b.name, score: Math.round((0.4 * wordsScore + 0.2 * cat + 0.2 * th + 0.2 * shp) * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score);
}

/** How similar a plan exercise is to each bank exercise (0–1), most similar first. */
export function similarity(e: PlanExercise, bank: BankExercise[], theme = ""): SimilarMatch[] {
  return similarExercises(
    { name: e.navn, category: categoryKey(e.kategori), themes: theme ? [theme] : [], organisation: e.organisering, execution: e.gjennomforing, drawing: e.tegning },
    bank,
  );
}

/** The bank exercise a new one is too similar to, so it should not be saved as an exercise of its own; null if none. */
export function tooSimilar(x: SimilarInput, bank: BankExercise[], except = ""): SimilarMatch | null {
  const top = similarExercises(x, bank, except)[0];
  return top && top.score >= TOO_SIMILAR ? top : null;
}

export function tooSimilarText(m: SimilarMatch): string {
  return `Øvelsen ligner for mye på «${m.name}», som allerede er i øvelsesbanken (${Math.round(m.score * 100)} % lik). Juster heller «${m.name}», eller lag en øvelse som er tydelig annerledes.`;
}

export interface BankCandidate {
  index: number;
  kode: string;
  navn: string;
  kilde: ExerciseSource;
  basert_pa: string;
  match: SimilarMatch | null;
  /** Too similar to the match to be saved as a new exercise: only as a variant of it, or not at all. */
  blocked: boolean;
  default: "save" | "skip";
}

/**
 * Exercises in a plan that may go into the bank when it is approved: new and
 * adjusted ones whose code is not in the bank. A new one with nothing similar
 * is saved by default; similar or adjusted ones are not unless the trainer says so.
 */
export function bankCandidates(p: Plan, bank: BankExercise[]): BankCandidate[] {
  const codes = new Set(bank.map((b) => b.code));
  return p.ovelser.flatMap((e, i) => {
    if (e.kilde === "bank" || codes.has(e.kode)) return [];
    const top = e.kilde === "ny" ? similarity(e, bank, p.tema)[0] : undefined;
    const match = top && top.score >= SIMILARITY_THRESHOLD ? top : null;
    const blocked = !!match && match.score >= TOO_SIMILAR;
    return [{ index: i + 1, kode: e.kode, navn: e.navn, kilde: e.kilde, basert_pa: e.basert_pa, match, blocked, default: e.kilde === "ny" && !match ? "save" : "skip" }];
  });
}

/** «Inspirert av øvelsen på tiim.no (Norges Fotballforbund):» above a link. */
export function sourceText(url: string): string {
  if (!url) return "";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Inspirert av øvelsen på:";
  }
  const nff = host === "tiim.no" || host === "fotball.no" || host.endsWith(".fotball.no");
  return `Inspirert av øvelsen på ${host}${nff ? " (Norges Fotballforbund)" : ""}:`;
}
