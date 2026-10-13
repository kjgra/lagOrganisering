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
- Preview (Vercel branches) → Supabase test project.
- Production (`main`) → Supabase prod project.

## UI
- Mobile first (375 px), used by coaches on their phones at the pitch.
- Language in the UI: Norwegian (bokmål).
- Drag-and-drop of players between teams (dnd-kit) with an alternative tap-to-move option.

## Working with Kjetil
- Short and concise answers. Ask if an instruction is unclear. Technical suggestions for improvement are welcome.
- Run `pnpm lint`, `pnpm typecheck` and `pnpm test` yourself before reporting that something is done. Check the UI at both mobile and desktop width.
- Small, focused changes. Work on a feature branch, PR to `main`.
- One commit: write the files and suggest a commit message — Kjetil commits himself.

## Commands
- `pnpm dev` – local development
- `pnpm build` – production build
- `pnpm test` – Vitest (unit) / Playwright (e2e)
- `supabase db push` – apply migrations
