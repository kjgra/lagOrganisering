import { createHash } from "node:crypto";
import { cleanPage } from "@/lib/feedback";

/**
 * The error log («Feillogg»): what is kept of an error, how it is grouped
 * (fingerprint) and the text of the GitHub issue a new kind of error becomes.
 * The repository is public, so the issue text is washed: no e-mail, numbers,
 * ids, quoted values or @mentions. Pure functions, tested in
 * tests/unit/errors.test.ts.
 */

export const ERROR_LABEL = "auto-feil";
/** New issues per 24 hours, at most. */
export const ERROR_ISSUES_PER_DAY = 5;
/** Rows not seen for this many days are deleted by the maintenance. */
export const ERROR_KEEP_DAYS = 90;

export type ErrorSource = "server" | "klient";

export interface ErrorInfo {
  area: string;
  source: ErrorSource;
  message: string;
  stack: string;
  route: string;
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** The message, stack (frames only) and route of an error, shortened to fit the table. */
export function errorInfo(area: string, err: unknown, opts: { route?: string; source?: ErrorSource } = {}): ErrorInfo {
  const e = err instanceof Error ? err : null;
  const name = e && e.name && e.name !== "Error" ? `${e.name}: ` : "";
  const message = e ? `${name}${e.message}` : typeof err === "string" ? err : (() => {
    try {
      return JSON.stringify(err) ?? String(err);
    } catch {
      return String(err);
    }
  })();
  const stack = (e?.stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at "))
    .slice(0, 12)
    .join("\n");
  const route = opts.route ? (opts.route.includes("[") ? opts.route : cleanPage(opts.route)) : "";
  return {
    area: cut(area.trim() || "Ukjent", 100),
    source: opts.source ?? "server",
    message: cut(message.trim() || "(uten melding)", 1000),
    stack: cut(stack, 4000),
    route: cut(route, 200),
  };
}

/** Removes what could identify someone or leak a secret, for the public issue. */
export function scrub(s: string): string {
  return (s ?? "")
    .replace(/=\([^)]*\)/g, "=(…)")
    .replace(/\b(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/g, "$1?<…>")
    .replace(/\b(Bearer|Basic)\s+\S+/g, "$1 <skjult>")
    .replace(/\b(token|api[_-]?key|key|secret|password|passord)(\s*[:=]\s*)\S+/gi, "$1$2<skjult>")
    .replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, "<e-post>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\b(?=[0-9A-F]*\d)(?=[0-9A-F]*[A-F])[0-9A-F]{16,}\b/gi, "<id>")
    .replace(/\+?\d[\d -]{5,}\d/g, "<tall>")
    .replace(/"[^"\n]{0,200}"/g, '"…"')
    .replace(/'[^'\n]{0,200}'/g, "'…'")
    .replace(/«[^»\n]{0,200}»/g, "«…»")
    .replace(/@(?=[\w-])/g, "@​");
}

/** Same kind of error, whatever the numbers and values in the message. The stack is left out: chunk names change with every build. */
export function fingerprint(i: Pick<ErrorInfo, "area" | "source" | "message">): string {
  const normal = scrub(i.message).replace(/\d+/g, "N").toLowerCase();
  return createHash("sha256").update(`${i.source}\n${i.area}\n${normal}`).digest("hex").slice(0, 16);
}

export interface IssueErrorInput extends ErrorInfo {
  fingerprint: string;
  appVersion: string;
  firstSeen: Date;
  count: number;
  /** The closed issue this error came back after. */
  previous?: number;
}

export function errorIssueTitle(i: Pick<ErrorInfo, "area" | "message">): string {
  const first = scrub(i.message).split("\n")[0].replace(/\s+/g, " ");
  return cut(`Feil i ${scrub(i.area)}: ${first}`, 120);
}

const fence = (s: string) => ["~~~", s.replace(/~~~/g, "~ ~ ~"), "~~~"].join("\n");

export function errorIssueBody(i: IssueErrorInput): string {
  const stack = scrub(i.stack);
  return [
    i.previous ? `Feilen kom tilbake etter at #${i.previous} ble lukket.\n` : "",
    fence(scrub(i.message)),
    "",
    "| | |",
    "|---|---|",
    `| Område | ${scrub(i.area)} |`,
    `| Kilde | ${i.source} |`,
    `| Side | \`${i.route || "ukjent"}\` |`,
    `| Versjon | ${i.appVersion} |`,
    `| Først sett | ${i.firstSeen.toISOString().slice(0, 16).replace("T", " ")} UTC |`,
    `| Antall | ${i.count} |`,
    "",
    stack ? `<details><summary>Stack</summary>\n\n${fence(stack)}\n\n</details>\n` : "",
    `_Opprettet automatisk av feilvakten i appen. Fingeravtrykk \`${i.fingerprint}\`. Detaljer i Admin → Feillogg._`,
  ]
    .filter((l, n) => l !== "" || n > 0)
    .join("\n");
}
