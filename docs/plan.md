# Plan og beslutninger (13. okt. 2026)

Avklart med Kjetil før bygging. Gjelder første ferdige versjon.

## Kilde for funksjonalitet
Det gamle R/Shiny-prosjektet https://github.com/kjgra/SpondNymark (offentlig, `main`). Funksjonaliteten der skal beholdes eller forbedres; UI følger `design/`.
Nyttige filer: `R/spond_client.R`, `R/fct_*.R`, `R/data_store.R`, `R/mod_*.R`, `inst/db/migrations/*.sql`, `inst/ai/system.md`, `inst/golem-config.yml`, `inst/app/www/favicon.svg`.

## Omfang (alt med)
1. Kjerneflyt fra designet: LoginForm → GroupPicker/GroupSwitcher (favoritter, sist brukt) → EventList → ParticipantList → TeamBoard → SavedProposals.
2. Tagger på spillere per hovedgruppe, med forslag (Keeper, Kaptein, Forsvar, Midtbane, Angrep, Ny) og sperre mot sensitive ord (`fct_tags.R`). Keepere spres ved fordeling.
3. Godkjenningsflyt: forslag delt i gruppa; utkast → til godkjenning → godkjent / avslått / rullet tilbake / slettet. Én godkjent per arrangement. Historikk og kommentarer. Redigeringslås (heartbeat) så to trenere ikke overskriver hverandre.
4. Trenere og tilgang: bare Spond-roller i `access_role_names` slipper inn, kun til egne grupper. Trenere (`coach_role_names`) vises for seg og fordeles ikke. `app_roles` (app, KI, admin) med logg; superadmin i miljøvariabel. Rettigheter sjekkes på server ved hver handling.
5. Treningsopplegg: årshjul, lagets standard, øvelsesbank (med tegning), opplegg per arrangement med versjoner, KI-generering (Claude API, forbruk og grenser), kommentarer/«be om endring», godkjenning, evaluering, lærdommer per lag, vedlikehold. KI-innhold merkes alltid som forslag.

## Tekniske beslutninger
- Ingen Supabase Auth: innlogging er via Spond. Databasen brukes bare fra server med service role; RLS på alle tabeller uten policies (stenger anon/authenticated). Tilgang håndheves i server-koden mot Spond-gruppene.
- Sesjon: kryptert httpOnly-cookie (Spond-token + profil-ID), `secure`, `sameSite=lax`. Passord lagres/logges aldri.
- Personvern som før: databasen lagrer bare Spond-ID-er, aldri navn/kontaktinfo. Navn hentes fra Spond ved visning. Avslagsmeldinger, fødselsdato osv. kastes.
- Mock-modus (`SPOND_MOCK=1`) med fiktive Spond-data, så appen kan kjøres og testes uten Spond. Brukes i CI og i sky-økten.
- Data: start med tomt skjema, ingen import fra gammel database.
- PDF: generert A4-fil med `@react-pdf/renderer`, samme oppsett som Typst-malen i den gamle appen (tegninger som vektorgrafikk, grupper fra godkjent lagforslag). Brukes også i arkivet.
- Logo: `favicon.svg` fra SpondNymark er den ekte logoen.
- Databaser: den gamle appen beholder Supabase test. Denne appen bruker Supabase prod i Production. Preview kjører simulert (mock-Spond, KI og database i minnet) med mindre en egen database settes opp.
- Nøkler: legges inn av Kjetil i Vercel. Aldri i git eller chat.

## Arbeidsflyt
- Feature-brancher med PR til `main`; bare Kjetil merger. Brancher stables når en PR ikke er merget ennå.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` før hver PR.
