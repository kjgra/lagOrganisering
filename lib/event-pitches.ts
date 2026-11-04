import "server-only";
import type { Db } from "@/lib/db";
import { pitchEvent } from "@/lib/plan-data";
import { dateText, WEEKDAY_PLURAL, type EventPitches } from "@/lib/plans/pitch-schedule";
import type { Pitch } from "@/lib/plans/plan";
import type { SpondEvent } from "@/lib/spond/types";
import type { Access } from "@/lib/store/access";
import { pitchesForEvent } from "@/lib/store/pitch-schedule";
import { listPitches, teamPitches } from "@/lib/store/training";

export interface EventPitchView {
  /** The team's pitches to choose from. */
  pool: Pitch[];
  resolved: EventPitches;
  chosenNames: string;
  sourceText: string;
  warning: string | null;
  fixedNames: string | null;
}

/**
 * The pitches for a training with text for the event page: its own, the
 * weekday's fixed ones, or a reminder to choose when the fixed ones ended.
 */
export async function eventPitchView(d: Db, access: Access, groupId: string, event: SpondEvent, today: string): Promise<EventPitchView> {
  const e = pitchEvent(event);
  const [pool, all, resolved] = await Promise.all([teamPitches(d, access, groupId, e.sub), listPitches(d), pitchesForEvent(d, access, groupId, e)]);
  const name = new Map(all.map((p) => [p.id, p.name]));
  const names = (ids: number[]) => ids.map((id) => name.get(id) ?? "Ukjent bane").join(", ");
  const day = e.date ? WEEKDAY_PLURAL[(new Date(`${e.date}T12:00:00Z`).getUTCDay() + 6) % 7] : "";
  const sourceText = resolved.source === "event" ? "endret for denne treningen" : resolved.source === "fixed" ? `fast for ${day}` : "";
  const warning = resolved.expired
    ? `De faste banene for ${day} sluttet ${dateText(resolved.expired.valid_to!, today)}. Velg baner for denne treningen, eller legg inn nye faste baner under Trening › Laget.`
    : null;
  return {
    pool,
    resolved,
    chosenNames: resolved.ids.length ? names(resolved.ids) : "Ikke valgt",
    sourceText,
    warning,
    fixedNames: resolved.fixed ? names(resolved.fixed.pitch_ids) : null,
  };
}
