# Nymark – Gruppeorganisering

[![CI](https://github.com/kjgra/lagOrganisering/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kjgra/lagOrganisering/actions/workflows/ci.yml?query=branch%3Amain)
[![Prosjektstatus: aktiv](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![Livssyklus: eksperimentell](https://img.shields.io/badge/livssyklus-eksperimentell-orange)](https://lifecycle.r-lib.org/articles/stages.html#experimental)
[![Versjon](https://img.shields.io/github/package-json/v/kjgra/lagOrganisering?label=versjon)](CHANGELOG.md)
[![Lisens: MIT](https://img.shields.io/github/license/kjgra/lagOrganisering?label=lisens)](LICENSE)

Webapp for trenere i Nymark: logg inn med Spond, se påmeldte, fordel spillere på lag, lag treningsopplegg (selv eller med KI) og evaluer øktene. Erstatter den gamle Shiny-appen (SpondNymark).

## Kom i gang lokalt

```sh
pnpm install
cp .env.example .env.local   # simulert Spond, database og KI
pnpm dev                     # http://localhost:3000
```

Logg inn med `kjetil@demo.no` / `demo` (superadmin). Andre demokontoer: `ann@demo.no` (app + KI), `beate@demo.no` (ingen app-tilgang). Alt er simulert: ingen Spond-konto, database eller API-nøkkel trengs.

## Kommandoer

| Kommando | Hva |
|---|---|
| `pnpm dev` | Utvikling |
| `pnpm build` / `pnpm start` | Produksjonsbygg |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (med Next-rutetyper) |
| `pnpm test` | Enhetstester (Vitest, PGlite) |
| `pnpm test:e2e` | Ende-til-ende (Playwright, mobil og desktop, egen server på port 3100) |

Med `TEST_DATABASE_URL` kjøres migreringstesten også mot ekte Postgres.

## Oppbygging

- `app/` – sider, Server Actions og Route Handlers (PDF, arkiv).
- `lib/spond/` – Spond-klient (uoffisielt API) og simulering. Bare på serveren.
- `lib/db/` – Postgres via `postgres.js`, eller PGlite i simulering. Samme SQL-migreringer.
- `lib/store/` – all databasetilgang, med tilgangssjekk per gruppe.
- `lib/plans/`, `lib/ai/`, `lib/pdf/` – treningsopplegg, tegninger, KI og PDF.
- `supabase/migrations/` – skjemaet. RLS er på for alle tabeller, uten policyer: bare serveren når databasen.

## Personvern

Spond-passordet brukes bare til innlogging og lagres aldri. Spond-tokenet ligger kryptert i en httpOnly-cookie. Databasen lagrer bare Spond-ID-er, ikke navn; navn hentes fra Spond når de vises. Ingenting med navn eller helseopplysninger sendes til KI.

## Publisering

Se [docs/publisering.md](docs/publisering.md) for Vercel og Supabase.

## Lisens

[MIT](LICENSE). Bruk koden fritt.
