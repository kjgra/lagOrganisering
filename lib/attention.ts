import type { Db } from "@/lib/db";
import type { Rights } from "@/lib/store/access";
import { waitingFeedbackCount } from "@/lib/store/feedback";

/**
 * «Venter på deg»: things in a settings/admin tab that someone has to look at
 * or decide on. Each tab with such things has a source here; the count shows
 * as a number badge on the tab and, added up, on the gear in the app bar.
 *
 * The badge counts things that still need a decision, and goes away when they
 * are handled, not when the tab is opened. Then nothing is forgotten because
 * it was only glanced at. A future source that is only news (no decision)
 * should count what has come since the person last opened the tab instead.
 *
 * A source must check the rights itself and return 0 for those who cannot
 * open the tab, without asking the database.
 */
export interface AttentionSource {
  /** The tab key under /innstillinger/ (see ADMIN_TABS). */
  tab: string;
  /** For screen readers: «2 tilbakemeldinger venter». */
  describe: (n: number) => string;
  count: (d: Db, rights: Rights) => Promise<number>;
}

export const ATTENTION_SOURCES: readonly AttentionSource[] = [
  {
    tab: "tilbakemeldinger",
    describe: (n) => `${n} ${n === 1 ? "tilbakemelding venter" : "tilbakemeldinger venter"}`,
    count: waitingFeedbackCount,
  },
];

export type Attention = Record<string, number>;

/** Counts per tab (only tabs with something waiting). A source that fails counts as 0. */
export async function adminAttention(d: Db, rights: Rights, sources: readonly AttentionSource[] = ATTENTION_SOURCES): Promise<Attention> {
  if (!rights.admin) return {};
  const counts = await Promise.all(sources.map((s) => s.count(d, rights).catch(() => 0)));
  const out: Attention = {};
  sources.forEach((s, i) => {
    if (counts[i] > 0) out[s.tab] = counts[i];
  });
  return out;
}

export function attentionTotal(a: Attention): number {
  return Object.values(a).reduce((s, n) => s + n, 0);
}

/** The text in a badge: up to 9, then «9+» so the badge stays small. */
export function badgeText(n: number): string {
  return n > 9 ? "9+" : String(n);
}

/** The gear's accessible name, with what waits. */
export function settingsLabel(a: Attention, sources: readonly AttentionSource[] = ATTENTION_SOURCES): string {
  const parts = sources.filter((s) => a[s.tab]).map((s) => s.describe(a[s.tab]));
  return parts.length ? `Innstillinger: ${parts.join(", ")}` : "Innstillinger";
}

/** A tab's accessible extra text, e.g. « (2 tilbakemeldinger venter)». */
export function tabAttention(a: Attention, tab: string, sources: readonly AttentionSource[] = ATTENTION_SOURCES): string {
  const s = sources.find((x) => x.tab === tab);
  return s && a[tab] ? s.describe(a[tab]) : "";
}
