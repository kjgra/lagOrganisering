import { MemberList } from "@/components/members/MemberList";
import { AppShell } from "@/components/shell/AppShell";
import { Avatar } from "@/components/ui/status";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listTags, tagSuggestions } from "@/lib/store/tags";

/** Members of the context: trainers, players (with tags) and other adults. */
export default async function MembersPage(props: PageProps<"/g/[groupId]/[sub]/medlemmer">) {
  const ctx = await contextFromParams(props.params);
  const tags = await listTags(await db(), ctx.user.access, ctx.group.id);
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
          rows={players.map((m) => ({ id: m.id, name: m.displayName, tags: tags.get(m.id) ?? [], suggestions: tagSuggestions(tags, m.id, fixed) }))}
        />
      ) : (
        <p className="nm-muted">Ingen spillere her.</p>
      )}
      <p className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
        Trykk på en spiller for å legge til eller fjerne tagger. Tagger gjelder hele {ctx.group.name}.
      </p>
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
