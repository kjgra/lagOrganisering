Lagrede lagforslag gruppert per arrangement, med lagstørrelser i vestfargene.

**Props:** `groups: {event, proposals: {id, name, savedAt, teams: string[][]}[]}[]`, `onOpen(id)`, `onDelete(id)`. **shadcn/ui:** `Card`, `Button`, `AlertDialog` hvis sletting skal bekreftes.

- Gruppeoverskrift: «Trening G10 · Tor 15. okt». Nyeste forslag øverst.
- Kort: navn («Forslag 2»), «3 lag · 14 spillere · Lagret i dag kl. 21:04», fargestripe per lag med antall spillere.
- «Åpne» åpner forslaget i TeamBoard. «Slett» fjerner og viser toast; tilby angre i toasten i produksjon.
- Tom tilstand: «Ingen lagrede forslag ennå. Lag lag fra et arrangement og trykk «Lagre forslag».»
- Desktop: to kolonner.
