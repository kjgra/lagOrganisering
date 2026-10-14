/**
 * Norwegian dates and numbers, always in Oslo time (the server may run in UTC).
 * Style from the design system: «Tor 15. okt», «17:30–18:45».
 */

export const TZ = "Europe/Oslo";

const WEEKDAYS = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const WEEKDAYS_LONG = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mars",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export interface OsloParts {
  year: number;
  month: number; // 1–12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function osloParts(d: Date | string): OsloParts {
  const date = typeof d === "string" ? new Date(d) : d;
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    weekday: WD[p.weekday] ?? 0,
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "17:30" */
export function clock(d: Date | string): string {
  const p = osloParts(d);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "Tor" */
export function weekdayShort(d: Date | string): string {
  return WEEKDAYS[osloParts(d).weekday];
}

/** "Tor 15. okt" (with the year when it is not this year). */
export function dayLabel(d: Date | string, now: Date = new Date()): string {
  const p = osloParts(d);
  const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
  return `${WEEKDAYS[p.weekday]} ${p.day}. ${MONTHS[p.month - 1]}${y}`;
}

/** "torsdag 15. oktober 2026 kl. 17:30", for screen readers and KI orders. */
export function longDate(d: Date | string): string {
  const p = osloParts(d);
  return `${WEEKDAYS_LONG[p.weekday]} ${p.day}. ${MONTH_NAMES[p.month - 1].toLowerCase()} ${p.year} kl. ${clock(d)}`;
}

/** "17:30–18:45", or with the end date when it ends another day. */
export function timeRange(start: string | null, end: string | null, now: Date = new Date()): string {
  if (!start) return "Tid ikke satt";
  if (!end) return clock(start);
  const sameDay = osloDate(start) === osloDate(end);
  return `${clock(start)}–${sameDay ? "" : `${dayLabel(end, now)} `}${clock(end)}`;
}

/** "2026-10-15" in Oslo time. */
export function osloDate(d: Date | string): string {
  const p = osloParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "13. okt kl. 21:04", with «i dag» and «i går» for the last two days. */
export function savedAt(d: Date | string, now: Date = new Date()): string {
  const day = osloDate(d);
  const today = osloDate(now);
  const yesterday = osloDate(new Date(now.getTime() - 86_400_000));
  const when = day === today ? "i dag" : day === yesterday ? "i går" : shortDate(d, now);
  return `${when} kl. ${clock(d)}`;
}

/** "13. okt" (with the year when it is not this year). */
export function shortDate(d: Date | string, now: Date = new Date()): string {
  const p = osloParts(d);
  const y = p.year !== osloParts(now).year ? ` ${p.year}` : "";
  return `${p.day}. ${MONTHS[p.month - 1]}${y}`;
}

/** Monday 00:00 Oslo time of the week `d` is in, as "YYYY-MM-DD". */
export function weekStart(d: Date | string): string {
  const p = osloParts(d);
  const mondayOffset = (p.weekday + 6) % 7;
  const noon = Date.UTC(p.year, p.month - 1, p.day, 12) - mondayOffset * 86_400_000;
  const x = new Date(noon);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

/**
 * Section for an event list: «Denne uken», «Neste uke», then month names
 * («November», «Januar 2027»).
 */
export function weekSection(d: Date | string, now: Date = new Date()): string {
  const w = weekStart(d);
  const thisWeek = weekStart(now);
  const nextWeek = weekStart(new Date(now.getTime() + 7 * 86_400_000));
  if (w === thisWeek) return "Denne uken";
  if (w === nextWeek) return "Neste uke";
  const p = osloParts(d);
  return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}

/** Same as `weekSection`, for past events: «Denne uken», «Forrige uke», months. */
export function pastSection(d: Date | string, now: Date = new Date()): string {
  const w = weekStart(d);
  if (w === weekStart(now)) return "Denne uken";
  if (w === weekStart(new Date(now.getTime() - 7 * 86_400_000))) return "Forrige uke";
  const p = osloParts(d);
  return `${MONTH_NAMES[p.month - 1]}${p.year !== osloParts(now).year ? ` ${p.year}` : ""}`;
}

/** Plural helper: plural(3, "spiller", "spillere") -> "3 spillere". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "1,25" with a decimal comma. */
export function decimal(x: number, digits = 2): string {
  return x.toFixed(digits).replace(".", ",");
}

/** Start of the month in Oslo, as a Date. */
export function osloMonthStart(now: Date = new Date(), monthsBack = 0): Date {
  const p = osloParts(now);
  const m = p.year * 12 + (p.month - 1) - monthsBack;
  return osloMidnight(Math.floor(m / 12), (m % 12) + 1, 1);
}

/** Minutes Oslo is ahead of UTC at the instant `d` (60 or 120). */
function osloOffsetMinutes(d: Date): number {
  const p = osloParts(d);
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((local - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
}

/** Midnight Oslo time on a date, as a Date. */
export function osloMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  let t = guess - osloOffsetMinutes(new Date(guess)) * 60_000;
  t = guess - osloOffsetMinutes(new Date(t)) * 60_000;
  return new Date(t);
}
