import { ClipboardList, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { AKTIVITETER, BAND_KEYS, DELFERDIGHETER, HOVEDTEMA, aktivitetLabel, delfTag, nffSummary, temaTag } from "@/lib/nff/fagplan";
import { ratingOf, type BankItem } from "@/lib/plans/bank-filter";
import { feedbackSummary, shouldAvoid } from "@/lib/plans/feedback";
import { CATEGORIES, EXERCISE_STATUSES, type BankExercise } from "@/lib/plans/plan";
import { openProposalCount } from "@/lib/store/improvements";
import { listExercises } from "@/lib/store/training";
import { ExerciseBank } from "@/components/training/ExerciseBank";
import { ExerciseLicense } from "@/components/training/ExerciseLicense";

/** The team's exercise bank, for every trainer. */
export default async function ExercisesPage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser">) {
  const ctx = await contextFromParams(props.params);
  // «Ny øvelse med KI» comes back here with the new exercise's id, so it can be marked.
  const fresh = Number((await props.searchParams).ny) || null;
  const d = await db();
  const [bank, proposals] = await Promise.all([listExercises(d, ctx.user.access, ctx.group.id), openProposalCount(d, ctx.user.access, ctx.group.id)]);
  const items = bank.map((b) => bankItem(b, bank));
  const present = (keys: string[], label: (k: string) => string | undefined) => keys.filter((k) => label(k)).map((k): [string, string] => [k, label(k)!]);
  const tags = new Set(bank.flatMap((b) => b.nff_tags));
  // Only what the bank has, in the catalog's order, so a filter never shows an empty grid.
  const options = {
    alder: present(BAND_KEYS.filter((k) => bank.some((b) => b.bands.includes(k))), (k) => `${k.replace("-", "–")} år`),
    tema: present(HOVEDTEMA.map((t) => t.key).filter((k) => tags.has(temaTag(k))), (k) => HOVEDTEMA.find((t) => t.key === k)?.label),
    aktivitet: present(AKTIVITETER.map((a) => a.key).filter((k) => bank.some((b) => b.nff_activity === k)), aktivitetLabel),
    delf: present(DELFERDIGHETER.map((t) => t.key).filter((k) => tags.has(delfTag(k))), (k) => DELFERDIGHETER.find((t) => t.key === k)?.label),
    kategori: present(Object.keys(CATEGORIES).filter((c) => bank.some((b) => b.category === c)), (k) => CATEGORIES[k]),
  };
  const base = ctx.path("/trening/ovelser");
  // Manual creation is rarely used: with KI it is a quiet link at the bottom, without KI the only button.
  const ai = ctx.user.rights.ai;
  const buttons = (
    <div className="nm-row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
      {ai ? (
        <Link href={`${base}/ki`} className="nm-btn nm-btn--primary">
          <Icon icon={Sparkles} />
          Ny øvelse med KI
        </Link>
      ) : (
        <Link href={`${base}/ny`} className="nm-btn nm-btn--primary">
          <Icon icon={Plus} />
          Ny øvelse
        </Link>
      )}
    </div>
  );
  // Import from a file is for the superadmin only, a quiet link like «Lag øvelse uten KI».
  const importLink = ctx.user.rights.superadmin ? (
    <Link href={`${base}/import`} style={{ textDecoration: "underline" }}>
      Importer øvelser fra fil
    </Link>
  ) : null;
  const manual =
    ai || importLink ? (
      <p className="nm-hint nm-row" style={{ marginTop: "var(--space-6)", gap: "var(--space-4)" }}>
        {ai ? (
          <Link href={`${base}/ny`} style={{ textDecoration: "underline" }}>
            Lag øvelse uten KI
          </Link>
        ) : null}
        {importLink}
      </p>
    ) : null;
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="ovelser" />
      {proposals ? (
        <div className="nm-note" role="status" style={{ maxWidth: 760, marginBottom: "var(--space-3)" }}>
          <Icon icon={Sparkles} />
          <span>
            {proposals === 1 ? "Ett forslag" : `${proposals} forslag`} til bedre øvelser venter, laget fra trenernes innspill.{" "}
            <Link href={ctx.path("/trening/forbedringer")} style={{ textDecoration: "underline" }}>
              Se forbedringer
            </Link>
          </span>
        </div>
      ) : null}
      <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>
        Øvelsesbanken er felles for alle lagene i appen, og innspillene fra alle lagene teller.
      </p>
      {bank.length ? (
        <>
          <p style={{ marginTop: 0 }}>
            Nye øvelser fra godkjente opplegg kommer inn som <em>kandidater</em>, og blir aktive når en trener gir 👍 og «Bruke igjen: Ja». Trykk på navnet for å se øvelsen, på skjemaet for å evaluere den (også uten at den er brukt på en trening), eller på {ctx.user.rights.ai ? "stjernene for å justere den med KI" : "blyanten for å endre den"}.
          </p>
          {buttons}
          <ExerciseBank items={items} base={base} ai={ai} fresh={fresh} statuses={EXERCISE_STATUSES} options={options} />
          {manual}
        </>
      ) : (
        <EmptyState icon={ClipboardList} text="Banken er tom. Øvelser fra godkjente opplegg kommer hit, eller lag en selv.">
          {buttons}
          {manual}
        </EmptyState>
      )}
      <ExerciseLicense />
    </AppShell>
  );
}

/** What the bank's list and grid need of an exercise, without its texts. */
function bankItem(b: BankExercise, bank: BankExercise[]): BankItem {
  const players = b.min_players && b.max_players ? `${b.min_players}–${b.max_players} spillere` : b.min_players ? `minst ${b.min_players} spillere` : b.max_players ? `opptil ${b.max_players} spillere` : "";
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    status: b.status,
    summary: [feedbackSummary(b), b.fb_last ? `sist ${shortDate(b.fb_last)}` : "", b.based_on ? `variant av ${bank.find((x) => x.code === b.based_on)?.name ?? b.based_on}` : ""].filter(Boolean).join(" · "),
    nff: nffSummary(b),
    avoid: shouldAvoid(b),
    bands: b.bands,
    activity: b.nff_activity,
    tags: b.nff_tags,
    rating: ratingOf(b),
    // One sketch is what a thumbnail can show.
    drawing: b.drawing?.skisser.length ? { skisser: [b.drawing.skisser[0]] } : null,
    facts: [b.duration_minutes ? `${b.duration_minutes} min` : "", players].filter(Boolean).join(" · "),
  };
}
