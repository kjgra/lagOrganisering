import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";

/** A page or an event that does not exist (any more), e.g. an old link. */
export default function NotFound() {
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand />
      </div>
      <div className="nm-login__body">
        <div className="nm-login__card">
          <h1 style={{ margin: 0, fontSize: "var(--fs-title)", lineHeight: "var(--lh-title)" }}>Fant ikke siden</h1>
          <div className="nm-note">
            <Icon icon={CircleAlert} />
            <span>Den kan være slettet, eller arrangementet er flyttet i Spond.</span>
          </div>
          <Link className="nm-btn nm-btn--primary nm-btn--block" href="/">
            Til startsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
