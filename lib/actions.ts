import "server-only";
import { AiError } from "@/lib/ai/plan-ai";
import { DrawingError } from "@/lib/plans/drawing";
import { GithubError } from "@/lib/github";
import { FeedbackError } from "@/lib/plans/feedback";
import { PlanError } from "@/lib/plans/plan";
import { UserError } from "@/lib/store/access";

const USER_ERRORS = [UserError, AiError, PlanError, FeedbackError, DrawingError, GithubError];

/** The answer of a Server Action called from a client component. */
export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

/**
 * Runs an action body: messages meant for the user are returned, other
 * errors are logged and replaced by a general message. Redirects pass through.
 */
export async function runAction<T>(what: string, f: () => Promise<{ data: T; message?: string }>): Promise<ActionResult<T>> {
  try {
    const r = await f();
    return { ok: true, data: r.data, message: r.message };
  } catch (err) {
    if (USER_ERRORS.some((E) => err instanceof E)) return { ok: false, error: (err as Error).message };
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    if (err instanceof Error && err.name === "ZodError") return { ok: false, error: "Ugyldige data." };
    console.error(`${what} feilet:`, (err as Error).message);
    return { ok: false, error: "Fikk ikke lagret. Prøv igjen om litt." };
  }
}
