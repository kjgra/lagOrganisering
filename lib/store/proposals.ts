import type { Db } from "@/lib/db";
import { commentProblem } from "@/lib/sensitive";
import { assertGroup, UserError, type Access } from "./access";

/**
 * Team proposals (lagforslag): groups of players for an event, or a sketch
 * of new subgroups (gruppeutkast, no event). Statuses and approval as in the
 * old app. Only Spond ids are stored; names come from Spond when shown.
 */

export type ProposalStatus = "draft" | "pending" | "approved" | "rejected" | "rolled_back" | "deleted";

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Utkast",
  pending: "Til godkjenning",
  approved: "Godkjent",
  rejected: "Avslått",
  rolled_back: "Rullet tilbake",
  deleted: "Slettet",
};

export type Decision = "created" | "edited" | "sent_for_approval" | "approved" | "rejected" | "rolled_back" | "deleted";

export const DECISION_LABEL: Record<Decision, string> = {
  created: "laget forslaget",
  edited: "endret gruppene",
  sent_for_approval: "sendte til godkjenning",
  approved: "godkjente",
  rejected: "avslo",
  rolled_back: "rullet tilbake",
  deleted: "slettet",
};

export interface ThreadItem {
  actor: string;
  text: string;
  createdAt: Date;
}

export interface Proposal {
  id: number;
  groupId: string;
  eventId: string | null;
  subgroupId: string | null;
  name: string;
  status: ProposalStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
  /** member id -> label */
  assignments: Record<string, string>;
  comments: ThreadItem[];
  history: (ThreadItem & { text: Decision })[];
}

/**
 * Every live proposal can be edited. Waiting and approved ones keep their
 * status (teams change at the pitch); the history shows who changed them.
 */
export const EDITABLE: ProposalStatus[] = ["draft", "pending", "approved", "rolled_back", "rejected"];
/** Statuses an edit keeps; the others go back to «Utkast» (or to approval). */
export const KEEPS_STATUS: ProposalStatus[] = ["pending", "approved"];
export const isEditable = (s: ProposalStatus) => EDITABLE.includes(s);

export type Action = "submit" | "approve" | "reject" | "rollback" | "delete";

export const TRANSITIONS: Record<Action, { from: ProposalStatus[]; to: ProposalStatus; log: Decision }> = {
  submit: { from: ["draft"], to: "pending", log: "sent_for_approval" },
  approve: { from: ["pending"], to: "approved", log: "approved" },
  reject: { from: ["pending"], to: "rejected", log: "rejected" },
  rollback: { from: ["approved"], to: "rolled_back", log: "rolled_back" },
  delete: { from: ["draft", "rolled_back", "rejected"], to: "deleted", log: "deleted" },
};

/** What can be done in a status. Every trainer with access may do every action. */
export function actionsFor(status: ProposalStatus): Action[] {
  return (Object.keys(TRANSITIONS) as Action[]).filter((a) => TRANSITIONS[a].from.includes(status));
}

/** Approved first, then waiting, drafts, rejected/rolled back; oldest first within. */
export function sortProposals<T extends { status: ProposalStatus; id: number }>(list: T[]): T[] {
  const rank: Record<ProposalStatus, number> = { approved: 1, pending: 2, draft: 3, rejected: 4, rolled_back: 5, deleted: 9 };
  return [...list].sort((a, b) => rank[a.status] - rank[b.status] || a.id - b.id);
}

interface HeaderRow {
  id: number;
  spond_group_id: string;
  spond_subgroup_id: string | null;
  spond_event_id: string | null;
  name: string;
  status: ProposalStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

async function hydrate(d: Db, headers: HeaderRow[]): Promise<Proposal[]> {
  if (!headers.length) return [];
  const ids = headers.map((h) => h.id);
  const [labels, members, threads] = await Promise.all([
    d.query<{ proposal_id: number; label: string }>(
      "SELECT proposal_id, label FROM group_proposal_labels WHERE proposal_id = ANY($1::int[]) ORDER BY proposal_id, sort_order",
      [ids],
    ),
    d.query<{ proposal_id: number; spond_member_id: string; label: string }>(
      "SELECT proposal_id, spond_member_id, label FROM group_proposal_members WHERE proposal_id = ANY($1::int[])",
      [ids],
    ),
    d.query<{ proposal_id: number; kind: string; actor: string; text: string; created_at: Date }>(
      `SELECT proposal_id, kind, actor, text, created_at FROM (
         SELECT proposal_id, 'comment' AS kind, author AS actor, body AS text, created_at, id FROM proposal_comments
         UNION ALL
         SELECT proposal_id, 'history', actor, decision, created_at, id FROM proposal_history
       ) x WHERE proposal_id = ANY($1::int[]) ORDER BY created_at, kind, id`,
      [ids],
    ),
  ]);
  return headers.map((h) => ({
    id: h.id,
    groupId: h.spond_group_id,
    eventId: h.spond_event_id,
    subgroupId: h.spond_subgroup_id,
    name: h.name,
    status: h.status,
    createdBy: h.created_by,
    createdAt: new Date(h.created_at),
    updatedAt: new Date(h.updated_at),
    labels: labels.filter((l) => l.proposal_id === h.id).map((l) => l.label),
    assignments: Object.fromEntries(members.filter((m) => m.proposal_id === h.id).map((m) => [m.spond_member_id, m.label])),
    comments: threads
      .filter((t) => t.proposal_id === h.id && t.kind === "comment")
      .map((t) => ({ actor: t.actor, text: t.text, createdAt: new Date(t.created_at) })),
    history: threads
      .filter((t) => t.proposal_id === h.id && t.kind === "history")
      .map((t) => ({ actor: t.actor, text: t.text as Decision, createdAt: new Date(t.created_at) })),
  }));
}

const SELECT = `SELECT id, spond_group_id, spond_subgroup_id, spond_event_id, name, status, created_by, created_at, updated_at
                  FROM group_proposals`;

/**
 * Proposals for these events, plus gruppeutkast made in this context (and
 * those waiting for approval from any context, for «Til godkjenning»).
 */
export async function listProposals(
  d: Db,
  access: Access,
  groupId: string,
  opts: { eventIds?: string[]; subgroupId?: string | null; drafts?: boolean } = {},
): Promise<Proposal[]> {
  assertGroup(access, groupId);
  const headers = await d.query<HeaderRow>(
    `${SELECT}
      WHERE spond_group_id = $1 AND status <> 'deleted'
        AND (spond_event_id = ANY($2::text[])
             OR ($4::boolean AND spond_event_id IS NULL
                 AND (spond_subgroup_id IS NOT DISTINCT FROM NULLIF($3, '') OR status = 'pending')))
      ORDER BY created_at, id`,
    [groupId, opts.eventIds ?? [], opts.subgroupId ?? "", opts.drafts ?? true],
  );
  return hydrate(d, headers);
}

/** The proposal that counts for an event: the approved one, else the last saved. */
export function chosenProposal<T extends { status: ProposalStatus; updatedAt: Date; id: number }>(list: T[]): T | null {
  const live = list.filter((p) => p.status !== "deleted");
  const approved = live.find((p) => p.status === "approved");
  return approved ?? live.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id)[0] ?? null;
}

/**
 * «Forrige treninger»: the teams (member ids) of each event that has a
 * proposal, in the order given (newest first). Events without one are left out.
 */
export async function teamsOfEvents(d: Db, access: Access, groupId: string, eventIds: string[]): Promise<string[][][]> {
  if (!eventIds.length) return [];
  const all = await listProposals(d, access, groupId, { eventIds, drafts: false });
  return eventIds.flatMap((e) => {
    const p = chosenProposal(all.filter((x) => x.eventId === e));
    if (!p) return [];
    const teams = p.labels.map((l) => Object.entries(p.assignments).filter(([, x]) => x === l).map(([id]) => id)).filter((t) => t.length);
    return teams.length ? [teams] : [];
  });
}

/** All proposals waiting for approval in a main group. */
export async function pendingProposals(d: Db, access: Access, groupId: string): Promise<Proposal[]> {
  assertGroup(access, groupId);
  return hydrate(d, await d.query<HeaderRow>(`${SELECT} WHERE spond_group_id = $1 AND status = 'pending' ORDER BY created_at, id`, [groupId]));
}

export async function getProposal(d: Db, access: Access, id: number): Promise<Proposal> {
  const rows = await d.query<HeaderRow>(`${SELECT} WHERE id = $1 AND status <> 'deleted'`, [id]);
  if (!rows.length) throw new UserError("Fant ikke forslaget.");
  assertGroup(access, rows[0].spond_group_id);
  return (await hydrate(d, rows))[0];
}

export function validateProposal(name: string, labels: string[], assignments: Record<string, string>) {
  const n = name.trim();
  if (!n || n.length > 120) throw new UserError("Navnet på forslaget må ha mellom 1 og 120 tegn.");
  const ls = labels.map((l) => l.trim().replace(/\s+/g, " "));
  if (!ls.length) throw new UserError("Forslaget må ha minst én gruppe.");
  if (ls.some((l) => !l || l.length > 60)) throw new UserError("Gruppenavn må ha mellom 1 og 60 tegn.");
  if (new Set(ls.map((l) => l.toLowerCase())).size !== ls.length) throw new UserError("To grupper kan ikke ha samme navn.");
  for (const l of Object.values(assignments)) {
    if (!ls.includes(l)) throw new UserError(`Ukjent gruppe i fordelingen: ${l}`);
  }
  return { name: n, labels: ls };
}

async function writeGroups(t: Db, id: number, labels: string[], assignments: Record<string, string>) {
  await t.query("DELETE FROM group_proposal_labels WHERE proposal_id = $1", [id]);
  await t.query(
    `INSERT INTO group_proposal_labels (proposal_id, label, sort_order)
     SELECT $1, x.label, x.ord FROM unnest($2::text[]) WITH ORDINALITY AS x(label, ord)`,
    [id, labels],
  );
  const entries = Object.entries(assignments);
  if (entries.length) {
    await t.query(
      `INSERT INTO group_proposal_members (proposal_id, spond_member_id, label)
       SELECT $1, x.member, x.label FROM unnest($2::text[], $3::text[]) AS x(member, label)`,
      [id, entries.map((e) => e[0]), entries.map((e) => e[1])],
    );
  }
}

async function log(t: Db, id: number, actor: string, decisions: Decision[]) {
  for (const dec of decisions) {
    await t.query("INSERT INTO proposal_history (proposal_id, actor, decision) VALUES ($1, $2, $3)", [id, actor, dec]);
  }
}

/**
 * Create (no `id`) or overwrite a proposal. Only draft, rejected and rolled
 * back proposals can be edited; editing sets the status back to draft.
 */
export async function saveProposal(
  d: Db,
  access: Access,
  input: {
    groupId: string;
    name: string;
    labels: string[];
    assignments: Record<string, string>;
    eventId?: string | null;
    subgroupId?: string | null;
    id?: number | null;
    submit?: boolean;
  },
): Promise<number> {
  assertGroup(access, input.groupId);
  const v = validateProposal(input.name, input.labels, input.assignments);
  const status: ProposalStatus = input.submit ? "pending" : "draft";
  return d.tx(async (t) => {
    if (!input.id) {
      const [{ id }] = await t.query<{ id: number }>(
        `INSERT INTO group_proposals (spond_group_id, spond_subgroup_id, spond_event_id, name, created_by, status)
         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6) RETURNING id`,
        // Event proposals follow the event's visibility, so they carry no subgroup.
        [input.groupId, input.eventId ? "" : (input.subgroupId ?? ""), input.eventId ?? "", v.name, access.profileId, status],
      );
      await writeGroups(t, id, v.labels, input.assignments);
      await log(t, id, access.profileId, input.submit ? ["created", "sent_for_approval"] : ["created"]);
      return id;
    }
    const cur = await t.query<{ spond_group_id: string; status: ProposalStatus }>(
      "SELECT spond_group_id, status FROM group_proposals WHERE id = $1 FOR UPDATE",
      [input.id],
    );
    if (!cur.length || cur[0].status === "deleted") throw new UserError("Fant ikke forslaget.");
    if (cur[0].spond_group_id !== input.groupId) throw new UserError("Forslaget hører til en annen gruppe.");
    if (!isEditable(cur[0].status)) {
      throw new UserError(`Forslaget kan ikke redigeres når status er «${STATUS_LABEL[cur[0].status]}».`);
    }
    const keep = KEEPS_STATUS.includes(cur[0].status);
    await t.query("UPDATE group_proposals SET name = $2, status = $3, updated_at = now() WHERE id = $1", [input.id, v.name, keep ? cur[0].status : status]);
    await writeGroups(t, input.id, v.labels, input.assignments);
    await log(t, input.id, access.profileId, input.submit && !keep ? ["edited", "sent_for_approval"] : ["edited"]);
    return input.id;
  });
}

/**
 * Change status. Delete is soft (history stays). Approving a proposal for an
 * event rolls back any other approved proposal for the same event. Only
 * succeeds from the allowed statuses, so two trainers cannot both succeed.
 * @returns names of proposals that were rolled back by an approval.
 */
export async function transition(d: Db, access: Access, id: number, action: Action): Promise<string[]> {
  const t = TRANSITIONS[action];
  if (!t) throw new UserError("Ukjent handling.");
  return d.tx(async (tx) => {
    const cur = await tx.query<{ spond_group_id: string; spond_event_id: string | null; status: ProposalStatus }>(
      "SELECT spond_group_id, spond_event_id, status FROM group_proposals WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!cur.length) throw new UserError("Fant ikke forslaget.");
    assertGroup(access, cur[0].spond_group_id);
    if (!t.from.includes(cur[0].status)) {
      throw new UserError(`Kan ikke utføre dette når status er «${STATUS_LABEL[cur[0].status]}».`);
    }
    await tx.query("UPDATE group_proposals SET status = $2, updated_at = now() WHERE id = $1", [id, t.to]);
    await log(tx, id, access.profileId, [t.log]);
    if (action !== "approve" || !cur[0].spond_event_id) return [];
    const others = await tx.query<{ id: number; name: string }>(
      `UPDATE group_proposals SET status = 'rolled_back', updated_at = now()
        WHERE spond_event_id = $1 AND spond_group_id = $2 AND id <> $3 AND status = 'approved'
       RETURNING id, name`,
      [cur[0].spond_event_id, cur[0].spond_group_id, id],
    );
    for (const o of others) await log(tx, o.id, access.profileId, ["rolled_back"]);
    return others.map((o) => o.name);
  });
}

export async function addComment(d: Db, access: Access, id: number, body: string): Promise<void> {
  await getProposal(d, access, id);
  const problem = commentProblem(body);
  if (problem) throw new UserError(problem);
  await d.query("INSERT INTO proposal_comments (proposal_id, author, body) VALUES ($1, $2, $3)", [id, access.profileId, body.trim()]);
}

/** The approved proposal for an event, if any. */
export async function approvedForEvent(d: Db, access: Access, groupId: string, eventId: string): Promise<Proposal | null> {
  const list = await listProposals(d, access, groupId, { eventIds: [eventId], drafts: false });
  return list.find((p) => p.status === "approved") ?? null;
}

// Edit locks ----------------------------------------------------------------------
// Advisory: others see «Redigeres av …» and get a warning, but can still edit.
// The editor renews its lock every 30 s; a lock older than 120 s is gone.

export const LOCK_MAX_AGE_S = 120;

export interface Lock {
  proposalId: number | null;
  eventId: string | null;
  subgroupId: string | null;
  editor: string;
  sessionKey: string;
  startedAt: Date;
}

export async function acquireLock(
  d: Db,
  access: Access,
  groupId: string,
  sessionKey: string,
  where: { proposalId?: number | null; eventId?: string | null; subgroupId?: string | null },
): Promise<void> {
  assertGroup(access, groupId);
  if (where.proposalId) {
    const p = await getProposal(d, access, where.proposalId);
    if (p.groupId !== groupId) throw new UserError("Forslaget hører til en annen gruppe.");
  }
  await d.query(
    `INSERT INTO edit_locks (spond_group_id, spond_subgroup_id, spond_event_id, proposal_id, editor, session_key)
     VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6)
     ON CONFLICT (session_key) DO UPDATE
       SET spond_group_id = EXCLUDED.spond_group_id, spond_subgroup_id = EXCLUDED.spond_subgroup_id,
           spond_event_id = EXCLUDED.spond_event_id, proposal_id = EXCLUDED.proposal_id,
           editor = EXCLUDED.editor, heartbeat_at = now(),
           started_at = CASE WHEN edit_locks.proposal_id IS NOT DISTINCT FROM EXCLUDED.proposal_id
                              AND edit_locks.spond_event_id IS NOT DISTINCT FROM EXCLUDED.spond_event_id
                             THEN edit_locks.started_at ELSE now() END`,
    [groupId, where.subgroupId ?? "", where.eventId ?? "", where.proposalId ?? null, access.profileId, sessionKey],
  );
  await d.query("DELETE FROM edit_locks WHERE heartbeat_at < now() - make_interval(secs => $1)", [LOCK_MAX_AGE_S]);
}

export async function releaseLock(d: Db, access: Access, sessionKey: string): Promise<void> {
  await d.query("DELETE FROM edit_locks WHERE session_key = $1 AND editor = $2", [sessionKey, access.profileId]);
}

export async function activeLocks(d: Db, access: Access, groupId: string): Promise<Lock[]> {
  assertGroup(access, groupId);
  const rows = await d.query<{
    proposal_id: number | null;
    spond_event_id: string | null;
    spond_subgroup_id: string | null;
    editor: string;
    session_key: string;
    started_at: Date;
  }>(
    `SELECT proposal_id, spond_event_id, spond_subgroup_id, editor, session_key, started_at FROM edit_locks
      WHERE spond_group_id = $1 AND heartbeat_at >= now() - make_interval(secs => $2) ORDER BY started_at`,
    [groupId, LOCK_MAX_AGE_S],
  );
  return rows.map((r) => ({
    proposalId: r.proposal_id,
    eventId: r.spond_event_id,
    subgroupId: r.spond_subgroup_id,
    editor: r.editor,
    sessionKey: r.session_key,
    startedAt: new Date(r.started_at),
  }));
}
