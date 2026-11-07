"use client";

import { GitBranch, Image as ImageIcon, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DrawingSvg, Shapes } from "@/components/plans/DrawingSvg";
import { Icon } from "@/components/ui/icon";
import { allStands, buildTimeline, canAnimate, choiceOf, HOLD, positionsAt } from "@/lib/plans/animation";
import { ALT_LETTERS, grassShapes, layout, px, sketchParts, type Drawing } from "@/lib/plans/drawing";

const WIDTH = 1200;

/**
 * A drawing that can be played step by step: people and balls follow the
 * arrows. «Skisse» shows the still picture. Drawings without arrows are just
 * the picture.
 */
export function DrawingPlayer({ drawing, title }: { drawing: Drawing; title?: string }) {
  if (!drawing.skisser.some(canAnimate)) return <DrawingSvg drawing={drawing} title={title} />;
  return <Player drawing={drawing} title={title} />;
}

interface Pos {
  k: number;
  t: number;
  hold: number;
  /** Play every step, or only the current one. */
  all: boolean;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const START: Pos = { k: 0, t: 0, hold: HOLD, all: false };

function Player({ drawing, title }: { drawing: Drawing; title?: string }) {
  const sketches = drawing.skisser.map((s, i) => ({ s, i })).filter((x) => canAnimate(x.s));
  const [mode, setMode] = useState<"anim" | "static">("anim");
  const [pick, setPick] = useState(0);
  const [alt, setAlt] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pos, setPos] = useState<Pos>(START);
  // The animation loop reads and writes the position here; the state above is what is drawn.
  const live = useRef<Pos>(START);
  const commit = (q: Pos, play: boolean) => {
    live.current = q;
    setPos(q);
    setPlaying(play);
  };

  const index = sketches[Math.min(pick, sketches.length - 1)].i;
  const sketch = drawing.skisser[index];
  const choice = choiceOf(sketch);
  // The React Compiler memoizes these.
  const lay = layout({ skisser: [sketch] }, WIDTH);
  const view = { lay, parts: sketchParts(lay, sketch, 0, allStands(sketch)), grass: grassShapes(lay) };
  const tl = buildTimeline(sketch, alt);
  const n = tl.steps.length;
  const k = Math.min(pos.k, n - 1);
  const t = Math.min(pos.t, tl.steps[k].dur);
  const done = k === n - 1 && t >= tl.steps[k].dur;

  // The loop reads the latest timeline from here, so a new render does not restart it.
  const timeline = useRef(tl);
  useEffect(() => {
    timeline.current = tl;
  });
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const dt = last < 0 ? 0 : (Math.min(100, now - last) / 1000) * speed;
      last = now;
      const steps = timeline.current.steps;
      const q = { ...live.current };
      if (q.k >= steps.length) q.k = steps.length - 1;
      let stop = false;
      if (q.hold < HOLD) q.hold += dt;
      else {
        q.t += dt;
        const dur = steps[q.k].dur;
        if (q.t >= dur) {
          q.t = dur;
          if (q.all && q.k < steps.length - 1) {
            q.k += 1;
            q.t = 0;
            q.hold = 0;
          } else stop = true;
        }
      }
      live.current = q;
      setPos(q);
      if (stop) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  /** Plays step `step` (and the rest when `all`), or jumps to its end without motion. */
  const run = (step: number, all: boolean) => {
    if (reducedMotion()) return commit({ k: step, t: tl.steps[step].dur, hold: HOLD, all: false }, false);
    commit({ k: step, t: 0, hold: all ? 0 : HOLD, all }, true);
  };
  const next = () => {
    if (playing) return commit({ k, t: tl.steps[k].dur, hold: HOLD, all: false }, false);
    if (t < tl.steps[k].dur) {
      if (reducedMotion()) return commit({ ...pos, k, t: tl.steps[k].dur }, false);
      return commit({ k, t, hold: HOLD, all: false }, true);
    }
    if (k < n - 1) run(k + 1, false);
  };
  const play = () => {
    if (playing) return commit({ ...live.current }, false);
    if (done) return run(0, true);
    if (reducedMotion()) return next();
    commit({ k, t, all: true, hold: t > 0 ? HOLD : 0 }, true);
  };
  const prev = () => {
    if (t > 0) commit({ k, t: 0, hold: HOLD, all: false }, false);
    else if (k > 0) commit({ k: k - 1, t: 0, hold: HOLD, all: false }, false);
  };
  const chooseAlt = (a: number) => {
    setAlt(a);
    if (choice && k >= choice.step) {
      const r = reducedMotion();
      commit({ k: choice.step, t: r ? Number.MAX_VALUE : 0, hold: HOLD, all: false }, !r);
    }
  };

  const positions = positionsAt(tl, k, t);
  const { parts, grass } = view;
  const opacity = (i: number) => {
    const s = tl.stepOf[i];
    return s < 0 ? 0 : s === k ? 1 : s > k ? 0.28 : 0.12;
  };
  const text = tl.steps[k].text;

  return (
    <div className="nm-player">
      <div className="nm-seg" role="group" aria-label="Visning">
        <button type="button" aria-pressed={mode === "anim"} onClick={() => setMode("anim")}>
          <Icon icon={Play} size={18} /> Animasjon
        </button>
        <button
          type="button"
          aria-pressed={mode === "static"}
          onClick={() => {
            setMode("static");
            commit({ ...pos, t }, false);
          }}
        >
          <Icon icon={ImageIcon} size={18} /> Skisse
        </button>
      </div>
      {mode === "static" ? (
        <>
          <DrawingSvg drawing={drawing} title={title} />
          {drawing.skisser.map((s, i) => {
            const c = choiceOf(s);
            return c ? (
              <p key={i} className="nm-player__legend">
                <Icon icon={GitBranch} size={18} />
                <span>
                  {c.sporsmal ? `${c.sporsmal} ` : "Valg: "}
                  {c.alternativer.map((a, j) => (
                    <span key={j} className="nm-player__alt-inline">
                      <span className="nm-alt-letter">{ALT_LETTERS[j]}</span>
                      {a || `Alternativ ${ALT_LETTERS[j]}`}
                    </span>
                  ))}
                </span>
              </p>
            ) : null;
          })}
        </>
      ) : (
        <>
          {sketches.length > 1 ? (
            <div className="nm-seg" role="group" aria-label="Skisse">
              {sketches.map((x, j) => (
                <button
                  key={x.i}
                  type="button"
                  aria-pressed={j === pick}
                  onClick={() => {
                    setPick(j);
                    setAlt(1);
                    commit(START, false);
                  }}
                >
                  {x.s.tittel || `Skisse ${x.i + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <svg viewBox={`0 0 ${lay.width} ${lay.height}`} width="100%" role="img" aria-label={`${title ?? "Tegning av øvelsen"}, animert`} className="nm-player__pitch">
            <Shapes shapes={grass} />
            <Shapes shapes={parts.base} />
            {parts.arrows.map((a, i) =>
              a ? (
                <g key={i} opacity={opacity(i)} className="nm-player__arrow">
                  <Shapes shapes={a} />
                </g>
              ) : null,
            )}
            {[false, true].map((balls) =>
              parts.sprites.map((sp, i) => {
                if (!sp || (sketch.objekter[i].type === "ball") !== balls) return null;
                const at = px(lay, sketch, 0, ...positions[i]);
                return (
                  <g key={`${balls}${i}`} transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`}>
                    <Shapes shapes={sp} />
                  </g>
                );
              }),
            )}
            <Shapes shapes={parts.top} />
          </svg>
          {choice ? (
            <div className="nm-player__choice">
              <p className="nm-player__question">
                <Icon icon={GitBranch} size={18} />
                Valg i trinn {choice.step + 1}
                {choice.sporsmal ? `: ${choice.sporsmal}` : ""}
              </p>
              <div className="nm-player__alts" role="group" aria-label={choice.sporsmal || "Velg alternativ"}>
                {choice.alternativer.map((a, j) => (
                  <button key={j} type="button" aria-pressed={alt === j + 1} onClick={() => chooseAlt(j + 1)}>
                    <span className="nm-alt-letter">{ALT_LETTERS[j]}</span>
                    {a || `Alternativ ${ALT_LETTERS[j]}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="nm-player__progress" aria-hidden="true">
            {tl.steps.map((s, i) => (
              <span key={i}>
                <i style={{ width: `${i < k ? 100 : i > k ? 0 : (100 * t) / s.dur}%` }} />
              </span>
            ))}
          </div>
          <div className="nm-player__caption" aria-live="polite">
            <span className="nm-player__num" aria-hidden="true">
              {k + 1}
            </span>
            <p>
              <span className="nm-sr-only">
                Trinn {k + 1} av {n}.{" "}
              </span>
              {text || (n > 1 ? `Trinn ${k + 1} av ${n}` : "Alle beveger seg samtidig")}
            </p>
          </div>
          <div className="nm-player__controls">
            <button type="button" className="nm-btn nm-btn--secondary nm-player__icon" onClick={prev} disabled={k === 0 && t === 0} aria-label="Forrige trinn">
              <Icon icon={SkipBack} />
            </button>
            <button type="button" className="nm-btn nm-btn--primary nm-btn--lg nm-player__play" onClick={play}>
              <Icon icon={playing ? Pause : Play} />
              {playing ? "Pause" : done ? "Spill igjen" : "Spill av"}
            </button>
            <button type="button" className="nm-btn nm-btn--secondary nm-player__icon" onClick={next} disabled={done} aria-label="Neste trinn">
              <Icon icon={SkipForward} />
            </button>
            <button type="button" className="nm-btn nm-btn--secondary nm-player__icon" onClick={() => setSpeed(speed === 1 ? 0.5 : 1)} aria-label={speed === 1 ? "Normal fart. Trykk for halv fart" : "Halv fart. Trykk for normal fart"}>
              {speed === 1 ? "1×" : "½×"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
