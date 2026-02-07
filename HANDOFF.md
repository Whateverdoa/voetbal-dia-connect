# HANDOFF.md — DIA Live (voetbal-dia-connect)

## What Is This?

**DIA Live** is a real-time youth football (soccer) match tracking app for club DIA. Coaches manage matches from their phone, parents/spectators follow live via a public code.

There are two repos:
- **voetbal-dia-connect** (this one) — lightweight version, Next.js + Convex
- **VOETBAL-WISSEL** — fuller version (private repo, same domain)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Convex (real-time serverless DB + functions) |
| Styling | Tailwind + custom `dia-green` color token |
| Package manager | npm (with npm-run-all for parallel dev) |
| Deployment target | Vercel |

## Architecture

```
┌─────────────────────────────────────────────┐
│ PUBLIC (Spectators)                         │
│ Enter 6-char code → /live/[code]            │
│ Real-time score, goals, lineup, timeline    │
└──────────────┬──────────────────────────────┘
               │ Convex query (reactive)
┌──────────────▼──────────────────────────────┐
│ CONVEX (Real-time Backend)                  │
│ schema.ts → clubs, teams, coaches, players, │
│             matches, matchPlayers,          │
│             matchEvents                     │
│ matches.ts → queries (getByPublicCode,      │
│              getForCoach, verifyCoachPin)    │
│ matchActions.ts → mutations (create, start, │
│                   nextQuarter, addGoal,     │
│                   substitute, etc.)         │
└──────────────▲──────────────────────────────┘
               │ Convex mutation (PIN-auth)
┌──────────────┴──────────────────────────────┐
│ COACH (Authenticated via PIN)               │
│ /coach → PIN login                          │
│ /coach/match/[id] → manage live match       │
│ Create match, manage lineup, score goals,   │
│ make substitutions, control quarters        │
└─────────────────────────────────────────────┘
```

## Data Model (Convex schema.ts)

- **clubs** — top-level org (DIA)
- **teams** — JO12-1, JO13-2, etc. (belongs to club)
- **coaches** — PIN-authenticated, linked to 1+ teams
- **players** — per team, shirt number, active flag
- **matches** — 6-char publicCode, coachPin, status machine (scheduled→lineup→live→halftime→finished), home/away score, quarter tracking
- **matchPlayers** — junction: which players in this match, onField/isKeeper state
- **matchEvents** — goal, assist, sub_in, sub_out, quarter_start/end, yellow/red cards

## Auth Model

Simple PIN-based (no user accounts):
- Coach enters 4-6 digit PIN → gets access to their teams/matches
- Public enters 6-char match code → read-only live view
- PIN stored on coach record, checked on every mutation

## Key Patterns

1. **Real-time via Convex** — `useQuery` auto-subscribes, UI updates instantly when coach makes changes
2. **Public code system** — random 6-char (no ambiguous chars: O/0/I/1 excluded)
3. **Quarter-based match flow** — supports 2 halves or 4 quarters
4. **Event sourcing light** — all match actions logged as events for timeline

## Current State

- Schema defined ✅
- Queries (public view, coach view) ✅
- Mutations (match lifecycle, goals, subs) ✅
- Public live page ✅
- Coach pages — need review/completion
- Admin/setup pages — likely incomplete
- Seed data — needed for development
- Tests — none yet
- Deployment — not configured

## What Needs Work

1. **Coach dashboard pages** — match creation, lineup management, live control panel
2. **Admin pages** — club/team/player/coach CRUD
3. **Seed script** — populate dev data (club DIA, teams, players, coach PINs)
4. **Mobile UX** — coach interface must work well on phone (used pitch-side)
5. **PWA** — offline resilience, installable
6. **Playing time tracking** — VOETBAL-WISSEL's core feature (fair sub rotation)
7. **Match history / stats** — post-match summaries
8. **Error handling** — PIN validation, network failures
9. **Testing** — Convex function tests, component tests

## Subagent Workflow

When working with AI subagents on this project, follow this workflow at the end of **every phase**:

### Phase Completion Checklist

1. **Primary agents** complete their tasks (e.g., `convex-specialist`, `frontend-designer`)
2. **`code-reviewer`** reviews all changes before handoff:
   - 300 LOC file limit
   - No `any` types
   - PIN security on mutations
   - Proper Convex patterns
3. **`test-agent`** creates/runs tests:
   - Unit tests for new code
   - Smoke test checklists for manual verification
   - All tests must pass before handoff
4. **`debugger`** (if needed) investigates any failures

### Available Subagents

| Agent | Role | When to Use |
|-------|------|-------------|
| `convex-specialist` | Backend schema, queries, mutations | Backend tasks |
| `frontend-designer` | Tailwind UI, mobile-first design | UI tasks |
| `dutch-ux-writer` | Dutch text consistency | After UI text changes |
| `ai-agent-architect` | Claude tool-use, voice integration | Agent layer |
| `code-reviewer` | Quality, security, conventions | **Every phase end** |
| `test-agent` | Tests, smoke checklists | **Every phase end** |
| `debugger` | Root cause analysis | When bugs arise |
| `mobile-ux-auditor` | Pitch-side usability | After UI changes |

### Test Commands

```bash
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI)
npm run test:coverage # Run with coverage report
```

## Dev Commands

```bash
npm run dev          # Next.js + Convex in parallel
npm run dev:frontend # Next.js only
npm run dev:backend  # Convex only
npm run build        # Production build
npx convex dev       # Convex dashboard + sync
```

## Pre-Push Verification

**Always verify locally before pushing to GitHub.** Vercel deploys automatically on push, so a broken push means a broken deploy.

1. **Run the build locally first:**
   ```bash
   npm run build
   ```
   This runs the exact same TypeScript type-checking and compilation that Vercel does. Fix any errors before proceeding.

2. **Test the app locally** (if build passes):
   ```bash
   npm run dev
   ```
   Spot-check key flows: coach login, match creation, live view.

3. **Wait for human approval before pushing.**
   Agents (subagents, AI assistants) must **never** push to GitHub on their own. Only the human operator decides when to push. This prevents conflicting pushes, broken deploys, and race conditions when multiple agents are working in parallel.

4. **Only push when the human says go:**
   ```bash
   git add .
   git commit -m "description of changes"
   git push
   ```

### Git Rules for Agents

- **Commits are fine** — agents may freely commit to the local branch.
- **Pushes require human approval** — never run `git push` unless the human explicitly asks for it.
- **No force pushes** — never use `git push --force` or `git push --force-with-lease` unless the human explicitly requests it.
- **Coordinate via commits** — when multiple agents work in parallel, each should commit their changes locally. The human merges and resolves any conflicts before pushing.

This avoids wasted Vercel build minutes, broken deployments, and conflicting pushes between agents.

## Environment

Requires `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` — set up via `npx convex init` or `npx convex deploy`.
