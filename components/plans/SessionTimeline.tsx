"use client";

import { Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export interface TimelineRow {
  from: number;
  to: number;
  label: string;
  /** Per group in a rotation: «Lag 1 · Oransje: Øvelse 2». */
  cells: string[];
}

const minutesSince = (start: string) => (Date.now() - Date.parse(start)) / 60_000;

/**
 * The schedule of today's session with «Nå» and «Neste» from the clock, and
 * a switch that keeps the screen on (Screen Wake Lock) while it is open.
 */
export function SessionTimeline({ start, rows }: { start: string | null; rows: TimelineRow[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!start) return;
    const tick = () => setNow(minutesSince(start));
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, [start]);
  const current = now === null ? -1 : rows.findIndex((r) => now >= r.from && now < r.to);
  const next = now === null ? -1 : rows.findIndex((r) => r.from > now);
  const status =
    now === null
      ? null
      : now < 0
        ? `Starter om ${Math.ceil(-now)} min`
        : current >= 0
          ? `${Math.floor(now)} min ut i økta`
          : next >= 0
            ? "Pause"
            : "Økta er ferdig";
  return (
    <div className="nm-stack" style={{ gap: "var(--space-2)" }}>
      <div className="nm-row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)" }} aria-live="polite">
          {status}
        </span>
        <WakeLock />
      </div>
      <ol className="nm-timeline">
        {rows.map((r, i) => (
          <li key={i} className={i === current ? "is-now" : i === next && current < 0 ? "is-next" : undefined} aria-current={i === current ? "step" : undefined}>
            <span className="nm-timeline__time">
              {r.from}–{r.to}
            </span>
            <span>
              {i === current ? <span className="nm-timeline__tag">Nå</span> : i === next ? <span className="nm-timeline__tag nm-timeline__tag--next">Neste</span> : null}
              <strong>{r.label}</strong>
              {r.cells.length ? (
                <span className="nm-timeline__cells">
                  {r.cells.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Sentinel = { release: () => Promise<void> };

/** «Hold skjermen på»: asks for a screen wake lock and takes it again when the app comes back. */
function WakeLock() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature check after mount
    setSupported("wakeLock" in navigator);
  }, []);
  useEffect(() => {
    if (!on) return;
    let lock: Sentinel | null = null;
    let gone = false;
    const take = async () => {
      try {
        const l = (await (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<Sentinel> } }).wakeLock.request("screen")) as Sentinel;
        if (gone) void l.release();
        else lock = l;
      } catch {
        setOn(false);
      }
    };
    void take();
    const onVis = () => document.visibilityState === "visible" && void take();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [on]);
  if (!supported) return null;
  return (
    <button type="button" className={`nm-btn ${on ? "nm-btn--primary" : "nm-btn--secondary"}`} aria-pressed={on} onClick={() => setOn(!on)}>
      <Icon icon={Sun} />
      {on ? "Skjermen holdes på" : "Hold skjermen på"}
    </button>
  );
}
