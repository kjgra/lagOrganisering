import { NFF_BANDS, type NffBand } from "@/lib/nff/bands";

type BandKey = NffBand["key"];

/**
 * What trainers ask KI for, as fixed needs. The trainer's wish in a KI plan
 * and the comments on plans are turned into these keys at night, so they can
 * be counted per age band: «for mange spillere til øvelsen» and «det ble kø»
 * both become `faerre_per_gruppe` / `mindre_ko`. Only keys are stored.
 */
export const NEEDS: Record<string, string> = {
  enklere: "enklere øvelser",
  vanskeligere: "vanskeligere øvelser",
  faerre_per_gruppe: "færre spillere per gruppe",
  mindre_ko: "mindre kø og venting",
  mer_aktivitet: "mer aktivitet og ballkontakt for alle",
  enklere_organisering: "enklere organisering og forklaring",
  lite_utstyr: "må fungere med lite utstyr",
  lite_plass: "må fungere på lite plass",
  faa_trenere: "må fungere med få trenere",
  kortere: "kortere øvelser eller økt",
  mer_tid: "mer tid per øvelse",
  mer_spill: "mer spill og smålagsspill",
  mer_1mot1: "mer 1 mot 1",
  mer_avslutning: "mer avslutning på mål",
  mer_pasning: "mer pasning og mottak",
  mer_forsvar: "mer forsvarsspill",
  mer_lek: "mer lek og konkurranse",
  keeper: "eget for keeperne",
  nye_ovelser: "nye øvelser",
  annet: "annet",
};

/** One need found in one wish or comment. */
export interface NeedRow {
  need: string;
  band: BandKey | null;
  /** «opplegg:12» or «kommentar:5»: one wish or comment. */
  source: string;
  author: string;
  groupId: string;
}

export interface NeedPattern {
  band: BandKey;
  need: string;
  /** Wishes and comments that asked for it. */
  sources: number;
  trainers: number;
  /** Groups (clubs or main groups in Spond) behind it. Shared with other groups only from 2. */
  groups: number;
}

/**
 * Needs that come back for an age band: from at least `minSessions` wishes or
 * comments and `minTrainers` trainers, so one trainer's habit is not a
 * pattern. Needs without a band, and «annet», are left out. Most asked first.
 */
export function needPatterns(rows: NeedRow[], t: { minSessions: number; minTrainers: number }): NeedPattern[] {
  const by = new Map<string, { band: BandKey; need: string; sources: Set<string>; trainers: Set<string>; groups: Set<string> }>();
  for (const r of rows) {
    if (!r.band || r.need === "annet" || !(r.need in NEEDS)) continue;
    const k = `${r.band}\n${r.need}`;
    const x = by.get(k) ?? { band: r.band, need: r.need, sources: new Set(), trainers: new Set(), groups: new Set() };
    x.sources.add(r.source);
    x.trainers.add(r.author);
    x.groups.add(r.groupId);
    by.set(k, x);
  }
  const bands = NFF_BANDS.map((b) => b.key);
  return [...by.values()]
    .filter((x) => x.sources.size >= t.minSessions && x.trainers.size >= t.minTrainers)
    .map((x) => ({ band: x.band, need: x.need, sources: x.sources.size, trainers: x.trainers.size, groups: x.groups.size }))
    .sort((a, b) => bands.indexOf(a.band) - bands.indexOf(b.band) || b.sources - a.sources || a.need.localeCompare(b.need));
}

/**
 * The needs a team's KI order may use: those from several groups (at least
 * two behind them, so no group can be recognised), and the team's own group's
 * needs counted on their own. Only for the team's age band.
 */
export function needsFor(rows: NeedRow[], groupId: string, band: BandKey | null, t: { minSessions: number; minTrainers: number }): NeedPattern[] {
  if (!band) return [];
  const shared = needPatterns(rows, t).filter((p) => p.band === band && p.groups >= 2);
  const own = needPatterns(
    rows.filter((r) => r.groupId === groupId),
    t,
  ).filter((p) => p.band === band && !shared.some((s) => s.need === p.need));
  return [...shared, ...own].sort((a, b) => b.sources - a.sources || a.need.localeCompare(b.need));
}
