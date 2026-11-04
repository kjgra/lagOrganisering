"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { findGroup, requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { pitchEvent } from "@/lib/plan-data";
import { MAX_PITCHES, WEEKDAY_PLURAL } from "@/lib/plans/pitch-schedule";
import { UserError } from "@/lib/store/access";
import { deleteWeekdayPitches, saveWeekdayPitches, setEventPitches } from "@/lib/store/pitch-schedule";

/** Faste baner per ukedag (Trening › Laget) and the pitches for one training. */

const sid = z.string().min(1).max(100);
const subId = z.string().max(100);
const pitchIds = z.array(z.number().int().positive()).max(MAX_PITCHES);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function trainer(groupId: string, sub = "") {
  const user = await requireUser();
  const group = findGroup(user, groupId);
  if (sub && !group.subgroups.some((s) => s.id === sub)) throw new UserError("Fant ikke laget.");
  return { user, group, d: await db() };
}

const scheduleInput = z.object({
  groupId: sid,
  sub: subId,
  from: dateKey,
  to: dateKey.nullable(),
  days: z.array(z.object({ weekday: z.number().int().min(1).max(7), pitch_ids: pitchIds })).max(7),
});

export async function saveWeekdayPitchesAction(input: z.input<typeof scheduleInput>): Promise<ActionResult> {
  return runAction("Lagring av faste baner", async () => {
    const v = scheduleInput.parse(input);
    const { user, d } = await trainer(v.groupId, v.sub);
    await saveWeekdayPitches(d, user.access, v.groupId, v.sub, { from: v.from, to: v.to, days: v.days });
    refresh();
    const names = v.days.map((x) => WEEKDAY_PLURAL[x.weekday - 1]);
    return { data: undefined, message: `Faste baner for ${names.join(", ")} er lagret.` };
  });
}

export async function deleteWeekdayPitchesAction(groupId: string, sub: string, id: number): Promise<ActionResult> {
  return runAction("Sletting av faste baner", async () => {
    const v = z.object({ groupId: sid, sub: subId, id: z.number().int().positive() }).parse({ groupId, sub, id });
    const { user, d } = await trainer(v.groupId, v.sub);
    await deleteWeekdayPitches(d, user.access, v.groupId, v.sub, v.id);
    refresh();
    return { data: undefined, message: "De faste banene er slettet." };
  });
}

/** Pitches for one training; an empty list (or the fixed ones) goes back to the fixed pitches. */
export async function setEventPitchesAction(groupId: string, eventId: string, ids: number[]): Promise<ActionResult> {
  return runAction("Lagring av baner for treningen", async () => {
    const v = z.object({ groupId: sid, eventId: sid, ids: pitchIds }).parse({ groupId, eventId, ids });
    const { user, group, d } = await trainer(v.groupId);
    const event = await findEvent(user, group.id, v.eventId);
    if (!event) throw new UserError("Fant ikke arrangementet.");
    await setEventPitches(d, user.access, group.id, pitchEvent(event), v.ids);
    refresh();
    return { data: undefined, message: v.ids.length ? "Banene for treningen er lagret." : "Treningen bruker de faste banene." };
  });
}
