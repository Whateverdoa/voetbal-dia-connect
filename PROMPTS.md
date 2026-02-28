# DIA Live — Development Prompts & Subagent Guide

## How To Use This

This doc contains **ready-to-paste prompts** for Cursor and Claude Code, organized by development task. Each prompt is self-contained with enough context to get useful output in a single session.

**Workflow:**

1. Pick the task you want to work on
2. Copy the prompt into Cursor or Claude Code
3. Review output, test, iterate
4. Update HANDOFF.md with what changed

---

## 🏗️ PHASE 1: Foundation (Do These First)

### 1.1 — Seed Script (Convex) first check if this allready has been done

**Use in: Claude Code or Cursor**

```
Read HANDOFF.md and convex/schema.ts.

Create a Convex seed function at convex/seed.ts that populates development data:

1. Club: "DIA" (slug: "dia")
2. Teams: "JO11-1", "JO12-1", "JO13-2" (with slugs)
3. Coaches:
   - "Coach Mike" PIN "1234" → linked to JO12-1
   - "Coach Lisa" PIN "5678" → linked to JO11-1 and JO13-2
4. Players: 14 players per team with Dutch first names and realistic shirt numbers (1-99)
5. One sample match for JO12-1:
   - Opponent: "VV Oranje"
   - isHome: true
   - status: "scheduled"
   - Include all 14 players in matchPlayers (none on field yet)

Export as a Convex action (not mutation) so it can be run with:
npx convex run seed:init

Add idempotency: check if club "dia" exists before inserting.
```

### 1.2 — Convex Environment Setup Check

**Use in: Claude Code terminal**

```
I need to verify the Convex setup for voetbal-dia-connect.

1. Check if .env.local exists with CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL
2. Run `npx convex dev --once` to sync schema
3. Verify the schema deployed correctly
4. List any TypeScript errors in the convex/ directory

If .env.local doesn't exist, tell me to run `npx convex init` first — don't create dummy values.
```

### 1.3 — Tailwind Config Review

**Use in: Cursor**

```
Check the Tailwind CSS 4 setup in this project:

1. Verify postcss.config.mjs has @tailwindcss/postcss
2. Check if dia-green color is defined (should be a green matching Dutch football club aesthetic, ~#1B5E20 or #2E7D32)
3. If not defined, add it to the Tailwind config or CSS custom properties
4. Verify the global CSS imports Tailwind correctly for v4

This is a Next.js 16 project with Tailwind CSS 4 (not v3).
```

---

## 🏟️ PHASE 2: Coach Interface

### 2.1 — Coach Login Page

**Use in: Cursor (visual work)**

```
Read HANDOFF.md for context. Build the coach login page at src/app/coach/page.tsx.

Requirements:
- PIN input (4-6 digits), large numeric keypad style for phone use
- Use useMutation for verifyCoachPin query
- On success: store PIN in sessionStorage, redirect to /coach/dashboard
- On failure: show error "Ongeldige PIN" with shake animation
- DIA green branding, clean mobile-first layout
- Dutch text throughout

The PIN check uses: api.matches.verifyCoachPin({ pin })
It returns { coach, teams, matches } or null.

After login, store: { coachId, coachName, pin, teams } in sessionStorage.
```

### 2.2 — Coach Dashboard

**Use in: Cursor**

```
Read HANDOFF.md. Build coach dashboard at src/app/coach/dashboard/page.tsx.

This page shows after PIN login. Read coach session from sessionStorage.

Layout:
- Header: "Welkom, [coach name]" with DIA branding
- Section per team the coach manages
- Per team: list of recent matches (from verifyCoachPin response)
- Each match card shows: opponent, date, status badge, score (if started)
- "Nieuwe wedstrijd" (New match) button per team
- Match cards link to /coach/match/[matchId]

Use useQuery(api.matches.verifyCoachPin, { pin }) for live data.
If no valid session, redirect to /coach.

Mobile-first, big touch targets. Status badges:
- scheduled → gray "Gepland"
- lineup → blue "Opstelling"
- live → red pulsing "LIVE"
- halftime → orange "Rust"
- finished → dark "Afgelopen"
```

### 2.3 — Match Creation Flow

**Use in: Cursor**

```
Read HANDOFF.md and convex/matchActions.ts (the create mutation).

Build match creation page at src/app/coach/match/new/page.tsx.

Flow:
1. Select team (from coach's teams)
2. Enter opponent name
3. Toggle home/away
4. Select quarter format (2 halves or 4 quarters)
5. Select players for this match (checkboxes from team roster)
6. "Wedstrijd aanmaken" button

On create: call api.matchActions.create with all fields.
On success: redirect to /coach/match/[matchId] and show the publicCode prominently
("Deel deze code met ouders: [CODE]")

Need a Convex query to get players by team:
- If it doesn't exist in matches.ts, create convex/players.ts with a getByTeam query

Dutch UI, mobile-first, step-by-step or single scrollable form.
```

### 2.4 — Coach Match Control Panel (THE BIG ONE)

**Use in: Cursor for UI, Claude Code for Convex logic**

```
Read HANDOFF.md and convex/matchActions.ts.

Build the coach match control panel at src/app/coach/match/[id]/page.tsx.
This is the primary coach interface, used PITCH-SIDE on a phone during a match.

Requirements:
1. Load match via useQuery(api.matches.getForCoach, { matchId, pin })
2. Show current score prominently
3. Show match status with control buttons:
   - "Start wedstrijd" (if scheduled)
   - "Volgend kwart" / "Rust" / "Einde" (if live)
   - "Hervat" (if halftime)

4. GOAL section:
   - Big "GOAL! 🎉" and "Tegendoelpunt" (opponent goal) buttons
   - When our goal: select scorer from on-field players, optional assist
   - Quick-add, no unnecessary steps

5. SUBSTITUTION section:
   - Show on-field players and bench players
   - Tap player out → tap player in → confirm
   - Visual: green background = on field, gray = bench

6. LINEUP toggle:
   - Toggle "Toon opstelling" (show lineup to public)
   - Toggle keeper per player

7. EVENT TIMELINE at bottom:
   - Reverse chronological
   - Show all events with player names

All mutations need matchId + pin. Store pin from sessionStorage.
CRITICAL: This must be fast and usable with cold/wet hands on a phone.
Big buttons, clear states, minimal taps per action.
```

---

## 📱 PHASE 3: Public Experience

### 3.1 — Polish Live Page

**Use in: Cursor**

```
Review src/app/live/[code]/page.tsx.

The live page exists but needs polish:
1. Add auto-refresh indicator (Convex handles real-time, but show "Live verbinding" status)
2. Add pull-to-refresh feel (even though Convex is already real-time)
3. Better goal animation when score changes (brief highlight/pulse)
4. Quarter progress indicator (visual bar or dots showing Q1/Q2/Q3/Q4)
5. Substitution events in timeline (currently filtered out for public)
6. Share button: copy match code or share link
7. Sound/vibration option on goal (with user opt-in)

Keep it lightweight, mobile-first. Parents watch this on their phones.
Currently the page works — don't break existing functionality.
```

### 3.2 — PWA Setup

**Use in: Claude Code**

```
Add Progressive Web App support to this Next.js 16 project.

1. Create public/manifest.json with:
   - name: "DIA Live"
   - short_name: "DIA"
   - theme_color: dia-green
   - display: standalone
   - icons (generate simple placeholder SVG icons at 192x192 and 512x512)

2. Add manifest link to layout.tsx
3. Add meta tags for mobile web app
4. Add viewport meta for mobile

Don't add a service worker yet — Convex handles real-time, and offline support is complex. Just make it installable on home screen.
```

---

## 🔧 PHASE 4: Quality & Features

### 4.1 — Playing Time Tracker (WISSEL feature)

**Use in: Claude Code for schema, Cursor for UI**

```
Read HANDOFF.md. The key feature from VOETBAL-WISSEL is fair playing time tracking.

Schema additions needed in convex/schema.ts:
- Add to matchPlayers: minutesPlayed (number), quartersList (array of quarter numbers played)
- Or create a new table: playingTime { matchId, playerId, quarterIn, quarterOut, minutes }

Logic:
- When a player goes onField during a quarter, record quarter start
- When subbed out or quarter ends, calculate minutes
- Show per-player playing time in coach view
- Show "fairness indicator" — highlight players with least playing time
- At halftime/quarter break, suggest which players should go in based on least minutes

This is the killer feature — coaches struggle to give kids equal playing time.

Start with the Convex schema change and a query that returns per-player minutes for a match.
```

### 4.2 — Admin Panel (Club Setup)

**Use in: Cursor**

```
Build admin pages for initial club setup at src/app/admin/.

Pages needed:
1. /admin — simple PIN or password gate (separate from coach PIN)
2. /admin/teams — CRUD for teams
3. /admin/players — CRUD for players per team (name, shirt number)
4. /admin/coaches — CRUD for coaches (name, PIN, team assignments)

Convex mutations needed:
- convex/admin.ts: createTeam, updateTeam, createPlayer, updatePlayer, togglePlayerActive, createCoach, updateCoach

Keep it functional, not pretty. This is used once at season start.
Admin PIN can be hardcoded or env var for now.
```

### 4.3 — Match History & Stats

**Use in: Claude Code**

```
Add match history view.

1. Convex query: getMatchHistory(teamId) — returns finished matches with scores and events
2. Page: /team/[slug]/history — public page showing past results
3. Per match: score, goal scorers, basic stats
4. Season summary: total goals, wins/draws/losses, top scorers

Keep queries efficient — collect only needed fields.
```

### 4.4 — Error Handling & Edge Cases

**Use in: Claude Code**

```
Audit the codebase for error handling gaps:

1. Network failure during mutation (Convex handles retry, but UI should show state)
2. Coach PIN expired/invalid mid-match
3. Two coaches with same PIN (schema allows this — add unique constraint or handle)
4. Match code collision (currently loops — add max retries)
5. Player deleted while in active match
6. Browser tab sleep/wake (mobile phones)

For each issue:
- Describe the failure mode
- Propose a fix
- Implement if straightforward

Don't refactor working code — just add guards and error boundaries.
```

---

## 🧪 TESTING PROMPTS

### Quick Smoke Test

**Use in: Cursor or Claude Code**

```
Write a manual test script (markdown checklist) for DIA Live:

1. Seed data → verify in Convex dashboard
2. Public: enter match code → see "Nog niet begonnen"
3. Coach: login with PIN 1234 → see dashboard
4. Coach: create match → get public code
5. Coach: set lineup → toggle show lineup
6. Public: verify lineup appears
7. Coach: start match → public sees LIVE
8. Coach: add goal → public sees score update
9. Coach: make substitution → verify player states
10. Coach: end match → public sees "Afgelopen"
```

### Component Test Template

**Use in: Cursor**

```
Create a test file for the coach match control panel.
Use Vitest + React Testing Library.

Test cases:
- Renders loading state while match data loads
- Shows "Start wedstrijd" button for scheduled match
- Shows goal/sub controls for live match
- PIN validation rejects wrong PIN
- Score updates after goal mutation

Mock Convex hooks with @testing-library/react + custom provider.
Put test next to component: src/app/coach/match/[id]/page.test.tsx
```

---

## 🚀 DEPLOYMENT PROMPTS

### Vercel Deploy

**Use in: Claude Code**

```
Prepare the project for Vercel deployment:

1. Verify next.config.js is clean (no hardcoded URLs)
2. Check that NEXT_PUBLIC_CONVEX_URL is the only required env var
3. Create a vercel.json if needed (probably not for standard Next.js)
4. Run `npm run build` and fix any build errors
5. List the env vars needed in Vercel dashboard

Don't actually deploy — just make it ready.
```

### Convex Production Deploy

**Use in: Claude Code**

```
Prepare Convex for production:

1. Run `npx convex deploy` (will prompt for production project)
2. Note the production CONVEX_URL
3. Verify schema deployed
4. Run seed script on production (with a real admin PIN, not 1234)

Document the steps — don't execute destructive operations without confirmation.
```

---

## Session Patterns

### Starting a Session (any tool)

```
Read HANDOFF.md first.
Current task: [describe what you're working on]
Time budget: [e.g., "30 minutes, need a stopping point"]
```

### Ending a Session

```
Update HANDOFF.md with:
- What was completed
- What's partially done
- Any blockers or decisions needed
- Next steps
```

### Context Recovery After Break

```
Read HANDOFF.md and git log --oneline -10.
What changed since last session? Summarize current state and what needs attention.
```
