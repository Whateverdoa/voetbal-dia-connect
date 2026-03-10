# HANDOFF.md — DIA Live (voetbal-dia-connect)

## What Is This?

**DIA Live** is a real-time youth football (soccer) match tracking app for club DIA. Coaches manage matches from their phone, parents/spectators follow live via a public code.

This is the **voetbal-dia-connect** repo — Next.js + Convex.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Backend | Convex (real-time serverless DB + functions) |
| Styling | Tailwind CSS 4 via `@theme` in `globals.css` (no config file), tokens: `dia-green`, `dia-green-light`, `dia-green-dark` |
| Icons | lucide-react (SVG icon library) |
| Utilities | clsx (conditional CSS classes) |
| Field view | SVG pitch with FC-style player cards, formation lines, perspective tilt, and live bench↔field substitutions. Components: `PitchView`, `FieldPlayerCard`, `FieldLines`, `FormationLines`, `PitchBench`. Config: `src/lib/formations.ts`, `src/lib/fieldConfig.ts`, `src/lib/roleColors.ts` |
| Testing | Vitest 4, React Testing Library, @testing-library/jest-dom |
| Image opt. | sharp |
| Package mgr | npm (with npm-run-all for parallel dev) |
| Deployment | Vercel (frontend) + Convex Cloud (backend) |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  NEXT.JS FRONTEND (App Router)                │
│                                                              │
│  PUBLIC (no auth)                                            │
│  ├─ /                     MatchBrowser (homepage)            │
│  ├─ /live/[code]          Live match view (real-time)        │
│  └─ /standen              Scoreboard (today's matches)       │
│                                                              │
│  COACH (PIN on coaches table)                                │
│  ├─ /coach                PIN login → team dashboard         │
│  ├─ /coach/new            Create new match                   │
│  └─ /coach/match/[id]     Match control panel                │
│                                                              │
│  REFEREE (PIN on referees table)                             │
│  ├─ /scheidsrechter              PIN login → match list      │
│  └─ /scheidsrechter/match/[id]   Clock + score controls      │
│                                                              │
│  ADMIN (server-side PIN via Convex env var)                  │
│  └─ /admin                CRUD dashboard (all entities)      │
│                                                              │
│  TEAM                                                        │
│  └─ /team/[slug]/history  Match history + season stats       │
└────────────────────────────┬─────────────────────────────────┘
                             │ useQuery() / useMutation()
┌────────────────────────────▼─────────────────────────────────┐
│                  CONVEX (Real-time Backend)                   │
│                                                              │
│  Tables: clubs, teams, coaches, referees, players,           │
│          matches, matchPlayers, matchEvents                   │
│                                                              │
│  Queries (barrel: matches.ts)                                │
│  ├─ publicQueries.ts     Public match list (no auth)         │
│  ├─ coachQueries.ts      Coach PIN verify, team lists        │
│  ├─ matchQueries.ts      Playing time, substitution data     │
│  ├─ refereeQueries.ts    Referee match by code+PIN, list     │
│  └─ lib/matchEventProjection.ts applyGoalEnrichments, staged subs   │
│                                                              │
│  Mutations (barrel: matchActions.ts)                         │
│  ├─ matchEvents.ts       Goals, cards, subs                  │
│  ├─ matchLineup.ts       Lineup management                   │
│  ├─ matchLineupSubstitutions.ts Field-view substitutions      │
│  ├─ matchPhase3Actions.ts Staged substitutions (stage/confirm/cancel) │
│  ├─ matchGoalEnrichmentActions.ts Goal enrichment (scorer/assist)     │
│  ├─ clockActions.ts      Clock pause/resume                  │
│  ├─ scoreActions.ts      Score adjustments (always goal event on +1) │
│  ├─ refereeActions.ts    Referee assignment                   │
│  └─ matchLeadActions.ts  Wedstrijdleider claim/release       │
│                                                              │
│  Admin (barrel: admin.ts)                                    │
│  ├─ adminAuth.ts         Server-side PIN verify              │
│  ├─ adminClubs.ts        Club CRUD                           │
│  ├─ adminTeams.ts        Team CRUD                           │
│  ├─ adminCoaches.ts      Coach CRUD                          │
│  ├─ adminPlayers.ts      Player CRUD                         │
│  ├─ adminReferees.ts     Referee CRUD                        │
│  └─ adminMatches.ts      Match CRUD + cascade delete         │
│                                                              │
│  Helpers: pinHelpers, refereeHelpers,                        │
│           playingTimeHelpers, helpers                         │
└──────────────────────────────────────────────────────────────┘
```

## Data Model (Convex schema.ts)

8 tables, all indexed for efficient queries.

- **clubs** — top-level org (DIA). Fields: `name`, `slug`, `createdAt`. Index: `by_slug`
- **teams** — JO12-1, JO13-2, etc. Fields: `clubId` (→clubs), `name`, `slug`, `createdAt`. Indexes: `by_club`, `by_slug` (clubId+slug), `by_slug_only`
- **coaches** — PIN-authenticated, linked to 1+ teams. Fields: `name`, `pin`, `teamIds[]` (→teams), `createdAt`. Index: `by_pin`
- **referees** — global referee records. Fields: `name`, `pin`, `active`, `createdAt`. Index: `by_pin`
- **players** — per team. Fields: `teamId` (→teams), `name`, `number` (shirt), `active`, `positionPrimary` (EN codes: GK/CB/RB/LB/CM/etc.), `positionSecondary`, `createdAt`. Index: `by_team`
- **matches** — core entity, status machine (scheduled→lineup→live→halftime→finished). Fields: `teamId` (→teams), `publicCode` (6-char), `coachPin`, `opponent`, `isHome`, `scheduledAt`, `status`, `currentQuarter`, `quarterCount` (2 or 4), `homeScore`, `awayScore`, `showLineup`, `pausedAt`, `accumulatedPauseTime`, `bankedOverrunSeconds` (carry-over for end-of-match extra time), `refereeId` (→referees), `leadCoachId` (→coaches), `formationId` (e.g. "8v8_3-3-1"), `pitchType` (full/half), `startedAt`, `quarterStartedAt`, `finishedAt`, `createdAt`. Indexes: `by_team`, `by_code`, `by_status`, `by_refereeId`
- **matchPlayers** — junction: players in a match. Fields: `matchId` (→matches), `playerId` (→players), `isKeeper`, `onField`, `fieldSlotIndex` (pitch position slot), `minutesPlayed`, `lastSubbedInAt`, `createdAt`. Indexes: `by_match`, `by_match_player`, `by_player`
- **matchEvents** — timeline events. Fields: `matchId` (→matches), `type` (goal/sub_in/sub_out/quarter_start/quarter_end/yellow_card/red_card/substitution_staged/substitution_executed/substitution_cancelled/goal_enrichment), `playerId`, `relatedPlayerId`, `quarter`, `matchMs`, `isOwnGoal`, `isOpponentGoal`, `stagedEventId`, `targetEventId`, `correlationId`, `commandType`, `note`, `timestamp`, `gameSecond`, `displayMinute`, `displayExtraMinute`, `createdAt`. Indexes: `by_match`, `by_match_type`
- **matchCommandDedupes** — idempotency. Fields: `matchId`, `commandType`, `correlationId`, `createdAt`. Index: `by_match_command_correlation`

## Auth Model

Identity-first via Clerk email login with multi-role metadata:

| Role | Auth method | Verification function |
|------|-------------|-----------------------|
| **Coach** | Clerk identity (email) | `verifyCoachTeamMembership()` / `verifyCoachPin()` (identity-first) |
| **Referee** | Clerk identity (email) | `resolveReferee()` / `getMatchesForReferee()` (identity-first) |
| **Admin** | Clerk identity (email allowlist) | `requireAdminAccess()` / `verifyAdminAccessQuery()` |
| **Public** | 6-char code | `getByPublicCode()` (read-only) |

**Key flows:**
- **Coach login:** account-based (`verifyCoachPin` identity path) → returns coach + teams + matches
- **Referee login:** account-based (`getMatchesForReferee` identity path) → assigned matches
- **Admin login:** account-based (`verifyAdminAccessQuery`) → all admin mutations guarded by `requireAdminAccess`
- **Public access:** 6-char code in URL → `getByPublicCode` query → match data
- **Clock/score:** authorization is identity-first, with role/capability checks on backend

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
- Seed data ✅ (club DIA, 3 teams with real rosters from CSV, 6 coaches (4 real JO12-1), 4 referees, 7 matches)
- CSV import system ✅ (reusable scripts: `import-players.mjs`, `import-matches.mjs` with dry-run, validation, dedup)
- Admin pages ✅ — CRUD for clubs, teams, players, coaches, referees
- Public match browser ✅ (homepage hero element — code input removed, match browser primary, coach/referee login secondary)
- Standen page ✅ (/standen — defaults to today's matches, ?alle=true for all, minimal scoreboard for kantine/tablet)
- Wedstrijdleider ✅ Phase 1 (coaches can claim/release match lead role, informational only)
- Admin match management ✅ (Wedstrijden tab in admin: list/create/edit/delete matches, referee assignment, cascade delete)
- Team match history ✅ (`/team/[slug]/history` — season stats, match list, result badges)
- Position/formation data model ✅ (schema fields + `src/lib/formations.ts` + `src/lib/positions.ts`)
- PitchView field component ✅ (EA FC-style player cards with role colors K=amber/V=blue/M=green/A=red, avatar silhouettes, formation connecting lines, SVG field markings, 3D perspective tilt, tap-to-swap player positions, live field-bench substitution with event logging, 90px uniform card size, full-field player spread)
- Global match clock ✅ (displayed clock anchored by quarter: 0/15/30/45 for 4 quarters, 0/30 for halves; no per-quarter reset in coach/public/referee headers)
- Event game-time in timeline ✅ (events now show football-style match minute like `10'` and `60+X'` with wall-clock fallback)
- Component tests ✅ (Vitest + RTL — coach login, match controls, live view components, playing time, substitutions, admin tabs)
- PWA — not yet
- Deployment — Vercel + Convex configured ✅

## Recent release: Phase 3 (veld test) — merged to main

PR merged: staged substitutions, goal enrichment, idempotency, referee/parent fixes.

- **Staged substitutions**: Coach stages a swap (Wissel klaarzetten) → confirm or cancel. Events `substitution_staged` / `substitution_executed` / `substitution_cancelled` are coach-only; public sees only the final `sub_out` (with names). Backend: `matchPhase3Actions.ts`, projection in `convex/lib/matchEventProjection.ts`.
- **Goal enrichment**: Coach can add scorer and assist to any goal (including referee +1 goals). Mutation `enrichGoal` in `matchGoalEnrichmentActions.ts`; projection merges `goal_enrichment` into goal display.
- **Idempotency**: `correlationId` on mutations + `matchCommandDedupes` table prevent duplicate actions (double-click, retry). Helper `convex/lib/commandIdempotency.ts`; client `src/lib/correlationId.ts`.
- **Referee +1 always creates goal event**: `adjustScore` with delta +1 always inserts a `goal` event (with optional `note` for shirt number). Coach can enrich later. Parent timeline shows all goals.
- **Referee page**: Missing `code` or `pin` in URL shows clear error instead of infinite loading.
- **Referee queries**: Moved to `convex/refereeQueries.ts` (getForReferee, getMatchesForReferee).
- **Event projection**: `applyGoalEnrichments`, `deriveOpenStagedSubstitutions`, `isCoachOnlyEvent` in `convex/lib/matchEventProjection.ts`. Public query returns cumulative events with coach-only events filtered out.
- **Restart helper**: `npm run dev:restart` runs `scripts/restart-dev.ps1` to kill stale dev processes and start a clean session.

## What Needs Work

- **Smart substitution suggestions** — current sub suggestions sort by playing time only; next step is position-aware filtering (prefer bench player whose positionPrimary matches the outgoing player's slot role, fallback to playing time)
- **Mobile UX polish** — coach interface works on phone but could benefit from UX audit
- **PWA** — offline resilience, installable on home screen
- **Match history stats** — history page exists, but post-match stat aggregation and player-level summaries not yet implemented
- **Test coverage** — component tests exist (Vitest + RTL), but Convex function tests and smoke test automation still needed

## TODO — Priority Task List

### Roadmap — steps we're taking (in order)

| Step | Scope | Branch / status |
|------|--------|------------------|
| **Step 1** | Pre-existing test failures + lint config. Fix: seed test (6 coaches), coach page mock (useConvexConnectionState), CoachDashboard (+2 meer tonen ▼), TeamsTab (getAdminPin mock); fix `npm run lint`. | `fix/pre-existing-tests-and-lint` — **done**: tests 402/402, lint runs via ESLint CLI (see below). |
| **Step 2** | Goal teamnaam, veldversie wissels + slot, scheidsrechter scorer-lijst, admin + coach navigatie (items 1–4). | `feature/step2-goal-field-referee-admin` — **done** (PR #14 merged). |
| **Step 3** | Role model simplification ("The Big One"). | In progress via stacked PRs: #16 (backend authz), #17 (frontend capabilities), #18 (cleanup/tests). |
| **Step 4** | Clerk authentication. | In progress: `feature/clerk-auth-foundation` (foundation) + `feature/clerk-role-policy` (route policy) + `feature/clerk-role-onboarding` (self role selection + PIN-link naar bestaand coach/scheids/admin record + bootstrap-admin via `CLERK_BOOTSTRAP_ADMIN_EMAILS` + account-first auto-login voor coach/scheids/admin via Clerk private metadata). |

### Next to-dos (Phase 3 follow-up — for Step 2)

| Task | Description |
|------|-------------|
| **Teamnaam bij goal-enrichment** | In coach goal-enrichment en in parent/live view: toon expliciet de **teamnaam van het scorende team** (eigen team vs tegenstander) bij elk doelpunt. |
| **Veldversie wissels + slot-overname** | Staged substitutions ook in de veldversie (PitchView); invaller op de **plek van de uitvaller** zetten (slot/positie overnemen). Plan eerst, dan implementatie. |
| **Scheidsrechter: scorer uit lijst** | Spelers in een lijst tonen zodat de scheidsrechter makkelijk kan zien/klikken wie de scoorder is (DIA-team). |
| **Admin + coach navigatie** | Admin zichtbaar in navbar of op loginpagina; vanuit coach-view eenvoudig terug naar parent/live view. |

### 🔴 HIGH PRIORITY

| Task | Description | Status |
|------|-------------|--------|
| **CSV Match Import** | CLI-based CSV import for matches and players. Scripts: `scripts/import-players.mjs`, `scripts/import-matches.mjs`. Convex mutations in `convex/import/`. Supports dry-run, validation, dedup. | ✅ Implemented |
| **Playing Time View Filter** | When coach taps "Speeltijd", the player list should switch to show only on-field + bench players for that match (not all team players). Currently shows the full player list. | ❌ Not started |
| **Add Players to Active Match** | Coach should be able to add additional players to a match after creation (e.g. late arrivals, extra subs). Currently players are only set at match creation time. | ❌ Not started |
| **Coach Match Delete** | Allow coaches to delete their own scheduled (not started) matches | ❌ Not started |

### 🟢 LOW PRIORITY / FUTURE

| Task | Description | Status |
|------|-------------|--------|
| **PWA Support** | Offline resilience, installable on home screen | ❌ Not started |
| **Match History Stats** | Post-match summaries, player stat aggregation | ❌ Not started |
| **Mobile UX Audit** | Professional review of pitch-side usability | ❌ Not started |
| **Named Login** | Replace PIN-only with name + PIN for audit trails | ❌ Not started |
| **Public/Parents Veld View** | Optional public/live toggle to show player positions on field (`Veld`) for parents and spectators | ❌ Not started |

## Follow-Up Items (from code review)

### ~~Critical — Security~~ (RESOLVED)

- ~~**Admin PIN exposed in client bundle**~~: **FIXED.** Admin auth is now fully identity-based via Clerk (`requireAdminAccess`) and no longer uses client-side PIN session storage.

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
- ~~**Wedstrijdleider (Phase 1)**~~: Coaches can claim/release "match lead" role. Schema: `leadCoachId: v.optional(v.id("coaches"))` on matches. Mutations in `convex/matchLeadActions.ts`. UI: collapsible `MatchLeadBadge` in coach match view. Phase 1 = informational only, no permission enforcement yet.
- ~~**Admin Match Management**~~: Full CRUD for matches in admin panel. "Wedstrijden" is the first tab (default). Backend: `convex/adminMatches.ts` (listAllMatches, createMatch, updateMatch, deleteMatch), identity-protected via `requireAdminAccess`. Frontend: `MatchesTab.tsx` (list + filters), `MatchForm.tsx` (collapsible create form with team/coach/referee dropdowns, player auto-selection), `MatchRow.tsx` (status badges, referee warning indicator, inline delete confirmation), `PlayerSelector.tsx` (extracted checkbox grid). Inline referee edit panel. Cascade delete (matchPlayers + matchEvents). Shared code generation in `convex/helpers.ts`.

- ~~**PitchView field component**~~: Visual football field for the coach match page. SVG-based field lines (FIFA/KNVB accurate for 8-tal and 11-tal). EA FC-style player cards with role-based colors (K=amber, V=blue, M=green, A=red), avatar silhouettes, name bars, number badges. Formation connecting lines (dashed SVG). CSS perspective tilt (12deg). Tap-to-swap: tap two field players to exchange positions, tap field + bench to substitute. Uniform 90px card size (field and bench). Players spread across full field (y: 16-90%). Backend: `swapFieldPositions` + `substituteFromField` mutation for live-safe field swaps/substitutions with timeline events. Files: `FieldPlayerCard.tsx`, `FormationLines.tsx`, `FieldLines.tsx`, `PitchBench.tsx`, `PitchView.tsx`, `roleColors.ts`, `fieldConfig.ts`. Formations: 8v8 (3-3-1, 1-4-2-1, 1-3-2-2) and 11v11 (4-3-3) with formation line links.
- ~~**Cumulative clock mode**~~: Implemented. Displayed match clock is now cumulative across quarters/halves (anchors 0/15/30/45 or 0/30) instead of resetting to 0 each quarter.
- ~~**Event game-time display**~~: Implemented. Event timeline now stores and renders match-minute (`displayMinute`, `displayExtraMinute`) while keeping wall-clock fallback for legacy events.
- ~~**Phase 3 (veld test)**~~: Staged substitutions (stage/confirm/cancel), goal enrichment (scorer/assist), idempotency (correlationId + matchCommandDedupes), referee +1 always creates goal event, referee page error for missing code/pin, refereeQueries split, event projection and coach-only filtering, dev restart script. See "Recent release: Phase 3" above.

## Current Work

**Branch:** `main` (Phase 3 merged). No active feature branch; next work should start from a new branch off `main`.

## Next Sprint — Tech Debt (from agent review 2026-02-14)

Findings from code-reviewer, test-agent, mobile-ux-auditor, and convex-specialist:

### Must Fix (before next feature work)

| Item | Source | Description |
|------|--------|-------------|
| ~~Atomic bench-to-field swap~~ | code-reviewer | **Resolved** with `substituteFromField` mutation (single backend operation + event logging). |
| Mutation error handling | code-reviewer | All mutation calls in PitchView are fire-and-forget with no `.catch()`. Add error feedback (toast/status). |
| `fieldSlotIndex` validation | code-reviewer | No range/integer check on `assignPlayerToSlot`. Add `fieldSlotIndex >= 0 && Number.isInteger()` guard. |
| PitchView test coverage | test-agent | Zero tests for 8 new PitchView files. Priority: P0 pure function tests (`formations.ts`, `fieldConfig.ts`, `roleColors.ts`), P1 interaction tests. |
| Pre-existing test failures | test-agent | 31 pre-existing test failures (coach/page, CoachDashboard, TeamsTab) — unrelated to PitchView but need fixing. |

### Should Fix (UX polish)

| Item | Source | Description |
|------|--------|-------------|
| `backdropFilter: blur()` | mobile-ux-auditor | 8-11 blur layers on field cards drain battery over 60-90 min match. Replace with solid `rgba(15,23,42,0.95)`. |
| Role color contrast | mobile-ux-auditor | V(blue)/M(green)/A(red) name bars fail WCAG AA for white text in sunlight. Darken colors. |
| Font sizes | mobile-ux-auditor | Player name 11px, role label 10px, bench header 10px — below 14px minimum for pitch-side use. |
| Card overlap in 4-player formations | mobile-ux-auditor | Cards overlap 7-11px in `1-4-2-1` and `4-3-3` on 375px phones. Consider responsive card sizing. |
| Dropdown/toggle touch targets | mobile-ux-auditor | Formation `<select>` and Veld/Lijst buttons ~36px tall (below 44px minimum). Add `min-h-[44px]`. |
| Status text contrast | mobile-ux-auditor | `text-yellow-400` on `bg-gray-100` is ~1.2:1 contrast — invisible in sunlight. |
| No swap undo | mobile-ux-auditor | Accidental tap permanently commits swap. Consider 3-second undo toast. |

### Nice to Have

| Item | Source | Description |
|------|--------|-------------|
| DRY name truncation | code-reviewer | Duplicated in `PitchView` (12 chars) and `FieldPlayerCard` (10 chars). Unify. |
| DRY `PlayerIcon` SVG | code-reviewer | Duplicated in `FieldPlayerCard` and `PitchBench`. Extract shared component. |
| `React.memo` on cards | code-reviewer | Wrap `FieldPlayerCard` and `MiniCard` to prevent unnecessary re-renders. |
| Bench role labels | mobile-ux-auditor | Bench MiniCards lack role text label (KEP/VER/MID/AAN). Only color distinguishes role. |
| Haptic feedback on swap | mobile-ux-auditor | `navigator.vibrate(50)` after successful swap for tactile confirmation. |

### Future Features

- **Named login (user accounts)**: Replace anonymous PIN-only auth with name + PIN login. Users would be identifiable (e.g., "Coach Mike logged in") instead of just a PIN. Enables: personal dashboards, audit trails ("who made this change?"), multi-device sessions, and per-user preferences. Could start simple (name stored on coach record, displayed after PIN login) and evolve toward full accounts later.
- **Cumulative clock mode**: Display game time cumulatively across quarters (e.g., 0–60 min) instead of per-quarter (0–15 min). Should be a coach setting per match. Next priority.
- **Seed data expansion**: Seeds 6 coaches (4 real JO12-1), 4 referees, 3 teams with real rosters (from CSV), 7 real matches. Modular seed in `convex/seed/`. Reusable CSV import in `scripts/` + `convex/import/`. Future: add more teams' match schedules, expand referee rosters with real data.
- **Opponent roster support**: Store rosters for both teams (not just ours). Enables sharing match data (goals, events, stats) with both teams afterwards. Shirt numbers stored by the referee in goal events can then be resolved to named players for either team.
- **Own goal registration**: In youth football, own goals happen by accident. Currently not tracked as a distinct event type. When needed, add an `isOwnGoal` flow to the GoalModal (separate from opponent goals) with appropriate score handling. Low priority for kindervoetbal — coaches generally don't want to single out a child.
- **Goal ownership split (coach vs referee)**: When a referee is actively assigned and controlling a match, the **coach should no longer be able to add new goals** — only the referee enters scores/goals. However, the coach **should still be able to edit goal details** (e.g., add or correct the player name on a goal that the referee registered with only a shirt number). This keeps the referee as the single source of truth for scoring, while the coach enriches the data afterwards with player names. Requires: (1) a check on coach goal mutations: if `match.refereeId` is set, reject new goals from coach; (2) a new "edit goal event" mutation for the coach to update `playerId`/`playerName` on existing goal events; (3) UI changes in the coach GoalModal to show "referee-controlled" state.
- **Full score editing (coach)**: Allow coach to manually set home/away score directly, for situations where the app gets out of sync with the real match. (Referee score editing already implemented.)
- **Quarter time warning**: When elapsed time exceeds the expected quarter duration (e.g., 15 min), show a visual/audio warning to the coach. Not a hard stop, just a nudge. Useful when the coach loses track of time pitch-side.
- **Professional player shields with photos**: Upgrade player cards to professional-style shields/cards with player headshots (where available), fallback avatar silhouettes, and role/number overlays tuned for sunlight readability.
- **Club logos in key views**: Add club/team logos to public live view, standings, match cards, and coach/referee headers (with graceful fallback when no logo is uploaded).

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
npm run dev:restart  # Stop stale local dev processes/locks, then start one clean dev session
npm run dev:frontend # Next.js only
npm run dev:backend  # Convex only
npm run build        # Production build
npm run lint         # ESLint (Next.js 16: use ESLint CLI; next lint removed)
npm run test:run     # Vitest once
npx convex dev       # Convex dashboard + sync
```

### Lint (Next.js 16)

Next.js 16 removed `next lint`; the project uses the ESLint CLI. Config: `eslint.config.mjs` (flat config) with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Scripts and `convex/_generated` are ignored. Some rules are set to `warn` so the command passes; tighten in follow-up if desired.

### Clean Restart Helper

- Script: `scripts/restart-dev.ps1`
- **Aanbevolen volgorde als er meerdere dev-sessies lopen:** eerst alles stoppen, dan één keer starten. Zo voorkom je Convex “another write batch” / file-lock errors.
- **Alleen stoppen (geen nieuwe start):** sluit alle dev-processen en verwijdert het Next.js lockbestand. Start daarna handmatig één keer `npm run dev` in één terminal.
  ```bash
  npm run dev:restart -- -StopOnly
  ```
  Daarna in dezelfde (of één andere) terminal: `npm run dev`.
- **Default (stoppen + nieuw venster):** stopt stale processen, verwijdert `.next/dev/lock`, start `npm run dev` in een **nieuw** PowerShell-venster. Sluit oude dev-vensters zodat je niet opnieuw meerdere runs hebt.
- **In de huidige terminal starten:**
  ```bash
  powershell -ExecutionPolicy Bypass -File ./scripts/restart-dev.ps1 -NoNewWindow
  ```

**Convex “Persisting failed” / “Another write batch or compaction is already active”:** dit komt bijna altijd doordat **meerdere** `convex dev` (of meerdere `npm run dev`) tegelijk draaien en naar dezelfde lokale Convex-data schrijven. Oplossing: alles stoppen met `npm run dev:restart -- -StopOnly`, eventueel andere terminals/vensters met dev sluiten, dan **één keer** `npm run dev` starten. De melding “user-mapped section open” (Windows os error 1224) past bij bestanden die door een ander proces zijn geopend.

## Production Seed & Import Runbook

### Database Operations (Development)

```bash
# 1. Clear ALL data (dev only — destroys everything)
npx convex run "seed/index:clearAll"

# 2. Re-seed with real data (club, teams, real rosters, coaches, referees, matches)
npx convex run "seed/index:init"
```

### Database Operations (Production)

**IMPORTANT:** In production, use `clearMatchesOnly` to preserve teams/coaches/players.

```bash
# 1. Clear ONLY match data (safe: keeps clubs, teams, coaches, players, referees)
npx convex run "seed/index:clearMatchesOnly"

# 2. Import players from CSV (dry-run first!)
node scripts/import-players.mjs path/to/players.csv --dry-run --pin <ADMIN_PIN>
node scripts/import-players.mjs path/to/players.csv --pin <ADMIN_PIN>

# 3. Import matches from CSV
node scripts/import-matches.mjs path/to/matches.csv --dry-run --pin <ADMIN_PIN> --coach-pin <PIN>
node scripts/import-matches.mjs path/to/matches.csv --pin <ADMIN_PIN> --coach-pin <PIN>
```

### CSV Formats

**Players CSV** (`Team,Naam` or `Team;Naam`):
```
Team,Naam
JO12-1,Hendriks Revi
JO12-1,Smit Sem
```
Names are auto-reordered from "Lastname Firstname" to "Firstname Lastname".

**Matches CSV** (`team_slug,opponent,date,time,is_home,finished,home_score,away_score`):
```
team_slug,opponent,date,time,is_home,finished,home_score,away_score
jo12-1,SCO JO12-2,2026-01-24,10:00,true,true,3,2
jo12-1,Baronie JO12-4,2026-03-07,11:30,false,false,,
```

### Production Reseed Procedure

1. **Backup**: Export current data via Convex Dashboard (snapshot)
2. **Clear matches**: `npx convex run "seed/index:clearMatchesOnly"`
3. **Import/upsert players**: Run `import-players.mjs` with `--dry-run`, then commit
4. **Import matches**: Run `import-matches.mjs` with `--dry-run`, then commit
5. **Spot-check**: Open coach UI → login → verify JO12-1 has correct roster and schedule
6. **Rollback**: If issues, restore from Convex Dashboard snapshot

### Rollback

- Convex Dashboard → Deployments → select previous deployment → "Restore"
- Or re-run the import scripts with corrected data (idempotent/dedup-safe)

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

**Clerk (optioneel, voor account-inloggen):** Zet in `.env.local` in de projectroot (naast `package.json`). Niet committen.

| Variable | Waar te halen | Doel |
|----------|----------------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys → Publishable key | Toont echte Clerk SignIn/SignUp UI op `/sign-in` en `/sign-up` |
| `CLERK_SECRET_KEY` | Zelfde scherm → Secret key | Server-side sessies; nooit in de browser |

Zonder deze twee vars: geen Clerk-UI, alleen fallbacktekst “Inloggen niet actief” op `/sign-in`. Na toevoegen: dev-server herstarten, daarna is de sign-in knop/UI zichtbaar. Op de homepage verschijnt dan ook een link **Account inloggen** → `/sign-in`.

**Coach inloggen zonder PIN (aanbevolen: database):** Zet bij een coach in de **admin** (tab Coaches) het veld **E-mail** (Clerk-e-mail). Dan kan die coach inloggen met alleen Clerk — geen PIN meer. Vereist dat op de **server** (Vercel) en in **Convex** hetzelfde geheim staat: `CONVEX_LINK_SECRET` (willekeurige string). In Convex: `npx convex env set CONVEX_LINK_SECRET <geheim>`. In Vercel: Environment Variables → `CONVEX_LINK_SECRET` = dezelfde waarde. Geen env-lijst meer nodig.

**Optioneel — fallback env-lijst:** `CLERK_COACH_EMAIL_PIN` = lijst `email:pin` (komma-gescheiden), bijv. `mjtenhoonte@gmail.com:2468`. Wordt alleen gebruikt als de coach in de database geen e-mail heeft. Voor schaal: liever e-mail in de database zetten (admin → Coaches → bewerken).

**Keyless mode:** Clerk kan zonder env vars draaien: er worden dan tijdelijke keys gegenereerd en een “Configure your application” prompt getoond om later te claimen. Voor productie of vaste sessies gebruik je de keys uit het Clerk Dashboard.

### Vercel Deployment (Environment Variables)

**CRITICAL: `CONVEX_DEPLOY_KEY` must be scoped to Production only.**

| Variable | Vercel Scope | Value Source | Purpose |
|----------|-------------|--------------|---------|
| `CONVEX_DEPLOY_KEY` | **Production ONLY** | Convex Dashboard → Settings → Deploy Keys → generate "Production" key (starts with `prod:`) | Authenticates `convex deploy` during production builds |
| `NEXT_PUBLIC_CONVEX_URL` | **All Environments** | Convex Dashboard → Settings → URL | Connects the React client to Convex in every build |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All (indien Clerk gebruikt) | Clerk Dashboard → API Keys | Echte Clerk SignIn/SignUp UI |
| `CLERK_SECRET_KEY` | All (indien Clerk gebruikt) | Clerk Dashboard → API Keys | Server-side Clerk sessies |

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

### Vercel Setup

`CONVEX_DEPLOY_KEY` is scoped to **Production only** in Vercel. Preview deployments build the frontend only (no backend changes). This is the correct configuration.
