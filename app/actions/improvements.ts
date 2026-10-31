"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { findGroup, requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { exerciseChanges } from "@/lib/plans/exercise-edits";
import { exerciseValues } from "@/lib/plans/exercise-values";
import { REJECTION_MAX } from "@/lib/plans/improvements";
import { isSensitive, memberNames, namesProblem } from "@/lib/sensitive";
import { UserError } from "@/lib/store/access";
import { decideProposal, getProposal } from "@/lib/store/improvements";
import { getExercise, saveExercise } from "@/lib/store/training";

const sid = z.string().min(1).max(100);
const id = z.number().int().positive();

async function proposalFor(groupId: string, proposalId: number) {
  const user = await requireUser();
  const group = findGroup(user, groupId);
  const d = await db();
  const p = await getProposal(d, user.access, group.id, proposalId);
  if (p.status !== "ny") throw new UserError("Forslaget er allerede behandlet.");
  return { user, group, d, p };
}

/** «Bruk»: save the proposal as the exercise, unless the exercise has changed since. */
export async function applyProposalAction(groupId: string, proposalId: number): Promise<ActionResult<number>> {
  return runAction("Bruk forslaget", async () => {
    const v = z.object({ groupId: sid, proposalId: id }).parse({ groupId, proposalId });
    const { user, group, d, p } = await proposalFor(v.groupId, v.proposalId);
    if (!p.exercise_id) throw new UserError("Øvelsen finnes ikke lenger i banken.");
    const now = exerciseValues(await getExercise(d, user.access, group.id, p.exercise_id));
    if (Object.keys(exerciseChanges(now, p.base_values)).length) {
      throw new UserError("Øvelsen er endret siden forslaget ble laget. Velg «Endre først» for å se over forslaget.");
    }
    const input = { ...p.proposed, themes: p.proposed.themes.split(",").map((t) => t.trim()).filter(Boolean) };
    await saveExercise(d, user.access, group.id, input, p.exercise_id, { kiDraft: p.proposed });
    await decideProposal(d, user.access, group.id, p.id, "brukt");
    refresh();
    return { data: p.exercise_id, message: p.kind === "arkiver" ? `«${p.exercise_name}» er arkivert.` : `«${p.proposed.name}» er oppdatert.` };
  });
}

/** «Avvis»: with one sentence on why, which KI gets with it next time. */
export async function rejectProposalAction(groupId: string, proposalId: number, reason: string): Promise<ActionResult> {
  return runAction("Avvis forslaget", async () => {
    const v = z.object({ groupId: sid, proposalId: id, reason: z.string().max(REJECTION_MAX + 50) }).parse({ groupId, proposalId, reason });
    const { user, group, d, p } = await proposalFor(v.groupId, v.proposalId);
    const why = v.reason.replace(/\s+/g, " ").trim();
    if (!why) throw new UserError("Skriv kort hvorfor, så blir neste forslag bedre.");
    if (why.length > REJECTION_MAX) throw new UserError(`Begrunnelsen kan ha maks ${REJECTION_MAX} tegn.`);
    if (isSensitive(why)) throw new UserError("Begrunnelsen skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
    const np = namesProblem(why, memberNames(group.members), "Skriv uten navn, begrunnelsen sendes til KI");
    if (np) throw new UserError(np);
    await decideProposal(d, user.access, group.id, p.id, "avvist", why);
    refresh();
    return { data: undefined, message: "Forslaget er avvist. Begrunnelsen tas med neste gang." };
  });
}
