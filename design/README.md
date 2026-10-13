Nymark er et verktøy for trenere på et barnelag i fotball: hente arrangementer fra Spond, fordele påmeldte spillere på lag, og lagre lagforslag. Det brukes på mobil ved banekanten – ofte i sollys, med hansker eller én hånd – og i nettleser hjemme. Alt i systemet følger av det: høy kontrast, store trykkflater, få og tydelige handlinger.

Uttrykket kommer fra appens egen topplinje: mørk ramme (`chrome`), klubbgul primærfarge (`primary`), rosa aksent fra logoens hake (`accent`) og en lys, varm sidebakgrunn (`surface`). Fargeverdiene er hentet direkte fra et skjermbilde av appen.

## Innhold og språk

- Skriv på bokmål, i du-form, kort og konkret. Verb først på knapper: «Lagre forslag», «Fordel på nytt», «Logg inn».
- Setningsbegynnelse med stor forbokstav, resten små – også i titler («Kommende arrangementer», ikke «Kommende Arrangementer»).
- Dato som «Tor 15. okt», klokkeslett med kolon og tankestrek: «17:30–18:45». Tall skrives som sifre: «14 påmeldt av 18».
- Spillernavn vises som fornavn + initial («Emil B.»). Skjermen sees av andre på banen.
- Statusordene er faste: «Kommer», «Ikke svart», «Kommer ikke». Svartall skrives «Kommer: 14 · Ikke svart: 3 · Kommer ikke: 1». Lag heter «Lag 1 · Oransje» osv.
- Ingen emoji. Ingen utropstegn i systemtekst.
- KI-genererte treningsopplegg (kommer senere) merkes alltid som forslag treneren kan redigere.

## Farger

- Sidebakgrunn `surface` (#f3f2ee). Kort, lister, lag og felt på `surface-raised` (hvit). Tekst `ink`; sekundær tekst `ink-muted` – aldri på knapper.
- Ramme: app-linje, sidemeny og bunnmeny er `chrome` (#121212) med `on-chrome`-tekst og `on-chrome-muted` for sekundært. Gruppevelger og rund ikonknapp på `chrome-raised` med `chrome-line`-kant. Rammen er mørk i begge temaer.
- Primærhandling: `primary` (klubbgul #ffc629) med `on-primary`-tekst, pilleform, og 2px `primary-edge`-kant så knappen står ut mot den lyse bakgrunnen. Aktivt menyvalg er også `primary`. Lenker på `chrome` («Logg ut») er `primary`, understreket.
- `accent` (rosa #ec3469) brukes kun i logoen og på miljømerket «TEST». Aldri for status eller feil.
- Sekundærknapper: `surface-raised` med 2px `ink`-kant. Kanter som bærer mening: `line-strong`; dekorative skiller: `line`.
- Svarstatus, alltid med ikon og ord: «Kommer» `success`/`success-bg` (hake), «Ikke svart» `warning`/`warning-bg` (klokke), «Kommer ikke» `declined`/`declined-bg` (kryss, nøytral grå – det er ikke en feil). Feil og sletting: `danger`.
- Arrangementer: datoblokken er `date-sent` (svart) når arrangementet er sendt ut i Spond, og hvit (`surface-raised`) med stiplet `line-strong`-kant og merket «Ikke sendt» når det ikke er sendt.
- Valgt spiller i TeamBoard: `highlight` med `on-highlight` (svart i lyst tema, gul i mørkt).
- Vestfarger `team-1`…`team-6` (Oransje, Blå, Gul, Grønn, Rød, Lilla) med `on-team-*`. Like i begge temaer fordi de svarer til fysiske vester. Vis alltid lagnummer og fargenavn sammen med fargen.
- Fokusring 3px (`border-focus`), 2px avstand: `focus` på lyse flater, `focus-on-chrome` (gul) på rammen.
- Lyst tema er standard (best i sollys). Mørkt tema bruker samme tokennavn; `surface` blir #121212 og `surface-raised` #262626, som gruppevelgeren i appen.

## Typografi

- To snitt av samme familie: **Barlow** (`--font-sans`) for all tekst, **Barlow Condensed** (`--font-display`) for ordmerket, undertittelen «GRUPPEORGANISERING», seksjonsetiketter og tall i datoblokken. Begge fra Google Fonts. Familien er identifisert fra skjermbildet av appen – bekreft mot appens kode.
- Brødtekst er `text-body-lg` (18px) fordi appen leses på armlengdes avstand ute. `text-body` (16px) for metadata. `text-caption` (14px) er minste størrelse.
- `text-label` (16px fet) for knapper, feltetiketter og spillernavn. `text-heading` for app-linja og korttitler, `text-title` som sidetittel.
- `text-display` (Barlow Condensed 800) bare for «Nymark» ved logoen; `text-eyebrow` (13px, versaler, 0,18em sperring) i `primary` under.

## Avstand, størrelse og form

- 4px-basert skala: `space-1`…`space-7`. Sidemarg `space-4` på mobil, `space-6` på desktop.
- Alt som kan trykkes er minst `touch-min` (44px). Knapper og felt `control-md` (48px); primærknapp i handlingslinja `control-lg` (56px); listerader `row-min` (64px).
- Kanter er `border-2` (2px) – 1px forsvinner i sollys.
- Hjørner: `radius-pill` for knapper, merker og menyvalg (som «Godkjenning» i appen); `radius-md` for felt, gruppevelger og spillerbrikker; `radius-lg` for kort og lag.
- Skill flater med kanter, ikke skygger. `shadow-raised` kun på toast; `shadow-drag` på brikke som dras.

## Flyt

1. **LoginForm** → innlogging med Spond.
2. **GroupPicker** første gang: favoritter øverst, deretter hovedgruppe → undergruppe. Har brukeren bare én hovedgruppe, vises undergruppene direkte; har den bare én undergruppe, velges den automatisk.
3. **EventList** for valgt gruppe. Ved senere oppstart åpner appen rett her, i sist brukte gruppe.
4. Bytt gruppe når som helst med **GroupSwitcher** (favoritter, sist brukt, «Alle grupper»).
5. EventList → **ParticipantList** → **TeamBoard** → «Lagre forslag» → **SavedProposals**.

Favoritter er stjernemerkede undergrupper, lagret per bruker. De gjør at trenere med flere hovedgrupper kommer til riktig gruppe med ett trykk, og de gir hurtigvalg i gruppebytteren. Brukere med én gruppe trenger dem ikke – derfor er stjernen valgfri og aldri et krav.

## Layout

- Design for 375px først. Mobil: mørk app-linje øverst – logo + ordmerke og innstillinger-knapp på toppnivåskjermer, tilbake + tittel på undersider. Deretter innhold, fast handlingslinje nederst med primærhandlingen lengst til høyre, og mørk bunnmeny (Arrangementer, Lagforslag) på toppnivåskjermene; aktivt valg har gul strek og gult ikon.
- På toppnivåskjermer på mobil står et gruppekort øverst i innholdet (undergruppe, hovedgruppe, «Bytt ▾») som åpner GroupSwitcher.
- Fra 768px: mørk sidemeny (260px) med logo, gruppevelger (hovedgruppe + «└ Gutter 2016»), menyvalg og «Innlogget som Kjetil · Logg ut» nederst. Innhold maks 760px bredt (TeamBoard bruker full bredde), handlinger høyrestilt nederst.
- Primærhandlinger ligger i nedre del av skjermen på mobil, innen rekkevidde for tommelen.

## Ikoner

- Lucide (standard i shadcn/ui, `lucide-react`), 2,25 strekbredde, 18–26px. Forhåndsvisningene tegner de samme Lucide-banene inline.
- Brukes: `star` (favoritt), `search`, `info`, `chevron-left/right/down`, `settings`, `send`, `x`, `calendar`, `clock`, `map-pin`, `users`, `check`, `shuffle`, `bookmark`, `grip-vertical`, `plus`, `minus`, `trash-2`, `lock`, `eye`/`eye-off`, `arrow-down`, `circle-alert`.
- Ikon står alltid sammen med tekst, unntatt ikonknapper med `aria-label`.

## Logo

- Logoen (stripet merke med rosa hake) står alltid til venstre for ordmerket «Nymark» og undertittelen «GRUPPEORGANISERING», på `chrome`. Bruk hele låsen sammen; ikke tegn merket på nytt.
- Filen i Assets › Logos er klippet fra et skjermbilde (42 × 42 px) og er bare en plassholder. Bytt den ut med appens egen SVG.
- Størrelse: 40px i app-linje og sidemeny, 56px i LoginForm.
- Miljømerket «TEST» (`accent`, pille) står ved siden av logoen i test-miljøet.

## Interaksjon

- Dra-og-slipp har alltid et trykk-alternativ: trykk spiller → trykk lag. Dette er hovedflyten på mobil.
- Hver flytting og omfordeling annonseres i en `aria-live`-region.
- Bekreft lagring med toast (mørk pille med gul kant) («Forslag 3 lagret»). Unngå modaler på banen.
- Ingen animasjon utover korte overganger (≤150ms); respekter `prefers-reduced-motion`.

## Bruk i Next.js + Tailwind + shadcn/ui

Legg CSS-variablene fra `tokens.css` i `globals.css` og koble dem i `tailwind.config.ts`:

```ts
theme: { extend: {
  colors: {
    background: "var(--surface)", foreground: "var(--ink)", card: "var(--surface-raised)",
    muted: { DEFAULT: "var(--surface-muted)", foreground: "var(--ink-muted)" },
    primary: { DEFAULT: "var(--primary)", foreground: "var(--on-primary)" },
    border: "var(--line)", input: "var(--line-strong)", ring: "var(--focus)",
    destructive: { DEFAULT: "var(--danger)", foreground: "var(--surface)" },
    success: { DEFAULT: "var(--success)", bg: "var(--success-bg)" },
    declined: { DEFAULT: "var(--declined)", bg: "var(--declined-bg)" },
    chrome: { DEFAULT: "var(--chrome)", raised: "var(--chrome-raised)", line: "var(--chrome-line)", foreground: "var(--on-chrome)" },
    accent: { DEFAULT: "var(--accent)", foreground: "var(--on-accent)" },
    warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)" },
    highlight: { DEFAULT: "var(--highlight)", foreground: "var(--on-highlight)" },
    team: { 1: "var(--team-1)", 2: "var(--team-2)", 3: "var(--team-3)", 4: "var(--team-4)", 5: "var(--team-5)", 6: "var(--team-6)" },
  },
  borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", full: "var(--radius-pill)" },
  minHeight: { touch: "var(--touch-min)", control: "var(--control-md)", "control-lg": "var(--control-lg)" },
  fontFamily: { sans: ["var(--font-sans)"], display: ["var(--font-display)"] },
}}
```

Last fontene med `next/font/google` (`Barlow` 400/500/700 og `Barlow_Condensed` 700/800). Komponentnavnene i systemet (`LoginForm`, `GroupPicker`, `GroupSwitcher`, `EventList`, `ParticipantList`, `TeamBoard`, `SavedProposals`, `PlayerChip`, `StatusBadge`) er navnene som skal brukes i koden.
