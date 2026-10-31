import type { Db } from "@/lib/db";
import { assertGroup, type Access } from "./access";

/**
 * Reminders to evaluate after a training. Each plan knows when its training
 * ends (training_plans.event_end), so the app can remind without Spond:
 * inside the app for the trainer who is logged in, and as a push message on
 * the phone for trainers who turned it on.
 */

/** How long after a training it counts as one to evaluate (in the app). */
const PENDING_DAYS = 7;
/** Push: wait a little after the training, and give up after a few hours. */
export const PUSH_AFTER_MIN = 15;
export const PUSH_WITHIN_H = 6;

/** Keep the plans' training time up to date from Spond (also for plans saved before the time was stored). */
export async function syncPlanTimes(d: Db, access: Access, groupId: string, events: { id: string; start: string | null; end: string | null }[]): Promise<void> {
  assertGroup(access, groupId);
  const timed = events.filter((e) => e.end);
  if (!timed.length) return;
  await d.query(
    `UPDATE training_plans t SET event_start = v.s, event_end = v.e
       FROM unnest($2::text[], $3::timestamptz[], $4::timestamptz[]) AS v(id, s, e)
      WHERE t.spond_group_id = $1 AND t.spond_event_id = v.id
        AND (t.event_end IS DISTINCT FROM v.e OR t.event_start IS DISTINCT FROM v.s)`,
    [groupId, timed.map((e) => e.id), timed.map((e) => e.start), timed.map((e) => e.end)],
  );
}

export interface PendingEvaluation {
  planId: number;
  eventId: string;
  title: string;
  eventStart: Date | null;
}

// The plan to evaluate per event: the approved version, else the newest.
const PLAN_PER_EVENT = `
  SELECT DISTINCT ON (spond_group_id, spond_event_id) id, spond_group_id, spond_event_id, plan->>'tittel' AS title, event_start, event_end
    FROM training_plans WHERE status <> 'deleted' AND event_end IS NOT NULL
   ORDER BY spond_group_id, spond_event_id, (status = 'approved') DESC, version DESC`;

/** Trainings in the last week with a plan that this trainer has not evaluated, newest first. */
export async function pendingEvaluations(d: Db, access: Access, groupId: string, now = new Date()): Promise<PendingEvaluation[]> {
  assertGroup(access, groupId);
  return d.query<PendingEvaluation>(
    `SELECT p.id AS "planId", p.spond_event_id AS "eventId", p.title, p.event_start AS "eventStart"
       FROM (${PLAN_PER_EVENT}) p
      WHERE p.spond_group_id = $1 AND p.event_end <= $2::timestamptz AND p.event_end > $2::timestamptz - make_interval(days => $3::int)
        AND NOT EXISTS (SELECT 1 FROM exercise_feedback f
                         WHERE f.spond_group_id = p.spond_group_id AND f.spond_event_id = p.spond_event_id AND f.author = $4)
      ORDER BY p.event_end DESC
      LIMIT 3`,
    [groupId, now, PENDING_DAYS, access.profileId],
  );
}

// Push subscriptions ----------------------------------------------------------------------------

export interface PushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Turn on push for this device; also refreshes which groups it reminds about. */
export async function savePushSubscription(d: Db, access: Access, s: PushKeys): Promise<void> {
  await d.query(
    `INSERT INTO push_subscriptions (spond_profile_id, endpoint, p256dh, auth, group_ids) VALUES ($1, $2, $3, $4, $5::text[])
     ON CONFLICT (endpoint) DO UPDATE SET spond_profile_id = EXCLUDED.spond_profile_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
       group_ids = EXCLUDED.group_ids, updated_at = now()`,
    [access.profileId, s.endpoint, s.p256dh, s.auth, [...access.groupIds]],
  );
}

export async function deletePushSubscription(d: Db, access: Access, endpoint: string): Promise<void> {
  await d.query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND spond_profile_id = $2", [endpoint, access.profileId]);
}

export async function myPushSubscriptions(d: Db, access: Access): Promise<PushKeys[]> {
  return d.query<PushKeys>("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE spond_profile_id = $1", [access.profileId]);
}

// For the scheduled job (no one is logged in) ---------------------------------------------------

export interface DueReminder {
  profileId: string;
  groupId: string;
  eventId: string;
  planId: number;
  title: string;
  subscriptions: PushKeys[];
}

/**
 * Trainings that ended a little while ago, per trainer with push for the
 * group who has neither evaluated nor been reminded. Runs without a user, so
 * it only reads what the job needs.
 */
export async function dueReminders(d: Db, now = new Date()): Promise<DueReminder[]> {
  const rows = await d.query<{ profile_id: string; group_id: string; event_id: string; plan_id: number; title: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT s.spond_profile_id AS profile_id, p.spond_group_id AS group_id, p.spond_event_id AS event_id, p.id AS plan_id, p.title,
            s.endpoint, s.p256dh, s.auth
       FROM (${PLAN_PER_EVENT}) p
       JOIN push_subscriptions s ON p.spond_group_id = ANY(s.group_ids)
      WHERE p.event_end <= $1::timestamptz - make_interval(mins => $2::int) AND p.event_end > $1::timestamptz - make_interval(hours => $3::int)
        AND NOT EXISTS (SELECT 1 FROM evaluation_reminders r
                         WHERE r.spond_group_id = p.spond_group_id AND r.spond_event_id = p.spond_event_id AND r.spond_profile_id = s.spond_profile_id)
        AND NOT EXISTS (SELECT 1 FROM exercise_feedback f
                         WHERE f.spond_group_id = p.spond_group_id AND f.spond_event_id = p.spond_event_id AND f.author = s.spond_profile_id)
      ORDER BY p.event_end, s.spond_profile_id`,
    [now, PUSH_AFTER_MIN, PUSH_WITHIN_H],
  );
  const out = new Map<string, DueReminder>();
  for (const r of rows) {
    const key = `${r.profile_id}\n${r.group_id}\n${r.event_id}`;
    const x = out.get(key) ?? { profileId: r.profile_id, groupId: r.group_id, eventId: r.event_id, planId: r.plan_id, title: r.title, subscriptions: [] };
    x.subscriptions.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
    out.set(key, x);
  }
  return [...out.values()];
}

/** Mark as reminded; false when another run got there first. */
export async function markReminded(d: Db, r: Pick<DueReminder, "groupId" | "eventId" | "profileId">): Promise<boolean> {
  const rows = await d.query(
    `INSERT INTO evaluation_reminders (spond_group_id, spond_event_id, spond_profile_id) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING 1`,
    [r.groupId, r.eventId, r.profileId],
  );
  return rows.length > 0;
}

/** A device that the push service says is gone (unsubscribed, app removed). */
export async function forgetPushSubscription(d: Db, endpoint: string): Promise<void> {
  await d.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}

/** The devices of trainers with push for a group (the weekly note about proposals). */
export async function groupPushSubscriptions(d: Db, groupId: string): Promise<PushKeys[]> {
  return d.query<PushKeys>("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE $1 = ANY(group_ids)", [groupId]);
}
