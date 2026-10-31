const fold = (x: string) => x.toLocaleLowerCase("nb").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

/** Does the row match every word of the search, in name, roles, groups or teams? */
export function matchesTrainer(r: { name: string; roles: string; groups: { id: string; name: string; teams: string[] }[] }, search: string, groupId: string): boolean {
  if (groupId && !r.groups.some((g) => g.id === groupId)) return false;
  const hay = fold([r.name, r.roles, ...r.groups.flatMap((g) => [g.name, ...g.teams])].join(" "));
  return fold(search).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
