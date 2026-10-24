import { Bookmark, CalendarDays, ChevronLeft, ClipboardList, Settings, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/icon";
import type { GroupContext } from "@/lib/context";
import { db } from "@/lib/db";
import { envLabel } from "@/lib/env";
import { pickerGroups } from "@/lib/groups";
import { getPreferences } from "@/lib/store/preferences";
import { pendingProposals } from "@/lib/store/proposals";
import { ContextCard, GroupSwitcherProvider, SideGroupSelect } from "./GroupSwitcher";

export type Section = "events" | "proposals" | "training" | "members";

const NAV: { key: Section; label: string; icon: typeof CalendarDays; path: string }[] = [
  { key: "events", label: "Arrangementer", icon: CalendarDays, path: "/arrangementer" },
  { key: "proposals", label: "Lagforslag", icon: Bookmark, path: "/lagforslag" },
  { key: "training", label: "Trening", icon: ClipboardList, path: "/trening" },
  { key: "members", label: "Medlemmer", icon: Users, path: "/medlemmer" },
];

/**
 * The app frame from the design: dark side menu (desktop), dark app bar,
 * content, a fixed action bar at the bottom and a dark bottom menu on the
 * top-level screens (phone). Sub pages get a back button and a title.
 */
export async function AppShell({
  ctx,
  title,
  section,
  back,
  actions,
  wide,
  children,
}: {
  ctx: GroupContext;
  title: string;
  /** The top-level section this page belongs to. */
  section: Section;
  /** Sub pages: where the back button goes. Top-level pages have none. */
  back?: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const d = await db();
  const [prefs, pending] = await Promise.all([
    getPreferences(d, ctx.user.session.profileId),
    pendingProposals(d, ctx.user.access, ctx.group.id).catch(() => []),
  ]);
  // Proposals waiting for approval, as a number on «Lagforslag» in both menus.
  const badge = (key: Section) =>
    key === "proposals" && pending.length ? (
      <span className="nm-navbadge">
        {pending.length}
        <span className="nm-sr"> venter på godkjenning</span>
      </span>
    ) : null;
  const label = envLabel();
  const top = !back;
  const sectionPath = NAV.find((n) => n.key === section)!.path;
  const navLinks = (cls?: string) =>
    NAV.map((n) => (
      <Link key={n.key} href={ctx.path(n.path)} aria-current={n.key === section && top ? "page" : undefined} className={cls}>
        <span className="nm-navicon">
          <Icon icon={n.icon} />
          {badge(n.key)}
        </span>
        {n.label}
      </Link>
    ));

  return (
    <GroupSwitcherProvider
      data={{
        groups: pickerGroups(ctx.user.data.groups),
        favorites: prefs.favorites,
        recent: prefs.recent,
        current: ctx.refKey,
        section: sectionPath,
        currentMain: ctx.group.name,
        currentSub: ctx.subgroup?.name ?? "Alle i hovedgruppa",
      }}
    >
      <div className="nm-app">
        <aside className="nm-side nm-chrome">
          <Brand env={label} />
          <SideGroupSelect />
          <nav aria-label="Hovedmeny">
            {NAV.map((n) => (
              <Link key={n.key} href={ctx.path(n.path)} aria-current={n.key === section ? "page" : undefined}>
                <Icon icon={n.icon} />
                {n.label}
                {badge(n.key)}
              </Link>
            ))}
          </nav>
          <div className="nm-side__user">
            Innlogget som <strong>{ctx.user.data.profile.firstName}</strong> &nbsp;
            <a href="/logg-ut" className="nm-link-chrome">
              Logg ut
            </a>
          </div>
        </aside>
        <header className="nm-appbar nm-chrome">
          {back ? (
            <>
              <Link href={back} className="nm-iconbtn" aria-label="Tilbake">
                <Icon icon={ChevronLeft} size={26} />
              </Link>
              <h1 className="nm-appbar__title">{title}</h1>
            </>
          ) : (
            <>
              <span className="nm-phone-only" style={{ flex: 1 }}>
                <Brand env={label} />
              </span>
              <h1 className="nm-appbar__title nm-desk-only">{title}</h1>
            </>
          )}
          <Link href={`/innstillinger?fra=${encodeURIComponent(ctx.path(sectionPath))}&lag=${encodeURIComponent(ctx.group.id)}`} className="nm-iconbtn nm-iconbtn--chrome" aria-label="Innstillinger">
            <Icon icon={Settings} />
          </Link>
        </header>
        <main className={wide ? "nm-main nm-main--wide" : "nm-main"}>
          <div className="nm-main__inner">
            {top ? (
              <>
                <ContextCard />
                <h1 className="nm-page-title nm-phone-only">{title}</h1>
              </>
            ) : null}
            {children}
          </div>
        </main>
        {actions ? <div className="nm-actions">{actions}</div> : null}
        {top ? (
          <nav className="nm-bottomnav nm-chrome" aria-label="Hovedmeny">
            {navLinks()}
          </nav>
        ) : null}
      </div>
    </GroupSwitcherProvider>
  );
}
