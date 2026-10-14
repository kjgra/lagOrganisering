import "server-only";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { fetchLinks, parseLinks } from "@/lib/ai/links";
import { AiError, WISH_MAX, type OrderContext } from "@/lib/ai/plan-ai";
import { osloParts } from "@/lib/format";
import { teamTitle } from "@/lib/proposal-view";
import { memberNames, namesProblem, isSensitive } from "@/lib/sensitive";
import { isPlayerKind } from "@/lib/spond/data";
import { eventParticipants, placeable } from "@/lib/spond/events";
import type { Group, SpondEvent } from "@/lib/spond/types";
import { approvedForEvent } from "@/lib/store/proposals";
import { getAiSettings } from "@/lib/store/ai";
import { getTeamSettings, listPlanComments, seasonTheme } from "@/lib/store/training";

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

/** The month's theme for an event (Oslo time), if the season plan has one. */
export async function themeForEvent(d: Db, user: CurrentUser, group: Group, event: SpondEvent) {
  const when = event.start ? new Date(event.start) : new Date();
  const { year, month } = osloParts(when);
  return seasonTheme(d, user.access, group.id, year, month);
}

export interface KiInput {
  theme: string;
  minutes: number | null;
  wish: string;
  links: string;
  commentIds: number[];
}

/** Everything the KI order needs, from the event, the team settings and the trainer's wishes. */
export async function orderContext(d: Db, user: CurrentUser, group: Group, event: SpondEvent, input: KiInput): Promise<{ order: OrderContext; commentIds: number[] }> {
  const names = memberNames(group.members);
  const wish = input.wish.trim();
  if (wish.length > WISH_MAX) throw new AiError(`Ønsket kan ha maks ${WISH_MAX} tegn.`);
  if (isSensitive(wish)) throw new AiError("Ønsket skal ikke inneholde helseopplysninger eller andre sensitive opplysninger.");
  const np = namesProblem(wish, names);
  if (np) throw new AiError(np);
  const settings = await getAiSettings(d);
  const urls = parseLinks(input.links, settings.link_domains);
  const [team, season, groups, comments, links] = await Promise.all([
    getTeamSettings(d, user.access, group.id),
    themeForEvent(d, user, group, event),
    planGroups(d, user, group, event.id),
    listPlanComments(d, user.access, group.id, event.id),
    urls.length ? fetchLinks(urls, settings.link_domains) : Promise.resolve([]),
  ]);
  const chosen = comments.filter((c) => input.commentIds.includes(c.id) && c.used_in_plan_id === null);
  const theme = input.theme.trim() || season?.theme || "";
  if (!theme) throw new AiError("Skriv et tema for økta.");
  if (theme.length > 80) throw new AiError("Temaet kan ha maks 80 tegn.");
  const nPlayers = eventParticipants(event, group).filter((p) => placeable(p.status, event.notSent) && isPlayerKind(p.kind)).length;
  return {
    commentIds: chosen.map((c) => c.id),
    order: {
      start: event.start,
      minutes: input.minutes ?? team.session_minutes,
      theme,
      themeDescription: season && season.theme.toLowerCase() === theme.toLowerCase() ? season.description : "",
      team: { age_group: team.age_group, pitch: team.pitch, equipment: team.equipment, principles: team.principles },
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
