import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { SeasonForm } from "@/components/training/forms";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { MONTH_NAMES, osloParts } from "@/lib/format";
import { listSeason } from "@/lib/store/training";

/** The season plan: a theme per month, for every trainer. */
export default async function SeasonPage(props: PageProps<"/g/[groupId]/[sub]/trening/arshjul">) {
  const ctx = await contextFromParams(props.params);
  const sp = await props.searchParams;
  const now = osloParts(new Date());
  const year = Number(typeof sp.ar === "string" ? sp.ar : "") || now.year;
  const rows = await listSeason(await db(), ctx.user.access, ctx.group.id, year);
  const themes = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.theme ?? "");
  const descriptions = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.description ?? "");
  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="arshjul" />
      <p style={{ marginTop: 0 }}>Månedens tema foreslås når trenerne lager opplegg, og KI bruker det.</p>
      <div className="nm-versions" style={{ marginBottom: "var(--space-4)" }}>
        {[now.year - 1, now.year, now.year + 1].map((y) => (
          <Link key={y} href={ctx.path(`/trening/arshjul?ar=${y}`)} aria-current={y === year}>
            {y}
          </Link>
        ))}
      </div>
      <SeasonForm key={year} groupId={ctx.group.id} year={year} months={MONTH_NAMES} themes={themes} descriptions={descriptions} current={year === now.year ? now.month : undefined} />
    </AppShell>
  );
}
