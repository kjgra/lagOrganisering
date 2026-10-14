/** URLs for a group context: /g/<main group>/<subgroup or «alle»>/... */
export const ALL = "alle";

export function ctxPath(groupId: string, subgroupId: string | null, rest = ""): string {
  return `/g/${encodeURIComponent(groupId)}/${subgroupId ? encodeURIComponent(subgroupId) : ALL}${rest}`;
}
