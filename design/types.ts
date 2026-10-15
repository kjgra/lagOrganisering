// Nymark – Gruppeorganisering. Typer som dokumentasjon for Next.js-komponentene.
export type Status = "kommer" | "ikke-svart" | "kommer-ikke";
export interface Player { id: string; name: string; status: Status; tags: string[] }
export interface SpondEvent { id: string; title: string; start: string; end: string; location: string; sent: boolean; accepted: number; unanswered: number; declined: number; invited: number }
export interface SubGroup { id: string; name: string; members: number }
export interface MainGroup { id: string; name: string; members: number; subs: SubGroup[] }
export interface GroupRef { main: string; sub: string | null } // sub null = hele hovedgruppa
export interface Proposal { id: string; name: string; savedAt: string; teams: string[][] }

export interface ButtonProps { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "md" | "lg"; block?: boolean; pending?: boolean; icon?: React.ReactNode; children: React.ReactNode }
export interface StatusBadgeProps { status: Status }
export interface ResponseCountsProps { accepted: number; unanswered: number; declined: number }
export interface BrandProps { size?: "md" | "lg"; env?: "test" }
export interface PlayerChipProps { player: Player; selected?: boolean; onSelect?: (id: string) => void; draggable?: boolean }
export interface LoginFormProps { onSubmit: (v: { email: string; password: string }) => void; pending?: boolean; error?: string }
export interface GroupPickerProps { groups: MainGroup[]; favorites: string[]; current?: GroupRef; onToggleFavorite: (subId: string) => void; onPick: (ref: GroupRef) => void }
export interface GroupSwitcherProps { open: boolean; onOpenChange: (open: boolean) => void; groups: MainGroup[]; favorites: string[]; recent: string[]; current: GroupRef; onToggleFavorite: (subId: string) => void; onPick: (ref: GroupRef) => void; onShowAll: () => void }
export interface EventListProps { events: SpondEvent[]; onOpen: (id: string) => void }
export interface ParticipantListProps { event: SpondEvent; participants: Player[]; onMakeTeams: () => void }
export interface TeamBoardProps { event: SpondEvent; players: Player[]; teamCount: number; onTeamCountChange: (n: number) => void; onReshuffle: () => void; onSave: (teams: string[][]) => void }
export interface SavedProposalsProps { groups: { event: SpondEvent; proposals: Proposal[] }[]; onOpen: (id: string) => void; onDelete: (id: string) => void }
