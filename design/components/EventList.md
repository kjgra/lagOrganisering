Kommende arrangementer fra Spond, gruppert per uke, med dato, tid, sted og svar (kommer / ikke svart / kommer ikke).

**Props:** `events: {id, start, end, title, location, sent, accepted, unanswered, declined, invited}[]`, `onOpen(id)`. **shadcn/ui:** `Card` som lenke.

- Øverst på mobil: gruppekortet (undergruppe, hovedgruppe, «Bytt ▾») som åpner GroupSwitcher. På desktop ligger gruppevelgeren i sidemenyen.
- Hele kortet er én lenke til ParticipantList (minst 96px høyt).
- Datoblokk med ukedag og dagnummer i `--font-display`. **Sendt** i Spond: `date-sent` (svart) med `on-date-sent`. **Ikke sendt**: hvit (`surface-raised`) med stiplet `line-strong`-kant, og merket «Ikke sendt» (send-ikon) + «18 blir invitert» i stedet for svartall. Forskjellen bæres av både bakgrunn, kantstil og ord.
- Tid og sted i `ink-muted` med klokke- og kartnål-ikon. Klokkeslett med tankestrek: «17:30–18:45».
- Svar (sendte arrangementer): «Kommer: 14», «Ikke svart: 3», «Kommer ikke: 1» med ikon og statusfarge, og stablet måler under. På mobil ligger svarraden i full bredde under tittel og tid, adskilt med en `line`-strek; på desktop står den i tekstkolonnen.
- Grupper med `nm-section-label`: «Denne uken», «Neste uke», deretter månedsnavn.
- Tom tilstand: «Ingen kommende arrangementer i Spond-gruppa.»
