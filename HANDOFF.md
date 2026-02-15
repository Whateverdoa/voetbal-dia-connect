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
│             referees                        │
│ matchActions.ts → mutations (create, start, │
│   assignReferee, nextQuarter, addGoal, etc.)│
└──────────────▲──────────────────────────────┘
               │ Convex mutation (PIN-auth)
┌──────────────┴──────────────────────────────┐
│ COACH (Authenticated via coach PIN)         │
│ /coach → PIN login                          │
│ /coach/match/[id] → manage live match       │
│ Create match, manage lineup, score goals,   │
│ make substitutions, control quarters        │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ REFEREE (Authenticated via referee PIN)     │
│ /scheidsrechter → PIN login → match list    │
│ /scheidsrechter/match/[id] → clock + score  │
│ Tap assigned match, start/pause/resume      │
│ clock, edit scores, optional shirt number   │
└─────────────────────────────────────────────┘
```

## Data Model (Convex schema.ts)

- **clubs** — top-level org (DIA)
- **teams** — JO12-1, JO13-2, etc. (belongs to club)
- **coaches** — PIN-authenticated, linked to 1+ teams
- **referees** — global referee records with PIN, active flag (assigned to matches by admin/coach)
- **players** — per team, shirt number, active flag
- **matches** — 6-char publicCode, coachPin, optional `refereeId` (links to referees table), optional `leadCoachId` (links to coaches table), status machine (scheduled→lineup→live→halftime→finished), home/away score, quarter tracking
- **matchPlayers** — junction: which players in this match, onField/isKeeper state
- **matchEvents** — goal, assist, sub_in, sub_out, quarter_start/end, yellow/red cards

## Auth Model

Simple PIN-based (no user accounts), **team-membership authorization**:
- **Coach** enters 4-6 digit PIN → `verifyCoachTeamMembership()` checks that the coach's `teamIds` includes the match's `teamId` → gets access to all matches for their teams
- **Referee** enters their global 4-6 digit PIN → sees list of assigned matches → taps one to enter clock/score controls (must be assigned to the match by admin/coach)
- **Public** enters 6-char match code → read-only live view
- Coach PIN stored on `coaches` table (`coaches.teamIds` is the authorization vector); referee PIN stored on `referees` table (global, not per-match)
- Match links to referee via `matches.refereeId` → coach assigns a referee from the dropdown in the match view
- Clock/score mutations accept either coach or referee PIN via `verifyClockPin(match, pin, referee?)` (async, checks team membership first, then falls back to referee PIN)
- `match.coachPin` field exists for backwards compatibility but is no longer used for authorization — all coach auth goes through team membership
- `getForCoach` query strips `coachPin` from response (never sent to client)

## Key Patterns

1. **Real-time via Convex** — `useQuery` auto-subscribes, UI updates instantly when coach makes changes
2. **Public code system** — random 6-char (no ambiguous chars: O/0/I/1 excluded)
3. **Quarter-based match flow** — supports 2 halves or 4 quarters
4. **Event sourcing light** — all match actions logged as events for timeline

## Current State

- Schema defined ✅
- Queries (public view, coach view, referee view) ✅
- Mutations (match lifecycle, goals, subs, clock pause/resume, score adjust) ✅
- Public live page ✅ (with real-time score, lineup, event timeline, pause indicator)
- Coach dashboard ✅ (PIN login, match list, live match control panel)
- Coach match management ✅ (lineup, substitutions, goals with player attribution, playing time tracking)
- Referee role ✅ (separate PIN, clock control, score editing with optional shirt number)
- Clock pause/resume ✅ (mid-quarter pause for injuries/stoppages, affects playing time)
- Seed data ✅ (club DIA, 3 teams, 14 players each, 4 coaches, 4 referees, 3 matches with referee assignments)
- Admin pages ✅ — CRUD for clubs, teams, players, coaches, referees
- Public match browser ✅ (homepage hero element — code input removed, match browser primary, coach/referee login secondary)
- Standen page ✅ (/standen — defaults to today's matches, ?alle=true for all, minimal scoreboard for kantine/tablet)
- Team-membership coach auth ✅ (any coach on the team can manage any match for that team; replaces single-owner `coachPin` model)
- Wedstrijdleider ✅ Phase 1 (coaches can claim/release match lead role, informational only — see Phase 2 plan below)
- Admin match management ✅ (Wedstrijden tab in admin: list/create/edit/delete matches, referee assignment, cascade delete)
- PWA — not yet
- Tests — none yet
- Deployment — Vercel target, Vercel + Convex configured ✅

## What Needs Work

- **Mobile UX polish** — coach interface works on phone but could benefit from UX audit
- **PWA** — offline resilience, installable on home screen
- **Match history / stats** — post-match summaries, player stat aggregation
- **Testing** — Convex function tests, component tests, smoke test automation

## TODO — Priority Task List

### 🔴 HIGH PRIORITY

| Task | Description | Status |
|------|-------------|--------|
| **CSV Match Import** | Admin uploads a CSV file to bulk-create matches for the season. Approach TBD — options: (A) client-side CSV parse + call createMatch per row, (B) Convex action that accepts parsed rows in one call, (C) dedicated upload endpoint. CSV columns likely: team name, opponent, home/away, date/time, coach name/PIN, referee name (optional). Should validate rows, show preview before import, report errors per row. UI: new section in the Wedstrijden tab or a separate import modal. | ❌ Not started |
| **Coach Match Delete** | Allow coaches to delete their own scheduled (not started) matches | ❌ Not started |
| **Wedstrijdleider Phase 2** | Enforce match lead permissions — only the wedstrijdleider can enter goals/subs/lineup changes. See detailed plan below. | ❌ Not started |

### 🟡 Wedstrijdleider Phase 2 — Detailed Plan

**Goal:** When a wedstrijdleider is assigned, only that coach can make match-altering actions. Other coaches on the team see the match but cannot modify it. Any coach can still claim/release the lead.

**Backend changes (`convex/`):**

1. **Add `isMatchLead` helper** to `convex/pinHelpers.ts`:
   - `isMatchLead(match, coachId)` → returns `true` if `match.leadCoachId === coachId` or if no lead is assigned (no lead = open access)
   - This keeps the current behavior when nobody has claimed the lead

2. **Add lead-only enforcement to mutations** — when `match.leadCoachId` is set, only that coach can call:
   - `addGoal`, `removeLastGoal` (goal recording)
   - `substitute` (substitutions)
   - `togglePlayerOnField`, `toggleKeeper`, `toggleShowLineup` (lineup changes)
   - `start`, `nextQuarter`, `resumeFromHalftime` (match lifecycle)
   - `pauseClock`, `resumeClock` (clock control — coach side only; referee always allowed)
   - `adjustScore` (score adjustment — coach side only; referee always allowed)
   - `assignReferee` (referee assignment)
   - Error message: `"Alleen de wedstrijdleider kan dit doen"` (Only the match leader can do this)

3. **Keep open for all coaches** (no lead restriction):
   - `claimMatchLead` (anyone can claim if no lead is set)
   - `releaseMatchLead` (only current lead can release — already enforced)

4. **Return `isLead` flag from `getForCoach` query** — the query already knows the coach (from PIN lookup); compare `coach._id === match.leadCoachId` and include `isLead: boolean` in the response. This lets the frontend know whether to show or disable controls.

**Frontend changes (`src/`):**

5. **Add `isLead` to `Match` type** in `src/components/match/types.ts`

6. **Pass `isLead` through the coach match page** (`src/app/coach/match/[id]/page.tsx`):
   - When `match.hasLead && !match.isLead` → show controls as disabled/read-only
   - Show a banner: `"[CoachName] is wedstrijdleider — je kunt meekijken maar niet wijzigen"`

7. **Disable action buttons when not lead:**
   - `MatchControls`: disable Goal, Wissel, clock, quarter buttons
   - `PlayerList`: disable togglePlayerOnField, toggleKeeper
   - `GoalModal` / `SubstitutionPanel`: don't render or show disabled state
   - `RefereeAssignment`: disable assignment dropdown
   - Keep `MatchLeadBadge` fully interactive (claim/release always available)

8. **MatchLeadBadge UX update:**
   - When another coach is lead: show "Neem de leiding over" button (claims lead, replacing current lead)
   - Or: require current lead to release first (simpler, avoids conflicts)
   - Decision: require release first (less confusing for volunteer coaches)

**Migration / backwards compatibility:**
- No schema changes needed (`leadCoachId` already exists)
- When `leadCoachId` is null/undefined → all coaches have full access (same as today)
- Phase 2 is purely additive — existing matches work unchanged until someone claims the lead

**Testing checklist:**
- [ ] Coach A claims lead → Coach A can do all actions
- [ ] Coach B (same team) sees match read-only, controls disabled
- [ ] Coach A releases lead → all coaches regain full access
- [ ] Referee can always control clock/score regardless of lead status
- [ ] No lead assigned → all coaches have full access (Phase 1 behavior)
- [ ] Coach B can claim lead after A releases

### 🟢 LOW PRIORITY / FUTURE

| Task | Description | Status |
|------|-------------|--------|
| **PWA Support** | Offline resilience, installable on home screen | ❌ Not started |
| **Match History Stats** | Post-match summaries, player stat aggregation | ❌ Not started |
| **Mobile UX Audit** | Professional review of pitch-side usability | ❌ Not started |
| **Named Login** | Replace PIN-only with name + PIN for audit trails | ❌ Not started |
| **Cumulative Clock** | Display game time 0-60 min instead of per-quarter | ❌ Not started |

## Follow-Up Items (from code review)

### ~~Critical — Security~~ (RESOLVED)

- ~~**Admin PIN exposed in client bundle**~~: **FIXED.** `NEXT_PUBLIC_ADMIN_PIN` removed entirely. Admin login now verifies PIN server-side via `convex/adminAuth.ts` → `verifyAdminPinQuery`. PIN is stored in `sessionStorage` after successful server verification (cleared on tab close). All admin components read PIN from `src/lib/adminSession.ts` → `getAdminPin()`. The PIN never appears in the client JS bundle.

### Warnings — Code Quality

- **`as Id<"players">` casts in `convex/teams.ts`**: Lines ~58 and ~164 cast string keys from `Object.entries()` to `Id<"players">`. Pragmatic but bypasses type safety. Consider using typed player ID tracking from the start.
- **`convex/seed.ts` hardcoded PIN "9999"**: The seed script uses the default dev admin PIN. This is fine for development but should never reach production seeding. Consider reading from an env var or Convex environment config.

### Completed Features

- ~~**Pause/stop clock during quarter**~~: Coach and referee can pause/resume the match clock mid-quarter. Uses `pausedAt` / `accumulatedPauseTime` fields. Playing time tracking accounts for pauses. Mutations in `convex/clockActions.ts`.
- ~~**Referee role ("scheidsrechter")**~~: Global referee records in `referees` table. Admin creates referees (Admin Panel → Scheidsrechters tab). Coach assigns a referee to a match via `RefereeAssignment` dropdown. Referee uses their global PIN + match code to access `/scheidsrechter`. Controls clock (start/pause/resume/end quarter) and edits scores with optional shirt number tracking. Match view at `/scheidsrechter/match/[id]`. Distinct dark-gray nav with amber "SCHEIDSRECHTER" badge.
- ~~**Referee score editing**~~: Referee can +/- scores for both teams. On "+", optional shirt number prompt logs a lightweight goal event with `note: "Rugnummer: N"` so the coach can later resolve to a named player. Mutation in `convex/scoreActions.ts`.
- ~~**Wedstrijd Browser (homepage)**~~: Public match list on homepage, grouped by status (LIVE/GEPLAND/AFGELOPEN). Real-time via `listPublicMatches` query in `convex/publicQueries.ts`. Component: `src/components/MatchBrowser.tsx`. Clickable cards link to `/live/[code]`.
- ~~**Homepage simplification**~~: Code input removed as primary UI. MatchBrowser is now the hero element. Coach/referee login as secondary links below. Collapsible "Heb je een code?" for edge cases. "Vandaag live" link to standen page.
- ~~**Standen page (defaults to today)**~~: Minimal scoreboard at `/standen`. Defaults to **today's matches only** (live + finished today + scheduled today). `?alle=true` shows all matches. Toggle link between views. Supports `?team=` filter. Real-time score updates.
- ~~**Team-membership coach auth**~~: Replaced single-owner `match.coachPin` model with team-membership authorization. Any coach assigned to the match's team can now manage that match. Core helper: `verifyCoachTeamMembership(ctx, match, pin)` in `convex/pinHelpers.ts`. All mutations updated: `matchActions.ts`, `matchEvents.ts`, `matchLineup.ts`, `clockActions.ts`, `scoreActions.ts`, `refereeActions.ts`, `matchLeadActions.ts`. `getForCoach` query strips `coachPin` from response. `coachPin` field kept for backwards compatibility but no longer used for authorization. `Match` TypeScript type updated to make `coachPin` optional.
- ~~**Wedstrijdleider (Phase 1)**~~: Coaches can claim/release "match lead" role. Schema: `leadCoachId: v.optional(v.id("coaches"))` on matches. Mutations in `convex/matchLeadActions.ts`. UI: collapsible `MatchLeadBadge` in coach match view. Phase 1 = informational only, no permission enforcement yet. Phase 2 plan documented below.
- ~~**Admin Match Management**~~: Full CRUD for matches in admin panel. "Wedstrijden" is the first tab (default). Backend: `convex/adminMatches.ts` (listAllMatches, createMatch, updateMatch, deleteMatch), all adminPin-protected. Frontend: `MatchesTab.tsx` (list + filters), `MatchForm.tsx` (collapsible create form with team/coach/referee dropdowns, player auto-selection), `MatchRow.tsx` (status badges, referee warning indicator, inline delete confirmation), `PlayerSelector.tsx` (extracted checkbox grid). Inline referee edit panel. Cascade delete (matchPlayers + matchEvents). Shared code generation in `convex/helpers.ts`. Coach PIN stripped from admin API responses (security fix).

### Future Features

- **Named login (user accounts)**: Replace anonymous PIN-only auth with name + PIN login. Users would be identifiable (e.g., "Coach Mike logged in") instead of just a PIN. Enables: personal dashboards, audit trails ("who made this change?"), multi-device sessions, and per-user preferences. Could start simple (name stored on coach record, displayed after PIN login) and evolve toward full accounts later.
- **Cumulative clock mode**: Display game time cumulatively across quarters (e.g., 0–60 min) instead of per-quarter (0–15 min). Should be a coach setting per match. Next priority.
- ~~**Seed data expansion**~~: Now seeds 4 coaches, 4 referees, 3 teams with 14 players each, 3 matches with referee assignments. Modular seed system in `convex/seed/`. Run `npx convex run seed:init`.
- **Opponent roster support**: Store rosters for both teams (not just ours). Enables sharing match data (goals, events, stats) with both teams afterwards. Shirt numbers stored by the referee in goal events can then be resolved to named players for either team.
- **Own goal registration**: In youth football, own goals happen by accident. Currently not tracked as a distinct event type. When needed, add an `isOwnGoal` flow to the GoalModal (separate from opponent goals) with appropriate score handling. Low priority for kindervoetbal — coaches generally don't want to single out a child.
- **Goal ownership split (coach vs referee)**: When a referee is actively assigned and controlling a match, the **coach should no longer be able to add new goals** — only the referee enters scores/goals. However, the coach **should still be able to edit goal details** (e.g., add or correct the player name on a goal that the referee registered with only a shirt number). This keeps the referee as the single source of truth for scoring, while the coach enriches the data afterwards with player names. Requires: (1) a check on coach goal mutations: if `match.refereeId` is set, reject new goals from coach; (2) a new "edit goal event" mutation for the coach to update `playerId`/`playerName` on existing goal events; (3) UI changes in the coach GoalModal to show "referee-controlled" state.
- **Full score editing (coach)**: Allow coach to manually set home/away score directly, for situations where the app gets out of sync with the real match. (Referee score editing already implemented.)
- **Quarter time warning**: When elapsed time exceeds the expected quarter duration (e.g., 15 min), show a visual/audio warning to the coach. Not a hard stop, just a nudge. Useful when the coach loses track of time pitch-side.

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

## Environment & Deployment

### Local Development (.env.local)

These are set automatically by `npx convex dev` and stored in `.env.local` (gitignored):

| Variable | Example | Purpose |
|----------|---------|---------|
| `CONVEX_DEPLOYMENT` | `dev:your-project-123` | Points `convex dev` at your dev backend |
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-project-123.convex.cloud` | Connects React client to Convex |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `http://localhost:3000` | Site URL for local dev |

No `CONVEX_DEPLOY_KEY` is needed locally — `convex dev` handles syncing.

### Vercel Deployment (Environment Variables)

**CRITICAL: `CONVEX_DEPLOY_KEY` must be scoped to Production only.**

| Variable | Vercel Scope | Value Source | Purpose |
|----------|-------------|--------------|---------|
| `CONVEX_DEPLOY_KEY` | **Production ONLY** | Convex Dashboard → Settings → Deploy Keys → generate "Production" key (starts with `prod:`) | Authenticates `convex deploy` during production builds |
| `NEXT_PUBLIC_CONVEX_URL` | **All Environments** | Convex Dashboard → Settings → URL | Connects the React client to Convex in every build |

**Why Production only?** Vercel creates **preview** deployments for every PR/branch push. If `CONVEX_DEPLOY_KEY` is set for "All Environments", Convex CLI detects a production key in a non-production context and **refuses to deploy** with error:
```
✖ Detected a non-production build environment and "CONVEX_DEPLOY_KEY"
  for a production Convex deployment. This is probably unintentional.
```

### How the Build Script Works (`scripts/build.mjs`)

The build script (`npm run build`) is **not** a raw `convex deploy` command. It's a conditional script:

```
npm run build
    │
    ▼
  scripts/build.mjs checks environment
    │
    ├─ CONVEX_DEPLOY_KEY + VERCEL_ENV=production
    │    → npx convex deploy --cmd "next build"
    │    → Deploys Convex functions AND builds Next.js
    │
    ├─ CONVEX_DEPLOY_KEY + VERCEL_ENV=preview
    │    → npx next build (only)
    │    → Builds Next.js using existing NEXT_PUBLIC_CONVEX_URL
    │    → Does NOT touch Convex backend
    │
    └─ No CONVEX_DEPLOY_KEY (local)
         → npx next build (only)
```

This means:
- **Production deploys** (push to `main`) deploy Convex functions + build frontend — full atomic deploy
- **Preview deploys** (PRs, branches) only build the frontend — safe, no backend changes
- **Local builds** just build Next.js — use `convex dev` for backend sync

### Current Vercel Setup Issue (Action Required)

As of Feb 2026, `CONVEX_DEPLOY_KEY` is set for **"All Environments"** in Vercel. This needs to be changed:

1. Go to Vercel → Project Settings → Environment Variables
2. Click the `...` menu on `CONVEX_DEPLOY_KEY`
3. Edit → change scope from "All Environments" to **"Production"** only
4. Save

This is a one-time fix. After this, preview deployments will succeed.
