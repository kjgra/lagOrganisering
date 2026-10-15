En spiller som kan flyttes mellom lag – dra med mus, eller trykk for å velge og trykk deretter på et lag.

**Props:** `player` (`id`, `name`, `tags`), `selected`, `onSelect`, `draggable`. **Implementering:** `<button>` med `aria-pressed`; dra-og-slipp med `@dnd-kit/core` (`PointerSensor` + `KeyboardSensor`; `TouchSensor` med `delay: 250` så rulling ikke starter et drag).

- Minst `touch-min` høy, 2px `line-strong`-kant, navn i `text-label`. Grep-ikonet signaliserer at brikken kan flyttes.
- Valgt: `highlight`-fyll med `on-highlight`-tekst (svart brikke med hvit tekst i lyst tema, gul i mørkt) – godt synlig i sollys. Gul er reservert for primærhandlinger i lyst tema.
- Under drag: `shadow-drag`.
- Keepere får et lite «K»-merke (`ink`), så fordelingen kan sjekkes med et blikk.
- Vis fornavn + initial i etternavn («Emil B.»), ikke fullt navn – appen brukes på banen der andre ser skjermen.
