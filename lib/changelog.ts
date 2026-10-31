// The version log (CHANGELOG.md, Keep a Changelog format) parsed for «Hva er nytt».
// Only the subset we write is understood: «## [versjon] – dato», a short summary,
// «### Type» and «- punkt». PR numbers and Markdown markup are removed for the trainers.

import { MONTH_NAMES } from "@/lib/format";

export const UNRELEASED = "Ikke utgitt";

export type ChangeGroup = { kind: string; items: string[] };
export type Release = { version: string; date: string | null; summary: string; groups: ChangeGroup[] };

/** Plain text for the app: no links, code marks, emphasis or «(#12)». */
export function plainText(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s*\((?:#\d+(?:[–-]#\d+)?(?:,\s*)?)+\)/g, "")
    .trim();
}

export function parseChangelog(md: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let group: ChangeGroup | null = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    const head = /^##\s+\[([^\]]+)\](?:\s*[–—-]\s*(\d{4}-\d{2}-\d{2}))?/.exec(line);
    if (head) {
      release = { version: head[1], date: head[2] ?? null, summary: "", groups: [] };
      releases.push(release);
      group = null;
      continue;
    }
    if (!release) continue;
    const kind = /^###\s+(.+)$/.exec(line);
    if (kind) {
      group = { kind: kind[1], items: [] };
      release.groups.push(group);
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item && group) {
      group.items.push(plainText(item[1]));
      continue;
    }
    if (line && !group) release.summary = [release.summary, plainText(line)].filter(Boolean).join(" ");
  }
  return releases.map((r) => ({ ...r, groups: r.groups.filter((g) => g.items.length) })).filter((r) => r.groups.length);
}

/** The newest released version (not «Ikke utgitt»). */
export function latestVersion(releases: Release[]): string | null {
  return releases.find((r) => r.version !== UNRELEASED)?.version ?? null;
}

/** «31. oktober 2026» from «2026-10-31». */
export function releaseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTH_NAMES[m - 1].toLowerCase()} ${y}`;
}
