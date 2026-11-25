"use client";

import { useEffect, useState } from "react";
import { kiProgress, kiStep } from "@/lib/ki-progress";

/**
 * Progress while KI makes a plan. The answer comes in one piece, so the bar is
 * an estimate from how long earlier calls took; the step text tells what KI
 * is doing. Only the step is announced to screen readers, not every second.
 */
export function KiProgress({ expectedMs, steps }: { expectedMs: number; steps: readonly string[] }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  const elapsed = now - start;
  const fraction = kiProgress(elapsed, expectedMs);
  const step = kiStep(steps, fraction);
  const secs = Math.floor(elapsed / 1000);
  const expected = Math.round(expectedMs / 1000);
  const late = elapsed > expectedMs;
  return (
    <div className="nm-kiprog">
      <div
        className="nm-kiprog__bar"
        role="progressbar"
        aria-label="KI jobber"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuetext={step}
      >
        <span style={{ width: `${(fraction * 100).toFixed(1)}%` }} />
      </div>
      <p className="nm-kiprog__step" aria-live="polite">
        {step} …
      </p>
      <p className="nm-hint" style={{ margin: 0 }}>
        {late ? `${secs} s. Tar litt lengre enn vanlig, men KI jobber fortsatt.` : `${secs} s av ca. ${expected} s.`} Ikke lukk siden.
      </p>
    </div>
  );
}
