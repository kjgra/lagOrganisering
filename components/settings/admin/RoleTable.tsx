"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/actions/admin";

type Role = "app" | "ai" | "admin" | "tags";

const ROLE_NAME: Record<Role, string> = { app: "App", ai: "KI", admin: "Admin", tags: "Tagger" };

export interface RoleRowView {
  profileId: string;
  name: string;
  roles: string;
  app: boolean;
  ai: boolean;
  admin: boolean;
  tags: boolean;
  superadmin: boolean;
  self: boolean;
  changed: string;
}

/** Trainers with a Spond profile, and their rights in the app. */
export function RoleTable({ groupId, rows, canAdmin }: { groupId: string; rows: RoleRowView[]; canAdmin: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = (r: RoleRowView, role: Role, granted: boolean) =>
    start(async () => {
      setError(null);
      setBusy(`${r.profileId}:${role}`);
      const res = await setRoleAction(groupId, r.profileId, role, granted);
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
            {rows.map((r) => (
              <tr key={r.profileId}>
                <td>
                  <strong>{r.name}</strong>
                  {r.superadmin ? <span className="nm-badge nm-badge--neutral" style={{ marginLeft: "var(--space-2)" }}>Superadmin</span> : null}
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
