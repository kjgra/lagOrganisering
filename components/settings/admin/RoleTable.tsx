"use client";

import { useMemo, useState, useTransition } from "react";
import { setRoleAction } from "@/app/actions/admin";
import { matchesTrainer } from "@/lib/trainer-search";

type Role = "app" | "ai" | "admin" | "tags";

const ROLE_NAME: Record<Role, string> = { app: "App", ai: "KI", admin: "Admin", tags: "Tagger" };

export interface RoleRowView {
  profileId: string;
  name: string;
  roles: string;
  /** The main group used to check the change (the first one the trainer is in). */
  groupId: string;
  groups: { id: string; name: string; teams: string[] }[];
  app: boolean;
  ai: boolean;
  admin: boolean;
  tags: boolean;
  superadmin: boolean;
  self: boolean;
  changed: string;
}

/** Trainers with a Spond profile in all the user's groups, and their rights in the app. */
export function RoleTable({ rows: all, groups, canAdmin }: { rows: RoleRowView[]; groups: { id: string; name: string }[]; canAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const rows = useMemo(() => all.filter((r) => matchesTrainer(r, search, groupId)), [all, search, groupId]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = (r: RoleRowView, role: Role, granted: boolean) =>
    start(async () => {
      setError(null);
      setBusy(`${r.profileId}:${role}`);
      const res = await setRoleAction(r.groupId, r.profileId, role, granted);
      setBusy(null);
      if (!res.ok) setError(`${r.name}: ${res.error}`);
    });
  const box = (r: RoleRowView, role: Role) => {
    const on = r.superadmin || r[role] || (role === "app" && r.admin);
    const locked = r.superadmin || (role === "admin" && !canAdmin) || (role === "app" && r.admin) || (r.self && role !== "ai" && role !== "tags");
    return (
      <input
        type="checkbox"
        style={{ width: 22, height: 22, accentColor: "var(--ink)" }}
        checked={on}
        disabled={locked || pending}
        aria-busy={busy === `${r.profileId}:${role}`}
        aria-label={`${ROLE_NAME[role]} for ${r.name}`}
        onChange={(e) => toggle(r, role, e.target.checked)}
      />
    );
  };
  return (
    <div>
      <div className="nm-form-row" style={{ marginBottom: "var(--space-3)" }}>
        <label className="nm-field">
          <span className="nm-field__label">Søk</span>
          <input className="nm-input" type="search" value={search} placeholder="Navn eller lag" onChange={(e) => setSearch(e.target.value)} />
        </label>
        {groups.length > 1 ? (
          <label className="nm-field">
            <span className="nm-field__label">Gruppe</span>
            <select className="nm-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Alle grupper</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <p className="nm-hint" aria-live="polite" style={{ marginTop: 0 }}>
        {rows.length === all.length ? `${all.length} trenere` : `Viser ${rows.length} av ${all.length} trenere`}
      </p>
      {error ? (
        <div className="nm-alert" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      ) : null}
      <div className="nm-scroll-x">
        <table className="nm-table">
          <thead>
            <tr>
              <th>Trener</th>
              <th className="num">App</th>
              <th className="num">KI</th>
              <th className="num">Tagger</th>
              <th className="num">Admin</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="nm-muted">
                  Ingen trenere passer søket.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.profileId}>
                <td>
                  <strong>{r.name}</strong>
                  {r.superadmin ? <span className="nm-badge nm-badge--neutral" style={{ marginLeft: "var(--space-2)" }}>Superadmin</span> : null}
                  <div className="nm-hint">
                    {r.groups.map((g) => (g.teams.length ? `${g.name}: ${g.teams.join(", ")}` : g.name)).join(" · ")}
                  </div>
                  <div className="nm-hint">
                    {r.roles}
                    {r.changed ? ` · ${r.changed}` : ""}
                  </div>
                </td>
                <td className="num">{box(r, "app")}</td>
                <td className="num">{box(r, "ai")}</td>
                <td className="num">{box(r, "tags")}</td>
                <td className="num">{box(r, "admin")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
