Bytt gruppe uten å forlate skjermen: bunnark på mobil, panel ved gruppevelgeren på desktop.

**Props:** `open`, `onOpenChange`, `favorites`, `recent`, `current`, `onPick(ref)`, `onShowAll()`. **shadcn/ui:** `Drawer` (mobil) og `Popover` (desktop), eller `Sheet side="bottom"`.

- Åpnes fra gruppekortet øverst på toppnivåskjermene på mobil («Gutter 2016 · Nymark IL – Fotball · Bytt ▾») og fra gruppevelgeren i sidemenyen på desktop (hovedgruppe på linje 1, «└ Gutter 2016» på linje 2).
- Innhold: **Favoritter**, **Sist brukt** (opptil 3 som ikke er favoritter), og knappen «Alle grupper» som åpner GroupPicker. Radene og stjernene er de samme som i GroupPicker.
- Ett trykk på en rad bytter gruppe, lukker arket, laster arrangementene på nytt og viser toast «Byttet til Gutter 2015».
- Mobil: bunnark med håndtak, `scrim` bak, `radius-xl` øverst, maks 82 % høyde. Desktop: panel på 380px ved siden av sidemenyen, uten scrim.
- Lukkes med ×-knapp, trykk utenfor eller Esc. Fokus flyttes til ×-knappen ved åpning og tilbake til gruppevelgeren ved lukking.
- Undersider (ParticipantList, TeamBoard) viser ikke gruppevelgeren på mobil – der er arrangementet konteksten.
