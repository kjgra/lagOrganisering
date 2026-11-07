/**
 * Animation of a sketch, step by step, from its arrows.
 *
 * Each arrow moves something: a run (`lop`) the nearest person, a pass
 * (`pasning`) the nearest ball, and a dribble (`foring`) the ball and the
 * person with it. Arrows with the same `trinn` move at the same time. A pass
 * is timed to arrive when the run it is played into ends. Without any `trinn`,
 * the order is guessed from how the arrows connect (`inferSteps`).
 *
 * One step may hold a choice (`valg`). Arrows with `alternativ` belong to one
 * of its alternatives; the others belong to all.
 */
import { arrowPath, type Arrow, type Choice, type Point, type Sketch } from "./drawing";

/** Playback speed in metres per second. */
export const SPEED = { lop: 4.2, foring: 3.2, pasning: 11 } as const;
/** Pause before each step when playing, in seconds. */
export const HOLD = 0.6;
const MIN_STEP = 0.9;

export interface Move {
  obj: number;
  path: Point[];
  /** Where the object is when the step starts; it glides onto the path. */
  from: Point;
  t0: number;
  t1: number;
  arrow?: number;
  linear?: boolean;
}

export interface Step {
  start: Point[];
  moves: Move[];
  dur: number;
  /** Arrows (indices into `piler`) in this step. */
  arrows: number[];
  text: string;
}

export interface Timeline {
  steps: Step[];
  end: Point[];
  /** The step (from 0) arrows belong to, by arrow index; -1 if not in this alternative. */
  stepOf: number[];
}

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const isPerson = (t: string) => t === "spiller" || t === "trener";

/** The sketch's choice and the step (from 0) it is in, or null. */
export function choiceOf(s: Sketch): (Choice & { step: number }) | null {
  const k = s.trinnliste.findIndex((t) => t.valg);
  return k < 0 ? null : { step: k, ...s.trinnliste[k].valg! };
}

/** Whether an arrow is part of alternative `alt` (1–3). */
export const inAlternative = (a: Arrow, alt: number) => !a.alternativ || a.alternativ === alt;

/** Whether the sketch has anything to animate. */
export const canAnimate = (s: Sketch) => s.piler.length > 0;

/**
 * A step for each arrow when none is given: an arrow starting where another
 * ends comes after it, and a run starting at a pass's start (pass and go)
 * comes after the pass.
 */
export function inferSteps(s: Sketch): number[] {
  const a = s.piler;
  const follows = (i: number, j: number) => {
    const [x, y] = [a[i], a[j]];
    if (i === j || (x.alternativ && y.alternativ && x.alternativ !== y.alternativ)) return false;
    return dist(x.fra, y.til) < 2.5 || (x.type === "lop" && y.type === "pasning" && dist(x.fra, y.fra) < 1.5);
  };
  // When two arrows follow each other (a pass back and forth), list order decides.
  const after = (i: number, j: number) => follows(i, j) && !(follows(j, i) && j > i);
  const step = a.map(() => 1);
  for (let round = 0; round < a.length; round++) {
    let changed = false;
    a.forEach((_, i) => {
      const need = Math.min(8, Math.max(1, ...a.map((_, j) => (after(i, j) ? step[j] + 1 : 1))));
      if (need !== step[i]) {
        step[i] = need;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return step;
}

/** The step of each arrow (from 1), given or inferred. */
export function arrowSteps(s: Sketch): number[] {
  if (s.piler.some((a) => a.trinn)) return s.piler.map((a) => a.trinn ?? 1);
  return inferSteps(s);
}

function pathLength(p: Point[]): number {
  let l = 0;
  for (let k = 1; k < p.length; k++) l += dist(p[k], p[k - 1]);
  return l;
}

/** The point at fraction t of the way along a path. */
export function pathAt(path: Point[], t: number): Point {
  const cum = [0];
  for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + dist(path[k], path[k - 1]));
  const s = Math.min(1, Math.max(0, t)) * cum[cum.length - 1];
  let k = 1;
  while (k < cum.length - 1 && cum[k] < s) k++;
  const u = cum[k] === cum[k - 1] ? 0 : (s - cum[k - 1]) / (cum[k] - cum[k - 1]);
  return [path[k - 1][0] + (path[k][0] - path[k - 1][0]) * u, path[k - 1][1] + (path[k][1] - path[k - 1][1]) * u];
}

/** The caption for step k (from 0) in alternative alt. */
export function stepText(s: Sketch, k: number, alt: number): string {
  const t = s.trinnliste[k];
  if (!t) return "";
  return t.tekster?.[alt - 1] || t.tekst;
}

/** The animation of a sketch for one alternative (1–3; 1 when there is no choice). */
export function buildTimeline(s: Sketch, alt = 1): Timeline {
  const objs = s.objekter;
  const steps = arrowSteps(s);
  const mine = s.piler.map((a) => inAlternative(a, alt));
  const n = Math.max(1, ...steps.filter((_, i) => mine[i]), s.trinnliste.length);
  const pos: Point[] = objs.map((o) => [o.x, o.y]);
  const out: Step[] = [];
  const stepOf = s.piler.map((_, i) => (mine[i] ? steps[i] - 1 : -1));
  for (let k = 1; k <= n; k++) {
    const start = pos.map((p) => [...p] as Point);
    const moves: Move[] = [];
    const used = new Set<number>();
    const nearest = (pt: Point, ok: (t: string) => boolean, max: number) => {
      let best = -1;
      let bd = max;
      start.forEach((p, i) => {
        if (!used.has(i) && ok(objs[i].type) && dist(p, pt) < bd) {
          bd = dist(p, pt);
          best = i;
        }
      });
      return best;
    };
    const arrows = s.piler.map((a, i) => ({ a, i })).filter((x) => mine[x.i] && steps[x.i] === k);
    // Runs and dribbles first, then passes, which are timed against the runs.
    const order = [...arrows].sort((x, y) => Number(x.a.type === "pasning") - Number(y.a.type === "pasning"));
    for (const { a, i } of order) {
      const path = arrowPath(a);
      const len = pathLength(path);
      if (a.type === "lop") {
        const o = nearest(a.fra, isPerson, 2.5);
        if (o >= 0) {
          used.add(o);
          moves.push({ obj: o, path, from: start[o], t0: 0, t1: len / SPEED.lop, arrow: i });
        }
      } else if (a.type === "foring") {
        const b = nearest(a.fra, (t) => t === "ball", 3);
        if (b < 0) continue;
        used.add(b);
        const t1 = len / SPEED.foring;
        moves.push({ obj: b, path, from: start[b], t0: 0, t1, arrow: i });
        const p = nearest(start[b], isPerson, 2);
        if (p >= 0) {
          used.add(p);
          const off: Point = [start[p][0] - start[b][0], start[p][1] - start[b][1]];
          moves.push({ obj: p, path: path.map((q) => [q[0] + off[0], q[1] + off[1]] as Point), from: start[p], t0: 0, t1 });
        }
      } else {
        const b = nearest(a.fra, (t) => t === "ball", 3);
        if (b < 0) continue;
        used.add(b);
        const d = len / SPEED.pasning;
        const run = moves.find((m) => m.arrow !== undefined && s.piler[m.arrow].type !== "pasning" && isPerson(objs[m.obj].type) && dist(m.path[m.path.length - 1], a.til) < 2.5);
        const t1 = run ? Math.max(d, run.t1) : d;
        moves.push({ obj: b, path, from: start[b], t0: t1 - d, t1, arrow: i, linear: true });
      }
    }
    const dur = Math.max(MIN_STEP, ...moves.map((m) => m.t1));
    for (const m of moves) pos[m.obj] = [...m.path[m.path.length - 1]] as Point;
    out.push({ start, moves, dur, arrows: arrows.map((x) => x.i), text: stepText(s, k - 1, alt) });
  }
  return { steps: out, end: pos.map((p) => [...p] as Point), stepOf };
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Where every object is t seconds into step k (from 0). */
export function positionsAt(tl: Timeline, k: number, t: number): Point[] {
  const st = tl.steps[k];
  const p = st.start.map((q) => [...q] as Point);
  for (const m of st.moves) {
    if (t <= m.t0) continue;
    const u = Math.min(1, (t - m.t0) / Math.max(0.01, m.t1 - m.t0));
    const e = m.linear ? 1 - (1 - u) ** 2 : ease(u);
    const q = pathAt(m.path, e);
    const off: Point = [m.from[0] - m.path[0][0], m.from[1] - m.path[0][1]];
    p[m.obj] = [q[0] + off[0] * (1 - e), q[1] + off[1] * (1 - e)];
  }
  return p;
}

/** Every position a person takes in any alternative, for shortening arrows. */
export function allStands(s: Sketch): Point[] {
  const alts = choiceOf(s)?.alternativer.length ?? 1;
  const out: Point[] = [];
  for (let a = 1; a <= alts; a++) {
    const tl = buildTimeline(s, a);
    for (const ps of [...tl.steps.map((x) => x.start), tl.end]) {
      ps.forEach((p, i) => isPerson(s.objekter[i].type) && out.push(p));
    }
  }
  return out;
}
