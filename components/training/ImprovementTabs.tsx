import Link from "next/link";
import type { GroupContext } from "@/lib/context";

/** «Forslag» and «Innsikt» in Forbedringer. */
export function ImprovementTabs({ ctx, current }: { ctx: GroupContext; current: "forslag" | "innsikt" }) {
  const base = ctx.path("/trening/forbedringer");
  return (
    <nav className="nm-tabs nm-tabs--inline" aria-label="Forbedringer">
      <Link href={base} aria-current={current === "forslag" ? "page" : undefined}>
        Forslag
      </Link>
      <Link href={`${base}/innsikt`} aria-current={current === "innsikt" ? "page" : undefined}>
        Innsikt
      </Link>
    </nav>
  );
}
