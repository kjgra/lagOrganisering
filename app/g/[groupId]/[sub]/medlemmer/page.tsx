import { MemberList } from "@/components/members/MemberList";
import { AppShell } from "@/components/shell/AppShell";
import { Avatar } from "@/components/ui/status";
import { contextFromParams, pairCandidates } from "@/lib/context";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listPlayerTags, pairsOf, tagSuggestions } from "@/lib/store/tags";

/** Members of the context: trainers, players (with tags, if the user may see them) and other adults. */
export default async function MembersPage(props: PageProps<"/g/[groupId]/[sub]/medlemmer">) {
  const ctx = await contextFromParams(props.params);
  const info = await listPlayerTags(await db(), ctx.user.access, ctx.user.rights, ctx.group.id);
  const { tags } = info;
  const canTag = ctx.user.rights.tags;
  const coaches = ctx.members.filter((m) => m.kind === "coach");
  const players = ctx.members.filter((m) => m.kind === "player");
  const adults = ctx.members.filter((m) => m.kind === "adult");
  const fixed = env().TAG_SUGGESTIONS;
  return (
    <AppShell ctx={ctx} title={`Medlemmer i ${ctx.label}`} section="members">
      <h2 className="nm-section-label" style={{ marginTop: 0 }}>
        Trenere · {coaches.length}
      </h2>
      {coaches.length ? (
        <ul className="nm-list">
          {coaches.map((m) => (
            <li key={m.id}>
              <Avatar name={m.displayName} />
              <span className="nm-list__main">
                <span className="nm-list__name">{m.displayName}</span>
                <span className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
                  {m.roles}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nm-muted">Ingen med trenerrolle her.</p>
      )}
      <h2 className="nm-section-label">Spillere · {players.length}</h2>
      {players.length ? (
        <MemberList
          groupId={ctx.group.id}
          canTag={canTag}
          players={pairCandidates(ctx)}
          rows={players.map((m) => ({
            id: m.id,
            name: m.displayName,
            tags: tags.get(m.id) ?? [],
            suggestions: tagSuggestions(tags, m.id, fixed),
            level: info.levels.get(m.id) ?? null,
            pairs: pairsOf(info.pairs, m.id),
          }))}
        />
      ) : (
        <p className="nm-muted">Ingen spillere her.</p>
      )}
      {canTag ? (
        <p className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
          Trykk på en spiller for å endre nivå, hvem spilleren spiller godt med, og tagger. Det gjelder hele {ctx.group.name}.
        </p>
      ) : null}
      {adults.length ? (
        <>
          <h2 className="nm-section-label">Andre voksne · {adults.length}</h2>
          <p className="nm-muted" style={{ marginTop: 0 }}>
            Foresatte som er medlemmer uten trenerrolle. De får ikke tagger og fordeles ikke på lag.
          </p>
          <ul className="nm-list">
            {adults.map((m) => (
              <li key={m.id}>
                <Avatar name={m.displayName} />
                <span className="nm-list__name">{m.displayName}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </AppShell>
  );
}
