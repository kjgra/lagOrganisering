"use client";

import { Shuffle } from "lucide-react";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/Sheet";
import type { BoardSettings, Mode } from "@/lib/board";

interface SheetPlayer {
  id: string;
  tags: string[];
  level: number | null;
}

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "even", label: "Jevne lag", hint: "Lagene blir omtrent like sterke." },
  { mode: "levels", label: "Nivådelt", hint: "Spillere på samme nivå havner sammen. Lagnummeret sier ikke noe om nivået." },
];

/** Tags in use among the players, and those already chosen, once each (any case). */
function roleChoices(players: SheetPlayer[], chosen: string[]): { tag: string; count: number }[] {
  const out = new Map<string, { tag: string; count: number }>();
  for (const t of players.flatMap((p) => p.tags)) {
    const k = t.toLowerCase();
    out.set(k, { tag: out.get(k)?.tag ?? t, count: (out.get(k)?.count ?? 0) + 1 });
  }
  for (const t of chosen) if (!out.has(t.toLowerCase())) out.set(t.toLowerCase(), { tag: t, count: 0 });
  return [...out.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "nb"));
}

/**
 * «Fordeling»: how the players are spread on the teams. Shown in a sheet, so
 * levels and pairs never show on the board itself.
 */
export function DistributionSheet({
  rules,
  players,
  pairs,
  onApply,
  onClose,
}: {
  rules: BoardSettings;
  players: SheetPlayer[];
  pairs: [string, string][];
  onApply: (next: BoardSettings) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState(rules.mode);
  const [roles, setRoles] = useState(rules.roles);
  const [keepPairs, setKeepPairs] = useState(rules.pairs);
  const choices = roleChoices(players, rules.roles);
  const here = new Set(players.map((p) => p.id));
  const pairsHere = pairs.filter(([a, b]) => here.has(a) && here.has(b)).length;
  const withLevel = players.filter((p) => p.level).length;
  const has = (t: string) => roles.some((r) => r.toLowerCase() === t.toLowerCase());
  const toggle = (t: string, on: boolean) => setRoles((rs) => (on ? [...rs.filter((r) => r.toLowerCase() !== t.toLowerCase()), t] : rs.filter((r) => r.toLowerCase() !== t.toLowerCase())));

  const levelNote = !players.length
    ? null
    : withLevel === players.length
      ? "Alle spillerne her har nivå."
      : withLevel
        ? `${withLevel} av ${players.length} spillere har nivå. De andre fordeles tilfeldig.`
        : "Ingen av spillerne her har nivå ennå, så lagene fordeles tilfeldig. Nivå settes i tagg-arket på Medlemmer.";

  return (
    <Sheet title="Fordeling" onClose={onClose}>
      <div className="nm-stack" style={{ gap: "var(--space-4)" }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)" }}>Type</legend>
          {MODES.map((m) => (
            <label key={m.mode} className="nm-check">
              <input type="radio" name="fordeling-type" checked={mode === m.mode} onChange={() => setMode(m.mode)} />
              <span>
                {m.label}
                <span className="nm-hint" style={{ display: "block" }}>
                  {m.hint}
                </span>
              </span>
            </label>
          ))}
          {levelNote ? (
            <p className="nm-hint" style={{ margin: "var(--space-1) 0 0" }}>
              {levelNote}
            </p>
          ) : null}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)" }}>Spre roller</legend>
          <p className="nm-hint" style={{ margin: "var(--space-1) 0 0" }}>
            Spillere med disse taggene fordeles på lagene, så langt det går.
          </p>
          {choices.length ? (
            choices.map((c) => (
              <label key={c.tag} className="nm-check">
                <input type="checkbox" checked={has(c.tag)} onChange={(e) => toggle(c.tag, e.target.checked)} />
                <span>
                  {c.tag}
                  <span className="nm-muted"> · {c.count ? `${c.count} her` : "ingen her"}</span>
                </span>
              </label>
            ))
          ) : (
            <p className="nm-hint" style={{ margin: "var(--space-2) 0 0" }}>
              Ingen av spillerne her har tagger ennå. Legg til for eksempel «Keeper» i tagg-arket på Medlemmer.
            </p>
          )}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)" }}>Spiller godt sammen</legend>
          <label className="nm-check">
            <input type="checkbox" checked={keepPairs} onChange={(e) => setKeepPairs(e.target.checked)} />
            <span>
              Sett dem på samme lag
              <span className="nm-hint" style={{ display: "block" }}>
                {pairsHere ? `${pairsHere} par blant spillerne her.` : "Ingen par blant spillerne her."}
              </span>
            </span>
          </label>
        </fieldset>
        <p className="nm-hint" style={{ margin: 0 }}>
          Valgene gjelder for alle trenerne i gruppa.
        </p>
        <button type="button" className="nm-btn nm-btn--primary nm-btn--block" onClick={() => onApply({ ...rules, mode, roles, pairs: keepPairs })}>
          <Icon icon={Shuffle} />
          Bruk og fordel på nytt
        </button>
      </div>
    </Sheet>
  );
}
