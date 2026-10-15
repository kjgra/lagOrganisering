import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";

export default function ErrorPage() {
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand />
      </div>
      <div className="nm-login__body">
        <div className="nm-login__card">
          <div className="nm-alert" role="alert">
            <Icon icon={CircleAlert} />
            <span>Fikk ikke kontakt med Spond akkurat nå. Prøv igjen om litt.</span>
          </div>
          <Link className="nm-btn nm-btn--primary nm-btn--block" href="/">
            Prøv igjen
          </Link>
          <a className="nm-btn nm-btn--ghost nm-btn--block" href="/logg-ut">
            Logg ut
          </a>
        </div>
      </div>
    </div>
  );
}
