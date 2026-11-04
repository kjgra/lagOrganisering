/**
 * Faste baner per ukedag. Banefordelingen kommer to ganger i året, og da får
 * hver treningsdag de samme banene til neste fordeling. En rad sier «disse
 * banene på mandager fra denne datoen», med en valgfri sluttdato (når neste
 * fordeling ventes). Den nyeste raden som har startet gjelder; etter
 * sluttdatoen har dagen ingen fast bane før nye legges inn. En enkelt
 * trening kan overstyres (event_pitches).
 *
 * Datoer er «YYYY-MM-DD» i norsk tid. Ukedag 1 = mandag … 7 = søndag.
 */

export interface WeekdayPitches {
  id: number;
  weekday: number;
  valid_from: string;
  /** Last day the pitches apply (inclusive), or null until the next change. */
  valid_to: string | null;
  pitch_ids: number[];
  updated_by: string;
  updated_at: Date;
}

export const WEEKDAY_NAMES = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"] as const;
/** «mandager» */
export const WEEKDAY_PLURAL = ["mandager", "tirsdager", "onsdager", "torsdager", "fredager", "lørdager", "søndager"] as const;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date as «YYYY-MM-DD». */
export function isDateKey(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** 1 = Monday … 7 = Sunday, for a date key. */
export function isoWeekday(dateKey: string): number {
  const wd = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** The date key `days` after (or before) another. */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type FixedState =
  /** The weekday has fixed pitches on that date. */
  | { state: "fixed"; row: WeekdayPitches }
  /** The weekday had fixed pitches, but they ended before that date. */
  | { state: "expired"; row: WeekdayPitches }
  /** No fixed pitches for the weekday (yet). */
  | { state: "none" };

/** What is fixed for a date: the newest row for its weekday that has started. */
export function fixedOn(rows: WeekdayPitches[], dateKey: string): FixedState {
  const wd = isoWeekday(dateKey);
  let best: WeekdayPitches | null = null;
  for (const r of rows) {
    if (r.weekday !== wd || r.valid_from > dateKey) continue;
    if (!best || r.valid_from > best.valid_from) best = r;
  }
  if (!best) return { state: "none" };
  if (best.valid_to && best.valid_to < dateKey) return { state: "expired", row: best };
  return { state: "fixed", row: best };
}

export type EventPitchSource = "event" | "fixed" | "none";

export interface EventPitches {
  /** The pitches for the training, empty when none are set. */
  ids: number[];
  source: EventPitchSource;
  /** The weekday's fixed pitches ended before the training (only when nothing else is set). */
  expired: WeekdayPitches | null;
  /** The fixed row in force, also when the training is overridden. */
  fixed: WeekdayPitches | null;
}

/** The pitches for a training: its own override, else the weekday's fixed pitches. */
export function eventPitches(rows: WeekdayPitches[], override: number[] | null, dateKey: string | null): EventPitches {
  const f: FixedState = dateKey ? fixedOn(rows, dateKey) : { state: "none" };
  const fixed = f.state === "fixed" ? f.row : null;
  if (override?.length) return { ids: override, source: "event", expired: null, fixed };
  if (fixed) return { ids: fixed.pitch_ids, source: "fixed", expired: null, fixed };
  return { ids: [], source: "none", expired: f.state === "expired" ? f.row : null, fixed: null };
}

/** Same pitches, in any order. */
export function samePitches(a: number[], b: number[]): boolean {
  const x = new Set(a);
  return x.size === new Set(b).size && b.every((id) => x.has(id));
}

/** Days before the end date when the app starts reminding. */
export const EXPIRY_WARN_DAYS = 21;

/**
 * Fixed pitches that end within `days` of today and are not followed by new
 * ones: one per weekday, earliest end first.
 */
export function endingSoon(rows: WeekdayPitches[], today: string, days = EXPIRY_WARN_DAYS): WeekdayPitches[] {
  const limit = addDays(today, days);
  const out: WeekdayPitches[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    const mine = rows.filter((r) => r.weekday === wd);
    // The row in force today, or the next one to start.
    const now = mine.filter((r) => r.valid_from <= today).sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
    if (!now?.valid_to || now.valid_to < today || now.valid_to > limit) continue;
    if (mine.some((r) => r.valid_from > now.valid_from && r.valid_from <= addDays(now.valid_to!, 1))) continue;
    out.push(now);
  }
  return out.sort((a, b) => a.valid_to!.localeCompare(b.valid_to!));
}

/** Rows the list shows: the one in force (or last ended) per weekday and all coming ones; older ones are history. */
export function currentRows(rows: WeekdayPitches[], today: string): WeekdayPitches[] {
  const out: WeekdayPitches[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    const mine = rows.filter((r) => r.weekday === wd).sort((a, b) => a.valid_from.localeCompare(b.valid_from));
    const started = mine.filter((r) => r.valid_from <= today);
    if (started.length) out.push(started[started.length - 1]);
    out.push(...mine.filter((r) => r.valid_from > today));
  }
  return out;
}

export interface WeekdayPitchesInput {
  from: string;
  to: string | null;
  days: { weekday: number; pitch_ids: number[] }[];
}

export const MAX_PITCHES = 12;

/** Check the form: a start date, an end date after it, and at least one weekday with pitches. */
export function validateWeekdayPitches(input: WeekdayPitchesInput): string | null {
  if (!isDateKey(input.from)) return "Velg dato banene gjelder fra.";
  if (input.to !== null && !isDateKey(input.to)) return "Ugyldig sluttdato.";
  if (input.to !== null && input.to < input.from) return "Sluttdatoen må være etter startdatoen.";
  if (!input.days.length) return "Velg minst én ukedag med baner.";
  const seen = new Set<number>();
  for (const d of input.days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 1 || d.weekday > 7 || seen.has(d.weekday)) return "Ugyldig ukedag.";
    seen.add(d.weekday);
    if (!d.pitch_ids.length) return `Velg minst én bane for ${WEEKDAY_PLURAL[d.weekday - 1]}.`;
    if (d.pitch_ids.length > MAX_PITCHES) return `Velg maks ${MAX_PITCHES} baner per dag.`;
  }
  return null;
}

// Text ---------------------------------------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

/** «4. nov», with the year when it is not `today`'s year. */
export function dateText(key: string, today: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]}${key.slice(0, 4) !== today.slice(0, 4) ? ` ${y}` : ""}`;
}

/** «mandager, tirsdager og torsdager» */
export function listText(items: string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} og ${items.at(-1)}`;
}

export type RowStatus = "now" | "coming" | "ending" | "ended";

export function rowStatus(r: WeekdayPitches, today: string, ending: WeekdayPitches[]): RowStatus {
  if (r.valid_from > today) return "coming";
  if (r.valid_to && r.valid_to < today) return "ended";
  return ending.some((x) => x.id === r.id) ? "ending" : "now";
}

/** «Fra 4. nov til og med 31. mar», «Fra 4. nov til neste endring», «4. nov–31. mar» */
export function periodText(r: WeekdayPitches, today: string): string {
  const from = dateText(r.valid_from, today);
  if (!r.valid_to) return `Fra ${from} til neste endring`;
  const to = dateText(r.valid_to, today);
  return r.valid_to < today ? `${from}–${to}` : `Fra ${from} til og med ${to}`;
}

/** «Faste baner for mandager slutter 31. mar.» for the rows ending soon, by date. */
export function endingText(rows: WeekdayPitches[], today: string): string | null {
  if (!rows.length) return null;
  const byDate = new Map<string, string[]>();
  for (const r of rows) byDate.set(r.valid_to!, [...(byDate.get(r.valid_to!) ?? []), WEEKDAY_PLURAL[r.weekday - 1]]);
  return [...byDate].map(([to, days]) => `Faste baner for ${listText(days)} slutter ${to === today ? "i dag" : dateText(to, today)}.`).join(" ");
}

/** «de faste banene for tirsdager og torsdager slutter 18. nov.» (or «sluttet» when past). */
export function endedText(rows: WeekdayPitches[], today: string): string {
  const byDate = new Map<string, string[]>();
  for (const r of [...rows].sort((a, b) => a.weekday - b.weekday)) byDate.set(r.valid_to!, [...(byDate.get(r.valid_to!) ?? []), WEEKDAY_PLURAL[r.weekday - 1]]);
  const parts = [...byDate].map(([to, days]) => `${listText(days)} ${to < today ? "sluttet" : "slutter"} ${dateText(to, today)}`);
  return `de faste banene for ${listText(parts)}.`;
}
