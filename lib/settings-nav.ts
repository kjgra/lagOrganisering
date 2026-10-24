import { ctxPath } from "@/lib/routes";

/** Only relative paths inside the app are used as «back» targets. */
export function safeBack(x: unknown): string {
  const s = typeof x === "string" ? x : Array.isArray(x) ? String(x[0] ?? "") : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : "/";
}

/**
 * Old admin links to training content (now under «Trening»): the same page in
 * the main group from ?lag=, for the whole group. Without a group, the start page.
 */
export function movedPath(sp: Record<string, string | string[] | undefined>, rest: string): string {
  const lag = typeof sp.lag === "string" ? sp.lag : "";
  return lag ? ctxPath(lag, null, rest) : "/";
}
