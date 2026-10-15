/**
 * Pitch drawings from coordinates (port of the old app's fct_drawing.R).
 *
 * A drawing (tegning) is JSON with 1–3 sketches side by side. Coordinates are
 * in metres: x from 0 to `bredde` (left to right), y from 0 to `lengde`
 * (bottom to top). Outside the field, up to `marg` metres, is grass for
 * titles and captions. A model never writes drawing code: the app checks
 * the JSON, moves what can be moved safely (`fixDrawing`), and renders it
 * (`drawingShapes`) to SVG in the browser and in the PDF.
 */

export class DrawingError extends Error {}

export type Team = "1" | "2" | "joker";
export type ObjectType = "spiller" | "trener" | "ball" | "kjegle" | "maal" | "smaamaal";
export type ArrowType = "pasning" | "lop" | "foring";
export type GoalSide = "venstre" | "hoyre" | "topp" | "bunn";
export type Point = [number, number];

export interface DrawingObject {
  type: ObjectType;
  x: number;
  y: number;
  lag?: Team;
  tekst?: string;
  farge?: "oransje" | "gul";
  bredde?: number;
  side?: GoalSide;
}

export interface Sketch {
  tittel: string;
  bane: { bredde: number; lengde: number; marg: number; midtlinje: boolean };
  soner: { x: number; y: number; b: number; h: number; tekst: string }[];
  linjer: { fra: Point; til: Point }[];
  hjelpelinjer: { fra: Point; til: Point; tekst: string }[];
  objekter: DrawingObject[];
  piler: { type: ArrowType; fra: Point; til: Point; bue: number }[];
  etiketter: { x: number; y: number; tekst: string }[];
  tekster: { x: number; y: number; tekst: string }[];
}

export interface Drawing {
  skisser: Sketch[];
}

export const COLOURS = {
  grass: ["#56a644", "#4c9a3a"],
  line: "#FFFFFF",
  team: { "1": "#1f5fbf", "2": "#d63a2f", joker: "#f2b600" } as Record<Team, string>,
  teamText: { "1": "#FFFFFF", "2": "#FFFFFF", joker: "#121212" } as Record<Team, string>,
  trainer: "#2b2b2b",
  cone: { oransje: "#ff8c1a", gul: "#f5c518" },
  helper: "#f5d63d",
  labelFill: "#1d4a1d",
  shadow: "rgba(0,0,0,0.33)",
};

const OBJECT_TYPES: ObjectType[] = ["spiller", "trener", "ball", "kjegle", "maal", "smaamaal"];
const ARROW_TYPES: ArrowType[] = ["pasning", "lop", "foring"];
const GOAL_SIDES: GoalSide[] = ["venstre", "hoyre", "topp", "bunn"];
export const DRAWING_MAX_CHARS = 20000;
const MAX_ITEMS: Record<string, number> = { objekter: 40, piler: 20, soner: 10, linjer: 20, hjelpelinjer: 10, etiketter: 15, tekster: 15 };

const txt = (x: unknown) => (x === null || x === undefined ? "" : String(x).trim());

function num(v: unknown, what: string, lo = -Infinity, hi = Infinity): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < lo || n > hi) {
    throw new DrawingError(`${what} må være et tall${Number.isFinite(lo) ? ` fra ${lo} til ${hi}` : ""}.`);
  }
  return n;
}

function text(v: unknown, what: string, max: number): string {
  const t = txt(v);
  if (t.length > max) throw new DrawingError(`${what} kan ha maks ${max} tegn.`);
  return t;
}

/** Read a drawing from JSON text (or pass an object through). Null for empty. */
export function parseDrawing(x: unknown): unknown {
  if (x === null || x === undefined) return null;
  if (typeof x !== "string") return x;
  const s = x.trim();
  if (!s) return null;
  if (s.length > DRAWING_MAX_CHARS) throw new DrawingError(`Tegningen er for stor (maks ${DRAWING_MAX_CHARS} tegn).`);
  try {
    return JSON.parse(s);
  } catch {
    throw new DrawingError("Tegningen er ikke gyldig JSON. Sjekk komma, klammer og anførselstegn.");
  }
}

/** Check a drawing and return it complete. Throws DrawingError with a Norwegian message. */
export function validateDrawing(input: unknown): Drawing | null {
  const d = parseDrawing(input) as { skisser?: unknown } | null;
  if (d === null) return null;
  const sk = d && typeof d === "object" ? d.skisser : undefined;
  if (!Array.isArray(sk) || sk.length < 1 || sk.length > 3) throw new DrawingError("En tegning må ha 1 til 3 skisser.");
  return {
    skisser: sk.map((raw, i) => {
      const s = (raw ?? {}) as Record<string, unknown>;
      const w = `Skisse ${i + 1}: `;
      for (const [k, max] of Object.entries(MAX_ITEMS)) {
        if (Array.isArray(s[k]) && (s[k] as unknown[]).length > max) throw new DrawingError(`${w}Maks ${max} ${k} per skisse.`);
      }
      const b = (s.bane ?? {}) as Record<string, unknown>;
      const bane = {
        bredde: num(b.bredde, `${w}Banens bredde`, 4, 120),
        lengde: num(b.lengde, `${w}Banens lengde`, 4, 120),
        marg: b.marg === undefined || b.marg === null ? 2.5 : num(b.marg, `${w}Margen`, 0.5, 10),
        midtlinje: b.midtlinje === true,
      };
      const inside = (x: number, y: number, what: string) => {
        if (x < -bane.marg || x > bane.bredde + bane.marg || y < -bane.marg || y > bane.lengde + bane.marg) {
          throw new DrawingError(`${w}${what} ligger utenfor tegningen.`);
        }
      };
      const pt = (p: unknown, what: string): Point => {
        if (!Array.isArray(p) || p.length !== 2) throw new DrawingError(`${w}${what} må være et punkt [x, y].`);
        const v: Point = [num(p[0], `${w}${what}`), num(p[1], `${w}${what}`)];
        inside(v[0], v[1], what);
        return v;
      };
      const list = (k: string) => (Array.isArray(s[k]) ? (s[k] as Record<string, unknown>[]) : []);
      const objekter = list("objekter").map((o) => {
        const type = txt(o.type) as ObjectType;
        if (!OBJECT_TYPES.includes(type)) throw new DrawingError(`${w}Ukjent objekttype «${txt(o.type)}».`);
        const x = num(o.x, `${w}${type} x`);
        const y = num(o.y, `${w}${type} y`);
        inside(x, y, type);
        const r: DrawingObject = { type, x, y };
        if (type === "spiller") {
          const lag = txt(o.lag ?? "1") as Team;
          if (!["1", "2", "joker"].includes(lag)) throw new DrawingError(`${w}Lag må være 1, 2 eller joker.`);
          r.lag = lag;
        }
        if (type === "spiller" || type === "trener") {
          r.tekst = text(o.tekst ?? (type === "trener" ? "T" : ""), `${w}Teksten på en spiller`, 3);
        }
        if (type === "kjegle") {
          const f = txt(o.farge ?? "oransje");
          if (f !== "oransje" && f !== "gul") throw new DrawingError(`${w}Kjeglefarge må være oransje eller gul.`);
          r.farge = f;
        }
        if (type === "maal" || type === "smaamaal") {
          r.bredde = num(o.bredde ?? (type === "maal" ? 5 : 2), `${w}Målets bredde`, 0.5, 8);
          const side = txt(o.side ?? "venstre") as GoalSide;
          if (!GOAL_SIDES.includes(side)) throw new DrawingError(`${w}Målets side må være venstre, hoyre, topp eller bunn.`);
          r.side = side;
        }
        return r;
      });
      const piler = list("piler").map((a) => {
        const type = txt(a.type) as ArrowType;
        if (!ARROW_TYPES.includes(type)) throw new DrawingError(`${w}Ukjent piltype «${txt(a.type)}».`);
        return {
          type,
          fra: pt(a.fra, "Pilens start"),
          til: pt(a.til, "Pilens slutt"),
          bue: a.bue === undefined || a.bue === null ? 0 : num(a.bue, `${w}Bue`, -1, 1),
        };
      });
      const soner = list("soner").map((z) => {
        const r = {
          x: num(z.x, `${w}Sone x`),
          y: num(z.y, `${w}Sone y`),
          b: num(z.b, `${w}Sonens bredde`, 0.5, 120),
          h: num(z.h, `${w}Sonens høyde`, 0.5, 120),
          tekst: text(z.tekst, `${w}Sonetekst`, 40),
        };
        inside(r.x, r.y, "Sonen");
        inside(r.x + r.b, r.y + r.h, "Sonen");
        return r;
      });
      const linjer = list("linjer").map((l) => ({ fra: pt(l.fra, "Linjens start"), til: pt(l.til, "Linjens slutt") }));
      const hjelpelinjer = list("hjelpelinjer").map((l) => ({
        fra: pt(l.fra, "Hjelpelinjens start"),
        til: pt(l.til, "Hjelpelinjens slutt"),
        tekst: text(l.tekst, `${w}Hjelpelinjens tekst`, 40),
      }));
      const label = (k: string, what: string) =>
        list(k).map((l) => {
          const x = num(l.x, `${w}${what} x`);
          const y = num(l.y, `${w}${what} y`);
          inside(x, y, what);
          return { x, y, tekst: text(l.tekst, `${w}${what}`, 60) };
        });
      return {
        tittel: text(s.tittel, `${w}Tittelen`, 50),
        bane,
        soner,
        linjer,
        hjelpelinjer,
        objekter,
        piler,
        etiketter: label("etiketter", "Etiketten"),
        tekster: label("tekster", "Teksten"),
      };
    }),
  };
}

// Layout -------------------------------------------------------------------------

export interface Sizes {
  playerR: number;
  ballR: number;
  cone: number;
  arrow: number;
  head: number;
  line: number;
  font: number;
  gap: number;
}

/** Sizes in pixels: a player is ~0.85 m in radius, but 1.8–4 % of the image width. */
export function sizes(widthPx: number, scale: number): Sizes {
  const r = Math.min(Math.max(0.85 * scale, 0.018 * widthPx), 0.04 * widthPx);
  const u = r / 0.024;
  return {
    playerR: r,
    ballR: 0.0085 * u,
    cone: 0.022 * u,
    arrow: 0.0042 * u * 1.33,
    head: 0.016 * u,
    line: 0.0022 * u * 1.33,
    font: 0.021 * u,
    gap: 0.004 * u,
  };
}

export interface Layout {
  width: number;
  height: number;
  scale: number;
  sizes: Sizes;
  /** Pixel x of each sketch's left edge (world x = -marg). */
  x0: number[];
  /** Pixel y offset of each sketch (centred vertically). */
  y0: number[];
}

/** All sketches share one scale, so metres look the same side by side. */
export function layout(d: Drawing, widthPx = 1800): Layout {
  const wm = d.skisser.map((s) => s.bane.bredde + 2 * s.bane.marg);
  const hm = d.skisser.map((s) => s.bane.lengde + 2 * s.bane.marg);
  const scale = widthPx / wm.reduce((a, b) => a + b, 0);
  const height = Math.round(Math.max(...hm) * scale);
  const x0 = wm.map((_, i) => wm.slice(0, i).reduce((a, b) => a + b, 0) * scale);
  const y0 = hm.map((h) => (height - h * scale) / 2);
  return { width: widthPx, height, scale, sizes: sizes(widthPx, scale), x0, y0 };
}

/** Pixel position of a world point in sketch i (SVG y grows downwards). */
export function px(lay: Layout, s: Sketch, i: number, x: number, y: number): Point {
  return [lay.x0[i] + (x + s.bane.marg) * lay.scale, lay.height - (lay.y0[i] + (y + s.bane.marg) * lay.scale)];
}

const people = (s: Sketch) => s.objekter.map((o, i) => ({ o, i })).filter(({ o }) => o.type === "spiller" || o.type === "trener");

/** Points along an arrow in metres: a quadratic curve when `bue` is not 0. */
export function arrowPath(a: Sketch["piler"][number], n = 40): Point[] {
  const [p0, p2] = [a.fra, a.til];
  const dx = p2[0] - p0[0];
  const dy = p2[1] - p0[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return [p0, p2];
  const nrm: Point = [-dy / len, dx / len];
  const p1: Point = [(p0[0] + p2[0]) / 2 + nrm[0] * a.bue * len, (p0[1] + p2[1]) / 2 + nrm[1] * a.bue * len];
  return Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1);
    return [
      (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
      (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
    ];
  });
}

function distToPath(p: Point, path: Point[]): number {
  let best = Infinity;
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    const ab: Point = [b[0] - a[0], b[1] - a[1]];
    const l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * ab[0]), p[1] - (a[1] + t * ab[1])));
  }
  return best;
}

/** Labels wrap at about 18 characters per line. */
export function wrap(t: string, width = 18): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of t.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

function labelBox(l: { tekst: string }, lay: Layout) {
  const lines = wrap(l.tekst);
  const f = lay.sizes.font * 0.72;
  return {
    w: (Math.max(...lines.map((x) => x.length)) * 0.56 * f + 1.4 * f) / lay.scale,
    h: (lines.length * 1.25 * f + 0.9 * f) / lay.scale,
  };
}

function personName(o: DrawingObject): string {
  const t = o.tekst ? ` ${o.tekst}` : "";
  return o.type === "trener" ? `Trener${t}` : `${{ "1": "Blå", "2": "Rød", joker: "Joker" }[o.lag ?? "1"]} spiller${t}`;
}

const lowerFirst = (x: string) => x[0].toLowerCase() + x.slice(1);

export interface DrawingProblem {
  skisse: number;
  type: "spillere" | "pil" | "etikett";
  melding: string;
}

/** Overlaps: players on top of each other, arrows through players, labels covering players. */
export function checkDrawing(d: Drawing, widthPx = 1800): DrawingProblem[] {
  const lay = layout(d, widthPx);
  const r = lay.sizes.playerR / lay.scale;
  const out: DrawingProblem[] = [];
  d.skisser.forEach((s, i) => {
    const ppl = people(s);
    for (let a = 0; a < ppl.length; a++) {
      for (let b = a + 1; b < ppl.length; b++) {
        if (Math.hypot(ppl[a].o.x - ppl[b].o.x, ppl[a].o.y - ppl[b].o.y) < 2 * r) {
          out.push({ skisse: i + 1, type: "spillere", melding: `${personName(ppl[a].o)} og ${lowerFirst(personName(ppl[b].o))} overlapper.` });
        }
      }
    }
    for (const a of s.piler) {
      const path = arrowPath(a);
      for (const { o } of ppl) {
        const p: Point = [o.x, o.y];
        const atEnd = Math.hypot(p[0] - a.fra[0], p[1] - a.fra[1]) <= 1.6 * r || Math.hypot(p[0] - a.til[0], p[1] - a.til[1]) <= 1.6 * r;
        if (!atEnd && distToPath(p, path) < 0.9 * r) {
          const what = { pasning: "pasning", lop: "løpsbane", foring: "føring" }[a.type];
          out.push({ skisse: i + 1, type: "pil", melding: `En ${what} går gjennom ${lowerFirst(personName(o))}.` });
        }
      }
    }
    for (const l of s.etiketter) {
      const box = labelBox(l, lay);
      for (const { o } of ppl) {
        if (Math.abs(o.x - l.x) < box.w / 2 + r && Math.abs(o.y - l.y) < box.h / 2 + r) {
          out.push({ skisse: i + 1, type: "etikett", melding: `Etiketten «${l.tekst}» dekker ${lowerFirst(personName(o))}.` });
        }
      }
    }
  });
  return out;
}

/**
 * Moves what can be moved safely: overlapping players apart (a ball at a
 * player's feet and arrows starting or ending at the player move along), and
 * labels off players. Arrows through players are left for `checkDrawing`.
 */
export function fixDrawing(input: Drawing, widthPx = 1800): Drawing {
  const d: Drawing = structuredClone(input);
  const lay = layout(d, widthPx);
  const r = lay.sizes.playerR / lay.scale;
  for (const s of d.skisser) {
    const ppl = people(s).map((p) => p.i);
    const move = (k: number, dx: number, dy: number) => {
      const o = s.objekter[k];
      const old: Point = [o.x, o.y];
      o.x = Math.min(Math.max(o.x + dx, -s.bane.marg + r), s.bane.bredde + s.bane.marg - r);
      o.y = Math.min(Math.max(o.y + dy, -s.bane.marg + r), s.bane.lengde + s.bane.marg - r);
      const shift: Point = [o.x - old[0], o.y - old[1]];
      for (const b of s.objekter) {
        if (b.type === "ball" && Math.hypot(b.x - old[0], b.y - old[1]) <= 1.6 * r) {
          b.x += shift[0];
          b.y += shift[1];
        }
      }
      for (const a of s.piler) {
        if (Math.hypot(a.fra[0] - old[0], a.fra[1] - old[1]) <= 1.6 * r) a.fra = [a.fra[0] + shift[0], a.fra[1] + shift[1]];
        if (Math.hypot(a.til[0] - old[0], a.til[1] - old[1]) <= 1.6 * r) a.til = [a.til[0] + shift[0], a.til[1] + shift[1]];
      }
    };
    for (let round = 0; round < 5; round++) {
      let moved = false;
      for (let a = 0; a < ppl.length; a++) {
        for (let b = a + 1; b < ppl.length; b++) {
          const pa = s.objekter[ppl[a]];
          const pb = s.objekter[ppl[b]];
          const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
          if (dist < 2 * r) {
            const dir: Point = dist > 1e-6 ? [(pb.x - pa.x) / dist, (pb.y - pa.y) / dist] : [1, 0];
            const push = (2.15 * r - dist) / 2;
            move(ppl[a], -dir[0] * push, -dir[1] * push);
            move(ppl[b], dir[0] * push, dir[1] * push);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    const pos = ppl.map((k) => [s.objekter[k].x, s.objekter[k].y] as Point);
    for (const l of s.etiketter) {
      const box = labelBox(l, lay);
      const free = (y: number) => !pos.some((p) => Math.abs(p[0] - l.x) < box.w / 2 + r && Math.abs(p[1] - y) < box.h / 2 + r);
      if (!pos.length || free(l.y)) continue;
      for (let step = 0.25; step <= s.bane.lengde; step += 0.25) {
        const cand = [l.y - step, l.y + step].filter((y) => y - box.h / 2 >= -s.bane.marg && y + box.h / 2 <= s.bane.lengde + s.bane.marg);
        const ok = cand.find(free);
        if (ok !== undefined) {
          l.y = ok;
          break;
        }
      }
    }
  }
  return d;
}

/** Without empty parts and default values, for the database. */
export function compactDrawing(d: Drawing): unknown {
  const drop = <T extends Record<string, unknown>>(x: T, defaults: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) {
      if (k in defaults && v === defaults[k]) continue;
      if (Array.isArray(v) && !v.length) continue;
      out[k] = v;
    }
    return out;
  };
  return {
    skisser: d.skisser.map((s) =>
      drop(
        {
          ...s,
          bane: drop(s.bane, { marg: 2.5, midtlinje: false }),
          objekter: s.objekter.map((o) =>
            drop(o as unknown as Record<string, unknown>, { farge: "oransje", tekst: o.type === "trener" ? "T" : "" }),
          ),
          piler: s.piler.map((a) => drop(a, { bue: 0 })),
          soner: s.soner.map((z) => drop(z, { tekst: "" })),
          hjelpelinjer: s.hjelpelinjer.map((h) => drop(h, { tekst: "" })),
        },
        { tittel: "" },
      ),
    ),
  };
}

/** One object per line, so a drawing is easy to edit by hand. */
export function prettyDrawing(d: Drawing | null): string {
  if (!d) return "";
  const c = compactDrawing(d) as { skisser: Record<string, unknown>[] };
  const sketch = (s: Record<string, unknown>) =>
    "    {\n" +
    Object.entries(s)
      .map(([k, v]) =>
        Array.isArray(v)
          ? `      "${k}": [\n${v.map((x) => `        ${JSON.stringify(x)}`).join(",\n")}\n      ]`
          : `      "${k}": ${JSON.stringify(v)}`,
      )
      .join(",\n") +
    "\n    }";
  return `{\n  "skisser": [\n${c.skisser.map(sketch).join(",\n")}\n  ]\n}`;
}

/** A small example to start from (3 mot 1 in a 12 × 12 m square). */
export const EXAMPLE_DRAWING = {
  skisser: [
    {
      tittel: "3 mot 1",
      bane: { bredde: 12, lengde: 12, marg: 2.5 },
      objekter: [
        { type: "kjegle", x: 0, y: 0 },
        { type: "kjegle", x: 12, y: 0 },
        { type: "kjegle", x: 0, y: 12 },
        { type: "kjegle", x: 12, y: 12 },
        { type: "spiller", lag: 1, x: 2, y: 2, tekst: "1" },
        { type: "ball", x: 3, y: 2.6 },
        { type: "spiller", lag: 1, x: 2, y: 10, tekst: "2" },
        { type: "spiller", lag: 1, x: 10, y: 3, tekst: "3" },
        { type: "spiller", lag: 2, x: 6, y: 5.5, tekst: "F" },
      ],
      piler: [
        { type: "pasning", fra: [3, 2.6], til: [9.2, 3.3] },
        { type: "lop", fra: [2, 10], til: [5, 10.5], bue: 0.2 },
      ],
      tekster: [{ x: 6, y: -1.4, tekst: "Rute 12 × 12 m" }],
    },
  ],
};

// Rendering to shapes ---------------------------------------------------------------------
// One list of simple shapes, drawn by both the SVG component and the PDF.

export type Shape =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; rx?: number; opacity?: number }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | { k: "poly"; points: Point[]; fill?: string; stroke?: string; sw?: number; closed: boolean; dash?: number[] }
  /** `y` is the vertical centre of the line. */
  | { k: "text"; x: number; y: number; text: string; size: number; fill: string; bold?: boolean; anchor?: "middle" | "start" };

function trimPath(path: Point[], amount: number): Point[] {
  let acc = 0;
  for (let k = 1; k < path.length; k++) {
    const seg = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
    if (acc + seg >= amount) {
      const t = seg ? (amount - acc) / seg : 0;
      const start: Point = [path[k - 1][0] + t * (path[k][0] - path[k - 1][0]), path[k - 1][1] + t * (path[k][1] - path[k - 1][1])];
      return [start, ...path.slice(k)];
    }
    acc += seg;
  }
  return path;
}

function wave(p: Point[], amp: number, wavelength: number): Point[] {
  const cum = [0];
  for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  const total = cum.at(-1)!;
  const stop = Math.max(0, total - wavelength * 0.6);
  const n = Math.max(20, Math.round(stop / 2));
  const at = (s: number): Point => {
    let k = 1;
    while (k < cum.length - 1 && cum[k] < s) k++;
    const t = cum[k] === cum[k - 1] ? 0 : (s - cum[k - 1]) / (cum[k] - cum[k - 1]);
    return [p[k - 1][0] + t * (p[k][0] - p[k - 1][0]), p[k - 1][1] + t * (p[k][1] - p[k - 1][1])];
  };
  const out: Point[] = [];
  for (let j = 0; j <= n; j++) {
    const s = (stop * j) / n;
    const a = at(s);
    const b = at(Math.min(total, s + 0.5));
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const off = amp * Math.sin((2 * Math.PI * s) / wavelength);
    out.push([a[0] - ((b[1] - a[1]) / l) * off, a[1] + ((b[0] - a[0]) / l) * off]);
  }
  out.push(p.at(-1)!);
  return out;
}

function head(path: Point[], size: number): Point[] {
  const end = path.at(-1)!;
  const back = path[Math.max(0, path.length - 4)];
  const l = Math.hypot(end[0] - back[0], end[1] - back[1]) || 1;
  const d: Point = [(end[0] - back[0]) / l, (end[1] - back[1]) / l];
  const n: Point = [-d[1], d[0]];
  const base: Point = [end[0] - d[0] * size, end[1] - d[1] * size];
  return [end, [base[0] + n[0] * size * 0.45, base[1] + n[1] * size * 0.45], [base[0] - n[0] * size * 0.45, base[1] - n[1] * size * 0.45]];
}

function textBox(out: Shape[], x: number, y: number, label: string, lay: Layout, alpha: number, wrapAt: number) {
  const f = lay.sizes.font * 0.72;
  const lines = wrap(label, wrapAt);
  const w = Math.max(...lines.map((l) => l.length)) * 0.56 * f + 1.4 * f;
  const h = lines.length * 1.25 * f + 0.9 * f;
  out.push({ k: "rect", x: x - w / 2, y: y - h / 2, w, h, fill: COLOURS.labelFill, rx: f * 0.4, opacity: alpha });
  lines.forEach((l, i) => {
    out.push({ k: "text", x, y: y - h / 2 + 0.45 * f + (i + 0.5) * 1.25 * f, text: l, size: f, fill: "#FFFFFF", bold: true, anchor: "middle" });
  });
}

/** The drawing as shapes in a `width` × `height` pixel box. */
export function drawingShapes(d: Drawing, widthPx = 1800): { width: number; height: number; shapes: Shape[] } {
  const lay = layout(d, widthPx);
  const sz = lay.sizes;
  const out: Shape[] = [];
  // Grass: six vertical stripes.
  for (let k = 0; k < 6; k++) {
    out.push({ k: "rect", x: (k * lay.width) / 6, y: 0, w: lay.width / 6 + 1, h: lay.height, fill: COLOURS.grass[k % 2] });
  }
  d.skisser.forEach((s, i) => {
    const b = s.bane;
    const P = (x: number, y: number) => px(lay, s, i, x, y);
    for (const z of s.soner) {
      const [a, c] = [P(z.x, z.y), P(z.x + z.b, z.y + z.h)];
      out.push({ k: "rect", x: Math.min(a[0], c[0]), y: Math.min(a[1], c[1]), w: Math.abs(c[0] - a[0]), h: Math.abs(c[1] - a[1]), fill: "#FFFFFF", opacity: 0.18 });
      if (z.tekst) {
        const t = P(z.x + z.b / 2, b.lengde + b.marg / 2);
        out.push({ k: "text", x: t[0], y: t[1], text: z.tekst, size: sz.font * 0.68, fill: "#FFFFFF", bold: true, anchor: "middle" });
      }
    }
    const [c0, c1] = [P(0, 0), P(b.bredde, b.lengde)];
    out.push({ k: "rect", x: c0[0], y: c1[1], w: c1[0] - c0[0], h: c0[1] - c1[1], stroke: COLOURS.line, sw: sz.line });
    if (b.midtlinje) out.push({ k: "poly", points: [P(b.bredde / 2, 0), P(b.bredde / 2, b.lengde)], stroke: COLOURS.line, sw: sz.line, closed: false });
    for (const l of s.linjer) out.push({ k: "poly", points: [P(...l.fra), P(...l.til)], stroke: COLOURS.line, sw: sz.line, closed: false });
    for (const l of s.hjelpelinjer) {
      const m = [P(...l.fra), P(...l.til)];
      out.push({ k: "poly", points: m, stroke: COLOURS.helper, sw: sz.line * 1.1, closed: false, dash: [sz.line * 3, sz.line * 3] });
      if (l.tekst) {
        const top = m[0][1] < m[1][1] ? m[0] : m[1];
        out.push({ k: "text", x: top[0], y: top[1] - (b.marg * lay.scale) / 2, text: l.tekst, size: sz.font * 0.68, fill: COLOURS.helper, bold: true, anchor: "middle" });
      }
    }
    for (const o of s.objekter) {
      const p = P(o.x, o.y);
      if (o.type === "maal" || o.type === "smaamaal") {
        const depth = (o.type === "maal" ? 1.3 : 0.9) * lay.scale;
        const half = ((o.bredde ?? 2) / 2) * lay.scale;
        const horizontal = o.side === "venstre" || o.side === "hoyre";
        const sign = o.side === "venstre" || o.side === "topp" ? -1 : 1;
        const cx = horizontal ? p[0] + (sign * depth) / 2 : p[0];
        const cy = horizontal ? p[1] : p[1] + (sign * depth) / 2;
        const w = horizontal ? depth : 2 * half;
        const h = horizontal ? 2 * half : depth;
        out.push({ k: "rect", x: cx - w / 2, y: cy - h / 2, w, h, fill: "#FFFFFF" });
        const step = o.type === "maal" ? depth / 3.5 : Math.min(w, h) / 2.2;
        for (let x = cx - w / 2 + step; x < cx + w / 2; x += step) {
          out.push({ k: "poly", points: [[x, cy - h / 2], [x, cy + h / 2]], stroke: o.type === "maal" ? "#d8d8d8" : "#555555", sw: sz.line * 0.5, closed: false });
        }
        for (let y = cy - h / 2 + step; y < cy + h / 2; y += step) {
          out.push({ k: "poly", points: [[cx - w / 2, y], [cx + w / 2, y]], stroke: o.type === "maal" ? "#d8d8d8" : "#555555", sw: sz.line * 0.5, closed: false });
        }
        out.push({ k: "rect", x: cx - w / 2, y: cy - h / 2, w, h, stroke: "#FFFFFF", sw: sz.line * 1.4 });
      }
      if (o.type === "kjegle") {
        const h = sz.cone;
        out.push({
          k: "poly",
          points: [[p[0] - h / 2, p[1] + h * 0.38], [p[0] + h / 2, p[1] + h * 0.38], [p[0], p[1] - h * 0.5]],
          fill: COLOURS.cone[o.farge ?? "oransje"],
          stroke: "#c45c00",
          sw: sz.line * 0.5,
          closed: true,
        });
      }
    }
    const ppl = people(s).map((x) => x.o);
    for (const a of s.piler) {
      let path = arrowPath(a).map(([x, y]) => P(x, y));
      const near = (pt: Point) => ppl.some((o) => Math.hypot(o.x - pt[0], o.y - pt[1]) * lay.scale <= sz.playerR * 1.15);
      if (near(a.fra)) path = trimPath(path, sz.playerR + sz.gap);
      if (near(a.til)) path = trimPath([...path].reverse(), sz.playerR + sz.gap * 2).reverse();
      if (path.length < 2) continue;
      const col = a.type === "pasning" ? "#FFFFFF" : "#121212";
      const hd = head(path, sz.head);
      const base: Point = [(hd[1][0] + hd[2][0]) / 2, (hd[1][1] + hd[2][1]) / 2];
      let line = [...path.slice(0, -1), base];
      if (a.type === "foring") line = wave(line, sz.playerR * 0.28, sz.playerR * 1.1);
      out.push({ k: "poly", points: line, stroke: col, sw: sz.arrow, closed: false, dash: a.type === "lop" ? [sz.arrow * 2.2, sz.arrow * 2.2] : undefined });
      out.push({ k: "poly", points: hd, fill: col, closed: true });
    }
    for (const o of ppl) {
      const p = P(o.x, o.y);
      const fill = o.type === "trener" ? COLOURS.trainer : COLOURS.team[o.lag ?? "1"];
      const tc = o.type === "trener" ? "#FFFFFF" : COLOURS.teamText[o.lag ?? "1"];
      out.push({ k: "circle", cx: p[0] + sz.playerR * 0.12, cy: p[1] + sz.playerR * 0.14, r: sz.playerR, fill: COLOURS.shadow });
      out.push({ k: "circle", cx: p[0], cy: p[1], r: sz.playerR, fill, stroke: "#FFFFFF", sw: sz.line * 1.1 });
      if (o.tekst) {
        const f = sz.font * (o.tekst.length > 1 ? 0.6 : 0.72);
        out.push({ k: "text", x: p[0], y: p[1], text: o.tekst, size: f, fill: tc, bold: true, anchor: "middle" });
      }
    }
    for (const o of s.objekter.filter((x) => x.type === "ball")) {
      const p = P(o.x, o.y);
      out.push({ k: "circle", cx: p[0], cy: p[1], r: sz.ballR, fill: "#FFFFFF", stroke: "#121212", sw: sz.line * 0.9 });
      out.push({ k: "circle", cx: p[0], cy: p[1], r: sz.ballR * 0.38, fill: "#121212" });
    }
    for (const l of s.etiketter) {
      const p = P(l.x, l.y);
      textBox(out, p[0], p[1], l.tekst, lay, 0.85, 18);
    }
    for (const l of s.tekster) {
      const p = P(l.x, l.y);
      out.push({ k: "text", x: p[0], y: p[1], text: l.tekst, size: sz.font * 0.68, fill: "#FFFFFF", bold: true, anchor: "middle" });
    }
    if (s.tittel) {
      const p = P(b.bredde / 2, b.lengde + b.marg / 2);
      textBox(out, p[0], p[1], s.tittel, lay, 0.55, 40);
    }
  });
  return { width: lay.width, height: lay.height, shapes: out };
}
