import { Check, CircleHelp, Clock, Hourglass, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { statusLabel } from "@/lib/spond/events";
import type { ResponseStatus } from "@/lib/spond/types";

const CLASS: Record<ResponseStatus, string> = {
  accepted: "nm-badge--kommer",
  unanswered: "nm-badge--ikke-svart",
  declined: "nm-badge--kommer-ikke",
  waiting: "nm-badge--neutral",
  unconfirmed: "nm-badge--neutral",
};
const ICON = { accepted: Check, unanswered: Clock, declined: X, waiting: Hourglass, unconfirmed: CircleHelp };

/** Response status, always icon + word, never colour alone. */
export function StatusBadge({ status }: { status: ResponseStatus }) {
  return (
    <span className={`nm-badge ${CLASS[status]}`}>
      <Icon icon={ICON[status]} size={16} />
      {statusLabel(status)}
    </span>
  );
}

/** «Kommer: 14 · Ikke svart: 3 · Kommer ikke: 1» with a stacked meter. The numbers carry the information. */
export function ResponseCounts({ accepted, unanswered, declined }: { accepted: number; unanswered: number; declined: number }) {
  const tot = accepted + unanswered + declined || 1;
  return (
    <>
      <div className="nm-counts">
        <span className="is-kommer">
          <Icon icon={Check} size={18} />
          Kommer: <b>{accepted}</b>
        </span>
        <span className="is-ikke-svart">
          <Icon icon={Clock} size={18} />
          Ikke svart: <b>{unanswered}</b>
        </span>
        <span className="is-kommer-ikke">
          <Icon icon={X} size={18} />
          Kommer ikke: <b>{declined}</b>
        </span>
      </div>
      <div className="nm-meter" role="img" aria-label={`${accepted} kommer, ${unanswered} ikke svart, ${declined} kommer ikke`}>
        <span className="is-kommer" style={{ width: `${(accepted / tot) * 100}%` }} />
        <span className="is-ikke-svart" style={{ width: `${(unanswered / tot) * 100}%` }} />
        <span className="is-kommer-ikke" style={{ width: `${(declined / tot) * 100}%` }} />
      </div>
    </>
  );
}

export function Tag({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="nm-tag" title={title}>
      {children}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <span className="nm-avatar" aria-hidden="true">
      {initials}
    </span>
  );
}
