import { Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { PROPOSAL_KINDS, PROPOSAL_STATUSES } from "@/lib/plans/improvements";
import { profileName } from "@/lib/proposal-view";
import { listProposals } from "@/lib/store/improvements";

/** «Forbedringer»: proposals for better exercises, made from the trainers' evaluations. */
export default async function ImprovementsPage(props: PageProps<"/g/[groupId]/[sub]/trening/forbedringer">) {
  const ctx = await contextFromParams(props.params);
  const { open, handled } = await listProposals(await db(), ctx.user.access, ctx.group.id);
  const base = ctx.path("/trening/forbedringer");
  return (
    <AppShell ctx={ctx} title="Forbedringer" section="training" back={ctx.path("/trening/ovelser")}>
      <p style={{ marginTop: 0, maxWidth: 760 }}>
        Når flere trenere eller økter peker på det samme problemet med en øvelse, lager KI et forslag til en bedre versjon. Se over forslaget og velg «Bruk», «Endre først» eller «Avvis».
      </p>
      {open.length ? (
        <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0, maxWidth: 760 }}>
          {open.map((p) => (
            <li key={p.id} className="nm-pick">
              <div>
                <Link href={`${base}/${p.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                  {p.exercise_name}
                </Link>
                <div className="nm-hint">
                  {PROPOSAL_KINDS[p.kind]} · {shortDate(p.created_at)}
                </div>
                <div className="nm-hint">{p.reason}</div>
              </div>
              <span className="nm-badge nm-badge--ikke-svart">
                <Icon icon={Sparkles} size={16} />
                {PROPOSAL_STATUSES.ny}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Sparkles} text="Ingen forslag venter. Nye forslag kommer når trenerne har evaluert nok." />
      )}
      {handled.length ? (
        <section className="nm-section" aria-labelledby="handled-h" style={{ maxWidth: 760 }}>
          <h2 id="handled-h" className="nm-section-label">
            Behandlet
          </h2>
          <ul className="nm-hint" style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
            {handled.map((p) => (
              <li key={p.id}>
                {p.exercise_name} · {PROPOSAL_KINDS[p.kind]} · {PROPOSAL_STATUSES[p.status]}
                {p.decided_at ? ` ${shortDate(p.decided_at)}` : ""}
                {p.decided_by ? ` av ${profileName(ctx.group, p.decided_by)}` : ""}
                {p.rejection ? ` («${p.rejection}»)` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
