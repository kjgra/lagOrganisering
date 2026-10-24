import "server-only";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { fetchLinks, parseLinks } from "@/lib/ai/links";
import { AiError, WISH_MAX, fagplanText, type ExerciseOrderContext, type OrderContext } from "@/lib/ai/plan-ai";
import { osloParts } from "@/lib/format";
import { teamAgeText, teamBand } from "@/lib/nff/bands";
import { CATEGORIES, pitchText } from "@/lib/plans/plan";
import { teamTitle } from "@/lib/proposal-view";
import { memberNames, namesProblem, isSensitive } from "@/lib/sensitive";
import { isPlayerKind } from "@/lib/spond/data";
import { eventParticipants, placeable } from "@/lib/spond/events";
import type { Group, SpondEvent } from "@/lib/spond/types";
import { approvedForEvent } from "@/lib/store/proposals";
import { getAiSettings } from "@/lib/store/ai";
import { getTeamSettings, latestPrinciples, listPlanComments, seasonTheme, teamPitches } from "@/lib/store/training";

/**
 * The groups of the approved team proposal for an event, with names. Used
 * for the PDF and the KI order (sizes only); never stored with the plan.
 */
export async function planGroups(d: Db, user: CurrentUser, group: Group, eventId: string) {
  const p = await approvedForEvent(d, user.access, group.id, eventId);
  if (!p) return [];
  const byId = new Map(group.members.map((m) => [m.id, m]));
  return p.labels
    .map((label, i) => ({
      name: teamTitle(label, i),
      players: Object.entries(p.assignments)
        .filter(([, l]) => l === label)
        .map(([id]) => byId.get(id))
        .filter((m) => m && m.kind !== "coach")
        .map((m) => m!.displayName)
        .sort((a, b) => a.localeCompare(b, "nb")),
    }))
    .filter((g) => g.players.length);
}

/**
 * Whose «Trening» an event uses: the subgroup it was sent to in Spond, or the
 * main group when it was sent to the whole group or to several subgroups.
 */
export function eventSub(event: SpondEvent): string {
  return event.subgroupIds.length === 1 ? event.subgroupIds[0] : "";
}

/** The month's theme for an event (Oslo time), if the season plan has one. */
export async function themeForEvent(d: Db, user: CurrentUser, group: Group, event: SpondEvent) {
  const when = event.start ? new Date(event.start) : new Date();
  const { year, month } = osloParts(when);
  return seasonTheme(d, user.access, group.id, eventSub(event), year, month);
}

export interface KiInput {
  theme: string;
  minutes: number | null;
  wish: string;
  links: string;
  commentIds: number[];
  /** The pitches for this session, from the team's pitches. */
  pitchIds: number[];
}

function checkWish(wish: string, names: string[]) {
  if (wish.length > WISH_MAX) throw new AiError(`Ønsket kan ha maks ${WISH_MAX} tegn.`);
  if (isSensitive(wish)) throw new AiError("Ønsket skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  const np = namesProblem(wish, names);
  if (np) throw new AiError(np);
}

/** Everything the KI order needs, from the event, the team settings and the trainer's wishes. */
export async function orderContext(d: Db, user: CurrentUser, group: Group, event: SpondEvent, input: KiInput): Promise<{ order: OrderContext; commentIds: number[] }> {
  const names = memberNames(group.members);
  const wish = input.wish.trim();
  checkWish(wish, names);
  const settings = await getAiSettings(d);
  const urls = parseLinks(input.links, settings.link_domains);
  const sub = eventSub(event);
  const [team, principles, pitches, season, groups, comments, links] = await Promise.all([
    getTeamSettings(d, user.access, group.id, sub),
    latestPrinciples(d, user.access, group.id, sub),
    teamPitches(d, user.access, group.id, sub),
    themeForEvent(d, user, group, event),
    planGroups(d, user, group, event.id),
    listPlanComments(d, user.access, group.id, event.id),
    urls.length ? fetchLinks(urls, settings.link_domains) : Promise.resolve([]),
  ]);
  const chosenPitches = pitches.filter((p) => input.pitchIds.includes(p.id));
  if (chosenPitches.length !== new Set(input.pitchIds).size) throw new AiError("Banene må være blant lagets baner.");
  if (pitches.length && !chosenPitches.length) throw new AiError("Velg minst én bane for økta.");
  const chosen = comments.filter((c) => input.commentIds.includes(c.id) && c.used_in_plan_id === null);
  const theme = input.theme.trim() || season?.theme || "";
  if (!theme) throw new AiError("Skriv et tema for økta.");
  if (theme.length > 80) throw new AiError("Temaet kan ha maks 80 tegn.");
  const nPlayers = eventParticipants(event, group).filter((p) => placeable(p.status, event.notSent) && isPlayerKind(p.kind)).length;
  return {
    commentIds: chosen.map((c) => c.id),
    order: {
      sub,
      start: event.start,
      minutes: input.minutes ?? team.session_minutes,
      theme,
      themeDescription: season && season.theme.toLowerCase() === theme.toLowerCase() ? season.description : "",
      team: { age_group: teamAgeText(team.birth_year, team.gender, osloParts(event.start ?? new Date()).year, team.age_group), pitch: pitchText(chosenPitches, team.pitch), equipment: team.equipment, principles },
      fagplan: fagplanText(teamBand(team.birth_year, osloParts(event.start ?? new Date()).year), theme),
      nPlayers,
      groupSizes: groups.map((g) => g.players.length),
      wish,
      maxNew: settings.max_new_exercises,
      links,
      names,
      comments: chosen.map((c) => (c.exercise_no ? `Øvelse ${c.exercise_no}: ${c.body}` : c.body)),
    },
  };
}

export interface ExerciseKiInput {
  /** The subgroup whose «Trening» is used, or '' for the main group. */
  sub: string;
  theme: string;
  players: number | null;
  minutes: number | null;
  category: string;
  wish: string;
  link: string;
  pitchIds: number[];
}

/** The order for «Ny øvelse med KI»: the team settings, the chosen pitches and the trainer's wishes. */
export async function exerciseOrderContext(d: Db, user: CurrentUser, group: Group, input: ExerciseKiInput, now = new Date()): Promise<ExerciseOrderContext> {
  const names = memberNames(group.members);
  const wish = input.wish.trim();
  checkWish(wish, names);
  const theme = input.theme.trim();
  if (theme.length > 80) throw new AiError("Temaet kan ha maks 80 tegn.");
  if (input.category && !(input.category in CATEGORIES)) throw new AiError("Ukjent kategori.");
  const settings = await getAiSettings(d);
  const urls = parseLinks(input.link, settings.link_domains);
  if (urls.length > 1) throw new AiError("Maks én lenke per øvelse.");
  const { year, month } = osloParts(now);
  const sub = input.sub;
  const [team, principles, pitches, season, links] = await Promise.all([
    getTeamSettings(d, user.access, group.id, sub),
    latestPrinciples(d, user.access, group.id, sub),
    teamPitches(d, user.access, group.id, sub),
    seasonTheme(d, user.access, group.id, sub, year, month),
    urls.length ? fetchLinks(urls, settings.link_domains) : Promise.resolve([]),
  ]);
  const chosen = pitches.filter((p) => input.pitchIds.includes(p.id));
  if (chosen.length !== new Set(input.pitchIds).size) throw new AiError("Banene må være blant lagets baner.");
  return {
    sub,
    theme,
    themeDescription: season && theme && season.theme.toLowerCase() === theme.toLowerCase() ? season.description : "",
    team: { age_group: teamAgeText(team.birth_year, team.gender, year, team.age_group), pitch: pitchText(chosen, team.pitch), equipment: team.equipment, principles },
    fagplan: fagplanText(teamBand(team.birth_year, year), theme || season?.theme || ""),
    players: input.players,
    minutes: input.minutes,
    category: input.category,
    wish,
    links,
    names,
  };
}
