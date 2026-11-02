import "server-only";
import { APP_VERSION } from "@/lib/changelog-file";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { errorInfo, errorIssueBody, errorIssueTitle, ERROR_LABEL, fingerprint, type ErrorInfo, type ErrorSource } from "@/lib/error-report";
import { createIssue, githubMode, issueState } from "@/lib/github";
import { claimIssue, mayReopen, recordError, setIssue } from "@/lib/store/errors";

/**
 * Reports an error: logged to Vercel as before («<area> feilet: <message>»),
 * saved in the error log, and in production a new kind of error becomes a
 * GitHub issue labelled «auto-feil» (see lib/error-report.ts). Never throws,
 * and gives up after a few seconds so a slow database never holds a request.
 */
export async function reportError(area: string, err: unknown, opts: { route?: string; source?: ErrorSource } = {}): Promise<void> {
  const info = errorInfo(area, err, opts);
  console.error(`${info.area} feilet:`, info.message);
  if (process.env.VITEST) return;
  try {
    await Promise.race([record(info), new Promise((_, reject) => setTimeout(() => reject(new Error("tidsavbrudd")), 8000))]);
  } catch (e) {
    console.error("Feillogging feilet:", (e as Error).message);
  }
}

async function record(info: ErrorInfo): Promise<void> {
  const d = await db();
  const fp = fingerprint(info);
  const row = await recordError(d, fp, info, APP_VERSION);
  if (githubMode() !== "real" || env().VERCEL_ENV !== "production") return;
  const claim = await claimIssue(d, row.id, APP_VERSION);
  if (!claim) return;
  let previous: number | undefined;
  if (claim === "sjekk") {
    if (row.issue_number === null || (await issueState(row.issue_number)) !== "closed" || !(await mayReopen(d))) return;
    previous = row.issue_number;
  }
  const issue = await createIssue({
    title: errorIssueTitle(info),
    body: errorIssueBody({ ...info, fingerprint: fp, appVersion: APP_VERSION, firstSeen: row.first_seen, count: row.count, previous }),
    labels: [ERROR_LABEL, info.source],
  });
  await setIssue(d, row.id, issue, APP_VERSION);
}
