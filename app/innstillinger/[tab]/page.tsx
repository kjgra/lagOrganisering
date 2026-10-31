import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AiSettingsForm } from "@/components/settings/admin/forms";
import { GroupSelect } from "@/components/settings/admin/GroupSelect";
import { MaintenancePanel } from "@/components/settings/admin/MaintenancePanel";
import { RoleTable } from "@/components/settings/admin/RoleTable";
import { ADMIN_TABS, SettingsShell, type AdminTab } from "@/components/settings/SettingsShell";
import { adminContext, trainers, type AdminContext } from "@/lib/admin";
import { AI_MODELS, budgetCheck, formatNok } from "@/lib/ai/plan-ai";
import { db } from "@/lib/db";
import { superadminId } from "@/lib/env";
import { decimal, MONTH_NAMES, osloMidnight, osloMonthStart, osloParts, savedAt, shortDate } from "@/lib/format";
import { MAINTENANCE_RULES } from "@/lib/maintenance";
import { movedPath } from "@/lib/settings-nav";
import { profileName } from "@/lib/proposal-view";
import { aiSpend, aiUsagePeriod, getAiSettings } from "@/lib/store/ai";
import { archiveKey, archiveLog, archivePending } from "@/lib/store/archive";
import { listRoles } from "@/lib/store/roles";

/** The admin panel: one tab per page, per main group (?lag=). */
export default async function AdminTabPage(props: PageProps<"/innstillinger/[tab]">) {
  const { tab } = await props.params;
  const sp = await props.searchParams;
  if (tab in MOVED) redirect(movedPath(sp, MOVED[tab]));
  const t = ADMIN_TABS.find((x) => x.key === tab);
  if (!t) notFound();
  const ctx = await adminContext(sp);
  if ("superadmin" in t && !ctx.user.rights.superadmin) notFound();
  const body = await TABS[t.key](ctx, sp);
  const hrefFor = Object.fromEntries(ctx.user.data.groups.map((g) => [g.id, `/innstillinger/${t.key}?fra=${encodeURIComponent(ctx.back)}&lag=${encodeURIComponent(g.id)}`]));
  return (
    <SettingsShell user={ctx.user} back={ctx.back} tab={t.key} groupId={ctx.group.id}>
      <h2 className="nm-h2">{t.label}</h2>
      {t.key !== "vedlikehold" ? <GroupSelect groups={ctx.user.data.groups.map((g) => ({ id: g.id, name: g.name }))} current={ctx.group.id} hrefFor={hrefFor} /> : null}
      {body}
    </SettingsShell>
  );
}

type Sp = Record<string, string | string[] | undefined>;

/** Tabs that moved to «Trening», for old links and bookmarks. */
const MOVED: Record<string, string> = { arshjul: "/trening/arshjul", standard: "/trening/laget", laerdommer: "/trening/prinsipper", ovelser: "/trening/ovelser" };
const str = (x: unknown) => (typeof x === "string" ? x : "");

const TABS: Record<AdminTab, (ctx: AdminContext, sp: Sp) => Promise<React.ReactNode>> = {
  async trenere({ user, group }) {
    const list = trainers(group);
    const roles = await listRoles(await db(), list.map((t) => t.profileId));
    const sa = superadminId();
    const rows = list.map((t) => {
      const r = roles.find((x) => x.spond_profile_id === t.profileId);
      return {
        profileId: t.profileId,
        name: t.name,
        roles: t.roles,
        app: !!r?.can_use_app,
        ai: !!r?.can_use_ai,
        admin: !!r?.is_admin,
        tags: r?.can_see_tags ?? true,
        superadmin: t.profileId === sa,
        self: t.profileId === user.session.profileId,
        changed: r ? `Endret av ${profileName(group, r.updated_by)} ${savedAt(r.updated_at)}` : "",
      };
    });
    return (
      <>
        <p style={{ marginTop: 0 }}>
          Trenere med profil i Spond. <strong>App</strong> gir tilgang til å logge inn i appen; ingen andre kommer inn. <strong>KI</strong> gir tilgang til å lage opplegg
          med KI. <strong>Tagger</strong> gir tilgang til å se og endre nivå, hvem som spiller godt sammen, og tagger på spillere; alle
          trenere har det som standard. <strong>Admin</strong> gir tannhjulet og alltid app-tilgang. Bare superadmin kan gi admin.
        </p>
        {rows.length ? <RoleTable groupId={group.id} rows={rows} canAdmin={user.rights.superadmin} /> : <p className="nm-muted">Fant ingen trenere med Spond-profil i gruppa.</p>}
      </>
    );
  },

  async ki({ user, group, q }, sp) {
    const d = await db();
    const now = new Date();
    const m = /^(\d{4})-(\d{2})$/.exec(str(sp.mnd));
    const from = m ? osloMidnight(Number(m[1]), Number(m[2]), 1) : osloMonthStart(now);
    const fp = osloParts(from);
    const to = fp.month === 12 ? osloMidnight(fp.year + 1, 1, 1) : osloMidnight(fp.year, fp.month + 1, 1);
    const [settings, usage, spend] = await Promise.all([getAiSettings(d), aiUsagePeriod(d, user.access, group.id, from, to), aiSpend(d, user.access, group.id, osloMonthStart(now))]);
    const nok = (usd: number) => (usd > 0 ? formatNok(usd, settings.usd_nok).replace(/^ca\. /, "") : "0 kr");
    const groupUsd = usage.rows.reduce((s, r) => s + r.cost_usd, 0);
    const days = new Map<number, number>();
    for (const r of usage.rows) {
      const day = osloParts(r.created_at).day;
      days.set(day, (days.get(day) ?? 0) + r.cost_usd);
    }
    const maxDay = Math.max(0, ...days.values());
    const by = (key: (r: (typeof usage.rows)[number]) => string) => {
      const out = new Map<string, { n: number; usd: number; err: number }>();
      for (const r of usage.rows) {
        const k = key(r);
        const o = out.get(k) ?? { n: 0, usd: 0, err: 0 };
        o.n++;
        o.usd += r.cost_usd;
        if (r.status === "error") o.err++;
        out.set(k, o);
      }
      return [...out.entries()].sort((a, b) => b[1].usd - a[1].usd);
    };
    const KIND: Record<string, string> = { draft: "Nytt opplegg", revision: "Justering", visual: "Tegning", learning: "Lærdommer", exercise: "Øvelse", feedback: "Evaluering" };
    const table = (title: string, rows: [string, { n: number; usd: number; err: number }][]) =>
      rows.length ? (
        <div className="nm-scroll-x" style={{ marginBottom: "var(--space-4)" }}>
          <table className="nm-table">
            <thead>
              <tr>
                <th>{title}</th>
                <th className="num">Kall</th>
                <th className="num">Feilet</th>
                <th className="num">Kostnad</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, o]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="num">{o.n}</td>
                  <td className="num">{o.err}</td>
                  <td className="num">{nok(o.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null;
    const months = Array.from({ length: 12 }, (_, i) => osloParts(osloMonthStart(now, i)));
    const budget = budgetCheck(spend, settings);
    const nDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    return (
      <>
        <section className="nm-section">
          <div className="nm-versions" style={{ marginBottom: "var(--space-3)" }}>
            {months.slice(0, 6).map((p) => {
              const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
              return (
                <Link key={key} href={`/innstillinger/ki${q({ mnd: key })}`} aria-current={p.year === fp.year && p.month === fp.month}>
                  {MONTH_NAMES[p.month - 1].slice(0, 3).toLowerCase()} {p.year}
                </Link>
              );
            })}
          </div>
          <div className="nm-form-row" style={{ marginBottom: "var(--space-3)" }}>
            {[
              ["Kall", String(usage.rows.length)],
              [`${group.name}`, nok(groupUsd)],
              ["Hele appen", nok(usage.totalUsd)],
              ["Grense per lag", `${settings.group_limit_nok} kr`],
            ].map(([l, v]) => (
              <div key={l} className="nm-card" style={{ padding: "var(--space-3)" }}>
                <div className="nm-hint">{l}</div>
                <div style={{ fontSize: "var(--fs-title)", fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          {!budget.ok ? (
            <div className="nm-alert" role="status" style={{ marginBottom: "var(--space-3)" }}>
              {budget.message}
            </div>
          ) : null}
          {usage.rows.length ? (
            <div aria-label="Kostnad per dag" role="img" style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-1)", height: 80, marginBottom: "var(--space-4)", borderBottom: "1px solid var(--line)" }}>
              {Array.from({ length: nDays }, (_, i) => {
                const v = days.get(i + 1) ?? 0;
                return <div key={i} title={`${i + 1}.: ${nok(v)}`} style={{ flex: 1, height: `${maxDay ? Math.max(v ? 4 : 0, (v / maxDay) * 100) : 0}%`, background: "var(--primary)", borderRadius: "var(--radius-sm)" }} />;
              })}
            </div>
          ) : (
            <p className="nm-muted">Ingen KI-kall i {MONTH_NAMES[fp.month - 1].toLowerCase()}.</p>
          )}
          {table("Trener", by((r) => profileName(group, r.spond_profile_id)))}
          {table("Modell", by((r) => AI_MODELS[r.model]?.label ?? r.model))}
          {table("Type", by((r) => KIND[r.kind] ?? r.kind))}
          <p className="nm-hint">Bare antall tokens og kostnad lagres, aldri teksten som sendes til eller kommer fra KI.</p>
        </section>
        <section className="nm-section">
          <h3 className="nm-h3" style={{ marginBottom: "var(--space-2)" }}>
            Innstillinger
          </h3>
          <AiSettingsForm
            editable={user.rights.superadmin}
            models={Object.entries(AI_MODELS).map(([id, m]) => ({ id, label: `${m.choice} (${m.label})` }))}
            initial={{
              model: settings.model,
              group_limit_nok: decimal(settings.group_limit_nok, 0),
              total_limit_usd: decimal(settings.total_limit_usd, 0),
              max_new_exercises: String(settings.max_new_exercises),
              usd_nok: decimal(settings.usd_nok, 2),
              link_domains: settings.link_domains.join(", "),
            }}
          />
        </section>
      </>
    );
  },

  async vedlikehold({ user }) {
    const d = await db();
    const [log, pending] = await Promise.all([archiveLog(d), archivePending(d, user.access)]);
    const m = log.maintenance;
    const names = Object.fromEntries(user.data.groups.map((g) => [g.id, g.name]));
    const runner = (id: string) => {
      for (const g of user.data.groups) {
        const n = profileName(g, id);
        if (n !== "en trener") return n;
      }
      return "en trener";
    };
    return (
      <>
        <section className="nm-section">
          <p style={{ marginTop: 0 }}>
            Vedlikeholdet kjører automatisk ved innlogging, høyst én gang i døgnet. Mellomversjoner av opplegg slettes etter {MAINTENANCE_RULES.versionDays} dager (første,
            siste og godkjente versjon beholdes). KI-bruk eldre enn {MAINTENANCE_RULES.aiMonths} måneder summeres per måned. Opplegg eldre enn ett år arkiveres av superadmin.
          </p>
          <p>
            <strong>Sist kjørt:</strong> {m.last_run ? `${savedAt(m.last_run)}${m.run_by ? ` (${m.run_by === user.session.profileId ? "av deg" : `ved innlogging av ${runner(m.run_by)}`})` : ""}` : "aldri"}
            {m.last_result ? (
              <>
                <br />
                <strong>Resultat:</strong> {m.last_result}
              </>
            ) : null}
          </p>
        </section>
        <section className="nm-section">
          <h3 className="nm-h3" style={{ marginBottom: "var(--space-2)" }}>
            Arkiv
          </h3>
          {pending.length ? (
            <>
              <p style={{ marginTop: 0 }}>
                {pending.length} {pending.length === 1 ? "trening" : "treninger"} med opplegg eldre enn ett år (
                {[...new Set(pending.map((p) => names[p.spond_group_id] ?? p.spond_group_id))].join(", ")}), {pending.reduce((s, p) => s + p.n_versions, 0)} versjoner.
              </p>
            </>
          ) : (
            <p style={{ marginTop: 0 }}>Ingen opplegg venter på arkivering.</p>
          )}
          <MaintenancePanel keys={pending.map(archiveKey)} nPending={pending.length} />
          {log.archives.length ? (
            <div className="nm-scroll-x" style={{ marginTop: "var(--space-4)" }}>
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>Slettet</th>
                    <th>Periode</th>
                    <th className="num">Treninger</th>
                    <th className="num">Versjoner</th>
                  </tr>
                </thead>
                <tbody>
                  {log.archives.map((a, i) => (
                    <tr key={i}>
                      <td>{savedAt(a.confirmed_at)}</td>
                      <td>
                        {a.period_from ? shortDate(a.period_from) : ""}–{a.period_to ? shortDate(a.period_to) : ""}
                      </td>
                      <td className="num">{a.n_events}</td>
                      <td className="num">{a.n_versions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </>
    );
  },
};
