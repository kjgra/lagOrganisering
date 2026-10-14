import { osloParts, weekdayShort } from "@/lib/format";

/** Weekday and day number. Black when the event is sent in Spond; white with a dashed edge when not. */
export function DateBlock({ start, sent, cancelled }: { start: string | null; sent: boolean; cancelled?: boolean }) {
  return (
    <div
      className={sent ? "nm-date" : "nm-date nm-date--unsent"}
      aria-hidden="true"
      style={cancelled ? { opacity: 0.55 } : undefined}
    >
      <span className="nm-date__wd">{start ? weekdayShort(start) : ""}</span>
      <span className="nm-date__day">{start ? osloParts(start).day : "?"}</span>
    </div>
  );
}
