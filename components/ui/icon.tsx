import type { LucideIcon } from "lucide-react";

/** A Lucide icon in the design system's style (2.25 stroke, hidden from screen readers). */
export function Icon({ icon: I, size = 22, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <I className={className ? `nm-icon ${className}` : "nm-icon"} size={size} strokeWidth={2.25} aria-hidden="true" />;
}
