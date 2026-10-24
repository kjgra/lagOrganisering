import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

/** An empty page or list: what is missing, and the next step as buttons. */
export function EmptyState({ icon, text, children }: { icon: LucideIcon; text: string; children?: ReactNode }) {
  return (
    <div className="nm-empty">
      <Icon icon={icon} size={32} />
      <p>{text}</p>
      {children ? <div className="nm-empty__actions">{children}</div> : null}
    </div>
  );
}
