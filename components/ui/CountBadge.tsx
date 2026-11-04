import { badgeText } from "@/lib/attention";

/**
 * A small number badge (proposals waiting, things in admin waiting). The
 * number is for the eye; screen readers get `label` instead («2 tilbakemeldinger
 * venter»). Nothing is shown for 0.
 */
export function CountBadge({ n, label, className }: { n: number; label?: string; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={className ? `nm-navbadge ${className}` : "nm-navbadge"}>
      <span aria-hidden={label ? "true" : undefined}>{badgeText(n)}</span>
      {label ? <span className="nm-sr"> {label}</span> : null}
    </span>
  );
}
