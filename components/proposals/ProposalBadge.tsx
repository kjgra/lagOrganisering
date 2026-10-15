import { Check, Pencil } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import type { Proposal } from "@/lib/store/proposals";

/** On an event card: approved teams, waiting for approval, or how many proposals. */
export function ProposalBadge({ proposals, locked }: { proposals: Proposal[]; locked?: boolean }) {
  const st = proposals.map((p) => p.status);
  return (
    <>
      {st.includes("approved") ? (
        <span className="nm-badge nm-badge--kommer">
          <Icon icon={Check} size={16} />
          Godkjente lag
        </span>
      ) : st.includes("pending") ? (
        <span className="nm-badge nm-badge--ikke-svart">Venter på godkjenning</span>
      ) : st.length ? (
        <span className="nm-badge nm-badge--neutral">{st.length === 1 ? "1 lagforslag" : `${st.length} lagforslag`}</span>
      ) : null}
      {locked ? (
        <span className="nm-badge nm-badge--neutral">
          <Icon icon={Pencil} size={16} />
          Redigeres
        </span>
      ) : null}
    </>
  );
}
