import "server-only";
import { osloMidnight, osloParts } from "@/lib/format";
import { SpondError, type SpondApi } from "./client";
import type { EventsQuery, RawEvent, RawGroup, RawMember, RawProfile } from "./types";

/**
 * A fake Spond for development, tests and demos (SPOND_MOCK=true). The data
 * is made up and generated the same way every time, with events around
 * today's date. Log in with one of the demo accounts and the password «demo».
 */

export const DEMO_PASSWORD = "demo";

export const DEMO_ACCOUNTS = [
  { email: "kjetil@demo.no", profileId: "P-KJETIL", note: "Hovedlagleder og superadmin" },
  { email: "ann@demo.no", profileId: "P-ANN", note: "Trener med app-tilgang og KI" },
  { email: "beate@demo.no", profileId: "P-BEATE", note: "Trener uten app-tilgang" },
  { email: "forelder@demo.no", profileId: "P-FORELDER", note: "Forelder uten trenerrolle" },
] as const;

const PROFILES: Record<string, RawProfile> = {
  "P-KJETIL": { id: "P-KJETIL", firstName: "Kjetil", lastName: "Gramstad" },
  "P-ANN": { id: "P-ANN", firstName: "Ann Kristin", lastName: "Kvamme" },
  "P-BEATE": { id: "P-BEATE", firstName: "Beate", lastName: "Isaksen" },
  "P-PER": { id: "P-PER", firstName: "Per", lastName: "Olsen" },
  "P-LISE": { id: "P-LISE", firstName: "Lise", lastName: "Moen" },
  "P-TOM": { id: "P-TOM", firstName: "Tom", lastName: "Berg" },
  "P-FORELDER": { id: "P-FORELDER", firstName: "Hilde", lastName: "Nilsen" },
};

// Small deterministic random generator (mulberry32).
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BOYS = ["Aksel", "Emil", "Filip", "Henrik", "Isak", "Jakob", "Johannes", "Kasper", "Lars", "Leon", "Magnus", "Noah", "Oliver", "Sander", "Theo", "Tobias", "Vetle", "William", "Elias", "Lucas", "Mathias", "Jonas", "Adrian", "Sebastian"];
const GIRLS = ["Emma", "Nora", "Ella", "Sofie", "Olivia", "Ingrid", "Leah", "Frida", "Maja", "Sara", "Astrid", "Hedda", "Tiril", "Mia", "Selma", "Amalie", "Thea", "Iben", "Julie", "Live"];
const LAST = ["Haugen", "Berg", "Solberg", "Lie", "Moe", "Strand", "Dahl", "Eide", "Aas", "Bakke", "Lund", "Ruud", "Vik", "Fjeld", "Nygård", "Tveit", "Hovland", "Sæther", "Holm", "Brekke", "Øvrebø", "Rønning"];

interface SubDef {
  id: string;
  name: string;
  players: number;
  girls?: boolean;
  coaches: string[]; // profile ids
  days: number[]; // weekdays with training (0 = Sunday)
}

const FOTBALL_SUBS: SubDef[] = [
  { id: "S-G2016", name: "Gutter 2016", players: 18, coaches: ["P-KJETIL", "P-ANN", "P-LISE"], days: [2, 4] },
  { id: "S-J2016", name: "Jenter 2016", players: 15, girls: true, coaches: ["P-BEATE"], days: [1, 3] },
  { id: "S-G2015", name: "Gutter 2015", players: 16, coaches: ["P-PER"], days: [1, 4] },
  { id: "S-G2017", name: "Gutter 2017", players: 14, coaches: ["P-TOM"], days: [3] },
  { id: "S-J2015", name: "Jenter 2015", players: 12, girls: true, coaches: ["P-BEATE"], days: [2] },
  { id: "S-KEEPER", name: "Keepertrening", players: 0, coaches: ["P-ANN"], days: [5] },
  { id: "S-TRENER", name: "Trenerteam barnefotball", players: 0, coaches: ["P-KJETIL", "P-ANN", "P-BEATE", "P-PER", "P-LISE", "P-TOM"], days: [] },
];

const ALLIDRETT_SUBS: SubDef[] = [
  { id: "S-6AAR", name: "6-åringer", players: 16, coaches: ["P-KJETIL"], days: [6] },
  { id: "S-7AAR", name: "7-åringer", players: 14, coaches: ["P-TOM"], days: [6] },
];

const COACH_ROLE: Record<string, string> = {
  "P-KJETIL": "R-HOVED",
  "P-ANN": "R-TRENER",
  "P-BEATE": "R-TRENER",
  "P-PER": "R-LAGLEDER",
  "P-LISE": "R-HJELP",
  "P-TOM": "R-TRENER",
};

const ROLES = [
  { id: "R-HOVED", name: "Hovedlagleder" },
  { id: "R-TRENER", name: "Trener" },
  { id: "R-LAGLEDER", name: "Lagleder" },
  { id: "R-HJELP", name: "Hjelpetrener" },
];

function buildGroup(id: string, name: string, subs: SubDef[], seed: number): RawGroup {
  const r = rng(seed);
  const members: RawMember[] = [];
  const coachMembers = new Map<string, RawMember>();
  for (const s of subs) {
    for (const pid of s.coaches) {
      let m = coachMembers.get(pid);
      if (!m) {
        const p = PROFILES[pid];
        m = { id: `M-${id}-${pid}`, firstName: p.firstName, lastName: p.lastName, profile: { id: pid }, roles: [COACH_ROLE[pid]], subGroups: [] };
        coachMembers.set(pid, m);
        members.push(m);
      }
      m.subGroups!.push(s.id);
    }
    const used = new Set<string>();
    for (let i = 0; i < s.players; i++) {
      const firsts = s.girls ? GIRLS : BOYS;
      let first = "";
      let last = "";
      do {
        first = firsts[Math.floor(r() * firsts.length)];
        last = LAST[Math.floor(r() * LAST.length)];
      } while (used.has(first));
      used.add(first);
      members.push({ id: `M-${s.id}-${i + 1}`, firstName: first, lastName: last, roles: [], subGroups: [s.id] });
    }
  }
  if (id === "G-FOTBALL") {
    // Two players whose short names clash (Emma H.), so they get full names.
    const j = members.filter((m) => m.subGroups?.includes("S-J2016"));
    if (j.length > 1) {
      Object.assign(j[0], { firstName: "Emma", lastName: "Haugen" });
      Object.assign(j[1], { firstName: "Emma", lastName: "Hansen" });
    }
    // Kjetil is parent of a player in Gutter 2016; Hilde Nilsen is a parent without a trainer role.
    const g16 = members.filter((m) => m.subGroups?.includes("S-G2016") && !m.profile);
    Object.assign(g16[0], { firstName: "Emil", lastName: "Gramstad", guardians: [{ profile: { id: "P-KJETIL" } }] });
    Object.assign(g16[1], { guardians: [{ profile: { id: "P-FORELDER" } }] });
    members.push({ id: "M-HILDE", firstName: "Hilde", lastName: "Nilsen", profile: { id: "P-FORELDER" }, roles: [], subGroups: ["S-G2016"] });
    // Goalkeeper training: some players from the other subgroups.
    for (const m of members.filter((x) => !x.profile).filter((_, i) => i % 9 === 3)) m.subGroups!.push("S-KEEPER");
  }
  return { id, name, roles: ROLES, subGroups: subs.map((s) => ({ id: s.id, name: s.name })), members };
}

const GROUPS: RawGroup[] = [
  buildGroup("G-FOTBALL", "Nymark IL – Fotball", FOTBALL_SUBS, 7),
  buildGroup("G-ALLIDRETT", "Nymark IL – Allidrett", ALLIDRETT_SUBS, 11),
  // Kjetil is a plain member here (no role), so the app must drop this group.
  {
    id: "G-HANDBALL",
    name: "Nymark IL – Håndball",
    roles: ROLES,
    subGroups: [],
    members: [{ id: "M-H-1", firstName: "Kjetil", lastName: "Gramstad", profile: { id: "P-KJETIL" }, roles: [] }],
  },
];

function groupsFor(profileId: string): RawGroup[] {
  return GROUPS.filter((g) => (g.members ?? []).some((m) => m.profile?.id === profileId));
}

const SUB_BY_ID = new Map(
  [...FOTBALL_SUBS.map((s) => ["G-FOTBALL", s] as const), ...ALLIDRETT_SUBS.map((s) => ["G-ALLIDRETT", s] as const)].map(
    ([g, s]) => [s.id, { group: g, sub: s }],
  ),
);

function at(day: Date, hour: number, minute: number): Date {
  const p = osloParts(day);
  return new Date(osloMidnight(p.year, p.month, p.day).getTime() + (hour * 60 + minute) * 60_000);
}

/** Events from six weeks back to five weeks ahead of `now`. */
export function mockEvents(now: Date = new Date()): (RawEvent & { groupId: string })[] {
  const out: (RawEvent & { groupId: string })[] = [];
  const today = osloParts(now);
  const base = osloMidnight(today.year, today.month, today.day);
  for (const [subId, { group, sub }] of SUB_BY_ID) {
    if (!sub.days.length) continue;
    const g = GROUPS.find((x) => x.id === group)!;
    const recipients = (g.members ?? []).filter((m) => m.subGroups?.some((s) => (typeof s === "string" ? s : s.id) === subId));
    for (let d = -42; d <= 35; d++) {
      const day = new Date(base.getTime() + d * 86_400_000 + 12 * 3_600_000);
      const wd = osloParts(day).weekday;
      const isMatch = wd === 6 && sub.days.indexOf(6) < 0 && Math.abs(d) % 14 < 7 && subId !== "S-KEEPER";
      if (!sub.days.includes(wd) && !isMatch) continue;
      const date = `${osloParts(day).year}${String(osloParts(day).month).padStart(2, "0")}${String(osloParts(day).day).padStart(2, "0")}`;
      const id = `E-${subId}-${date}${isMatch ? "-K" : ""}`;
      const start = isMatch ? at(day, 10, 0) : sub.name.includes("åringer") ? at(day, 11, 0) : at(day, 17, 30);
      const end = new Date(start.getTime() + (isMatch ? 90 : 75) * 60_000);
      const notSent = start.getTime() - now.getTime() > 7 * 86_400_000;
      const r = rng(hash(id));
      const accepted: string[] = [];
      const unanswered: string[] = [];
      const declined: string[] = [];
      const waiting: string[] = [];
      for (const m of recipients) {
        const past = end.getTime() < now.getTime();
        const x = r();
        if (notSent) unanswered.push(m.id);
        else if (x < (past ? 0.8 : 0.66)) accepted.push(m.id);
        else if (x < (past ? 0.82 : 0.86)) unanswered.push(m.id);
        else if (x < 0.97 || !isMatch) declined.push(m.id);
        else waiting.push(m.id);
      }
      const owner = PROFILES[sub.coaches[0]];
      out.push({
        id,
        groupId: group,
        heading: isMatch ? "Seriekamp mot Sandviken" : sub.id === "S-KEEPER" ? "Keepertrening" : `Trening ${sub.name}`,
        startTimestamp: start.toISOString(),
        endTimestamp: end.toISOString(),
        cancelled: d === 9 && wd === sub.days[0],
        matchEvent: isMatch,
        inviteTime: notSent ? new Date(start.getTime() - 7 * 86_400_000).toISOString() : undefined,
        location: { feature: isMatch ? "Nymark kunstgress, bane 1" : "Nymark kunstgress", address: "Ikke lagret" },
        recipients: { group: { subGroups: [subId] } },
        responses: {
          acceptedIds: accepted,
          unansweredIds: unanswered,
          declinedIds: declined,
          waitinglistIds: waiting,
          unconfirmedIds: [],
        },
        owners: [{ id: owner.id, firstName: owner.firstName, lastName: owner.lastName, response: notSent ? "unanswered" : "accepted" }],
      });
    }
  }
  return out;
}

const TOKEN_PREFIX = "mock-token:";

function profileOf(token: string): string {
  if (!token.startsWith(TOKEN_PREFIX)) throw new SpondError("Økten i Spond er utløpt. Logg inn på nytt.", "expired");
  return token.slice(TOKEN_PREFIX.length);
}

export const mockSpond: SpondApi = {
  async login(identifier, password) {
    const acc = DEMO_ACCOUNTS.find((a) => a.email === identifier.toLowerCase());
    if (!acc || password !== DEMO_PASSWORD) {
      throw new SpondError("Feil e-post, mobilnummer eller passord. Sjekk og prøv igjen.", "login");
    }
    return { token: `${TOKEN_PREFIX}${acc.profileId}`, expiration: new Date(Date.now() + 12 * 3_600_000).toISOString() };
  },
  async profile(token) {
    return PROFILES[profileOf(token)];
  },
  async groups(token) {
    return structuredClone(groupsFor(profileOf(token)));
  },
  async events(token, q: EventsQuery) {
    profileOf(token);
    let list = mockEvents();
    if (q.groupId) list = list.filter((e) => e.groupId === q.groupId);
    if (q.subgroupId) list = list.filter((e) => e.recipients?.group?.subGroups?.includes(q.subgroupId!));
    if (!q.includeScheduled) list = list.filter((e) => !e.inviteTime);
    const t = (x?: string) => (x ? Date.parse(x) : 0);
    if (q.minStart) list = list.filter((e) => t(e.startTimestamp) >= q.minStart!.getTime());
    if (q.maxStart) list = list.filter((e) => t(e.startTimestamp) <= q.maxStart!.getTime());
    if (q.minEnd) list = list.filter((e) => t(e.endTimestamp) >= q.minEnd!.getTime());
    if (q.maxEnd) list = list.filter((e) => t(e.endTimestamp) <= q.maxEnd!.getTime());
    list.sort((a, b) => t(a.startTimestamp) - t(b.startTimestamp));
    return structuredClone(list.slice(0, q.max ?? 100)).map((e) => {
      const { groupId, ...rest } = e;
      void groupId;
      return rest;
    });
  },
};
