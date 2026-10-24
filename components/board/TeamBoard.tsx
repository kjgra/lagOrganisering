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
import { ArrowDown, Bookmark, GripVertical, Minus, Pencil, Plus, Send, Shuffle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { lockAction, saveProposalAction, unlockAction } from "@/app/actions/proposals";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { distribute, labelProblem, moveFollow, nextLabel, parentNotes, type Assignments, type ParentLink } from "@/lib/board";
import { teamTitle, vestOf } from "@/lib/proposal-view";

export interface BoardPlayer {
  id: string;
  name: string;
  keeper: boolean;
  coach: boolean;
  tags: string[];
  short: string[];
  /** Used by the automatic distribution only; never shown on the board, which others can see. */
  level: number | null;
  /** «Kommer ikke» for a placed player who no longer comes. */
  note: string | null;
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
  moveTo: (id: string, label: string) => void;
  addTeam: () => void;
  removeTeam: () => void;
  removeLabel: (l: string) => void;
  renameTeam: (from: string, to: string) => string | null;
  reshuffle: () => void;
  save: (submit: boolean) => void;
  pending: boolean;
  error: string | null;
  live: string;
}

const Ctx = createContext<BoardState | null>(null);
const useBoard = () => useContext(Ctx)!;

const MAX_TEAMS = 8;

/** Holds the board's state, shared by the board and the action bar. */
export function BoardProvider({ props, children }: { props: BoardProps; children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(props.name);
  const [labels, setLabels] = useState(props.labels);
  const [seed, setSeed] = useState(1);
  const byId = useMemo(() => new Map(props.members.map((m) => [m.id, m])), [props.members]);
  const allowed = useMemo(() => new Set(props.members.map((m) => m.id)), [props.members]);
  const [assignments, setAssignments] = useState<Assignments>(() =>
    props.autoStart ? { ...props.assignments, ...distribute(props.members, props.labels, 1, props.pairs) } : props.assignments,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lockKey = useRef<string>("");

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

  const moveTo = (id: string, label: string) => {
    if ((assignments[id] ?? "") === label) {
      setSelected(null);
      return;
    }
    const r = moveFollow(assignments, id, label, allowed, labels, props.links);
    setAssignments(r.assignments);
    setSelected(null);
    const where = label ? `til ${label}` : "tilbake til ikke fordelt";
    setLive(`${nameOf(id)} flyttet ${where}.${r.followed.length ? ` ${r.followed.map(nameOf).join(", ")} fulgte med.` : ""}`);
    if (r.followed.length) toast(`${r.followed.map(nameOf).join(", ")} ble flyttet sammen med ${nameOf(id)}`);
  };

  const removeLabel = (l: string) => {
    if (labels.length <= 1) return;
    setLabels(labels.filter((x) => x !== l));
    setAssignments(Object.fromEntries(Object.entries(assignments).filter(([, x]) => x !== l)));
    setLive(`${l} er fjernet. Spillerne er tilbake blant dem som ikke er fordelt.`);
  };

  const state: BoardState = {
    ...props,
    name,
    setName,
    labels,
    assignments,
    selected,
    setSelected,
    moveTo,
    addTeam: () => {
      if (labels.length >= MAX_TEAMS) return;
      const l = nextLabel(labels);
      setLabels([...labels, l]);
      setLive(`${l} er lagt til.`);
    },
    removeTeam: () => removeLabel(labels[labels.length - 1]),
    removeLabel,
    renameTeam: (from, to) => {
      const t = to.trim().replace(/\s+/g, " ");
      if (t === from) return null;
      const problem = labelProblem(t, labels.filter((x) => x !== from));
      if (problem) return problem;
      setLabels(labels.map((x) => (x === from ? t : x)));
      setAssignments(Object.fromEntries(Object.entries(assignments).map(([k, v]) => [k, v === from ? t : v])));
      return null;
    },
    reshuffle: () => {
      const s = seed + 1;
      setSeed(s);
      const keep = Object.fromEntries(Object.entries(assignments).filter(([id]) => byId.get(id)?.coach));
      setAssignments({ ...keep, ...distribute(props.members, labels, s, props.pairs) });
      setSelected(null);
      setLive("Spillerne er fordelt på nytt.");
    },
    save: (submit) =>
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
        if (r.message) toast(r.message);
        router.push(props.doneHref);
        router.refresh();
      }),
    pending,
    error,
    live,
  };
  return <Ctx value={state}>{children}</Ctx>;
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
  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const byLabel = (l: string) => b.members.filter((m) => b.assignments[m.id] === l);
  const pool = b.members.filter((m) => !b.assignments[m.id] || !b.labels.includes(b.assignments[m.id]));
  const selP = b.members.find((m) => m.id === b.selected);
  const nPlayers = b.members.filter((m) => !m.coach).length;

  const onEnd = (e: DragEndEvent) => {
    setDragging(null);
    const to = e.over?.id ? String(e.over.id) : null;
    if (!to) return;
    b.moveTo(String(e.active.id), to === "__pool__" ? "" : to.slice(5));
  };

  return (
    <div onClick={() => b.setSelected(null)}>
      <label className="nm-field" style={{ marginBottom: "var(--space-4)", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <span className="nm-field__label">Navn på forslaget</span>
        <input className="nm-input" value={b.name} maxLength={120} onChange={(e) => b.setName(e.target.value)} />
      </label>
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
      {selP ? (
        <div className="nm-movebar" style={{ marginBottom: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
          {selP.name} er valgt. Trykk på laget spilleren skal til.
          <button type="button" className="nm-btn" onClick={() => b.setSelected(null)}>
            Avbryt
          </button>
        </div>
      ) : (
        <p className="nm-muted" style={{ margin: "0 0 var(--space-3)", fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)" }}>
          <span className="nm-phone-only">Trykk på en spiller, deretter på et lag for å flytte.</span>
          <span className="nm-desk-only">Dra spillere mellom lagene, eller trykk på spiller og deretter lag.</span>
        </p>
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
      <div className="nm-row" style={{ marginTop: "var(--space-4)" }}>
        <button type="button" className="nm-btn nm-btn--ghost" disabled={b.pending} onClick={(e) => { e.stopPropagation(); b.save(true); }}>
          <Icon icon={Send} size={20} />
          Lagre og send til godkjenning
        </button>
      </div>
      <div aria-live="polite" className="nm-sr">
        {b.live}
      </div>
    </div>
  );
}

/** «Fordel på nytt» and «Lagre forslag» in the action bar. */
export function BoardActions() {
  const b = useBoard();
  return (
    <>
      <button type="button" className="nm-btn nm-btn--secondary nm-btn--lg" onClick={b.reshuffle} disabled={b.pending}>
        <Icon icon={Shuffle} />
        Fordel på nytt
      </button>
      <button type="button" className="nm-btn nm-btn--primary nm-btn--lg" onClick={() => b.save(false)} disabled={b.pending} aria-busy={b.pending}>
        <Icon icon={Bookmark} />
        {b.pending ? "Lagrer …" : "Lagre forslag"}
      </button>
    </>
  );
}
