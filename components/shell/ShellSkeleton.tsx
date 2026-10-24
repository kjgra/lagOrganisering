"use client";

import { Bookmark, CalendarDays, ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";

const NAV = [
  { key: "arrangementer", label: "Arrangementer", icon: CalendarDays },
  { key: "lagforslag", label: "Lagforslag", icon: Bookmark },
  { key: "medlemmer", label: "Medlemmer", icon: Users },
] as const;

/** The app bar title of a sub page, guessed from its path while it loads. */
function titleOf(parts: string[]): string {
  const last = parts.at(-1) ?? "";
  if (parts[0] === "innstillinger") return "Innstillinger";
  if (last === "lag" || parts.at(-2) === "lag") return "Lag";
  if (last === "ki") return "KI-opplegg";
  if (last === "endre") return "Opplegg";
  if (last === "evaluering") return "Evaluering";
  if (last === "dagens-okt") return "Dagens økt";
  if (parts.includes("utkast")) return "Gruppeutkast";
  if (parts.at(-2) === "arrangementer") return "Påmeldte";
  return "";
}

/**
 * Shown at once while a page loads (loading.tsx), so a tap always gives
 * feedback, also in the home-screen app where there is no loading bar. The
 * same frame as AppShell, with grey blocks where the content comes.
 */
export function ShellSkeleton({ top = false }: { top?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const parts = pathname.split("/").filter(Boolean);
  const base = parts[0] === "g" && parts.length >= 3 ? `/g/${parts[1]}/${parts[2]}` : null;
  const section = parts[3] ?? "";
  const links = (cls?: string) =>
    base
      ? NAV.map((n) => (
          <Link key={n.key} href={`${base}/${n.key}`} aria-current={top && n.key === section ? "page" : undefined} className={cls}>
            <Icon icon={n.icon} />
            {n.label}
          </Link>
        ))
      : null;
  return (
    <div className="nm-app" aria-busy="true">
      <aside className="nm-side nm-chrome">
        <Brand />
        <div className="nm-skel nm-skel--chrome" style={{ height: 56, marginTop: "var(--space-5)" }} />
        <nav aria-label="Hovedmeny">{links()}</nav>
      </aside>
      <header className="nm-appbar nm-chrome">
        {top ? (
          <span className="nm-phone-only" style={{ flex: 1 }}>
            <Brand />
          </span>
        ) : (
          <>
            <button type="button" className="nm-iconbtn" aria-label="Tilbake" onClick={() => router.back()}>
              <Icon icon={ChevronLeft} size={26} />
            </button>
            <span className="nm-appbar__title">{titleOf(parts)}</span>
          </>
        )}
      </header>
      <main className="nm-main">
        <div className="nm-main__inner nm-stack" style={{ gap: "var(--space-4)" }}>
          <span role="status" className="nm-sr">
            Laster …
          </span>
          {top ? <div className="nm-skel nm-phone-only" style={{ height: 76 }} /> : null}
          <div className="nm-skel" style={{ height: 28, width: "60%" }} />
          <div className="nm-skel" style={{ height: 20, width: "40%" }} />
          <div className="nm-skel nm-skel--card" />
          <div className="nm-skel nm-skel--card" />
          <div className="nm-skel nm-skel--card" />
        </div>
      </main>
      {top ? (
        <nav className="nm-bottomnav nm-chrome" aria-label="Hovedmeny">
          {links()}
        </nav>
      ) : null}
    </div>
  );
}
