# Nymark – Gruppeorganisering

Web app for football coaches in Nymark: sign in with Spond, fetch participants for an event, split them into groups/teams, and save the proposals.

## Stack
- Next.js 16 (App Router, TypeScript strict, Turbopack)
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL) via `@supabase/ssr` and `@supabase/supabase-js`
- Hosting: Vercel (preview deploy per branch, production from `main`)
- Package manager: pnpm. Node 20+

## Architecture
- `app/` – routes. Server Components by default; `"use client"` only where needed (drag-and-drop, forms).
- `lib/spond/` – Spond client (unofficial REST API). **Server only** (`import "server-only"`).
- `lib/supabase/` – `server.ts` and `client.ts` from the `@supabase/ssr` pattern.
- `components/` – UI components. Names match the design: `LoginForm`, `EventList`, `ParticipantList`, `TeamBoard`.
- `supabase/migrations/` – all schema changes as SQL migrations. Never change the database by hand.

## Security rules (non-negotiable)
- Spond password: used only to obtain a token and is never stored or logged.
- Spond token: only on the server (httpOnly cookie, `secure`, `sameSite=lax`). Never sent to the client.
- All Spond calls go through Server Actions or Route Handlers.
- RLS is enabled on all tables. Service role key only on the server, never `NEXT_PUBLIC_`.
- Validate all input with zod.

## Environments
- Local: `.env.local` (not in git). `.env.example` documents the variables.
- Preview (Vercel branches) → simulated by default (`SPOND_MOCK`, `AI_MOCK`, in-memory database). The Supabase test project belongs to the old app.
- Production (`main`) → Supabase prod project.

## UI
- Mobile first (375 px), used by coaches on their phones at the pitch.
- Language in the UI: Norwegian (bokmål).
- Drag-and-drop of players between teams (dnd-kit) with an alternative tap-to-move option.

## Design system
The design lives in `design/` (exported from the Nymark design system artifact: https://claude.ai/artifact/HqE27Tf8tGad8MKNjc6vfG). **Read `design/README.md` before building or changing UI.**
- `design/README.md` – brand book: language and microcopy, colors, typography, spacing, layout, flow, icons, interaction. Includes the Tailwind mapping.
- `design/tokens.json` – source of truth for all tokens. `design/tokens.css` is generated from it (`python design/generate-tokens-css.py design/tokens.json design/tokens.css`); never edit `tokens.css` by hand.
- `design/components/<Name>.md` – guidelines per component (props, shadcn/ui building blocks, states, copy). Component names in code match these file names.
- `design/types.ts` – shared types (`Player`, `SpondEvent`, `MainGroup`, `GroupRef`, `Proposal`, component props). Copy into `lib/types.ts` when the app is scaffolded.
- `design/reference/` – `bundle.css`/`bundle.js` from the design previews (plain HTML/JS, `nm-*` classes). Reference for look and behaviour only; do not import into the app.
- `design/logo.md` – the logo in the design is a placeholder cut from a screenshot. Ask Kjetil for the real SVG.

Rules to follow without exception:
- Use tokens only (CSS variables via Tailwind) – no hard-coded colors, sizes or radii.
- Import `design/tokens.css` (or its contents) in `app/globals.css`. Load Barlow (400/500/700) and Barlow Condensed (700/800) with `next/font/local` (Barlow files in `app/fonts/`) and point `--font-sans` / `--font-display` at the next/font variables.
- Light theme is default; dark theme via `data-theme="dark"` or `prefers-color-scheme`.
- Touch targets ≥ `touch-min` (44 px), borders 2 px, status always icon + word, team colors always with number and colour name.
- Icons: `lucide-react`, stroke width 2.25.
- Drag-and-drop always has a tap-to-move alternative, and every move is announced in an `aria-live` region.

## Working with Kjetil
- Short and concise answers. Ask if an instruction is unclear. Technical suggestions for improvement are welcome.
- Run `pnpm lint`, `pnpm typecheck` and `pnpm test` yourself before reporting that something is done. Check the UI at both mobile and desktop width.
- Small, focused changes. Work on a feature branch, PR to `main`.

## Commands
- `pnpm dev` – local development
- `pnpm build` – production build
- `pnpm test` – Vitest (unit) / Playwright (e2e)
- `supabase db push` – apply migrations
