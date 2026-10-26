"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowDown, Bookmark, GripVertical, Minus, Pencil, Plus, Send, Shuffle, SlidersHorizontal, Trash2, Undo2, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { saveBoardSettingsAction } from "@/app/actions/board";
import { lockAction, saveProposalAction, unlockAction } from "@/app/actions/proposals";
import { DistributionSheet } from "@/components/board/DistributionSheet";
import { Icon } from "@/components/ui/icon";
import { DraftNote, LeaveGuard, useLocalDraft } from "@/components/ui/draft";
import { useToast } from "@/components/ui/toast";
import {
  DEFAULT_SETTINGS,
  distribute,
  labelProblem,
  moveFollow,
  nextLabel,
  parentNotes,
  type Assignments,
  type BoardSettings,
  type DistributeOptions,
  type ParentLink,
} from "@/lib/board";
import { teamTitle, vestOf } from "@/lib/proposal-view";

export interface BoardPlayer {
  id: string;
  name: string;
  coach: boolean;
  tags: string[];
  short: string[];
  /** Used by the automatic distribution only; never shown on the board, which others can see. */
  level: number | null;
  /** «Kommer ikke» for a placed player who no longer comes. */
  note: string | null;
  /** No longer coming: kept out of the teams (moved to the pool when the board opens). */
  out: boolean;
  /** Has not answered: in the pool to be placed by hand, never placed automatically. */
  maybe: boolean;
}

export interface BoardProps {
  groupId: string;
  eventId: string | null;
  subgroupId: string | null;
  proposalId: number | null;
  name: string;
  labels: string[];
  assignments: Assignments;
  /** True for a new proposal: distribute at once. */
  autoStart: boolean;
  members: BoardPlayer[];
  poolLabel: string;
  links: ParentLink[];
  /** Players who play well together; the automatic distribution keeps them on one team. */
  pairs: [string, string][];
  /** «Fordeling»; null without the tags right (then: random, nothing to choose). */
  settings: BoardSettings | null;
  /** Where «Fordeling» is saved: the page's subgroup, '' for the main group. */
  settingsScope: string;
  /** For «Som sist» / «Rullér»: teams of the last trainings (member ids), newest first; null for a gruppeutkast. */
  previous: string[][][] | null;
  /** «Godkjent» or «Til godkjenning» when editing such a proposal: saving keeps that status. */
  keptStatus: string | null;
  doneHref: string;
  lockedBy: string | null;
}

interface BoardState extends BoardProps {
  name: string;
  setName: (n: string) => void;
  labels: string[];
  assignments: Assignments;
  selected: string | null;
  setSelected: (id: string | null) => void;
  /** The players moved last, so their chips can show where they landed. */
  moved: string[];
  moveTo: (id: string, label: string) => void;
  addTeam: () => void;
  removeTeam: () => void;
  removeLabel: (l: string) => void;
  renameTeam: (from: string, to: string) => string | null;
  reshuffle: () => void;
  /** Names of players taken out of the teams because they no longer come. */
  dropped: string[];
  /** The «Fordeling» in use. */
  rules: BoardSettings;
  applyRules: (next: BoardSettings) => void;
  undo: () => void;
  canUndo: boolean;
  submit: boolean;
  setSubmit: (on: boolean) => void;
  save: () => void;
  pending: boolean;
  error: string | null;
  live: string;
  dirty: boolean;
  draft: { at: number } | null;
  restoreDraft: () => void;
  discardDraft: () => void;
}

interface Snapshot {
  labels: string[];
  assignments: Assignments;
}

interface BoardDraft extends Snapshot {
  name: string;
}

/** Pairs count only when «Spiller godt sammen» is on; history only where there is one. */
const optionsOf = (s: BoardSettings, p: Pick<BoardProps, "pairs" | "previous">): DistributeOptions => ({
  mode: s.mode,
  roles: s.roles,
  pairs: s.pairs ? p.pairs : [],
  history: p.previous ? s.history : "off",
  previous: p.previous ?? [],
});

const Ctx = createContext<BoardState | null>(null);
const useBoard = () => useContext(Ctx)!;

const MAX_TEAMS = 8;
const MAX_UNDO = 30;

/** Holds the board's state, shared by the board and the action bar. */
export function BoardProvider({ props, children }: { props: BoardProps; children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setNameState] = useState(props.name);
  const [labels, setLabels] = useState(props.labels);
  const seed = useRef(1);
  const [rules, setRules] = useState<BoardSettings>(props.settings ?? DEFAULT_SETTINGS);
  const byId = useMemo(() => new Map(props.members.map((m) => [m.id, m])), [props.members]);
  const allowed = useMemo(() => new Set(props.members.map((m) => m.id)), [props.members]);
  // Players who no longer come are taken out of the teams when the board opens.
  const dropped = useMemo(() => props.members.filter((m) => m.out && props.assignments[m.id]).map((m) => m.name), [props.members, props.assignments]);
  const [assignments, setAssignments] = useState<Assignments>(() => {
    const kept = Object.fromEntries(Object.entries(props.assignments).filter(([id]) => !byId.get(id)?.out));
    return props.autoStart ? { ...kept, ...distribute(props.members, props.labels, 1, optionsOf(rules, props)) } : kept;
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [moved, setMoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [submit, setSubmit] = useState(false);
  const [dirty, setDirty] = useState(dropped.length > 0);
  // A new board is distributed automatically until someone moves a player by hand.
  const [manual, setManual] = useState(!props.autoStart);
  const lockKey = useRef<string>("");
  const history = useRef<Snapshot[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  // The latest labels and assignments, for actions run later from a toast.
  const cur = useRef<Snapshot>({ labels, assignments });
  useLayoutEffect(() => {
    cur.current = { labels, assignments };
  }, [labels, assignments]);

  const draftKey = `nm-board:${props.groupId}:${props.eventId ?? `utkast-${props.subgroupId ?? "alle"}`}:${props.proposalId ?? "ny"}`;
  const draftValue = useMemo<BoardDraft>(() => ({ name, labels, assignments }), [name, labels, assignments]);
  const draft = useLocalDraft<BoardDraft>(draftKey, draftValue, dirty);

  // Advisory edit lock: taken when the editor opens, renewed every 30 s, released on leaving.
  useEffect(() => {
    lockKey.current = crypto.randomUUID();
    const lock = () =>
      lockAction({ groupId: props.groupId, key: lockKey.current, proposalId: props.proposalId, eventId: props.eventId, subgroupId: props.subgroupId });
    void lock();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void lock();
    }, 30_000);
    return () => {
      clearInterval(t);
      void unlockAction(lockKey.current);
    };
  }, [props.groupId, props.proposalId, props.eventId, props.subgroupId]);

  const nameOf = useCallback((id: string) => byId.get(id)?.name ?? "Tidligere medlem", [byId]);

  /** Every change to the teams goes through here, so it can be undone. */
  const change = (nextLabels: string[], nextAssignments: Assignments) => {
    history.current = [...history.current.slice(-(MAX_UNDO - 1)), cur.current];
    setUndoCount(history.current.length);
    setLabels(nextLabels);
    setAssignments(nextAssignments);
    setDirty(true);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setUndoCount(history.current.length);
    setLabels(prev.labels);
    setAssignments(prev.assignments);
    setSelected(null);
    setLive("Siste endring er angret.");
  };

  /** Coaches keep their place (gruppeutkast); the players are spread on `ls`. */
  const spread = (ls: string[], s: number, using = rules): Assignments => {
    const keep = Object.fromEntries(Object.entries(cur.current.assignments).filter(([id, l]) => byId.get(id)?.coach && ls.includes(l)));
    return { ...keep, ...distribute(props.members, ls, s, optionsOf(using, props)) };
  };

  const reshuffle = () => {
    seed.current += 1;
    change(cur.current.labels, spread(cur.current.labels, seed.current));
    setManual(false);
    setSelected(null);
    setLive("Spillerne er fordelt på nytt.");
    toast("Spillerne er fordelt på nytt", { label: "Angre", run: undo });
  };

  /** New «Fordeling»: distribute again with it, and save it for the other trainers. */
  const applyRules = (next: BoardSettings) => {
    setRules(next);
    seed.current += 1;
    change(cur.current.labels, spread(cur.current.labels, seed.current, next));
    setManual(false);
    setSelected(null);
    setLive("Spillerne er fordelt på nytt.");
    toast("Spillerne er fordelt på nytt", { label: "Angre", run: undo });
    void saveBoardSettingsAction(props.groupId, props.settingsScope, next).then((r) => {
      if (!r.ok) toast(`Fordelingen ble ikke lagret til neste gang: ${r.error}`);
    });
  };

  const moveTo = (id: string, label: string) => {
    if ((assignments[id] ?? "") === label) {
      setSelected(null);
      return;
    }
    const r = moveFollow(assignments, id, label, allowed, labels, props.links);
    change(labels, r.assignments);
    setManual(true);
    setSelected(null);
    setMoved([id, ...r.followed]);
    const where = label ? `til ${label}` : "tilbake til ikke fordelt";
    setLive(`${nameOf(id)} flyttet ${where}.${r.followed.length ? ` ${r.followed.map(nameOf).join(", ")} fulgte med.` : ""}`);
    if (r.followed.length) toast(`${r.followed.map(nameOf).join(", ")} ble flyttet sammen med ${nameOf(id)}`, { label: "Angre", run: undo });
  };

  const removeLabel = (l: string) => {
    if (labels.length <= 1) return;
    const rest = labels.filter((x) => x !== l);
    if (!manual) {
      change(rest, spread(rest, seed.current));
      setLive(`${l} er fjernet, og spillerne er fordelt på ${rest.length} lag.`);
    } else {
      change(rest, Object.fromEntries(Object.entries(assignments).filter(([, x]) => x !== l)));
      setLive(`${l} er fjernet. Spillerne er tilbake blant dem som ikke er fordelt.`);
    }
    toast(`${l} er fjernet`, { label: "Angre", run: undo });
  };

  const setName = (n: string) => {
    setNameState(n);
    setDirty(true);
  };

  const state: BoardState = {
    ...props,
    name,
    setName,
    labels,
    assignments,
    selected,
    setSelected,
    moved,
    moveTo,
    addTeam: () => {
      if (labels.length >= MAX_TEAMS) return;
      const l = nextLabel(labels);
      const next = [...labels, l];
      if (!manual) {
        change(next, spread(next, seed.current));
        setLive(`${l} er lagt til, og spillerne er fordelt på ${next.length} lag.`);
      } else {
        change(next, assignments);
        setLive(`${l} er lagt til.`);
        toast(`${l} er lagt til`, { label: "Fordel på nytt", run: reshuffle });
      }
    },
    removeTeam: () => removeLabel(labels[labels.length - 1]),
    removeLabel,
    renameTeam: (from, to) => {
      const t = to.trim().replace(/\s+/g, " ");
      if (t === from) return null;
      const problem = labelProblem(t, labels.filter((x) => x !== from));
      if (problem) return problem;
      change(
        labels.map((x) => (x === from ? t : x)),
        Object.fromEntries(Object.entries(assignments).map(([k, v]) => [k, v === from ? t : v])),
      );
      return null;
    },
    reshuffle,
    dropped,
    rules,
    applyRules,
    undo,
    canUndo: undoCount > 0,
    submit,
    setSubmit,
    save: () =>
      start(async () => {
        setError(null);
        const r = await saveProposalAction({
          groupId: props.groupId,
          eventId: props.eventId,
          subgroupId: props.subgroupId,
          id: props.proposalId,
          name,
          labels,
          assignments,
          submit,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setDirty(false);
        draft.clear();
        if (r.message) toast(r.message);
        router.push(props.doneHref);
        router.refresh();
      }),
    pending,
    error,
    live,
    dirty,
    draft: draft.saved ? { at: draft.saved.at } : null,
    restoreDraft: () => {
      const v = draft.saved?.value;
      if (!v) return;
      const ls = v.labels.filter((l) => typeof l === "string").slice(0, MAX_TEAMS);
      if (!ls.length) return draft.clear();
      change(ls, Object.fromEntries(Object.entries(v.assignments).filter(([id, l]) => allowed.has(id) && ls.includes(l))));
      setNameState(v.name || name);
      setManual(true);
      draft.dismiss();
      setLive("Kladden er hentet fram.");
    },
    discardDraft: draft.clear,
  };
  return (
    <Ctx value={state}>
      {children}
      <LeaveGuard when={dirty && !pending} text="Endringene i lagene er ikke lagret. De ligger som kladd på denne enheten, så du kan fortsette senere." />
    </Ctx>
  );
}

function Chip({ p, overlay }: { p: BoardPlayer; overlay?: boolean }) {
  const b = useBoard();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: overlay });
  const sel = b.selected === p.id;
  return (
    <button
      ref={overlay ? undefined : setNodeRef}
      type="button"
      className={`nm-chip${isDragging || overlay ? " is-dragging" : ""}`}
      aria-label={`${p.name}${p.coach ? ", trener" : ""}${p.note ? ` (${p.note})` : ""}${p.tags.length ? `, ${p.tags.join(", ")}` : ""}. Trykk for å flytte.`}
      style={isDragging && !overlay ? { opacity: 0.35 } : undefined}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      aria-pressed={sel}
      data-moved={!overlay && b.moved.includes(p.id) ? "" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        b.setSelected(sel ? null : p.id);
      }}
    >
      <span className="nm-chip__grip">
        <Icon icon={GripVertical} size={18} />
      </span>
      {p.coach ? <span className="nm-chip__mark">Trener</span> : null}
      {p.name}
      {p.short.map((s, i) => (
        <span key={p.tags[i]} className="nm-chip__mark" title={p.tags[i]}>
          {s}
        </span>
      ))}
      {p.note ? <span className="nm-minichip__note">{p.note}</span> : null}
    </button>
  );
}

function Column({ label, index, members, pool }: { label: string; index: number; members: BoardPlayer[]; pool?: boolean }) {
  const b = useBoard();
  const { setNodeRef, isOver } = useDroppable({ id: pool ? "__pool__" : `team:${label}` });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(label);
  const [problem, setProblem] = useState<string | null>(null);
  const source = b.selected ? (b.assignments[b.selected] ?? "") === (pool ? "" : label) : false;
  const vest = vestOf(index);
  const notes = parentNotes(b.assignments, b.links, (id) => b.members.find((m) => m.id === id)?.name ?? "");
  const title = pool ? b.poolLabel : teamTitle(label, index);
  return (
    <section
      ref={setNodeRef}
      className={`nm-team${pool ? " nm-team--pool" : ` nm-team--${vest.n}`}${source ? " is-source" : ""}${isOver ? " is-over" : ""}`}
      aria-label={title}
      onClick={() => b.selected && b.moveTo(b.selected, pool ? "" : label)}
    >
      <div className="nm-team__head">
        {editing && !pool ? (
          <form
            className="nm-row"
            style={{ flex: 1, flexWrap: "nowrap", gap: "var(--space-2)" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const p = b.renameTeam(label, text);
              setProblem(p);
              if (!p) setEditing(false);
            }}
          >
            <input className="nm-input" style={{ minHeight: 36, fontSize: "var(--fs-body)" }} value={text} maxLength={60} autoFocus aria-label="Lagnavn" onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="nm-btn nm-btn--secondary" style={{ minHeight: 36 }}>
              OK
            </button>
          </form>
        ) : (
          <span className="nm-row" style={{ gap: "var(--space-2)" }}>
            {title}
            {!pool ? (
              <button
                type="button"
                className="nm-iconbtn"
                style={{ width: 32, height: 32 }}
                aria-label={`Gi ${label} nytt navn`}
                onClick={(e) => {
                  e.stopPropagation();
                  setText(label);
                  setEditing(true);
                }}
              >
                <Icon icon={Pencil} size={16} />
              </button>
            ) : null}
          </span>
        )}
        <span className="nm-row" style={{ gap: "var(--space-1)" }}>
          <span className="nm-team__count">{members.length}</span>
          {!pool && b.labels.length > 1 ? (
            <button
              type="button"
              className="nm-iconbtn"
              style={{ width: 32, height: 32 }}
              aria-label={`Fjern ${label} (spillerne flyttes tilbake)`}
              onClick={(e) => {
                e.stopPropagation();
                b.removeLabel(label);
              }}
            >
              <Icon icon={Trash2} size={16} />
            </button>
          ) : null}
        </span>
      </div>
      {problem ? (
        <div className="nm-alert" role="alert" style={{ margin: "var(--space-2)" }}>
          {problem}
        </div>
      ) : null}
      <div className="nm-team__body">
        {members.map((m) => (
          <span key={m.id} className="nm-row" style={{ gap: "var(--space-1)", flexDirection: "column", alignItems: "flex-start" }}>
            <Chip p={m} />
            {notes[m.id] ? <span className="nm-minichip__note">{notes[m.id]}</span> : null}
          </span>
        ))}
        {!members.length ? <span className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>{pool ? "Alle er fordelt" : "Slipp spillere her"}</span> : null}
        <button
          type="button"
          className="nm-team__drop"
          onClick={(e) => {
            e.stopPropagation();
            if (b.selected) b.moveTo(b.selected, pool ? "" : label);
          }}
        >
          <Icon icon={ArrowDown} size={20} />
          Flytt hit
        </button>
      </div>
    </section>
  );
}

/** The teams with players: drag with a mouse, or tap a player and then a team. */
export function TeamBoard() {
  const b = useBoard();
  const [dragging, setDragging] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const byLabel = (l: string) => b.members.filter((m) => b.assignments[m.id] === l);
  const pool = b.members.filter((m) => !b.assignments[m.id] || !b.labels.includes(b.assignments[m.id]));
  const selP = b.members.find((m) => m.id === b.selected);
  const nPlayers = b.members.filter((m) => !m.coach && !m.out && !m.maybe).length;
  const nMaybe = b.members.filter((m) => m.maybe).length;

  const onEnd = (e: DragEndEvent) => {
    setDragging(null);
    const to = e.over?.id ? String(e.over.id) : null;
    if (!to) return;
    b.moveTo(String(e.active.id), to === "__pool__" ? "" : to.slice(5));
  };

  return (
    <div onClick={() => b.setSelected(null)}>
      {b.draft ? (
        <div style={{ marginBottom: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
          <DraftNote at={b.draft.at} onRestore={b.restoreDraft} onDiscard={b.discardDraft} />
        </div>
      ) : null}
      <label className="nm-field" style={{ marginBottom: "var(--space-2)", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <span className="nm-field__label">Navn på forslaget</span>
        <input className="nm-input" value={b.name} maxLength={120} onChange={(e) => b.setName(e.target.value)} />
      </label>
      {b.keptStatus ? (
        <p className="nm-hint" style={{ margin: "0 0 var(--space-3)" }}>
          Forslaget har status «{b.keptStatus}». Endringene lagres uten at statusen endres, og historikken viser hvem som endret.
        </p>
      ) : (
        <label className="nm-check" style={{ marginBottom: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={b.submit} onChange={(e) => b.setSubmit(e.target.checked)} />
          Send til godkjenning når jeg lagrer
        </label>
      )}
      {b.dropped.length ? (
        <div className="nm-note" role="status" style={{ marginBottom: "var(--space-3)" }}>
          <Icon icon={UserX} />
          <span>
            {b.dropped.join(", ")} kommer ikke lenger og er tatt ut av lagene. Lagre for å oppdatere
            forslaget.
          </span>
        </div>
      ) : null}
      {b.lockedBy ? (
        <div className="nm-note" role="status" style={{ marginBottom: "var(--space-3)" }}>
          <Icon icon={Pencil} />
          <span>{b.lockedBy} redigerer dette nå. Redigerer dere samtidig, blir den siste som lagrer stående.</span>
        </div>
      ) : null}
      <div className="nm-row" style={{ justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div className="nm-stack" style={{ gap: "var(--space-1)" }}>
          <span style={{ fontSize: "var(--fs-body)", fontWeight: 700 }}>Antall lag</span>
          <span className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
            {nPlayers} {nPlayers === 1 ? "spiller" : "spillere"}
            {nMaybe ? ` · ${nMaybe} har ikke svart` : ""}
          </span>
        </div>
        <div className="nm-stepper" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Færre lag" disabled={b.labels.length <= 1} onClick={b.removeTeam}>
            <Icon icon={Minus} />
          </button>
          <span className="nm-stepper__value" aria-live="polite">
            {b.labels.length} lag
          </span>
          <button type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Flere lag" disabled={b.labels.length >= MAX_TEAMS} onClick={b.addTeam}>
            <Icon icon={Plus} />
          </button>
        </div>
      </div>
      {b.settings ? (
        <div style={{ marginBottom: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="nm-btn nm-btn--secondary" onClick={() => setRulesOpen(true)}>
            <Icon icon={SlidersHorizontal} />
            Fordeling
          </button>
        </div>
      ) : null}
      {rulesOpen ? (
        <div onClick={(e) => e.stopPropagation()}>
          <DistributionSheet
            rules={b.rules}
            players={b.members.filter((m) => !m.coach)}
            pairs={b.pairs}
            previous={b.previous}
            onApply={(next) => {
              setRulesOpen(false);
              b.applyRules(next);
            }}
            onClose={() => setRulesOpen(false)}
          />
        </div>
      ) : null}
      {selP ? (
        <div className="nm-movebar" style={{ marginBottom: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
          {selP.name} er valgt. Trykk på laget spilleren skal til, her eller nederst.
          <button type="button" className="nm-btn" onClick={() => b.setSelected(null)}>
            Avbryt
          </button>
        </div>
      ) : (
        <div className="nm-row" style={{ margin: "0 0 var(--space-3)", flexWrap: "nowrap", alignItems: "center" }}>
          <p className="nm-muted" style={{ margin: 0, flex: 1, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)" }}>
            <span className="nm-phone-only">Trykk på en spiller, deretter på et lag for å flytte.</span>
            <span className="nm-desk-only">Dra spillere mellom lagene, eller trykk på spiller og deretter lag.</span>
          </p>
          {b.canUndo ? (
            <button
              type="button"
              className="nm-btn nm-btn--secondary"
              onClick={(e) => {
                e.stopPropagation();
                b.undo();
              }}
            >
              <Icon icon={Undo2} />
              Angre
            </button>
          ) : null}
        </div>
      )}
      {b.error ? (
        <div className="nm-alert" role="alert" style={{ marginBottom: "var(--space-3)" }}>
          {b.error}
        </div>
      ) : null}
      <DndContext id={dndId} sensors={sensors} onDragStart={(e: DragStartEvent) => setDragging(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
        <div className={`nm-teams${selP ? " is-moving" : ""}`}>
          {b.labels.map((l, i) => (
            <Column key={l} label={l} index={i} members={byLabel(l)} />
          ))}
          {pool.length || selP ? <Column label="" index={-1} members={pool} pool /> : null}
        </div>
        <DragOverlay>{dragging ? <Chip p={b.members.find((m) => m.id === dragging)!} overlay /> : null}</DragOverlay>
      </DndContext>
      <div aria-live="polite" className="nm-sr">
        {b.live}
      </div>
    </div>
  );
}

/**
 * The action bar: «Fordel på nytt» and «Lagre forslag». While a player is
 * selected it becomes a row of teams instead, so a tap moves the player
 * without scrolling down to the team (the main flow on a phone).
 */
export function BoardActions() {
  const b = useBoard();
  const selP = b.members.find((m) => m.id === b.selected);
  if (selP) {
    const from = b.assignments[selP.id] && b.labels.includes(b.assignments[selP.id]) ? b.assignments[selP.id] : "";
    const count = (l: string) => b.members.filter((m) => b.assignments[m.id] === l).length;
    return (
      <div className="nm-moveto" role="group" aria-label={`Flytt ${selP.name} til`}>
        <span className="nm-moveto__label">Flytt {selP.name} til</span>
        <div className="nm-moveto__list">
          {b.labels.map((l, i) =>
            l === from ? null : (
              <button key={l} type="button" className={`nm-moveto__team nm-team--${vestOf(i).n}`} onClick={() => b.moveTo(selP.id, l)}>
                {teamTitle(l, i)}
                <span className="nm-team__count">{count(l)}</span>
              </button>
            ),
          )}
          {from ? (
            <button type="button" className="nm-moveto__team nm-team--pool" onClick={() => b.moveTo(selP.id, "")}>
              Ikke fordelt
            </button>
          ) : null}
          <button type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Avbryt flytting" onClick={() => b.setSelected(null)}>
            <Icon icon={X} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <button type="button" className="nm-btn nm-btn--secondary nm-btn--lg" onClick={b.reshuffle} disabled={b.pending}>
        <Icon icon={Shuffle} />
        Fordel på nytt
      </button>
      <button type="button" className="nm-btn nm-btn--primary nm-btn--lg" onClick={b.save} disabled={b.pending} aria-busy={b.pending}>
        <Icon icon={b.submit ? Send : Bookmark} />
        {b.pending ? "Lagrer …" : b.submit ? "Lagre og send" : "Lagre forslag"}
      </button>
    </>
  );
}
