/**
 * Spond data. `Raw*` are the parts of Spond's (unofficial) API answers that
 * the app reads; everything else in the answers is dropped right away (see
 * data.ts and events.ts). The other types are the minimised data the app
 * works with. None of it is written to the database except ids.
 */

export interface RawRole {
  id: string;
  name?: string;
}

export interface RawMember {
  id: string;
  firstName?: string;
  lastName?: string;
  profile?: { id?: string } | null;
  roles?: string[];
  subGroups?: (string | { id: string })[];
  guardians?: { profile?: { id?: string } | null }[];
}

export interface RawGroup {
  id: string;
  name?: string;
  roles?: RawRole[];
  subGroups?: { id: string; name?: string }[];
  members?: RawMember[];
}

export interface RawProfile {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface RawOwner {
  id?: string;
  firstName?: string;
  lastName?: string;
  response?: string;
}

export interface RawEvent {
  id: string;
  heading?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  cancelled?: boolean;
  matchEvent?: boolean;
  inviteTime?: string;
  location?: { feature?: string; address?: string } | null;
  recipients?: {
    group?: { subGroups?: (string | { id: string })[] };
    subGroups?: (string | { id: string })[];
  };
  responses?: Partial<Record<RawResponseField, (string | { id: string })[]>>;
  owners?: RawOwner[];
}

export type RawResponseField = "acceptedIds" | "waitinglistIds" | "unconfirmedIds" | "unansweredIds" | "declinedIds";

/** Response status in the app. */
export type ResponseStatus = "accepted" | "waiting" | "unconfirmed" | "unanswered" | "declined";

export type MemberKind = "coach" | "player" | "adult";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  profileId: string | null;
  kind: MemberKind;
  /** Trainer role names, comma separated ("" for others). */
  roles: string;
  subgroupIds: string[];
  /** "Emil B.", or the full name where two would look the same. */
  displayName: string;
}

export interface Subgroup {
  id: string;
  name: string;
  size: number;
}

export interface Group {
  id: string;
  name: string;
  /** The logged-in user's roles that give access, comma separated. */
  myRoles: string;
  subgroups: Subgroup[];
  members: Member[];
  /** Which trainer is parent of which member (member ids), kept in memory only. */
  parentLinks: { parentId: string; childId: string }[];
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
}

/** What the app keeps from Spond for a logged-in user. */
export interface SessionData {
  profile: Profile;
  /** Only the groups where the user has an access role. */
  groups: Group[];
}

export interface EventResponse {
  memberId: string;
  status: ResponseStatus;
}

export interface EventOwner {
  profileId: string;
  firstName: string;
  lastName: string;
  status: ResponseStatus | null;
}

export interface SpondEvent {
  id: string;
  heading: string;
  /** ISO timestamps (UTC). */
  start: string | null;
  end: string | null;
  cancelled: boolean;
  match: boolean;
  subgroupIds: string[];
  location: string;
  /** Planned send time when the invitation is not sent yet. */
  inviteTime: string | null;
  notSent: boolean;
  responses: EventResponse[];
  owners: EventOwner[];
}

export interface EventsQuery {
  groupId?: string;
  subgroupId?: string;
  minStart?: Date;
  maxStart?: Date;
  minEnd?: Date;
  maxEnd?: Date;
  includeScheduled?: boolean;
  max?: number;
}
