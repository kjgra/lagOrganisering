import "server-only";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { AiError } from "@/lib/ai/plan-ai";
import { prepareKi, runKi } from "@/lib/ai/service";
import { DEFAULT_SETTINGS, distribute, HISTORY_TRAININGS, type BoardMember, type BoardSettings } from "@/lib/board";
import { trainingsBefore } from "@/lib/events-data";
import { eventSub, orderContext, themeForEvent } from "@/lib/plan-data";
import { isPlayerKind } from "@/lib/spond/data";
import { eventIsPast, eventParticipants, placeable, responseCounts } from "@/lib/spond/events";
import type { Group, SpondEvent } from "@/lib/spond/types";
import { UserError } from "@/lib/store/access";
import { getBoardSettings } from "@/lib/store/board-settings";
import { listProposals, saveProposal, teamsOfEvents } from "@/lib/store/proposals";
import { listPlayerTags } from "@/lib/store/tags";
import { getTeamSettings, lastPlanPitches, planVersions, teamPitches } from "@/lib/store/training";

/**
 * «Hurtigopprett»: one tap before a training makes a team proposal with the
 * group's usual choices and a KI plan with no wishes. Both are drafts the
 * trainer checks and approves. The plan is marked `kind: "hurtig"` in its
 * context, and the trainer's changes to it are logged like other KI plans
 * (edit_log «opplegg_etter_ki»), so KI learns from them.
 */

/** Players per team for the default number of teams. */
export const TEAM_SIZE = { min: 4, max: 8 };
const DEFAULT_MINUTES = 60;

/**
 * The number of teams: as at the last training, else one per trainer who
 * comes, else as few as possible; always 4–8 players per team where it goes.
 */
export function quickTeamCount(players: number, coaches: number, previous: number | null): number {
  if (players <= 0) return 1;
  const most = Math.max(1, Math.floor(players / TEAM_SIZE.min));
  const least = Math.min(most, Math.max(1, Math.ceil(players / TEAM_SIZE.max)));
  const want = previous || coaches || least;
  return Math.min(most, Math.max(least, want));
}

/** «5–6 spillere» per team. */
export function teamSizeText(players: number, teams: number): string {
  const lo = Math.floor(players / teams);
  const hi = Math.ceil(players / teams);
  return `${lo === hi ? lo : `${lo}–${hi}`} spillere`;
}

/** The session's length: the team's standard, else the event's, else 60 minutes. */
export function quickMinutes(standard: number | null, start: string | null, end: string | null): number {
  if (standard) return standard;
  if (start && end) {
    const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
    if (m >= 15 && m <= 240) return m;
  }
  return DEFAULT_MINUTES;
}

export function distributionText(s: BoardSettings | null, hasPrevious: boolean): string {
  if (!s) return "Tilfeldig";
  const parts = [s.mode === "levels" ? "Nivådelt" : "Jevne lag"];
  if (s.roles.length) parts.push(`${s.roles.join(", ").toLowerCase()} spres`);
  if (hasPrevious && s.history === "rotate") parts.push("nye lagkamerater");
  if (hasPrevious && s.history === "same") parts.push("lagkamerater som sist");
  return parts.join(", ");
}

export interface QuickDefaults {
  players: number;
  teams: number;
  sizeText: string;
  /** Teams at the last training with teams, or null. */
  previousTeams: number | null;
  distribution: string;
  theme: string;
  minutes: number;
  coaches: number;
  pitches: { id: number; name: string }[];
  /** Chosen for the trainer: the last KI plan's pitches, or the team's only pitch. */
  pitchIds: number[];
}

interface Basis {
  defaults: QuickDefaults;
  members: BoardMember[];
  settings: BoardSettings | null;
  pairs: [string, string][];
  previous: string[][][];
}

async function basis(d: Db, user: CurrentUser, group: Group, sub: string | null, event: SpondEvent): Promise<Basis> {
  const [info, settings, team, pitches, season, lastPitches] = await Promise.all([
    listPlayerTags(d, user.access, user.rights, group.id),
    getBoardSettings(d, user.access, user.rights, group.id, sub ?? ""),
    getTeamSettings(d, user.access, group.id, eventSub(event)),
    teamPitches(d, user.access, group.id, eventSub(event)),
    themeForEvent(d, user, group, event),
    lastPlanPitches(d, user.access, group.id),
  ]);
  // «Forrige treninger» works on tags, so (as on the board) only with the tags right.
  const earlier = settings ? await trainingsBefore(user, group.id, sub, event).catch(() => []) : [];
  const previous = settings ? (await teamsOfEvents(d, user.access, group.id, earlier.slice(0, 12))).slice(0, HISTORY_TRAININGS) : [];
  const members: BoardMember[] = eventParticipants(event, group)
    .filter((p) => placeable(p.status, event.notSent) && isPlayerKind(p.kind))
    .map((p) => ({
      id: p.memberId,
      name: p.displayName,
      coach: false,
      tags: info.tags.get(p.memberId) ?? [],
      level: info.levels.get(p.memberId) ?? null,
    }));
  const coaches = responseCounts(event, group).coachesComing;
  const teams = quickTeamCount(members.length, coaches, previous[0]?.length ?? null);
  const known = new Set(pitches.map((p) => p.id));
  const fromLast = lastPitches.filter((id) => known.has(id));
  return {
    defaults: {
      players: members.length,
      teams,
      sizeText: members.length ? teamSizeText(members.length, teams) : "",
      previousTeams: previous[0]?.length ?? null,
      distribution: distributionText(settings, previous.length > 0),
      theme: season?.theme ?? "",
      minutes: quickMinutes(team.session_minutes, event.start, event.end),
      coaches,
      pitches: pitches.map((p) => ({ id: p.id, name: p.name })),
      pitchIds: fromLast.length ? fromLast : pitches.length === 1 ? [pitches[0].id] : [],
    },
    members,
    settings,
    pairs: info.pairs,
    previous,
  };
}

/** Why «Hurtigopprett» cannot be used for the event, or null. */
async function blocked(d: Db, user: CurrentUser, group: Group, event: SpondEvent): Promise<string | null> {
  if (!user.rights.ai) return "Du har ikke tilgang til KI. Spør en administrator.";
  if (eventIsPast(event)) return "Arrangementet er over.";
  if (event.cancelled || event.match) return "Hurtigopprett er bare for treninger.";
  const [proposals, versions] = await Promise.all([
    listProposals(d, user.access, group.id, {
      eventIds: [event.id],
      drafts: false,
    }),
    planVersions(d, user.access, group.id, event.id),
  ]);
  if (proposals.length || versions.length) return "Økta har allerede lag eller opplegg.";
  return null;
}

/** The defaults shown before the trainer taps «Lag alt»; null when it cannot be used. */
export async function quickDefaults(d: Db, user: CurrentUser, group: Group, sub: string | null, event: SpondEvent): Promise<QuickDefaults | null> {
  if (await blocked(d, user, group, event)) return null;
  const { defaults } = await basis(d, user, group, sub, event);
  return defaults.players ? defaults : null;
}

export interface QuickInput {
  theme: string;
  pitchIds: number[];
  model?: string;
}

async function prepare(d: Db, user: CurrentUser, group: Group, sub: string | null, event: SpondEvent, input: QuickInput, seed: number) {
  const why = await blocked(d, user, group, event);
  if (why) throw new UserError(why);
  const b = await basis(d, user, group, sub, event);
  if (!b.defaults.players) throw new UserError("Ingen spillere har svart ja ennå.");
  const labels = Array.from({ length: b.defaults.teams }, (_, i) => `Lag ${i + 1}`);
  const s = b.settings ?? {
    ...DEFAULT_SETTINGS,
    roles: [],
    pairs: false,
    history: "off" as const,
  };
  const assignments = distribute(b.members, labels, seed, {
    mode: s.mode,
    roles: s.roles,
    pairs: s.pairs ? b.pairs : [],
    history: b.previous.length ? s.history : "off",
    previous: b.previous,
  });
  const sizes = labels.map((l) => Object.values(assignments).filter((x) => x === l).length).filter(Boolean);
  const { order } = await orderContext(
    d,
    user,
    group,
    event,
    {
      theme: input.theme,
      minutes: b.defaults.minutes,
      wish: "",
      links: "",
      commentIds: [],
      pitchIds: input.pitchIds,
      coaches: b.defaults.coaches,
    },
    sizes,
  );
  // Rights and budget are checked here, before anything is saved.
  const prep = await prepareKi(d, user, user.rights, group, order, {
    model: input.model,
    quick: true,
  });
  return { labels, assignments, prep };
}

/** Price estimate per model for the KI plan, with the teams as they would be. */
export async function quickPrep(d: Db, user: CurrentUser, group: Group, sub: string | null, event: SpondEvent, input: QuickInput) {
  return (await prepare(d, user, group, sub, event, input, 1)).prep;
}

/**
 * Make both: the team proposal first (a draft), then the KI plan from its
 * group sizes (a draft version). When KI fails, the teams are kept and the
 * error is returned, so the trainer can make the plan another way.
 */
export async function quickCreate(d: Db, user: CurrentUser, group: Group, sub: string | null, event: SpondEvent, input: QuickInput, seed = Date.now()) {
  const { labels, assignments, prep } = await prepare(d, user, group, sub, event, input, seed);
  const proposalId = await saveProposal(d, user.access, {
    groupId: group.id,
    eventId: event.id,
    name: "Hurtigforslag",
    labels,
    assignments,
  });
  try {
    const plan = await runKi(d, user, prep, event.id, [], event);
    return { proposalId, plan, error: null };
  } catch (err) {
    if (err instanceof AiError) return { proposalId, plan: null, error: err.message };
    throw err;
  }
}
