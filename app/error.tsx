"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";

/** Something failed while showing a page: say so in Norwegian and offer to try again. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand />
      </div>
      <div className="nm-login__body">
        <div className="nm-login__card">
          <h1 style={{ margin: 0, fontSize: "var(--fs-title)", lineHeight: "var(--lh-title)" }}>Noe gikk galt</h1>
          <div className="nm-alert" role="alert">
            <Icon icon={CircleAlert} />
            <span>Siden kunne ikke vises. Sjekk nettet og prøv igjen.</span>
          </div>
          <button type="button" className="nm-btn nm-btn--primary nm-btn--block" onClick={retry}>
            <Icon icon={RotateCcw} />
            Prøv igjen
          </button>
          <Link className="nm-btn nm-btn--secondary nm-btn--block" href="/">
            Til startsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
