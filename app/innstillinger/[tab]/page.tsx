import { Pencil, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSettingsForm, LearningForm, SeasonForm, TeamSettingsForm, type PitchGroup } from "@/components/settings/admin/forms";
import { GroupSelect } from "@/components/settings/admin/GroupSelect";
import { MaintenancePanel } from "@/components/settings/admin/MaintenancePanel";
import { RoleTable } from "@/components/settings/admin/RoleTable";
import { ADMIN_TABS, SettingsShell, type AdminTab } from "@/components/settings/SettingsShell";
import { Icon } from "@/components/ui/icon";
import { adminContext, trainers, type AdminContext } from "@/lib/admin";
import { AI_MODELS, budgetCheck, formatNok } from "@/lib/ai/plan-ai";
import { db } from "@/lib/db";
import { superadminId } from "@/lib/env";
import { decimal, MONTH_NAMES, osloMidnight, osloMonthStart, osloParts, savedAt, shortDate } from "@/lib/format";
import { MAINTENANCE_RULES } from "@/lib/maintenance";
import { feedbackSummary, shouldAvoid } from "@/lib/plans/feedback";
import { CATEGORIES, EXERCISE_STATUSES, pitchFacts, pitchTree, type Pitch } from "@/lib/plans/plan";
import { profileName } from "@/lib/proposal-view";
import { aiSpend, aiUsagePeriod, getAiSettings } from "@/lib/store/ai";
import { archiveKey, archiveLog, archivePending } from "@/lib/store/archive";
import { listRoles } from "@/lib/store/roles";
import { getTeamSettings, learningState, listExercises, listPitches, listSeason } from "@/lib/store/training";

/** The admin panel: one tab per page, per main group (?lag=). */
export default async function AdminTabPage(props: PageProps<"/innstillinger/[tab]">) {
  const { tab } = await props.params;
  const t = ADMIN_TABS.find((x) => x.key === tab);
  if (!t) notFound();
  const sp = await props.searchParams;
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
const str = (x: unknown) => (typeof x === "string" ? x : "");

/** Main pitches with their sub-pitches; retired pitches only when the team has them. */
function pitchGroups(pitches: Pitch[], chosen: number[]): PitchGroup[] {
  const groups: PitchGroup[] = [];
  for (const { pitch: p, depth } of pitchTree(pitches)) {
    if (depth === 0) groups.push({ title: p.name, pitches: [] });
    if (p.retired && !chosen.includes(p.id)) continue;
    groups.at(-1)?.pitches.push({ id: p.id, depth, name: p.name, facts: pitchFacts(p) });
  }
  return groups.filter((g) => g.pitches.length);
}

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
    const KIND: Record<string, string> = { draft: "Nytt opplegg", revision: "Justering", visual: "Tegning", learning: "Lærdommer", exercise: "Ny øvelse" };
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

  async arshjul({ user, group, q }, sp) {
    const now = osloParts(new Date());
    const year = Number(str(sp.ar)) || now.year;
    const rows = await listSeason(await db(), user.access, group.id, year);
    const themes = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.theme ?? "");
    const descriptions = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.description ?? "");
    return (
      <>
        <p style={{ marginTop: 0 }}>Månedens tema foreslås når trenerne lager opplegg, og KI bruker det.</p>
        <div className="nm-versions" style={{ marginBottom: "var(--space-4)" }}>
          {[now.year - 1, now.year, now.year + 1].map((y) => (
            <Link key={y} href={`/innstillinger/arshjul${q({ ar: y })}`} aria-current={y === year}>
              {y}
            </Link>
          ))}
        </div>
        <SeasonForm key={year} groupId={group.id} year={year} months={MONTH_NAMES} themes={themes} descriptions={descriptions} current={year === now.year ? now.month : undefined} />
      </>
    );
  },

  async standard({ user, group }) {
    const d = await db();
    const [s, pitches] = await Promise.all([getTeamSettings(d, user.access, group.id), listPitches(d)]);
    return (
      <>
        <p style={{ marginTop: 0 }}>Det som gjelder for laget hver gang. Brukes som utgangspunkt i opplegg og av KI.</p>
        <TeamSettingsForm
          groupId={group.id}
          initial={{
            age_group: s.age_group,
            birth_year: s.birth_year ? String(s.birth_year) : "",
            gender: s.gender ?? "",
            session_minutes: s.session_minutes ? String(s.session_minutes) : "",
            pitch: s.pitch,
            equipment: s.equipment,
            principles: s.principles,
          }}
          initialPitches={s.pitch_ids}
          pitchGroups={pitchGroups(pitches, s.pitch_ids)}
          year={osloParts(new Date()).year}
        />
        {s.updated_by && s.updated_at ? (
          <p className="nm-hint">
            Sist endret av {profileName(group, s.updated_by)} {savedAt(s.updated_at)}.
          </p>
        ) : null}
      </>
    );
  },

  async laerdommer({ user, group }) {
    const st = await learningState(await db(), user.access, group.id, 6);
    const current = st.versions[0];
    return (
      <>
        <LearningForm key={current?.id ?? 0} groupId={group.id} initial={current?.body ?? ""} canKi={user.rights.ai} nNew={st.nNew} />
        {st.versions.length ? (
          <section className="nm-section" style={{ marginTop: "var(--space-5)" }}>
            <h3 className="nm-h3" style={{ marginBottom: "var(--space-2)" }}>
              Historikk
            </h3>
            {st.versions.map((v) => (
              <details key={v.id} className="nm-exercise">
                <summary style={{ cursor: "pointer", minHeight: 32 }}>
                  {savedAt(v.created_at)} · {v.source === "ai" ? "med KI" : "manuelt"} av {profileName(group, v.created_by)}
                </summary>
                <p style={{ whiteSpace: "pre-wrap" }}>{v.body}</p>
              </details>
            ))}
          </section>
        ) : null}
      </>
    );
  },

  async ovelser({ user, group, q }) {
    const bank = await listExercises(await db(), user.access, group.id);
    const cats = Object.keys(CATEGORIES).filter((c) => bank.some((b) => b.category === c));
    const status = (s: string) => (s === "active" ? "nm-badge--kommer" : s === "candidate" ? "nm-badge--ikke-svart" : "nm-badge--neutral");
    return (
      <>
        <p style={{ marginTop: 0 }}>
          Lagets øvelsesbank. Nye øvelser fra godkjente opplegg kommer inn som <em>kandidater</em>, og blir aktive når en trener gir 👍 og «Bruke igjen: Ja». Trykk på en øvelse for å evaluere den, også uten at den er brukt på en trening, eller på blyanten for å endre den.
        </p>
        <div className="nm-row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <Link href={`/innstillinger/ovelse/ny${q()}`} className="nm-btn nm-btn--primary">
            <Icon icon={Plus} />
            Ny øvelse
          </Link>
          {user.rights.ai ? (
            <Link href={`/innstillinger/ovelse/ki${q()}`} className="nm-btn nm-btn--secondary">
              <Icon icon={Sparkles} />
              Ny øvelse med KI
            </Link>
          ) : null}
        </div>
        {cats.map((c) => (
          <section key={c} className="nm-section">
            <h3 className="nm-section-label">{CATEGORIES[c]}</h3>
            <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {bank
                .filter((b) => b.category === c)
                .map((b) => (
                  <li key={b.id} className="nm-pick">
                    <div>
                      <Link href={`/innstillinger/ovelse/${b.id}/evaluering${q()}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                        {b.name}
                      </Link>
                      <div className="nm-hint">
                        {feedbackSummary(b)}
                        {b.fb_last ? ` · sist ${shortDate(b.fb_last)}` : ""}
                        {b.based_on ? ` · variant av ${bank.find((x) => x.code === b.based_on)?.name ?? b.based_on}` : ""}
                      </div>
                    </div>
                    {shouldAvoid(b) ? <span className="nm-badge nm-badge--kommer-ikke">Unngås av KI</span> : null}
                    <span className={`nm-badge ${status(b.status)}`}>{EXERCISE_STATUSES[b.status]}</span>
                    <Link href={`/innstillinger/ovelse/${b.id}${q()}`} className="nm-btn nm-btn--ghost" aria-label={`Endre ${b.name}`} title="Endre øvelsen">
                      <Icon icon={Pencil} />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {!bank.length ? <p className="nm-muted">Banken er tom.</p> : null}
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
