import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";
import type { CurrentUser } from "@/lib/auth/current";
import { envLabel } from "@/lib/env";

export const ADMIN_TABS = [
  { key: "trenere", label: "Trenere" },
  { key: "ki", label: "KI" },
  { key: "arshjul", label: "Årshjul" },
  { key: "standard", label: "Lagets standard" },
  { key: "laerdommer", label: "Lærdommer" },
  { key: "ovelser", label: "Øvelser" },
  { key: "vedlikehold", label: "Vedlikehold", superadmin: true },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]["key"];

/**
 * Settings: the user's own (theme, logout) for everyone, and the admin panel
 * (trainers' rights, KI, season plan, team settings, learnings, exercises,
 * maintenance) for admins, per main group.
 */
export function SettingsShell({
  user,
  back,
  tab,
  groupId,
  actions,
  children,
}: {
  user: CurrentUser;
  back: string;
  tab: AdminTab | "generelt";
  groupId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const label = envLabel();
  const q = (extra = "") => `?fra=${encodeURIComponent(back)}${groupId ? `&lag=${encodeURIComponent(groupId)}` : ""}${extra}`;
  const tabs = user.rights.admin ? ADMIN_TABS.filter((t) => !("superadmin" in t) || user.rights.superadmin) : [];
  return (
    <div className="nm-app">
      <aside className="nm-side nm-chrome">
        <Brand env={label} />
        <nav aria-label="Innstillinger">
          <Link href={`/innstillinger${q()}`} aria-current={tab === "generelt" ? "page" : undefined}>
            Generelt
          </Link>
          {tabs.map((t) => (
            <Link key={t.key} href={`/innstillinger/${t.key}${q()}`} aria-current={tab === t.key ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="nm-side__user">
          Innlogget som <strong>{user.data.profile.firstName}</strong> &nbsp;
          <a href="/logg-ut" className="nm-link-chrome">
            Logg ut
          </a>
        </div>
      </aside>
      <header className="nm-appbar nm-chrome">
        <Link href={back} className="nm-iconbtn" aria-label="Tilbake">
          <Icon icon={ChevronLeft} size={26} />
        </Link>
        <h1 className="nm-appbar__title">Innstillinger</h1>
      </header>
      <main className="nm-main">
        <div className="nm-main__inner">
          {tabs.length ? (
            <nav className="nm-tabs nm-phone-only" aria-label="Innstillinger">
              <Link href={`/innstillinger${q()}`} aria-current={tab === "generelt" ? "page" : undefined}>
                Generelt
              </Link>
              {tabs.map((t) => (
                <Link key={t.key} href={`/innstillinger/${t.key}${q()}`} aria-current={tab === t.key ? "page" : undefined}>
                  {t.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {children}
        </div>
      </main>
      {actions ? <div className="nm-actions">{actions}</div> : null}
    </div>
  );
}
