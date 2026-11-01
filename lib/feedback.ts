import { isSensitive, namesFound } from "@/lib/sensitive";

/**
 * Feedback from the app's users («Tilbakemelding»): a problem or a
 * suggestion. It waits in the superadmin's inbox, and only what the
 * superadmin sends becomes a GitHub issue. The repository is public, so the
 * issue holds the text and a few technical facts, never who sent it.
 */

export const FEEDBACK_KINDS = [
  { key: "feil", label: "Noe virker ikke", issue: "Feil" },
  { key: "forslag", label: "Forslag", issue: "Forslag" },
] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["key"];

export const FEEDBACK_MAX = 2000;
/** Reports per person per 24 hours. */
export const FEEDBACK_DAILY_LIMIT = 5;
export const FEEDBACK_LABEL = "tilbakemelding";

export function feedbackProblem(text: string, names: string[]): string | null {
  const t = (text ?? "").trim();
  if (t.length < 5) return "Skriv litt mer, så vi forstår hva det gjelder.";
  if (t.length > FEEDBACK_MAX) return `Tilbakemeldingen kan ha maks ${FEEDBACK_MAX} tegn.`;
  if (isSensitive(t)) return "Ikke skriv helseopplysninger eller andre sensitive opplysninger. Teksten kan bli offentlig.";
  if (/\S+@\S+\.\S+/.test(t) || /\d[\d ]{6,}\d/.test(t)) return "Ikke skriv e-post eller telefonnummer. Teksten kan bli offentlig.";
  const found = namesFound(t, names);
  if (found.length) {
    return `Teksten nevner ${found
      .slice(0, 3)
      .map((n) => `«${n}»`)
      .join(", ")}. Skriv uten navn, teksten kan bli offentlig: f.eks. «en spiller» eller «en trener».`;
  }
  return null;
}

/**
 * The page the report was sent from, without ids: words in the path are
 * kept, everything else (group, event and plan ids) becomes «…».
 */
export function cleanPage(path: string): string {
  const p = (path ?? "").split(/[?#]/)[0];
  if (!p.startsWith("/") || p.startsWith("//")) return "";
  const parts = p
    .split("/")
    .filter(Boolean)
    .map((s) => (/^[a-zæøå]+(-[a-zæøå]+)*$/.test(s) ? s : "…"));
  return ("/" + parts.join("/")).slice(0, 200);
}

/** Device, system and browser in a few words, from the User-Agent and the screen width. Never the full string. */
export function clientSummary(userAgent: string, width: number | null): string {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Edg\//.test(ua)
      ? "Edge"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome|CriOS/.test(ua)
          ? "Chrome"
          : /Safari/.test(ua)
            ? "Safari"
            : "";
  const w = width && Number.isFinite(width) && width > 0 ? Math.round(width) : null;
  const device = w === null ? "" : w < 768 ? "mobil" : w < 1024 ? "nettbrett" : "PC";
  return [device && `${device} (${w} px)`, os, browser].filter(Boolean).join(", ");
}

export interface IssueInput {
  kind: FeedbackKind;
  body: string;
  page: string;
  appVersion: string;
  client: string;
  role: "trener" | "admin";
  createdAt: Date;
}

/** Stops @mentions in the public issue from notifying anyone on GitHub. */
const noMentions = (s: string) => s.replace(/@(?=[\w-])/g, "@\u200b");

export function issueTitle(r: Pick<IssueInput, "kind" | "body">): string {
  const label = FEEDBACK_KINDS.find((k) => k.key === r.kind)?.issue ?? "Tilbakemelding";
  const first = noMentions(r.body.trim().replace(/\s+/g, " "));
  return `${label}: ${first.length > 70 ? first.slice(0, 69).trimEnd() + "…" : first}`;
}

/** Markdown for the issue. Who sent it is not included. */
export function issueBody(r: IssueInput): string {
  const quoted = noMentions(r.body.trim())
    .split(/\r?\n/)
    .map((l) => `> ${l}`)
    .join("\n");
  const date = r.createdAt.toISOString().slice(0, 10);
  return [
    quoted,
    "",
    "| | |",
    "|---|---|",
    `| Type | ${FEEDBACK_KINDS.find((k) => k.key === r.kind)?.issue ?? r.kind} |`,
    `| Side | \`${r.page || "/"}\` |`,
    `| Versjon | ${r.appVersion} |`,
    `| Enhet | ${r.client || "ukjent"} |`,
    `| Rolle | ${r.role} |`,
    `| Sendt | ${date} |`,
    "",
    "_Sendt fra tilbakemeldingsknappen i appen og godkjent av admin før publisering._",
  ].join("\n");
}

export function issueLabels(kind: FeedbackKind): string[] {
  return [FEEDBACK_LABEL, kind];
}
