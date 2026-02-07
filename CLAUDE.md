# CLAUDE.md — DIA Live (voetbal-dia-connect)

## Project Context

Youth football match tracking app. Next.js 16 + Convex real-time backend. Two user roles: Coach (PIN-auth, manages match) and Public (code-based, read-only live view).

Read `HANDOFF.md` for full architecture and data model.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19 with TypeScript
- Convex for real-time backend (schema, queries, mutations)
- Tailwind CSS 4 with custom `dia-green` token
- npm as package manager

## Code Conventions

### TypeScript
- Strict mode, no `any` types in new code (existing `any` in live page can be typed incrementally)
- Use Convex's generated types from `convex/_generated/`
- Prefer `const` over `let`, never `var`

### React / Next.js
- App Router (`src/app/`) — all pages are `"use client"` that use Convex hooks
- Use `useQuery` / `useMutation` from `convex/react`
- Components go in `src/components/`
- Shared hooks in `src/hooks/`

### Convex
- Schema changes in `convex/schema.ts` — always backwards-compatible
- Queries in `convex/matches.ts` (or new domain files)
- Mutations in `convex/matchActions.ts` (or new domain files)
- Every mutation must verify `coachPin` before modifying data
- Use indexes for all queries (never full table scans)

### Styling
- Tailwind utility classes, no custom CSS files
- `dia-green` is the brand color (defined in Tailwind config)
- Mobile-first — coach interface used pitch-side on phones
- Keep UI simple: big touch targets, clear status indicators

### Dutch Language
- All user-facing text in Dutch (this is a Dutch youth football club)
- Code/comments in English
- Key terms: wedstrijd=match, kwart=quarter, rust=halftime, opstelling=lineup, wissel=substitution, doelpunt=goal

## File Structure

```
src/
  app/
    page.tsx           — Home (enter match code)
    coach/             — Coach pages (PIN login, dashboard, match control)
    live/[code]/       — Public live match view
  components/          — Shared React components
  hooks/               — Custom hooks
convex/
  schema.ts            — Data model
  matches.ts           — Query functions
  matchActions.ts      — Mutation functions
  _generated/          — Auto-generated (don't edit)
```

## Common Tasks

### Add a new Convex query
1. Add to appropriate file in `convex/`
2. Use proper indexes from schema
3. Return only needed fields (don't leak PINs to public queries)

### Add a new page
1. Create `src/app/[route]/page.tsx`
2. Mark `"use client"` if using Convex hooks
3. Use `useQuery`/`useMutation` from `convex/react`

### Seed development data
Run `npx convex run seed:init` (if seed function exists) or use Convex dashboard

## Testing

- Run `npx convex dev` in one terminal, `npm run dev:frontend` in another
- Test public view: enter match code on homepage
- Test coach: use PIN to access coach dashboard
- Check Convex dashboard for data state

## Boundaries

- Don't modify `convex/_generated/` — auto-generated
- Don't add authentication beyond PIN (keep it simple for volunteer coaches)
- Don't add external APIs yet — keep it self-contained
- Performance: matches may have 20+ events, keep queries efficient
