Knapper for alle handlinger; gul pilleknapp for den ene viktigste handlingen på en skjerm.

**shadcn/ui:** `Button` med variantene `default` → primary, `outline` → secondary, `ghost`, `destructive` → danger (tekstknapp, ikke rød flate).

- Alle knapper er piller (`radius-pill`), som «Godkjenning» i appen.
- Én primærknapp per skjerm: `primary` (gul) med `on-primary`-tekst og 2px `primary-edge`-kant. Resten `secondary` (hvit med 2px `ink`-kant) eller `ghost`.
- Rund ikonknapp på mørk ramme (innstillinger): `nm-iconbtn--chrome`, `chrome-raised` med `chrome-line`-kant.
- Høyde `control-md` (48px); i handlingslinja og LoginForm `control-lg` (56px). Ikonknapper er `touch-min` × `touch-min`.
- Tekst i `text-label`, verb først: «Lagre forslag», «Fordel på nytt», «Logg inn».
- Ikon til venstre for tekst, 20–22px. Ikonknapper uten tekst skal ha `aria-label`.
- Laster: `aria-busy="true"` og teksten «Logger inn …». Deaktivert: `disabled`, 45 % opasitet – bruk sparsomt, forklar heller hva som mangler.
- Slett-handlinger er `danger` tekstknapp med søppelbøtte-ikon, aldri primær.
