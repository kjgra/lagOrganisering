import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ProposalDecision } from "@/components/training/ProposalDecision";
import { ProposalDiff } from "@/components/training/ProposalDiff";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { ARCHIVING_KINDS, PROPOSAL_KINDS, PROPOSAL_STATUSES } from "@/lib/plans/improvements";
import { getProposal } from "@/lib/store/improvements";

/** One proposal: the reason first, then before and after, then the choice. */
export default async function ProposalPage(props: PageProps<"/g/[groupId]/[sub]/trening/forbedringer/[id]">) {
  const ctx = await contextFromParams(props.params);
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await getProposal(await db(), ctx.user.access, ctx.group.id, id).catch(() => null);
  if (!p) notFound();
  const base = ctx.path("/trening/forbedringer");
  return (
    <AppShell ctx={ctx} title={p.exercise_name} section="training" back={base}>
      <p className="nm-hint" style={{ marginTop: 0 }}>
        {PROPOSAL_KINDS[p.kind]} · laget {shortDate(p.created_at)} · {PROPOSAL_STATUSES[p.status]}
        {p.exercise_id ? (
          <>
            {" · "}
            <Link href={ctx.path(`/trening/ovelser/${p.exercise_id}`)} style={{ textDecoration: "underline" }}>
              Se øvelsen
            </Link>
          </>
        ) : null}
      </p>
      <section className="nm-card nm-proposal" aria-labelledby="why-h" style={{ maxWidth: 760, marginBottom: "var(--space-4)" }}>
        <h2 id="why-h" className="nm-h3" style={{ margin: 0 }}>
          Hvorfor
        </h2>
        <p style={{ margin: 0 }}>{p.reason}</p>
        {p.status === "auto" ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            {p.kind === "tilbakerulling"
              ? "Appen gikk tilbake av seg selv. Under Versjoner på øvelsen kan du velge en annen versjon."
              : "Små forbedringer brukes automatisk (KI-innstillinger). Under Versjoner på øvelsen kan du gå tilbake."}
          </p>
        ) : null}
        {p.kind === "variant" ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Forslaget er en ny øvelse for én aldersgruppe, basert på denne. Den som finnes blir som den er, for de andre aldersgruppene.
          </p>
        ) : null}
        {ARCHIVING_KINDS.includes(p.kind) ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Forslaget er å arkivere øvelsen. Den blir liggende i banken, men KI bruker den ikke lenger.
          </p>
        ) : null}
        {p.kind === "ny_ovelse" ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Forslaget er en ny øvelse fra KI. Med «Bruk» legges den i banken som kandidat, merket med aldersgruppe og hovedtema.
          </p>
        ) : null}
        {p.kind === "metadata" ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Resten av øvelsen blir som den er.
          </p>
        ) : null}
      </section>
      <div style={{ maxWidth: 1040, marginBottom: "var(--space-4)" }}>
        <ProposalDiff before={p.base_values} after={p.proposed} fresh={p.kind === "ny_ovelse"} />
      </div>
      {p.status === "ny" && (p.exercise_id || p.kind === "ny_ovelse") ? (
        <ProposalDecision groupId={ctx.group.id} id={p.id} archive={ARCHIVING_KINDS.includes(p.kind)} editHref={`${base}/${p.id}/endre`} doneHref={base} />
      ) : p.status === "ny" ? (
        <p className="nm-hint">Øvelsen finnes ikke lenger i banken.</p>
      ) : null}
    </AppShell>
  );
}
