# Nymark – Gruppeorganisering

Web app for volunteer football coaches (barnefotball, 6–12 years) in Nymark: sign in with Spond, split participants into teams, plan trainings with NFF's curriculum and an exercise bank, and evaluate them. Prod: https://lagorganisering.vercel.app. Owner: Kjetil (`kjgra`).

## Stack
- Next.js 16 (App Router, TypeScript strict, Turbopack). Not the Next.js from your training data: read `AGENTS.md` and `node_modules/next/dist/docs/` before using an API you're unsure of.
- Tailwind CSS + shadcn/ui, `lucide-react`, dnd-kit
- Supabase Postgres (Ireland, eu-west-1), reached only from the server with node-postgres (`pg`, transaction pooler; scripts use `postgres.js`). No Supabase Auth, client or Data API. PGlite runs the same migrations in simulation and tests.
- Claude API (`@anthropic-ai/sdk`) for KI features; Sonnet is the default model.
- Hosting: Vercel (region dub1). pnpm, Node 20+.

## Environments
- **Production** (`main`) → Supabase prod project.
- **Preview** (every branch) → simulated by default (`SPOND_MOCK`, `AI_MOCK`, PGlite in memory), or a separate Supabase preview DB cloned from prod (`docs/publisering.md` §5, workflow «Preview-database»). The old Supabase test project belongs to the retired R/Shiny app.
- **Demo** → separate Vercel project with `APP_ENV=DEMO`: Production build, fully simulated, public demo logins.
- `lib/env.ts` validates all variables with zod and refuses unsafe combinations (mock + real DB, mock in prod). `.env.example` documents them.

## Where things live
- `app/` – routes. Server Components by default; `"use client"` only where needed. Group pages are under `app/g/[groupId]/[sub]/` (`arrangementer`, `lagforslag`, `trening`, `medlemmer`); admin/superadmin under `app/innstillinger/`.
- `lib/spond/` – Spond client (unofficial REST API). Server only (`import "server-only"`).
- `lib/db/` – connection (Postgres or PGlite); `lib/store/` – all queries, each checking group access (`access.ts`).
- `lib/nff/` – NFF bands, fagplan catalog, coverage. `lib/plans/` – training plans, exercise bank, pitches, improvements. `lib/ai/` – prompts and KI calls. `lib/demo/` – demo seed.
- `components/` – UI. Names match `design/components/<Name>.md`.
- `supabase/migrations/` – every schema change as a SQL migration. Never change a database by hand.
- `tests/unit` (Vitest), `tests/e2e` (Playwright, mobile + desktop).
- `public/bruksanvisning/` – the coach user guide (served at `/bruksanvisning`, PDF built by the «Bruksanvisning» workflow); `docs/bruksanvisning.md` explains it.
- `docs/plan.md` – original decisions; `docs/publisering.md` – setup of Vercel, Supabase, workflows and secrets.
- `.github/workflows/` – `ci` (lint, typecheck, test, build, e2e), `migrate-prod`, `preview-db`, `feilvakt` (error log → GitHub issues), `reminders`, `analyse`, `bruksanvisning` (guide PDF).

## Domain glossary (UI words are Norwegian)
- **Hovedgruppe / undergruppe** – Spond group and subgroup; the app's unit is a team (`[groupId]/[sub]`). Only configured Spond roles get in (`lib/spond/data.ts`); coaches are not distributed into teams.
- **Arrangement** – Spond event (training or match).
- **Lagforslag** – a proposal splitting participants into teams; flow utkast → til godkjenning → godkjent. «Fordeling» suggests teams automatically.
- **Bånd** – NFF age band: 6–7, 8–9, 10–12 (`lib/nff/bands.ts`). A team stores its birth year, so the band moves up each season.
- **NFF fagplan** – **hovedtema** (theme for a whole session, per band), **delferdighet** (sub-skill), **læringsmoment** (coaching point). Exercises are tagged with them (`lib/nff/fagplan.ts`, also in the DB with the team's own additions).
- **Årshjul** – the team's season plan of hovedtema per period. Don't change the årshjul UI until the coaching group has decided.
- **Opplegg / Dagens økt** – a training plan for an event (versions, KI generation, evaluation).
- **Øvelsesbank** – shared exercise bank with sketches, ratings per band and «Forbedringer».
- **Faste baner** – fixed pitch per weekday, with an end date and per-training override.
- **Utstyr** – the team's equipment counts; KI keeps parallel exercises within it.
- **Laget** – team settings under Trening (standard, utstyr, baner).

## Security rules (non-negotiable)
- Spond password: used only to obtain a token and is never stored or logged.
- Spond token: only on the server (httpOnly cookie, `secure`, `sameSite=lax`). Never sent to the client.
- All Spond calls go through Server Actions or Route Handlers. Access is checked on the server for every action.
- The database stores only Spond IDs, never names or contact details; no names in stored free text.
- RLS on all tables (no policies). DB credentials only on the server, never `NEXT_PUBLIC_`.
- Validate all input with zod.

## Design system
Read `design/README.md` before building or changing UI. Tokens in `design/tokens.json` (source of truth); `design/tokens.css` is generated (`python design/generate-tokens-css.py design/tokens.json design/tokens.css`), never edited by hand. `design/reference/` is for look and behaviour only, never imported.
- Mobile first (375 px), coaches use it on their phones at the pitch. UI language: Norwegian bokmål.
- Tokens only: no hard-coded colors, sizes or radii. Light theme default; dark via `data-theme="dark"` or `prefers-color-scheme`.
- Touch targets ≥ 44 px, borders 2 px, status always icon + word, team colors always with number and colour name. Icons: `lucide-react`, stroke width 2.25.
- Drag-and-drop always has a tap-to-move alternative, and every move is announced in an `aria-live` region.
- New screens or bigger layout changes: first a clickable mobile HTML mockup (artifact) for Kjetil to test; build after he approves. Small tweaks can be built directly.

## Working conventions
- Kjetil wants short, concise answers. Ask if something is unclear; concrete improvement suggestions are welcome (generalise his concrete ideas and check best practice).
- Work on a feature branch and open a PR to `main`. **Never merge**: Kjetil merges after checking the preview.
- **Only one open PR at a time.** Check right before opening that no other PR is open; if one is, wait.
- Locally run only the fast checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`. CI runs build and e2e; follow CI and fix failures. The e2e job is pinned to `ubuntu-24.04` (newer runners break Playwright Chromium).
- **Every PR that changes something coaches see updates the user guide** (`public/bruksanvisning/index.html`: text, version on the cover, screenshots when they no longer match) in the same PR. See `docs/bruksanvisning.md`.
- **Every PR bumps the version (SemVer)**: patch for fixes and docs, minor for features, major for breaking changes. Bump from `main`'s current version, set `version` in `package.json`, and add a `## [x.y.z] – YYYY-MM-DD` section to `CHANGELOG.md` (Norwegian, Keep a Changelog: Lagt til / Endret / Fikset / Sikkerhet). The changelog is shown to coaches in the app («Hva er nytt»), so write for coaches. A unit test checks that `package.json` and the changelog agree.
- Migrations run automatically against prod (GitHub Action «Migreringer til prod») after merge. Don't ask Kjetil to run them. A change to `lib/nff/fagplan.ts` needs a migration too.
- Security upgrades: start the PR right away.
- Work is tracked in Claude project threads, not on a GitHub issues board. GitHub issues come from the in-app feedback button and Feilvakt.
- Kjetil's Windows laptop has no `pnpm` on PATH: give him local commands as `npx pnpm …`.

## Commands
- `pnpm dev` – local development (simulated without `.env.local`)
- `pnpm build` – production build
- `pnpm test` – Vitest; `pnpm test:e2e` – Playwright
- `pnpm clone:prod-to-preview` – copy prod data to the preview DB
