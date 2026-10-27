/**
 * Pure logic for the team board, shared by the browser and tests.
 */

export type Assignments = Record<string, string>;

export interface BoardMember {
  id: string;
  name: string;
  coach: boolean;
  /** Free tags such as «Keeper»; those chosen as roles are spread over the teams. */
  tags?: string[];
  /** 1–5, or null when not set. */
  level?: number | null;
  /** No longer coming (or no longer a member): shown, but never placed automatically. */
  out?: boolean;
  /** Has not answered yet: can be placed by hand, but never automatically. */
  maybe?: boolean;
}

/** «Jevne lag»: about equally strong teams. «Nivådelt»: players on the same level together. */
export type Mode = "even" | "levels";
export type HistoryMode = "off" | "same" | "rotate";

/** How the automatic distribution works, chosen per subgroup in «Fordeling». */
export interface BoardSettings {
  mode: Mode;
  /** Tags spread over the teams, one per team as far as it goes. */
  roles: string[];
  /** Keep players who play well together on one team. */
  pairs: boolean;
  history: HistoryMode;
}

export const DEFAULT_SETTINGS: BoardSettings = { mode: "even", roles: ["Keeper"], pairs: true, history: "rotate" };

export interface DistributeOptions {
  mode?: Mode;
  /** Tags to spread (any case). Default «Keeper». */
  roles?: string[];
  /** Pairs to keep together; leave out to ignore them. */
  pairs?: [string, string][];
  /** «Som sist» or «Rullér», with the teams of the last trainings (newest first, member ids). */
  history?: HistoryMode;
  previous?: string[][][];
}

/** How many earlier trainings «Rullér» looks at, and how much each counts (newest first). */
export const HISTORY_TRAININGS = 3;
const RECENCY = [1, 0.6, 0.3];

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

function shuffle<T>(list: T[], r: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Weights, in the order of what matters most: roles spread, then the level
 * (sum or bands), then pairs. A pair is split when keeping it would make the
 * teams clearly uneven, or (nivådelt) put a player more than a level off.
 */
const WEIGHT = { role: 1000, level: 10, pair: { even: 50, levels: 20 }, history: 4 };
const STARTS = 4;
const MAX_PASSES = 60;

/**
 * Spread the players (not trainers) on the teams. The teams are always the
 * same size (at most one apart). Within that, the chosen roles are spread,
 * then «Jevne lag» evens out the level sum (a player without a level counts
 * as the average) or «Nivådelt» puts players of the same level together,
 * then pairs are kept together, then «Som sist» keeps last training's
 * teammates together or «Rullér» gives everyone new teammates. Without any of
 * this it is random.
 * Which team gets which players is random, so a team number never tells the level.
 */
export function distribute(players: BoardMember[], labels: string[], seed: number, opts: DistributeOptions = {}): Assignments {
  const n = labels.length;
  if (!n) return {};
  const r = rng(seed);
  const list = players.filter((p) => !p.coach && !p.out && !p.maybe);
  const m = list.length;
  if (!m) return {};
  const mode = opts.mode ?? "even";
  const roles = (opts.roles ?? DEFAULT_SETTINGS.roles).map((t) => t.toLowerCase());
  const roleOf = list.map((p) => roles.map((role) => (p.tags ?? []).some((t) => t.toLowerCase() === role)));
  const usedRoles = roles.map((_, k) => roleOf.some((x) => x[k])).flatMap((on, k) => (on ? [k] : []));
  const level = list.map((p) => p.level || 0);
  const known = level.filter(Boolean);
  const avg = known.length ? known.reduce((s, x) => s + x, 0) / known.length : 0;
  const index = new Map(list.map((p, i) => [p.id, i]));
  const pairs = (opts.pairs ?? []).flatMap(([a, b]) => (index.has(a) && index.has(b) && a !== b ? [[index.get(a)!, index.get(b)!]] : []));
  // Teammates before, as [i, j, weight]: kept together for «Som sist», kept apart for «Rullér».
  const history = opts.history ?? "off";
  const before = new Map<string, [number, number, number]>();
  const trainings = history === "same" ? (opts.previous ?? []).slice(0, 1) : history === "rotate" ? (opts.previous ?? []).slice(0, HISTORY_TRAININGS) : [];
  trainings.forEach((teams, age) => {
    for (const ids of teams) {
      const here = ids.filter((id) => index.has(id)).map((id) => index.get(id)!);
      for (let x = 0; x < here.length; x++)
        for (let y = x + 1; y < here.length; y++) {
          const [i, j] = here[x] < here[y] ? [here[x], here[y]] : [here[y], here[x]];
          const k = `${i}:${j}`;
          before.set(k, [i, j, (before.get(k)?.[2] ?? 0) + WEIGHT.history * RECENCY[age]]);
        }
    }
  });
  const teammates = [...before.values()];

  const cost = (team: number[]): number => {
    let c = 0;
    for (const k of usedRoles) {
      const count = new Array<number>(n).fill(0);
      for (let i = 0; i < m; i++) if (roleOf[i][k]) count[team[i]]++;
      const mean = count.reduce((s, x) => s + x, 0) / n;
      for (const x of count) c += WEIGHT.role * (x - mean) ** 2;
    }
    if (known.length) {
      const sum = new Array<number>(n).fill(0);
      const size = new Array<number>(n).fill(0);
      for (let i = 0; i < m; i++) {
        if (mode === "even") {
          sum[team[i]] += level[i] || avg;
          size[team[i]]++;
        } else if (level[i]) {
          sum[team[i]] += level[i];
          size[team[i]]++;
        }
      }
      if (mode === "even") for (let t = 0; t < n; t++) c += WEIGHT.level * (sum[t] - size[t] * avg) ** 2;
      else for (let i = 0; i < m; i++) if (level[i]) c += WEIGHT.level * (level[i] - sum[team[i]] / size[team[i]]) ** 2;
    }
    for (const [a, b] of pairs) if (team[a] !== team[b]) c += WEIGHT.pair[mode];
    if (history === "same") for (const [a, b, w] of teammates) c += team[a] !== team[b] ? w : 0;
    else for (const [a, b, w] of teammates) c += team[a] === team[b] ? w : 0;
    return c;
  };

  let best: number[] = [];
  let bestCost = Infinity;
  for (let s = 0; s < STARTS; s++) {
    // Equal sizes from the start; swapping two players keeps them.
    const order = shuffle(
      list.map((_, i) => i),
      r,
    );
    const team = new Array<number>(m);
    order.forEach((i, pos) => (team[i] = pos % n));
    let cur = cost(team);
    for (let pass = 0; pass < MAX_PASSES && cur > 0; pass++) {
      let improved = false;
      for (let a = 0; a < m; a++)
        for (let b = a + 1; b < m; b++) {
          const i = order[a];
          const j = order[b];
          if (team[i] === team[j]) continue;
          [team[i], team[j]] = [team[j], team[i]];
          const c = cost(team);
          if (c < cur - 1e-9) {
            cur = c;
            improved = true;
          } else [team[i], team[j]] = [team[j], team[i]];
        }
      if (!improved) break;
    }
    if (cur < bestCost - 1e-9) {
      best = [...team];
      bestCost = cur;
    }
    // Nothing to weigh: the first random start is as good as any.
    if (bestCost === 0) break;
  }
  return Object.fromEntries(list.map((p, i) => [p.id, labels[best[i]]]));
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
