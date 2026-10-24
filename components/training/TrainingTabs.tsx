import Link from "next/link";
import type { GroupContext } from "@/lib/context";

export const TRAINING_TABS = [
  { key: "ovelser", label: "Øvelser" },
  { key: "arshjul", label: "Årshjul" },
  { key: "prinsipper", label: "Slik trener vi" },
  { key: "laget", label: "Laget" },
] as const;

export type TrainingTab = (typeof TRAINING_TABS)[number]["key"];

/** The four pages of «Trening», as tabs at the top. */
export function TrainingTabs({ ctx, current }: { ctx: GroupContext; current: TrainingTab }) {
  return (
    <nav className="nm-tabs nm-tabs--inline" aria-label="Trening">
        {TRAINING_TABS.map((t) => (
          <Link key={t.key} href={ctx.path(`/trening/${t.key}`)} aria-current={t.key === current ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
    </nav>
  );
}
