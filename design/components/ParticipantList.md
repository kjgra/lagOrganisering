Påmeldte spillere for valgt arrangement med svarstatus, tagger og en snarvei til lagfordeling.

**Props:** `event`, `participants: {id, name, status, tags}[]`, `onMakeTeams()`. **shadcn/ui:** `ToggleGroup` for filteret, `Avatar`, `Badge`.

- Toppen gjentar arrangementet (tittel, dato, tid, sted) så treneren vet hvor hen er.
- Under arrangementet: svartall «Kommer: 14 · Ikke svart: 3 · Kommer ikke: 1» med måler.
- Filter som pille-kontroll med tall: «Alle 18», «Kommer 14», «Ikke svart 3», «Kommer ikke 1». Aktivt valg er `chrome` med `on-chrome`. På smal skjerm kan filteret rulles sidelengs.
- Rad: avatar med initialer, navn, tagger, StatusBadge til høyre. Minst `row-min` høy.
- Sortering: «Kommer», «Ikke svart», «Kommer ikke», alfabetisk innenfor.
- Primærhandling i handlingslinja: «Lag lag av 14 spillere» – kun spillere som kommer fordeles.
- Tagger redigeres fra raden (trykk → ark med tagger); ikke vist i denne versjonen.
