/**
 * Tags, comments and free text must not hold health or other sensitive
 * information (GDPR art. 9), nor contact details. The app refuses obvious
 * words; the list is a help, not a guarantee. Matched at the start of a
 * word, case-insensitive: "skad" catches "skadet", "skade", "skadeavbrekk".
 */

const SENSITIVE = [
  /(?<![\p{L}\p{N}])skad/iu,
  /(?<![\p{L}\p{N}])syk(e|t|dom|dommen|meldt|emeldt)?(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])diagnos/iu,
  /(?<![\p{L}\p{N}])allergi/iu,
  /(?<![\p{L}\p{N}])astma/iu,
  /(?<![\p{L}\p{N}])adhd(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])autis/iu,
  /(?<![\p{L}\p{N}])epilep/iu,
  /(?<![\p{L}\p{N}])diabet/iu,
  /(?<![\p{L}\p{N}])medisin/iu,
  /(?<![\p{L}\p{N}])hjernerystelse/iu,
  /(?<![\p{L}\p{N}])brudd(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])brukket/iu,
  /(?<![\p{L}\p{N}])operer/iu,
  /(?<![\p{L}\p{N}])smert/iu,
  /(?<![\p{L}\p{N}])dysleksi/iu,
  /(?<![\p{L}\p{N}])spiseforstyrr/iu,
  /(?<![\p{L}\p{N}])angst/iu,
  /(?<![\p{L}\p{N}])depre/iu,
  /(?<![\p{L}\p{N}])psyk/iu,
  /(?<![\p{L}\p{N}])gravid/iu,
  /(?<![\p{L}\p{N}])fysioterap/iu,
  /(?<![\p{L}\p{N}])rehab/iu,
  /(?<![\p{L}\p{N}])sykehus/iu,
  /(?<![\p{L}\p{N}])barnevern/iu,
  /(?<![\p{L}\p{N}])relig/iu,
  /(?<![\p{L}\p{N}])etnisk/iu,
  /(?<![\p{L}\p{N}])funksjonshem/iu,
];

export function isSensitive(...texts: (string | null | undefined)[]): boolean {
  const t = texts.filter(Boolean).join(" ");
  return !!t && SENSITIVE.some((re) => re.test(t));
}

/** Trim and collapse inner whitespace. */
export const clean = (x: unknown) => (typeof x === "string" ? x.trim().replace(/\s+/g, " ") : "");

export function tagProblem(tag: string): string | null {
  const t = clean(tag);
  if (!t) return "Skriv inn en tag.";
  if (t.length > 40) return "En tag kan ha maks 40 tegn.";
  if (isSensitive(t)) return "Tagger skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
  if (t.includes("@") || /\d[\d ]{6,}\d/.test(t)) return "Tagger skal ikke inneholde kontaktinformasjon.";
  return null;
}

export function commentProblem(text: string, max = 2000): string | null {
  const t = (text ?? "").trim();
  if (!t) return "Skriv en kommentar først.";
  if (t.length > max) return `En kommentar kan ha maks ${max} tegn.`;
  if (isSensitive(t)) return "Kommentarer skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.";
  return null;
}

// Names in free text. Names are never sent to KI, so text that goes there is
// checked against the team's member names. Full names are always caught; a
// first name alone only with at least 3 letters and when it is not a common word.
const COMMON = new Set(["per", "dag", "liv", "sol", "ask", "stein", "kai", "mai", "vår", "var", "tor", "rom", "lin", "even", "hans", "frank", "storm", "fred", "rune", "ulv", "ørn", "vill", "siv"]);

export function memberNames(members: { firstName: string; lastName: string }[]): string[] {
  const out = new Set<string>();
  for (const m of members) {
    const full = `${m.firstName} ${m.lastName}`.trim();
    if (full.includes(" ")) out.add(full);
    for (const f of [m.firstName.trim(), ...m.firstName.split(/[\s-]+/)]) {
      if (f.length >= 3 && !COMMON.has(f.toLowerCase())) out.add(f);
    }
  }
  return [...out].filter(Boolean);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function namesFound(text: string, names: string[]): string[] {
  if (!text.trim() || !names.length) return [];
  return names.filter((n) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "iu").test(text));
}

export function namesProblem(text: string, names: string[], reason = "Navn sendes ikke til KI"): string | null {
  const found = namesFound(text, names);
  if (!found.length) return null;
  return `Teksten nevner ${found.slice(0, 3).map((n) => `«${n}»`).join(", ")}. ${reason}: skriv f.eks. «en av keeperne» i stedet.`;
}

/** Member names replaced by «en spiller», for spoken text that goes to KI. Longest names first, so a full name goes as one. */
export function redactNames(text: string, names: string[]): string {
  return [...names]
    .sort((a, b) => b.length - a.length)
    .reduce((t, n) => t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, "giu"), "en spiller"), text);
}
