"use client";

import { useRouter } from "next/navigation";

/** Which main group the admin tab is about (only shown with more than one). */
export function GroupSelect({ groups, current, hrefFor }: { groups: { id: string; name: string }[]; current: string; hrefFor: Record<string, string> }) {
  const router = useRouter();
  if (groups.length < 2) return null;
  return (
    <label className="nm-field" style={{ maxWidth: 420, marginBottom: 16 }}>
      <span className="nm-field__label">Gruppe</span>
      <select className="nm-input" value={current} onChange={(e) => router.push(hrefFor[e.target.value])}>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}
