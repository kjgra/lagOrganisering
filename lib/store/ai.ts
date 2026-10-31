import type { Db } from "@/lib/db";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@/lib/ai/plan-ai";
import { validateDomains } from "@/lib/ai/links";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import { assertGroup, assertSuperadmin, UserError, type Access, type Rights } from "./access";

/** KI settings and usage. Usage rows hold tokens and cost, never prompt or answer text. */

export async function getAiSettings(d: Db): Promise<AiSettings> {
  const rows = await d.query<{
    model: string;
    group_limit_nok: number;
    total_limit_usd: number;
    max_new_exercises: number;
    usd_nok: number;
    link_domains: string[];
    pattern_min_sessions: number;
    pattern_min_trainers: number;
    updated_by: string;
    updated_at: Date;
  }>(
    `SELECT model, group_limit_nok::float8 AS group_limit_nok, total_limit_usd::float8 AS total_limit_usd, max_new_exercises,
            usd_nok::float8 AS usd_nok, link_domains, pattern_min_sessions, pattern_min_trainers, updated_by, updated_at FROM ai_settings WHERE id`,
  );
  return rows[0] ? { ...rows[0] } : { ...DEFAULT_AI_SETTINGS };
}

export async function saveAiSettings(d: Db, rights: Rights, actor: string, s: Record<string, unknown>): Promise<void> {
  assertSuperadmin(rights);
  const num = (x: unknown, what: string, lo: number, hi: number) => {
    const v = Number(String(x ?? "").replace(",", "."));
    if (!Number.isFinite(v) || v < lo || v > hi) throw new UserError(`${what} må være et tall fra ${lo} til ${hi}.`);
    return v;
  };
  const model = String(s.model ?? "");
  if (!(model in AI_MODELS)) throw new UserError("Ukjent modell.");
  const maxNew = num(s.max_new_exercises, "Maks nye øvelser", 0, 6);
  if (!Number.isInteger(maxNew)) throw new UserError("Maks nye øvelser må være et helt tall.");
  // Missing (an older form) keeps the default.
  const whole = (x: unknown, fallback: number, what: string, lo: number, hi: number) => {
    const v = num(x ?? fallback, what, lo, hi);
    if (!Number.isInteger(v)) throw new UserError(`${what} må være et helt tall.`);
    return v;
  };
  let domains: string[];
  try {
    domains = validateDomains(String(s.link_domains ?? ""));
  } catch (err) {
    throw new UserError((err as Error).message);
  }
  await d.query(
    `INSERT INTO ai_settings (id, model, group_limit_nok, total_limit_usd, max_new_exercises, usd_nok, link_domains, updated_by,
                             pattern_min_sessions, pattern_min_trainers)
     VALUES (true, $1, $2, $3, $4, $5, $6::text[], $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET model = EXCLUDED.model, group_limit_nok = EXCLUDED.group_limit_nok,
       total_limit_usd = EXCLUDED.total_limit_usd, max_new_exercises = EXCLUDED.max_new_exercises, usd_nok = EXCLUDED.usd_nok,
       link_domains = EXCLUDED.link_domains, updated_by = EXCLUDED.updated_by, updated_at = now(),
       pattern_min_sessions = EXCLUDED.pattern_min_sessions, pattern_min_trainers = EXCLUDED.pattern_min_trainers`,
    [
      model,
      num(s.group_limit_nok, "Grensen per lag", 0, 10000),
      num(s.total_limit_usd, "Grensen totalt", 0, 1000),
      maxNew,
      num(s.usd_nok, "Dollarkursen", 1, 100),
      domains,
      actor,
      whole(s.pattern_min_sessions, DEFAULT_AI_SETTINGS.pattern_min_sessions, "Økter for et mønster", 1, 20),
      whole(s.pattern_min_trainers, DEFAULT_AI_SETTINGS.pattern_min_trainers, "Trenere for et mønster", 1, 10),
    ],
  );
}

export interface UsageRow {
  kind: "draft" | "revision" | "visual" | "learning" | "exercise" | "feedback" | "observations";
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  duration_ms: number | null;
  status: "ok" | "error";
  error_code: string;
}

export async function logAiUsage(d: Db, access: Access, groupId: string, u: UsageRow, eventId: string | null, planId: number | null = null): Promise<number> {
  assertGroup(access, groupId);
  const [{ id }] = await d.query<{ id: number }>(
    `INSERT INTO ai_usage (spond_profile_id, spond_group_id, spond_event_id, plan_id, kind, model, input_tokens, output_tokens,
                           cache_read_tokens, cache_write_tokens, cost_usd, duration_ms, status, error_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULLIF($14, '')) RETURNING id`,
    [access.profileId, groupId, eventId, planId, u.kind, u.model.slice(0, 60), Math.round(u.input_tokens), Math.round(u.output_tokens), Math.round(u.cache_read_tokens), Math.round(u.cache_write_tokens), Number(u.cost_usd.toFixed(5)), u.duration_ms, u.status, u.error_code.slice(0, 60)],
  );
  return id;
}

/** Spent since `since` (start of the month): the group, and the whole app as a sum only. */
export async function aiSpend(d: Db, access: Access, groupId: string, since: Date) {
  assertGroup(access, groupId);
  const [r] = await d.query<{ group_usd: number; total_usd: number }>(
    `SELECT coalesce(sum(cost_usd) FILTER (WHERE spond_group_id = $1), 0)::float8 AS group_usd, coalesce(sum(cost_usd), 0)::float8 AS total_usd
       FROM ai_usage WHERE created_at >= $2::timestamptz`,
    [groupId, since.toISOString()],
  );
  return r;
}

/** Typical answer length (median of the last 20 successful calls), for the price estimate. */
export async function typicalOutput(d: Db, kind: string, model: string): Promise<number | null> {
  const [r] = await d.query<{ n: number | null }>(
    `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY output_tokens)::float8 AS n
       FROM (SELECT output_tokens FROM ai_usage WHERE kind = $1 AND model = $2 AND status = 'ok' AND output_tokens > 0
              ORDER BY created_at DESC LIMIT 20) t`,
    [kind, model],
  );
  return r?.n ?? null;
}

/** One group's calls in a period, and the sum for the whole app (admin overview). */
export async function aiUsagePeriod(d: Db, access: Access, groupId: string, from: Date, to: Date) {
  assertGroup(access, groupId);
  const rows = await d.query<{
    created_at: Date;
    spond_profile_id: string;
    kind: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    cost_usd: number;
    status: string;
  }>(
    `SELECT created_at, spond_profile_id, kind, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
            cost_usd::float8 AS cost_usd, status
       FROM ai_usage WHERE spond_group_id = $1 AND created_at >= $2::timestamptz AND created_at < $3::timestamptz ORDER BY created_at`,
    [groupId, from.toISOString(), to.toISOString()],
  );
  const [{ usd }] = await d.query<{ usd: number }>(
    "SELECT coalesce(sum(cost_usd), 0)::float8 AS usd FROM ai_usage WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz",
    [from.toISOString(), to.toISOString()],
  );
  return { rows, totalUsd: usd };
}
