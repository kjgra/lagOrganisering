/** Only relative paths inside the app are used as «back» targets. */
export function safeBack(x: unknown): string {
  const s = typeof x === "string" ? x : Array.isArray(x) ? String(x[0] ?? "") : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : "/";
}
