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
import { arrowPath, MAX_STEPS, type Arrow, type Choice, type Point, type Sketch } from "./drawing";

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
  problems: AnimationProblem[];
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

/** How an arrow waits for another arrow in the same step. */
type Dep = { j: number; kind: "after" | "with" | "go" | "align" };

/** Delay from a pass to the passer's run (pass and go), in seconds. */
const GO_DELAY = 0.25;

/**
 * What each arrow in a step waits for. Given: `etter` (starts when that arrow
 * ends) and `samtidig` (starts with it). Otherwise guessed: an arrow starting
 * where another ends comes after it, a run from where a pass starts goes just
 * after the pass, and a pass into a run arrives when the run ends.
 */
function dependencies(s: Sketch, ids: number[]): Map<number, Dep[]> {
  const out = new Map<number, Dep[]>();
  const inStep = new Set(ids);
  for (const i of ids) {
    const a = s.piler[i];
    const deps: Dep[] = [];
    const given = (n: number | undefined) => (n && inStep.has(n - 1) && n - 1 !== i ? n - 1 : -1);
    if (given(a.etter) >= 0) deps.push({ j: given(a.etter), kind: "after" });
    else if (given(a.samtidig) >= 0) deps.push({ j: given(a.samtidig), kind: "with" });
    else {
      for (const j of ids) {
        if (j === i) continue;
        const b = s.piler[j];
        const ballArrow = (x: Arrow) => x.type !== "lop";
        if (dist(a.fra, b.til) < 2.5 && !(dist(b.fra, a.til) < 2.5 && j > i)) {
          // A pass played from where a run ends waits for both the run and the ball.
          if (ballArrow(a) || (a.type === "lop" && b.type === "lop")) deps.push({ j, kind: "after" });
        } else if (a.type === "lop" && b.type === "pasning" && dist(a.fra, b.fra) < 1.5) deps.push({ j, kind: "go" });
        else if (a.type === "pasning" && b.type !== "pasning" && dist(a.til, b.til) < 2.5) deps.push({ j, kind: "align" });
      }
    }
    out.set(i, deps);
  }
  return out;
}

/** The arrows in an order where each comes after what it waits for (list order breaks cycles). */
function scheduleOrder(ids: number[], deps: Map<number, Dep[]>): number[] {
  const done = new Set<number>();
  const busy = new Set<number>();
  const out: number[] = [];
  const visit = (i: number) => {
    if (done.has(i) || busy.has(i)) return;
    busy.add(i);
    for (const d of deps.get(i) ?? []) visit(d.j);
    busy.delete(i);
    done.add(i);
    out.push(i);
  };
  ids.forEach(visit);
  return out;
}

export interface AnimationProblem {
  /** Arrow index, from 0. */
  arrow: number;
  /** Alternative (1–3), or 0 when there is no choice. */
  alt: number;
  melding: string;
}

/** The animation of a sketch for one alternative (1–3; 1 when there is no choice). */
export function buildTimeline(s: Sketch, alt = 1): Timeline {
  const objs = s.objekter;
  const steps = arrowSteps(s);
  const mine = s.piler.map((a) => inAlternative(a, alt));
  const n = Math.max(1, ...steps.filter((_, i) => mine[i]), s.trinnliste.length);
  const pos: Point[] = objs.map((o) => [o.x, o.y]);
  const out: Step[] = [];
  const problems: AnimationProblem[] = [];
  const stepOf = s.piler.map((_, i) => (mine[i] ? steps[i] - 1 : -1));
  const altNo = choiceOf(s) ? alt : 0;
  for (let k = 1; k <= n; k++) {
    const start = pos.map((p) => [...p] as Point);
    const moves: Move[] = [];
    const ids = s.piler.map((_, i) => i).filter((i) => mine[i] && steps[i] === k);
    const deps = dependencies(s, ids);
    const times = new Map<number, { t0: number; t1: number }>();
    // Where things are at time t, and who is still moving then.
    const at = (t: number) => {
      const p = start.map((q) => [...q] as Point);
      const moving = new Set<number>();
      for (const m of moves) {
        if (m.t1 <= t + 0.01) p[m.obj] = [...m.path[m.path.length - 1]] as Point;
        else moving.add(m.obj);
      }
      return { p, moving };
    };
    for (const i of scheduleOrder(ids, deps)) {
      const a = s.piler[i];
      const path = arrowPath(a);
      const speed = SPEED[a.type];
      const d = pathLength(path) / speed;
      let earliest = 0;
      let alignTo = -1;
      for (const dep of deps.get(i) ?? []) {
        const tj = times.get(dep.j);
        if (!tj) continue;
        if (dep.kind === "after") earliest = Math.max(earliest, tj.t1);
        else if (dep.kind === "with") earliest = Math.max(earliest, tj.t0);
        else if (dep.kind === "go") earliest = Math.max(earliest, tj.t0 + GO_DELAY);
        else alignTo = Math.max(alignTo, tj.t1);
      }
      const { p, moving } = at(earliest);
      const nearest = (pt: Point, ok: (t: string) => boolean, max: number) => {
        let best = -1;
        let bd = max;
        p.forEach((q, o) => {
          if (!moving.has(o) && ok(objs[o].type) && dist(q, pt) < bd) {
            bd = dist(q, pt);
            best = o;
          }
        });
        return best;
      };
      const t0 = alignTo > earliest + d ? alignTo - d : earliest;
      const t1 = t0 + d;
      if (a.type === "lop") {
        const o = nearest(a.fra, isPerson, 2.5);
        if (o < 0) {
          problems.push({ arrow: i, alt: altNo, melding: `Løpet i trinn ${k} starter ikke ved en spiller.` });
          continue;
        }
        moves.push({ obj: o, path, from: p[o], t0, t1, arrow: i });
      } else {
        const b = nearest(a.fra, (t) => t === "ball", 3);
        if (b < 0) {
          problems.push({ arrow: i, alt: altNo, melding: `${a.type === "pasning" ? "Pasningen" : "Føringen"} i trinn ${k} starter ikke ved ballen.` });
          continue;
        }
        moves.push({ obj: b, path, from: p[b], t0, t1, arrow: i, linear: a.type === "pasning" });
        if (a.type === "foring") {
          const o = nearest(p[b], isPerson, 2);
          if (o >= 0) {
            const off: Point = [p[o][0] - p[b][0], p[o][1] - p[b][1]];
            moves.push({ obj: o, path: path.map((q) => [q[0] + off[0], q[1] + off[1]] as Point), from: p[o], t0, t1 });
          }
        }
      }
      times.set(i, { t0, t1 });
    }
    moves.sort((x, y) => x.t0 - y.t0);
    const dur = Math.max(MIN_STEP, ...moves.map((m) => m.t1));
    for (const m of moves) pos[m.obj] = [...m.path[m.path.length - 1]] as Point;
    out.push({ start, moves, dur, arrows: ids, text: stepText(s, k - 1, alt) });
  }
  return { steps: out, end: pos.map((p) => [...p] as Point), stepOf, problems };
}

/**
 * What looks wrong when the sketch is played: arrows with nothing to move,
 * and passes nobody receives (shots at goal are fine).
 */
export function checkAnimation(s: Sketch): AnimationProblem[] {
  const alts = choiceOf(s)?.alternativer.length ?? 1;
  const goals = s.objekter.filter((o) => o.type === "maal" || o.type === "smaamaal");
  const out: AnimationProblem[] = [];
  const seen = new Set<string>();
  for (let alt = 1; alt <= alts; alt++) {
    const tl = buildTimeline(s, alt);
    const add = (p: AnimationProblem) => {
      if (seen.has(`${p.arrow}:${p.melding}`)) return;
      seen.add(`${p.arrow}:${p.melding}`);
      out.push(p);
    };
    tl.problems.forEach(add);
    tl.steps.forEach((st, k) => {
      for (const m of st.moves) {
        if (m.arrow === undefined || s.piler[m.arrow].type !== "pasning") continue;
        const a = s.piler[m.arrow];
        const p = positionsAt(tl, k, m.t1);
        const received = s.objekter.some((o, i) => isPerson(o.type) && dist(p[i], a.til) < 2.5);
        const atGoal = goals.some((g) => dist([g.x, g.y], a.til) < (g.bredde ?? 2) / 2 + 2.5);
        const later = s.piler.some((b, j) => j !== m.arrow && inAlternative(b, alt) && dist(b.fra, a.til) < 2.5);
        if (!received && !atGoal && !later) add({ arrow: m.arrow, alt: alts > 1 ? alt : 0, melding: `Ingen tar imot pasningen i trinn ${k + 1}.` });
      }
    });
  }
  return out;
}

/**
 * Moves an arrow to a later step when nothing can move it in its own step
 * (e.g. a pass before the ball has arrived). For drawings from KI.
 */
export function fixAnimation(s: Sketch): Sketch {
  if (!s.piler.some((a) => a.trinn)) return s;
  const out = structuredClone(s);
  for (let round = 0; round < out.piler.length; round++) {
    const bad = checkAnimation(out).filter((p) => /starter ikke/.test(p.melding));
    if (!bad.length) break;
    const a = out.piler[bad[0].arrow];
    if ((a.trinn ?? 1) >= MAX_STEPS) break;
    a.trinn = (a.trinn ?? 1) + 1;
  }
  return out;
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
