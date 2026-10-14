/**
 * Pure logic for the team board, shared by the browser and tests.
 */

export type Assignments = Record<string, string>;

export interface BoardMember {
  id: string;
  name: string;
  keeper: boolean;
  coach: boolean;
}

/** Small deterministic random generator, so «Fordel på nytt» can be tested. */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Keepers are spread first (one per team), the rest are shuffled and
 * snake-distributed, so the teams differ by at most one. Trainers are not
 * distributed automatically.
 */
export function distribute(players: BoardMember[], labels: string[], seed: number): Assignments {
  if (!labels.length) return {};
  const r = rng(seed);
  const list = players.filter((p) => !p.coach);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  list.sort((a, b) => Number(b.keeper) - Number(a.keeper));
  const n = labels.length;
  const out: Assignments = {};
  list.forEach((p, idx) => {
    const round = Math.floor(idx / n);
    const pos = idx % n;
    out[p.id] = labels[round % 2 ? n - 1 - pos : pos];
  });
  return out;
}

/** Move a member to a team ("" = back to the pool). Unknown members or teams change nothing. */
export function move(a: Assignments, memberId: string, label: string, allowed: Set<string>, labels: string[]): Assignments {
  if (!allowed.has(memberId)) return a;
  const next = { ...a };
  if (!label) delete next[memberId];
  else if (labels.includes(label)) next[memberId] = label;
  else return a;
  return next;
}

export interface ParentLink {
  parentId: string;
  childId: string;
}

/**
 * In a gruppeutkast a trainer follows their child: moving a child moves
 * every trainer who is its parent (and may be placed) to the same team.
 * @returns the new assignments and the ids of the trainers who followed.
 */
export function moveFollow(
  a: Assignments,
  memberId: string,
  label: string,
  allowed: Set<string>,
  labels: string[],
  links: ParentLink[],
): { assignments: Assignments; followed: string[] } {
  let next = move(a, memberId, label, allowed, labels);
  if (next === a) return { assignments: a, followed: [] };
  const followed: string[] = [];
  for (const p of new Set(links.filter((l) => l.childId === memberId).map((l) => l.parentId))) {
    if (p === memberId) continue;
    const before = next;
    next = move(next, p, label, allowed, labels);
    if (next !== before && before[p] !== next[p]) followed.push(p);
  }
  return { assignments: next, followed };
}

/** Warnings for trainers placed away from all their placed children. */
export function parentNotes(a: Assignments, links: ParentLink[], nameOf: (id: string) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Set(links.map((l) => l.parentId))) {
    if (!a[p]) continue;
    const kids = links.filter((l) => l.parentId === p && a[l.childId]).map((l) => l.childId);
    if (!kids.length || kids.some((k) => a[k] === a[p])) continue;
    out[p] = `Forelder til ${kids.map((k) => `${nameOf(k)} (${a[k]})`).join(", ")}`;
  }
  return out;
}

/** «Lag 3»: the first «Lag n» not in use. */
export function nextLabel(labels: string[]): string {
  const used = new Set(labels.map((l) => l.toLowerCase()));
  for (let i = 1; i < 500; i++) if (!used.has(`lag ${i}`)) return `Lag ${i}`;
  return `Lag ${labels.length + 1}`;
}

/** «Forslag 3»: the first free name. */
export function nextName(existing: string[], base = "Forslag"): string {
  let n = 1;
  while (existing.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function labelProblem(label: string, others: string[]): string | null {
  const l = label.trim();
  if (!l) return "Skriv inn et navn på laget.";
  if (l.length > 60) return "Et lagnavn kan ha maks 60 tegn.";
  if (others.some((o) => o.toLowerCase() === l.toLowerCase())) return "Det finnes allerede et lag med det navnet.";
  return null;
}
