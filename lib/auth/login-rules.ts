/**
 * What the user typed as an e-mail address or a mobile number, and limits on
 * failed logins. Every attempt is passed on to Spond: without limits the app
 * could be used to guess passwords, and Spond could block the server. The
 * counts live in memory (per server instance), keyed by a hash, never stored.
 */

export interface LoginIdentifier {
  kind: "email" | "phone";
  value: string;
}

/**
 * E-mail is lower-cased. Mobile numbers get the form +4799999999: spaces,
 * dashes, dots and brackets are removed, 00 becomes +, and 8 digits are
 * taken as Norwegian.
 */
export function loginIdentifier(input: string): LoginIdentifier | null {
  const x = input.trim();
  if (!x) return null;
  if (x.includes("@")) {
    const e = x.toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) ? { kind: "email", value: e } : null;
  }
  let d = x.replace(/[\s.()-]/g, "").replace(/^00/, "+");
  if (/^\d{8}$/.test(d)) d = `+47${d}`;
  return /^\+\d{8,15}$/.test(d) ? { kind: "phone", value: d } : null;
}

export const LOGIN_LIMITS = {
  client: { max: 5, window: 60 }, // 5 failures a minute from one address
  ident: { max: 10, window: 15 * 60 }, // 10 per account per 15 minutes
  all: { max: 60, window: 15 * 60 }, // 60 in all per 15 minutes
} as const;

export type LimitKind = keyof typeof LOGIN_LIMITS;

export class Throttle {
  private failures = new Map<string, number[]>();

  private recent(key: string, window: number, now: number): number[] {
    return (this.failures.get(key) ?? []).filter((t) => t > now - window);
  }

  /** Seconds to wait before the next attempt (0 = go ahead). */
  wait(keys: Partial<Record<LimitKind, string>>, now = Date.now() / 1000): number {
    let wait = 0;
    for (const [kind, key] of Object.entries(keys) as [LimitKind, string][]) {
      const lim = LOGIN_LIMITS[kind];
      const t = this.recent(`${kind}:${key}`, lim.window, now).sort((a, b) => b - a);
      if (t.length >= lim.max) wait = Math.max(wait, t[lim.max - 1] + lim.window - now);
    }
    return Math.ceil(wait);
  }

  failed(keys: Partial<Record<LimitKind, string>>, now = Date.now() / 1000): void {
    for (const [kind, key] of Object.entries(keys) as [LimitKind, string][]) {
      const k = `${kind}:${key}`;
      this.failures.set(k, [...this.recent(k, LOGIN_LIMITS[kind].window, now), now]);
    }
    // Forget keys without recent failures, so the map does not grow.
    for (const [k, t] of this.failures) {
      const kind = k.split(":")[0] as LimitKind;
      if (!t.some((x) => x > now - LOGIN_LIMITS[kind].window)) this.failures.delete(k);
    }
  }

  succeeded(keys: Partial<Record<LimitKind, string>>): void {
    for (const kind of ["client", "ident"] as const) if (keys[kind]) this.failures.delete(`${kind}:${keys[kind]}`);
  }
}

/** "40 sekunder", "1 minutt", "3 minutter" */
export function waitText(sec: number): string {
  if (sec < 60) return `${sec} sekunder`;
  const m = Math.ceil(sec / 60);
  return `${m} ${m === 1 ? "minutt" : "minutter"}`;
}
