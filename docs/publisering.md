# Publisering: Vercel og Supabase

Appen kjører simulert til alt er satt opp. Slik kobles ekte tjenester på.

## 1. Supabase (prod-databasen)

1. **Kjør migreringene** fra din maskin:
   ```sh
   supabase link --project-ref <prod-ref>
   supabase db push
   ```
   Migreringene slår på RLS for alle tabeller og tar bort rettighetene til `anon` og `authenticated`.
2. **Slå av Data API** (anbefalt): Project Settings → Data API → slå av, eller fjern `public` fra «Exposed schemas». Appen bruker ikke Supabase-klienten, bare direkte Postgres fra serveren.
3. **Tilkoblingsstreng**: Connect → «Transaction pooler» (port **6543**). Den passer for Vercel sine serverløse funksjoner. Bruk den som `DATABASE_URL`.
4. Ikke bruk `service_role`- eller `anon`-nøkkelen i appen; de trengs ikke.
5. Slå på daglig backup (Pro) eller sett opp en egen eksport.

Den gamle appen fortsetter mot test-databasen. Denne appen skal bare ha prod.

## 2. Vercel

Settings → Environment Variables:

| Variabel | Production | Preview |
|---|---|---|
| `SESSION_SECRET` | `openssl rand -base64 48` (egen verdi) | egen verdi |
| `DATABASE_URL` | prod (pooler, 6543) | tom = simulert, eller en testdatabase |
| `SUPERADMIN_PROFILE_ID` | din Spond-profil-ID | samme (med `SPOND_MOCK` er demokontoen kjetil@demo.no alltid superadmin) |
| `ANTHROPIC_API_KEY` | nøkkel fra console.anthropic.com | valgfri |
| `SPOND_MOCK` | (ikke sett) | `true` for demo |
| `AI_MOCK` | (ikke sett) | `true` for demo |
| `APP_ENV` | (tom) | `TEST` |

Appen nekter å starte i Production hvis `SPOND_MOCK`/`AI_MOCK` er på, eller hvis `DATABASE_URL` eller `SESSION_SECRET` mangler.

Uten `DATABASE_URL` i Preview brukes en database i minnet med demodata; den nullstilles når funksjonen startes på nytt.

**Spond-profil-ID**: deploy uten `SUPERADMIN_PROFILE_ID`, logg inn med Spond, og «Ingen tilgang»-siden viser profil-ID-en din. Sett den som `SUPERADMIN_PROFILE_ID` og deploy på nytt. Superadmin står aldri i databasen, så ingen kan låse deg ute.

**KI-modeller**: Haiku 5.5 er standard, Sonnet 5.5 kan velges per opplegg. Grenser per lag og totalt settes under Innstillinger → KI (superadmin). Sonnet-kall bruker serverside-fallback hvis en sikkerhetsklassifisering avviser forespørselen.

## 3. Kopier data fra test (valgfritt)

Alt trenerne har lagt inn i test-databasen (den gamle appen) kan kopieres til prod etter at migreringene er kjørt mot prod: øvelser, trenertilganger (med logg), årshjul, lagets standard, tagger på spillere, lagforslag (med lag, spillere, historikk og kommentarer), treningsopplegg (med kommentarer og evaluering), lærdommer, KI-innstillinger og KI-forbruk. Tagger som bare er et tall fra 1 til 5, blir nivå. Kjør `supabase db push` først, så prod har tabellene for nivå og par. Bruk «Session pooler» eller direkte tilkobling (port 5432) for begge:

```sh
export SOURCE_DATABASE_URL='postgresql://...test...'
export TARGET_DATABASE_URL='postgresql://...prod...'
pnpm copy:test-to-prod            # prøvekjøring: viser hva som ville blitt endret
pnpm copy:test-to-prod --apply    # skriver til prod
```

`--group <spond-gruppe-id>` begrenser alt som hører til et lag, til én hovedgruppe. Tilganger, brukerinnstillinger, KI-innstillinger og arkivloggen kopieres alltid i sin helhet.

Scriptet kan kjøres flere ganger, og alt skjer i én transaksjon:
- En rad i prod overskrives bare når raden i test er nyere (`updated_at`). Rader uten `updated_at` (tagger, opplegg, lagene i et forslag) og loggrader legges bare til.
- Lagforslag og opplegg får nye ID-er i prod. Er et lagforslag nyere i test, erstattes lagene og spillerne i prod med versjonen fra test. Ellers slettes ingenting.
- Har prod et annet opplegg med samme versjon for et arrangement, eller allerede et godkjent opplegg, hoppes opplegget fra test over sammen med kommentarene og evalueringen. Kolonnen «hoppet over» viser hvor mange.
- Tabeller som ikke finnes i test, hoppes over, og kolonner som mangler, får standardverdien («merknad»). Redigeringslåser og vedlikeholdsstatus kopieres ikke.

Kjør prøvekjøringen først og se gjennom tabellen før du kjører med `--apply`.

## 4. Første innlogging

1. Logg inn som superadmin.
2. Innstillinger → Trenere: gi app-tilgang (og eventuelt KI/admin) til trenerne.
3. Trening → Øvelser, Årshjul, Slik trener vi og Laget: fyll inn for laget (alle trenere med app-tilgang kan gjøre det).

## Sjekkliste

- [ ] `supabase db push` mot prod
- [ ] Data API av
- [ ] Eventuelt `pnpm copy:test-to-prod --apply`
- [ ] Miljøvariabler i Vercel (Production og Preview)
- [ ] Deploy fra `main`, logg inn, sjekk Innstillinger → Generelt (ingen «simulert»)
