import "server-only";
import { env } from "@/lib/env";

/**
 * Creates GitHub issues for feedback the superadmin has approved. Uses a
 * fine-grained token with only «Issues: Read and write» on the repository
 * (GITHUB_FEEDBACK_TOKEN), set in Vercel for Production only. With simulated
 * Spond (demo, preview) no issue is created: the app pretends.
 */

export type GithubMode = "real" | "mock" | "off";

export function githubMode(): GithubMode {
  const e = env();
  if (e.SPOND_MOCK) return "mock";
  return e.GITHUB_FEEDBACK_TOKEN ? "real" : "off";
}

export function feedbackRepo(): string {
  return env().GITHUB_FEEDBACK_REPO;
}

export class GithubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubError";
  }
}

export async function createIssue(issue: { title: string; body: string; labels: string[] }): Promise<{ number: number; url: string }> {
  const mode = githubMode();
  const repo = feedbackRepo();
  if (mode === "mock") return { number: 0, url: `https://github.com/${repo}/issues` };
  if (mode === "off") throw new GithubError("GitHub er ikke satt opp (GITHUB_FEEDBACK_TOKEN mangler).");
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env().GITHUB_FEEDBACK_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "lagorganisering",
    },
    body: JSON.stringify(issue),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // The status only: the answer could echo the request.
    console.error("GitHub-issue feilet:", res.status);
    if (res.status === 401 || res.status === 403) throw new GithubError("GitHub avviste nøkkelen. Sjekk GITHUB_FEEDBACK_TOKEN.");
    if (res.status === 404) throw new GithubError(`Fant ikke repoet ${repo}, eller nøkkelen har ikke tilgang til det.`);
    throw new GithubError("GitHub svarte ikke som ventet. Prøv igjen om litt.");
  }
  const j = (await res.json()) as { number?: unknown; html_url?: unknown };
  if (typeof j.number !== "number" || typeof j.html_url !== "string") throw new GithubError("GitHub svarte ikke som ventet.");
  return { number: j.number, url: j.html_url };
}
