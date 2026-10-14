import { ClipboardCheck, FileDown, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { DrawingSvg } from "@/components/plans/DrawingSvg";
import { PlanComments } from "@/components/plans/PlanComments";
import { PlanControls } from "@/components/plans/PlanControls";
import { Icon } from "@/components/ui/icon";
import { AI_MODELS } from "@/lib/ai/plan-ai";
import type { GroupContext } from "@/lib/context";
import { db } from "@/lib/db";
import { savedAt } from "@/lib/format";
import { FEEDBACK_TAGS, RATINGS, ratingsText } from "@/lib/plans/feedback";
import { bankCandidates, schedule, type PlanExercise } from "@/lib/plans/plan";
import { profileName } from "@/lib/proposal-view";
import { eventIsPast } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";
import { getPlan, listExercises, listFeedback, listPlanComments, planVersions } from "@/lib/store/training";

function Lines({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="nm-h3" style={{ margin: "10px 0 4px", fontSize: 16 }}>{title}</h4>
      <ul className="nm-plan-list">
        {items.map((t, i) => (
          <li key={i}>{t.replaceAll("**", "")}</li>
        ))}
      </ul>
    </div>
  );
}

function ExerciseDetails({ e, n }: { e: PlanExercise; n: number }) {
  return (
    <details className="nm-exercise">
      <summary style={{ cursor: "pointer", fontSize: 17, fontWeight: 700, minHeight: 32 }}>
        {n}. {e.navn}
        <span className="nm-muted" style={{ fontWeight: 400 }}>
          {e.kategori ? ` · ${e.kategori}` : ""}
          {e.kilde === "ny" ? " · ny" : e.kilde === "justert" ? " · justert" : ""}
        </span>
      </summary>
      <div style={{ paddingTop: 8 }}>
        {e.fokus ? <p style={{ margin: "0 0 8px" }}>Fokus: {e.fokus.replaceAll("**", "")}</p> : null}
        {e.tegning ? <DrawingSvg drawing={e.tegning} title={`Tegning av ${e.navn}`} /> : null}
        <Lines title="Organisering" items={e.organisering} />
        <Lines title="Gjennomføring" items={e.gjennomforing} />
        <Lines title="Tilpasning" items={e.tilpasning} />
        <Lines title="Læringsmomenter" items={e.laeringsmomenter} />
        <Lines title="Spørsmål til spillerne" items={e.sporsmal} />
        <Lines title="Variasjoner" items={[e.enklere && `Enklere: ${e.enklere}`, e.vanskeligere && `Vanskeligere: ${e.vanskeligere}`].filter(Boolean)} />
        {e.nff_url ? (
          <p style={{ margin: "8px 0 0", fontSize: 15 }}>
            Kilde:{" "}
            <a href={e.nff_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
              {e.nff_url}
            </a>
          </p>
        ) : null}
      </div>
    </details>
  );
}

/**
 * The training plan of an event: versions, the chosen version (the approved
 * one, else the newest), approval, PDF, KI, comments and the evaluation.
 */
export async function PlanSection({ ctx, event, selected }: { ctx: GroupContext; event: SpondEvent; selected?: number }) {
  const d = await db();
  const { user, group } = ctx;
  const versions = await planVersions(d, user.access, group.id, event.id);
  const past = eventIsPast(event);
  const canKi = user.rights.ai && !past && !event.cancelled;
  const base = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  const head = (
    <h2 className="nm-section-label" id="plan-h">
      Treningsopplegg
    </h2>
  );

  if (!versions.length) {
    return (
      <section aria-labelledby="plan-h">
        {head}
        <p className="nm-muted" style={{ margin: "0 0 12px" }}>
          {past ? "Det ble ikke laget noe opplegg for denne økta." : "Ingen opplegg ennå. Sett sammen et fra øvelsesbanken, eller la KI foreslå et."}
        </p>
        {!past ? (
          <div className="nm-row" style={{ gap: 8 }}>
            <Link href={`${base}/opplegg/endre`} className="nm-btn nm-btn--secondary">
              <Icon icon={Pencil} />
              Lag opplegg
            </Link>
            {canKi ? (
              <Link href={`${base}/opplegg/ki`} className="nm-btn nm-btn--secondary">
                <Icon icon={Sparkles} />
                Lag med KI
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  const approved = versions.find((v) => v.status === "approved");
  const current = versions.find((v) => v.id === selected) ?? approved ?? versions[0];
  const [stored, comments, bank, feedback] = await Promise.all([
    getPlan(d, user.access, current.id),
    listPlanComments(d, user.access, group.id, event.id),
    listExercises(d, user.access, group.id),
    past ? listFeedback(d, user.access, group.id, event.id) : Promise.resolve([]),
  ]);
  const p = stored.plan;
  const sched = schedule(p);
  const candidates = current.status === "approved" ? [] : bankCandidates(p, bank);
  const source = stored.source === "ai" ? `med KI (${AI_MODELS[stored.model]?.label ?? "ukjent modell"})` : "manuelt";
  const fbForPlan = feedback.filter((f) => f.plan_id === stored.id);
  const myFeedback = fbForPlan.some((f) => f.author === user.session.profileId);
  const evaluated = approved ?? versions[0];

  return (
    <section aria-labelledby="plan-h">
      {head}
      <article className="nm-card nm-proposal">
        {versions.length > 1 ? (
          <nav className="nm-versions" aria-label="Versjoner">
            {versions.map((v) => (
              <Link key={v.id} href={`${base}?opplegg=${v.id}#plan-h`} aria-current={v.id === current.id} scroll={false}>
                v{v.version}
                {v.status === "approved" ? " ✓" : ""}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="nm-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, lineHeight: "26px", fontWeight: 700 }}>{p.tittel}</div>
            {p.undertittel ? <div style={{ fontSize: 16 }}>{p.undertittel}</div> : null}
            <div className="nm-muted" style={{ fontSize: 15 }}>
              Versjon {current.version} · laget {source} av {profileName(group, stored.createdBy)} · {savedAt(stored.createdAt)}
            </div>
            {stored.approvedBy && stored.approvedAt ? (
              <div className="nm-muted" style={{ fontSize: 15 }}>
                Godkjent av {profileName(group, stored.approvedBy)} {savedAt(stored.approvedAt)}
              </div>
            ) : null}
          </div>
          <span className={`nm-badge ${current.status === "approved" ? "nm-badge--kommer" : "nm-badge--neutral"}`}>{current.status === "approved" ? "Godkjent" : "Utkast"}</span>
        </div>

        {p.fokus.forsvar || p.fokus.angrep ? (
          <div className="nm-note" style={{ display: "block" }}>
            {p.fokus.forsvar ? <div>Forsvar: {p.fokus.forsvar.replaceAll("**", "")}</div> : null}
            {p.fokus.angrep ? <div>Angrep: {p.fokus.angrep.replaceAll("**", "")}</div> : null}
          </div>
        ) : null}

        <div>
          <h3 className="nm-h3" style={{ marginBottom: 4 }}>Tidsplan · {sched.total} min</h3>
          <ul className="nm-plan-list" style={{ listStyle: "none", paddingLeft: 0 }}>
            {sched.rows.map((r, i) => (
              <li key={i}>
                <span className="nm-muted" style={{ display: "inline-block", minWidth: 58 }}>
                  {r.tid}
                </span>
                {r.felles ? r.tekst?.replaceAll("**", "") : sched.columns.length > 2 ? "Stasjoner (rotasjon)" : r.celler?.[0]}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {p.ovelser.map((e, i) => (
            <ExerciseDetails key={i} e={e} n={i + 1} />
          ))}
        </div>

        <div className="nm-row" style={{ gap: 8 }}>
          <a href={`/api/opplegg/${stored.id}/pdf`} target="_blank" rel="noreferrer" className="nm-btn nm-btn--primary">
            <Icon icon={FileDown} />
            Last ned PDF
          </a>
          {!past ? (
            <Link href={`${base}/opplegg/endre?fra=${stored.id}`} className="nm-btn nm-btn--secondary">
              <Icon icon={Pencil} />
              Endre
            </Link>
          ) : null}
          {canKi ? (
            <>
              <Link href={`${base}/opplegg/ki?fra=${stored.id}`} className="nm-btn nm-btn--secondary">
                <Icon icon={Sparkles} />
                Juster med KI
              </Link>
              <Link href={`${base}/opplegg/ki`} className="nm-btn nm-btn--ghost">
                Nytt med KI
              </Link>
            </>
          ) : null}
        </div>
        <PlanControls planId={stored.id} version={current.version} approved={current.status === "approved"} candidates={candidates} />

        {past ? (
          <div className="nm-stack" style={{ gap: 8 }}>
            <h3 className="nm-h3">Evaluering</h3>
            {fbForPlan.length ? (
              <ul className="nm-plan-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                {[null, ...p.ovelser.map((_, i) => i + 1)].map((no) => {
                  const rows = fbForPlan.filter((f) => f.exercise_no === no);
                  if (!rows.length) return null;
                  const counts: Record<string, number> = {};
                  for (const r of rows) if (r.rating) counts[r.rating] = (counts[r.rating] ?? 0) + 1;
                  const tags = [...new Set(rows.flatMap((r) => r.tags))].map((t) => FEEDBACK_TAGS[t] ?? t);
                  return (
                    <li key={no ?? 0}>
                      <strong>{no === null ? "Hele økta" : `${no}. ${p.ovelser[no - 1].navn}`}</strong>: {[ratingsText(counts), ...rows.filter((r) => r.actual_players !== null).map((r) => `${r.actual_players} spillere kom`)].filter(Boolean).join(" · ") || "–"}
                      {tags.length ? <span className="nm-muted"> · {tags.join(", ")}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="nm-muted" style={{ margin: 0 }}>
                Ingen har evaluert {current.id === evaluated.id ? "økta" : "denne versjonen"} ennå. Hvordan gikk det? {Object.values(RATINGS).join(" ")}
              </p>
            )}
            <div>
              <Link href={`${base}/opplegg/${stored.id}/evaluering`} className="nm-btn nm-btn--secondary">
                <Icon icon={ClipboardCheck} />
                {myFeedback ? "Endre evalueringen din" : "Evaluer økta"}
              </Link>
            </div>
          </div>
        ) : null}

        <PlanComments
          groupId={group.id}
          planId={stored.id}
          exercises={p.ovelser.map((e) => e.navn)}
          canWrite={!past}
          comments={comments.map((c) => ({
            id: c.id,
            version: c.version,
            exerciseNo: c.exercise_no,
            author: profileName(group, c.author),
            mine: c.author === user.session.profileId,
            body: c.body,
            when: savedAt(c.created_at),
            usedIn: c.used_in_version,
          }))}
        />
      </article>
    </section>
  );
}
