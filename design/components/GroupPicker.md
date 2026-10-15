Velg hovedgruppe og undergruppe etter innlogging – med favoritter øverst, så de fleste kommer videre med ett trykk.

**Props:** `groups: MainGroup[]`, `favorites: string[]`, `current?: GroupRef`, `onToggleFavorite(subId)`, `onPick(ref)`. **Data:** Spond-gruppene med `subGroups`. **shadcn/ui:** `Input` (søk), `Toggle` (stjerne), `Button`.

**Når vises den?**
- Etter første innlogging, og når brukeren trykker «Alle grupper» i GroupSwitcher.
- Ved senere oppstart hoppes den over: appen åpner rett i sist brukte gruppe (lagret per bruker). Finnes ikke gruppa lenger, vises GroupPicker.
- **Én hovedgruppe** (de fleste): hovedgruppesteget hoppes over; skjermen viser undergruppene direkte, og teksten er «Velg undergruppa du skal jobbe med.»
- **Én hovedgruppe med bare én undergruppe**: velg den automatisk og gå rett til EventList.

**Oppbygging**
- Overskrift «Velg gruppe» og en linje som sier hvor mange hovedgrupper brukeren er med i.
- **Favoritter** (på tvers av hovedgrupper) øverst – ett trykk åpner gruppa. Hver rad viser undergruppe + hovedgruppe. Uten favoritter står et tips: «Trykk på stjerna ved en gruppe du bruker ofte …»
- **Hovedgrupper**: navn, «7 undergrupper · 124 medlemmer», pil.
- **Undergrupper** for valgt hovedgruppe: søkefelt når det er mer enn 6, så «Alle i hovedgruppa» (for å fordele hele gruppa), deretter favoritter i denne hovedgruppa og resten alfabetisk.
- Rad: hele raden velger gruppa (minst `row-min`); stjernen er en egen knapp (`touch-min`) til høyre med `aria-pressed` og «Legg … til i favoritter» / «Fjern … fra favoritter». Påslått stjerne er fylt med `primary` og har `ink`-kontur.
- Gjeldende gruppe har `surface-muted`-bakgrunn og en hake i `success`.
- Bunnlinje: «Valget huskes. Neste gang åpner appen rett i gruppa du brukte sist.»

**Mobil vs. desktop**
- Mobil: to steg. Steg 1 viser favoritter og hovedgrupper; trykk på en hovedgruppe → steg 2 med undergrupper og en «‹ Hovedgrupper»-knapp. Fokus flyttes til overskriften i steg 2.
- Desktop: favoritter i full bredde, hovedgrupper i venstre kolonne (320px) og undergruppene til valgt hovedgruppe til høyre.
- Etter valg: gå til EventList og vis toast «Åpnet Gutter 2016».
