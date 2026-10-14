import type {
  EventOwner,
  EventResponse,
  Group,
  MemberKind,
  RawEvent,
  RawResponseField,
  ResponseStatus,
  SpondEvent,
} from "./types";
import { shortName } from "./data";

/**
 * Events ("sponds"): data minimisation and helpers. Spond sends a lot per
 * event (recipients with profiles and guardians, comments, decline
 * messages, addresses). We keep only id, heading, times, place name, type
 * flags, which subgroups it was sent to and member ids per response.
 * Decline messages are dropped on purpose: they often say why someone can't
 * come (sick, injured).
 */

export const STATUSES: { field: RawResponseField; status: ResponseStatus; label: string }[] = [
  { field: "acceptedIds", status: "accepted", label: "Kommer" },
  { field: "waitinglistIds", status: "waiting", label: "Venteliste" },
  { field: "unconfirmedIds", status: "unconfirmed", label: "Ikke bekreftet" },
  { field: "unansweredIds", status: "unanswered", label: "Ikke svart" },
  { field: "declinedIds", status: "declined", label: "Kommer ikke" },
];

export const statusLabel = (s: ResponseStatus | null | undefined) =>
  STATUSES.find((x) => x.status === s)?.label ?? "Ukjent";

const ownerStatus: Record<string, ResponseStatus> = {
  accepted: "accepted",
  declined: "declined",
  unanswered: "unanswered",
  waitinglist: "waiting",
  unconfirmed: "unconfirmed",
};

const ids = (x: (string | { id: string })[] | undefined) => (x ?? []).map((v) => String(typeof v === "string" ? v : v.id));

function parseTime(x?: string): string | null {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function eventMinimal(e: RawEvent): SpondEvent {
  const seen = new Set<string>();
  const responses: EventResponse[] = [];
  for (const s of STATUSES) {
    for (const id of ids(e.responses?.[s.field])) {
      if (seen.has(id)) continue;
      seen.add(id);
      responses.push({ memberId: id, status: s.status });
    }
  }
  const ownersSeen = new Set<string>();
  const owners: EventOwner[] = [];
  for (const o of e.owners ?? []) {
    if (!o?.id || ownersSeen.has(o.id)) continue;
    ownersSeen.add(o.id);
    owners.push({
      profileId: String(o.id),
      firstName: String(o.firstName ?? ""),
      lastName: String(o.lastName ?? ""),
      status: ownerStatus[String(o.response ?? "").toLowerCase()] ?? null,
    });
  }
  const inviteTime = parseTime(e.inviteTime);
  return {
    id: String(e.id),
    heading: e.heading?.trim() || "(uten tittel)",
    start: parseTime(e.startTimestamp),
    end: parseTime(e.endTimestamp),
    cancelled: !!e.cancelled,
    match: !!e.matchEvent,
    subgroupIds: [...new Set([...ids(e.recipients?.group?.subGroups), ...ids(e.recipients?.subGroups)])],
    location: String(e.location?.feature ?? "").trim(),
    inviteTime,
    notSent: inviteTime !== null,
    responses,
    owners,
  };
}

/** Minimal events, without duplicates, for a subgroup (or all), sorted by start. */
export function eventsForContext(raw: RawEvent[], subgroupId: string | null, newestFirst = false): SpondEvent[] {
  const seen = new Set<string>();
  const out: SpondEvent[] = [];
  for (const r of raw) {
    if (!r?.id || seen.has(String(r.id))) continue;
    seen.add(String(r.id));
    const e = eventMinimal(r);
    if (subgroupId && !e.subgroupIds.includes(subgroupId)) continue;
    out.push(e);
  }
  const t = (e: SpondEvent) => (e.start ? Date.parse(e.start) : Number.POSITIVE_INFINITY);
  return out.sort((a, b) => (newestFirst ? t(b) - t(a) : t(a) - t(b)));
}

/** Who an event was sent to: subgroup names, or the main group's name. */
export function eventSentTo(e: SpondEvent, group: Group): string[] {
  const names = e.subgroupIds
    .map((id) => group.subgroups.find((s) => s.id === id)?.name)
    .filter((x): x is string => !!x);
  return names.length ? names : [group.name];
}

export function eventIsPast(e: SpondEvent, now: Date = new Date()): boolean {
  const t = e.end ?? e.start;
  return !!t && Date.parse(t) < now.getTime();
}

export interface Participant {
  memberId: string;
  displayName: string;
  status: ResponseStatus;
  /** Still a member of the group. */
  known: boolean;
  kind: MemberKind | null;
}

const ownerMemberIds = (e: SpondEvent, group: Group) => {
  const own = new Set(e.owners.map((o) => o.profileId));
  return new Set(group.members.filter((m) => (m.profileId && own.has(m.profileId)) || own.has(m.id)).map((m) => m.id));
};

const ORDER = Object.fromEntries(STATUSES.map((s, i) => [s.status, i]));

/**
 * Recipients of an event with names from the whole main group (so a name
 * looks the same in every subgroup). Former members: «Tidligere medlem».
 * Organisers count as trainers. Sorted by status order, then name.
 */
export function eventParticipants(e: SpondEvent, group: Group): Participant[] {
  const byId = new Map(group.members.map((m) => [m.id, m]));
  const owners = ownerMemberIds(e, group);
  return e.responses
    .map((r) => {
      const m = byId.get(r.memberId);
      return {
        memberId: r.memberId,
        displayName: m?.displayName ?? "Tidligere medlem",
        status: r.status,
        known: !!m,
        kind: owners.has(r.memberId) ? ("coach" as const) : (m?.kind ?? null),
      };
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.displayName.localeCompare(b.displayName, "nb"));
}

/**
 * The trainers on an event: organisers and recipients with a trainer role.
 * An organiser's own answer counts; organisers who are not members are named
 * from the event (shown only, never stored).
 */
export function eventCoaches(e: SpondEvent, group: Group): { displayName: string; status: ResponseStatus }[] {
  const list = new Map<string, { displayName: string; status: ResponseStatus }>();
  for (const p of eventParticipants(e, group)) {
    if (p.kind === "coach") list.set(p.memberId, { displayName: p.displayName, status: p.status });
  }
  for (const o of e.owners) {
    const m = group.members.find((x) => x.profileId === o.profileId || x.id === o.profileId);
    const key = m ? m.id : `owner:${o.profileId}`;
    const cur = list.get(key);
    if (cur) {
      if (o.status) cur.status = o.status;
    } else {
      const name = m?.displayName ?? (shortName(o.firstName, o.lastName) || "Arrangør");
      list.set(key, { displayName: name, status: o.status ?? "unanswered" });
    }
  }
  return [...list.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "nb"));
}

/** Players (not trainers) who may be put in teams for an event: those coming;
 * before the invitation is sent, everyone invited. */
export function placeable(status: ResponseStatus | null | undefined, notSent: boolean): boolean {
  if (!status) return false;
  return notSent ? status !== "declined" : status === "accepted";
}

export interface ResponseCounts {
  accepted: number;
  unanswered: number;
  declined: number;
  waiting: number;
  unconfirmed: number;
  /** Players invited (all statuses). */
  invited: number;
  coachesComing: number;
}

/** Counts for players only (not trainers or other adults); trainers coming are counted separately. */
export function responseCounts(e: SpondEvent, group: Group): ResponseCounts {
  const players = eventParticipants(e, group).filter((p) => p.kind !== "coach" && p.kind !== "adult");
  const n = (s: ResponseStatus) => players.filter((p) => p.status === s).length;
  return {
    accepted: n("accepted"),
    unanswered: n("unanswered"),
    declined: n("declined"),
    waiting: n("waiting"),
    unconfirmed: n("unconfirmed"),
    invited: players.length,
    coachesComing: eventCoaches(e, group).filter((c) => c.status === "accepted").length,
  };
}
