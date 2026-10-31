# Publisering: Vercel og Supabase

Appen kjører simulert til alt er satt opp. Slik kobles ekte tjenester på.

## 1. Supabase (prod-databasen)

1. **Kjør migreringene**. GitHub-workflowen «Migreringer til prod» (`.github/workflows/migrate-prod.yml`) kjører `supabase db push` mot prod:
   - automatisk når en merge til `main` endrer noe i `supabase/migrations/`
   - manuelt: Actions → «Migreringer til prod» → «Run workflow» (fungerer i GitHub-appen på mobil). Kryss av «Prøvekjøring» for å se hva som ville blitt kjørt.

   Den trenger én secret i repoet, `SUPABASE_DB_URL` (Settings → Secrets and variables → Actions → New repository secret): tilkoblingsstrengen fra Supabase → Connect → **«Session pooler»** (port **5432**), med passordet satt inn. Spesialtegn i passordet må URL-kodes (f.eks. `@` → `%40`). Ikke bruk den direkte tilkoblingen (bare IPv6, som GitHub ikke har) eller transaction pooler (6543).

   Fra egen maskin går det fortsatt:
   ```sh
   npx supabase link --project-ref <prod-ref>
   npx supabase db push
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
| `DATABASE_URL` | prod (pooler, 6543) | preview-databasen (pooler, 6543, se avsnitt 5), eller tom = simulert |
| `SUPERADMIN_PROFILE_ID` | din Spond-profil-ID | samme (med `SPOND_MOCK` er demokontoen kjetil@demo.no alltid superadmin) |
| `ANTHROPIC_API_KEY` | nøkkel fra console.anthropic.com | valgfri |
| `SPOND_MOCK` | (ikke sett) | `true` for demo |
| `AI_MOCK` | (ikke sett) | `true` for demo |
| `APP_ENV` | (tom) | `TEST` |

Appen nekter å starte i Production hvis `SPOND_MOCK`/`AI_MOCK` er på, eller hvis `DATABASE_URL` eller `SESSION_SECRET` mangler.

Uten `DATABASE_URL` i Preview brukes en database i minnet med demodata; den nullstilles når funksjonen startes på nytt.

**Spond-profil-ID**: deploy uten `SUPERADMIN_PROFILE_ID`, logg inn med Spond, og «Ingen tilgang»-siden viser profil-ID-en din. Sett den som `SUPERADMIN_PROFILE_ID` og deploy på nytt. Superadmin står aldri i databasen, så ingen kan låse deg ute.

**KI-modeller**: Sonnet 5.5 er standard, Haiku 5.5 (billigere) kan velges per opplegg. Grenser per lag og totalt settes under Innstillinger → KI (superadmin). Sonnet-kall bruker serverside-fallback hvis en sikkerhetsklassifisering avviser forespørselen.

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

## 5. Preview-database (valgfritt)

Vercel Preview kan bruke en egen Supabase-database med en kopi av prod i stedet for minnedatabasen. Supabase sin innebygde branching krever Pro, så dette er et eget prosjekt.

1. **Nytt Supabase-prosjekt**, f.eks. `nymark-preview`, samme region som prod. Gratisplanen har plass til to aktive prosjekter. Slå av Data API som i prod.
2. **Secret i GitHub**: `SUPABASE_PREVIEW_DB_URL` = preview-prosjektets «Session pooler» (port 5432), som for prod.
3. **Fyll databasen**: Actions → «Preview-database» → «Run workflow» på `main` med «Nullstill fra prod» krysset av. Den sletter alt i preview, kjører migreringene fra `main` og kopierer alle rader fra prod (samme ID-er; redigeringslåser kopieres ikke). Kjør den igjen når du vil ha ferske data, eller når preview har fått migreringer fra en PR som ikke ble merget.
4. **Vercel** → Environment Variables, bare **Preview**:
   - `DATABASE_URL`: preview-prosjektets «Transaction pooler» (port 6543)
   - fjern `SPOND_MOCK`, så logger du inn med ekte Spond
   - `AI_MOCK=true` for å slippe KI-kostnader, eller fjern den og sett `ANTHROPIC_API_KEY`
   - `SESSION_SECRET` (egen verdi), `SUPERADMIN_PROFILE_ID`, `APP_ENV=TEST`

   Deploy preview på nytt etterpå; nye variabler gjelder fra neste bygg.

Etter dette kjører workflowen migreringer mot preview automatisk når en PR endrer `supabase/migrations/`, så en ny migrering testes i preview før den når prod. Uten secret hopper den over.

Fra egen maskin:
```sh
export SOURCE_DATABASE_URL='postgresql://...prod...'
export TARGET_DATABASE_URL='postgresql://...preview...'
pnpm clone:prod-to-preview            # prøvekjøring
pnpm clone:prod-to-preview --apply    # erstatter alt i preview
```
Preview må ha alle migreringene prod har, ellers stopper scriptet. Bruk aldri prod som mål. `copy:test-to-prod` passer ikke her: det er laget for den gamle test-databasen og slår sammen i stedet for å erstatte.

## 6. Fast preview-adresse (valgfritt)

Workflowen «Fast preview-adresse» peker `lagorganisering-preview.vercel.app` til den nyeste ferdige preview-deployen, så den kan legges på hjemskjermen.

1. Vercel → Account Settings → Tokens → Create: et token med tilgang til prosjektet.
2. GitHub-secret `VERCEL_TOKEN` med tokenet. Uten den hopper workflowen over.

Den gjelder fra neste preview som bygges på en branch laget etter at workflowen kom inn i `main`. Adressen følger den preview-en som sist ble ferdig, så med to åpne PR-er viser den den nyeste. Preview er beskyttet med Vercel-innlogging (Deployment Protection), så logg inn i Vercel i Safari før du legger den på hjemskjermen.

## 7. Påminnelse etter trening (valgfritt)

En trener som ikke har evaluert en trening med opplegg, ser en påminnelse på Arrangementer i en uke etterpå. Det virker uten oppsett. I tillegg kan de slå på varsler på mobilen (Web Push) nederst på evalueringssiden; da får de et varsel 15 minutter til 6 timer etter treningen. Det krever:

1. Nøkler, laget én gang: `npx web-push generate-vapid-keys`.
2. Miljøvariabler i Vercel (Production, og Preview hvis du vil teste der): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (f.eks. `mailto:din@epost.no`) og `CRON_SECRET` (`openssl rand -base64 32`). Bytt ikke nøklene senere, da må alle slå på varslene på nytt.
3. GitHub: secret `CRON_SECRET` (samme verdi) og variabel `APP_URL` (Settings → Secrets and variables → Actions → Variables), f.eks. `https://lagorganisering.vercel.app`. Workflowen «Påminnelser» kaller da appen hvert kvarter. Uten dem hopper den over.

På iPhone virker varsler bare når appen er lagt på hjemskjermen (iOS 16.4 eller nyere). «Send testvarsel» på evalueringssiden sjekker at alt er riktig, også i preview (der sendes påminnelsene etter trening ikke automatisk).

## 8. «Dette sier trenerne» (analyse av innspill)

Etter hver lagrede evaluering går appen gjennom innspillene for laget: KI (Haiku, innenfor KI-budsjettet) gjør kommentarene om til observasjoner, og appen regner ut et mønster per øvelse som vises øverst på øvelsessiden. Det virker uten oppsett. I tillegg kjører workflowen «Analyse av innspill» hver natt for alle lag og tar igjen kommentarer som ikke ble gått gjennom (f.eks. fordi budsjettet var brukt opp). Den bruker samme `CRON_SECRET` og `APP_URL` som i §7. Tersklene for et mønster stilles under KI-innstillinger. KI-kallene står som «Appen (automatisk)» i KI-oversikten.

## Sjekkliste

- [ ] Secret `SUPABASE_DB_URL` i GitHub, og «Migreringer til prod» kjørt
- [ ] Data API av
- [ ] Eventuelt `pnpm copy:test-to-prod --apply`
- [ ] Miljøvariabler i Vercel (Production og Preview)
- [ ] Eventuelt preview-database (avsnitt 5) og fast preview-adresse (avsnitt 6)
- [ ] Eventuelt varsler etter trening (avsnitt 7)
- [ ] Deploy fra `main`, logg inn, sjekk Innstillinger → Generelt (ingen «simulert»)
