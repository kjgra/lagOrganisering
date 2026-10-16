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

Øvelsesbanken, trenertilganger (`app_roles` med loggen `app_role_log`), årshjulet og lagets standard (`team_settings`) kan kopieres fra test-databasen (den gamle appen) etter at migreringene er kjørt mot prod. Bruk «Session pooler» eller direkte tilkobling (port 5432) for begge:

```sh
export SOURCE_DATABASE_URL='postgresql://...test...'
export TARGET_DATABASE_URL='postgresql://...prod...'
pnpm copy:test-to-prod            # prøvekjøring: viser hva som ville blitt endret
pnpm copy:test-to-prod --apply    # skriver til prod
```

`--group <spond-gruppe-id>` begrenser øvelser, årshjul og lagets standard til én hovedgruppe. Scriptet kan kjøres flere ganger: det sletter ingenting, og en rad i prod overskrives bare når raden i test er nyere, og en loggrad legges bare til hvis den ikke finnes fra før. Alt skjer i én transaksjon.

## 4. Første innlogging

1. Logg inn som superadmin.
2. Innstillinger → Trenere: gi app-tilgang (og eventuelt KI/admin) til trenerne.
3. Innstillinger → Årshjul, Lagets standard og Øvelser: fyll inn for laget.

## Sjekkliste

- [ ] `supabase db push` mot prod
- [ ] Data API av
- [ ] Eventuelt `pnpm copy:test-to-prod --apply`
- [ ] Miljøvariabler i Vercel (Production og Preview)
- [ ] Deploy fra `main`, logg inn, sjekk Innstillinger → Generelt (ingen «simulert»)
