"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser, type CurrentUser } from "@/lib/auth/current";
import { APP_VERSION } from "@/lib/changelog-file";
import { db } from "@/lib/db";
import { cleanPage, clientSummary, FEEDBACK_MAX, feedbackProblem, issueBody, issueLabels, issueTitle } from "@/lib/feedback";
import { createIssue, githubMode } from "@/lib/github";
import { memberNames } from "@/lib/sensitive";
import { UserError } from "@/lib/store/access";
import { addFeedback, deleteFeedback, getWaitingFeedback, markFeedbackSent } from "@/lib/store/feedback";

const id = z.number().int().positive();

/** Names of members and trainers in all the user's groups, which must not be in the text. */
function namesFor(user: CurrentUser): string[] {
  const all = user.data.groups.flatMap((g) => g.members.map((m) => ({ firstName: m.firstName, lastName: m.lastName })));
  return memberNames([...all, { firstName: user.data.profile.firstName, lastName: user.data.profile.lastName }]);
}

function checkText(user: CurrentUser, text: string): string {
  const body = text.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  const problem = feedbackProblem(body, namesFor(user));
  if (problem) throw new UserError(problem);
  return body;
}

/** «Send tilbakemelding»: saved for the superadmin to read, nothing goes to GitHub yet. */
export async function sendFeedbackAction(input: { kind: string; body: string; page: string; width: number | null }): Promise<ActionResult> {
  return runAction("Send tilbakemelding", async () => {
    const v = z
      .object({
        kind: z.enum(["feil", "forslag"]),
        body: z.string().max(FEEDBACK_MAX + 200),
        page: z.string().max(500),
        width: z.number().int().min(0).max(10_000).nullable(),
      })
      .parse(input);
    const user = await requireUser();
    const body = checkText(user, v.body);
    const ua = (await headers()).get("user-agent") ?? "";
    await addFeedback(await db(), user.session.profileId, {
      kind: v.kind,
      body,
      page: cleanPage(v.page),
      appVersion: APP_VERSION,
      client: clientSummary(ua, v.width).slice(0, 100),
      role: user.rights.admin ? "admin" : "trener",
    });
    return { data: undefined, message: "Takk! Tilbakemeldingen er sendt." };
  });
}

/** «Send til GitHub»: the (possibly edited) text becomes a public issue. */
export async function publishFeedbackAction(reportId: number, text: string): Promise<ActionResult<string>> {
  return runAction("Send til GitHub", async () => {
    const v = z.object({ reportId: id, text: z.string().max(FEEDBACK_MAX + 200) }).parse({ reportId, text });
    const user = await requireUser();
    const d = await db();
    const r = await getWaitingFeedback(d, user.rights, v.reportId);
    const body = checkText(user, v.text);
    const issue = await createIssue({
      title: issueTitle({ kind: r.kind, body }),
      body: issueBody({ kind: r.kind, body, page: r.page, appVersion: r.app_version, client: r.client, role: r.role, createdAt: new Date(r.created_at) }),
      labels: issueLabels(r.kind),
    });
    await markFeedbackSent(d, user.rights, user.session.profileId, r.id, body, issue);
    refresh();
    return {
      data: issue.url,
      message: githubMode() === "mock" ? "Simulert: ingen issue ble laget i demo." : `Sendt til GitHub som issue #${issue.number}.`,
    };
  });
}

/** «Avvis»: the report is deleted. */
export async function rejectFeedbackAction(reportId: number): Promise<ActionResult> {
  return runAction("Avvis tilbakemelding", async () => {
    const v = id.parse(reportId);
    const user = await requireUser();
    await deleteFeedback(await db(), user.rights, v);
    refresh();
    return { data: undefined, message: "Tilbakemeldingen er slettet." };
  });
}
