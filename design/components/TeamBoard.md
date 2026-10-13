Velg antall lag; spillerne som kommer fordeles automatisk og kan flyttes med dra-og-slipp eller trykk-spiller-så-lag.

**Props:** `players`, `teamCount`, `onTeamCountChange(n)`, `onReshuffle()`, `onSave(teams)`. **Implementering:** `@dnd-kit/core` for drag; trykk-flyten er vanlig klikk-state og må alltid fungere uten drag.

- Antall lag: stepper med − / + (`touch-min`), 2–6 lag. Endring fordeler på nytt.
- Automatisk fordeling: keepere spres først (én per lag), resten stokkes og slangefordeles så lagene blir like store (maks én i forskjell).
- Lag har faste vestfarger: Lag 1 Oransje (`team-1`) … Lag 6 Lilla (`team-6`). Topplinja viser alltid nummer + fargenavn + antall – fargen er aldri eneste kjennetegn.
- **Trykk-flyt (mobil):** trykk spiller → brikken blir `highlight` (svart), en `highlight`-linje sier «Emil B. er valgt. Trykk på laget spilleren skal til.» med «Avbryt», og hvert annet lag får en stiplet «Flytt hit»-knapp. Trykk på laget (eller knappen) flytter. Trykk samme spiller igjen for å angre valget.
- **Dra (desktop):** dra brikken over et lag; laget får fokusring (`focus`) som slippmål.
- Hver flytting annonseres i en `aria-live`-region: «Emil B. flyttet til Lag 2.»
- Handlingslinje: «Fordel på nytt» (secondary) og «Lagre forslag» (primary). Lagring viser toast «Forslag 3 lagret».
- Mobil: lagene stables i full bredde, brikkene brytes i rader. Desktop: rutenett med kolonner på min. 220px.
