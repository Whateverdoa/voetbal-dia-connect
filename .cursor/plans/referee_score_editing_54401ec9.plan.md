---
name: Referee Score Editing
overview: Add simple +/- score editing to the referee view, update HANDOFF.md with completed/follow-up items, add a prominent "SCHEIDSRECHTER" badge, and set a referee PIN for testing.
todos:
  - id: score-mutation
    content: Create convex/scoreActions.ts with adjustScore mutation (matchId, pin, team, delta, optional scorerNumber) using verifyClockPin auth. When scorerNumber provided on +1, log a goal event with note.
    status: completed
  - id: reexport-score
    content: Add adjustScore re-export to convex/matchActions.ts
    status: completed
  - id: score-controls-ui
    content: Create src/components/referee/RefereeScoreControls.tsx with +/- buttons per team. "+" opens optional rugnummer prompt (skip or enter number). "-" decrements immediately.
    status: completed
  - id: referee-page-update
    content: "Update referee match page: add RefereeScoreControls, add prominent SCHEIDSRECHTER badge"
    status: completed
  - id: handoff-update
    content: "Update HANDOFF.md: mark pause/clock and referee role as done, add follow-up items"
    status: completed
  - id: set-pin-test
    content: Set referee PIN on test match and verify the full referee flow (badge, score editing, clock)
    status: completed
isProject: false
---

# Referee Score Editing + HANDOFF Update

## Current State

- Referee page exists at [`src/app/scheidsrechter/match/[id]/page.tsx`](src/app/scheidsrechter/match/[id]/page.tsx) with clock controls only
- Score is displayed in `RefereeScoreHeader` (inline component in the page) but **not editable**
- The existing `addGoal` mutation in [`convex/matchEvents.ts`](convex/matchEvents.ts) is coach-only (checks `coachPin`, not `verifyClockPin`) and creates full goal events with player attribution -- **not what we want**
- [`convex/matchActions.ts`](convex/matchActions.ts) is at ~296 LOC (near the 300 limit)

## Plan

### Phase 1: Backend -- Score adjustment mutation

**New file: `convex/scoreActions.ts`**

Create an `adjustScore` mutation:

- Args: `matchId`, `pin`, `team` ("home" | "away"), `delta` (+1 or -1), `scorerNumber` (optional number -- shirt number on the back)
- Auth: Use `verifyClockPin` from [`convex/pinHelpers.ts`](convex/pinHelpers.ts) so both coach and referee can adjust
- Guard: Clamp score to minimum 0 (prevent negative scores)
- When `delta === +1` and `scorerNumber` is provided: increment score AND create a `"goal"` event in `matchEvents` with `isOpponentGoal` set based on `team` vs `isHome`, no `playerId`, and `note: "Rugnummer: {N}"`. The coach can later resolve this to a named player via the existing `addGoal` flow.
- When `delta === +1` and no `scorerNumber`: just increment score, no event (lightweight correction)
- When `delta === -1`: just decrement score, no event (pure correction)

**Update `convex/matchActions.ts`**: Add re-export line:

```typescript
export { adjustScore } from "./scoreActions";
```

This keeps matchActions as the single public API surface (consistent with existing pattern for `pauseClock`, `resumeClock`, `addGoal`, etc.).

### Phase 2: Frontend -- Referee score controls

**New file: `src/components/referee/RefereeScoreControls.tsx`**

A component with:

- Two columns (Home / Away), each showing the team name and current score
- Large **+** and **-** buttons per team (big touch targets, min 56px height)
- **"+" flow**: Tapping "+" opens a small inline prompt: "Rugnummer scorer? (optioneel)" with a number input and two buttons: "Opslaan" (save with number) and "Sla over" (skip, just increment). This is the optional shirt number feature.
- **"-" flow**: Tapping "-" immediately decrements (no prompt -- it's a correction)
- Calls `adjustScore` mutation with `delta`, and optionally `scorerNumber`
- Disabled state while loading, error feedback on failure
- Simple guard: disable "-" button when score is already 0

### Phase 3: Referee page updates

**Edit: [`src/app/scheidsrechter/match/[id]/page.tsx`](src/app/scheidsrechter/match/[id]/page.tsx)**

- Add `RefereeScoreControls` between the score header and clock controls
- Add a prominent **"SCHEIDSRECHTER"** badge in the header area (yellow/amber badge, clearly visible, distinct from the coach view)
- Pass `matchId`, `pin`, team names, `isHome`, and current scores to the score controls

### Phase 4: Update HANDOFF.md

**Edit: [`HANDOFF.md`](HANDOFF.md)**

Under "Future Features", mark as **done**:

- ~~Pause/stop clock during quarter~~ (done)
- ~~Referee role ("scheidsrechter")~~ (done)

Add new follow-up items:

- **Cumulative clock mode**: Per-quarter vs match-time display as a coach setting (next priority)
- **Seed data expansion**: Additional coaches for same team + 4 referee PINs
- **Referee score editing**: (will be done by this plan)
- **Referee visual identity**: Prominent "SCHEIDSRECHTER" indicator (will be done by this plan)
- **Opponent roster support**: Store rosters for both teams (not just ours). Enables sharing match data (goals, events, stats) with both teams afterwards. Shirt numbers stored by the referee in goal events can then be resolved to named players for either team.

### Phase 5: Set referee PIN + test

- Use the Convex dashboard or run a quick mutation to set a `refereePin` on the existing test match
- Walk through the full referee flow: login, see badge, edit scores, verify clock controls still work

## Key Decisions

- **Optional shirt number, not mandatory** -- The referee can tap "+" and immediately skip, or enter a rugnummer. When provided, a lightweight `"goal"` event is logged with `note: "Rugnummer: 7"` (no `playerId`). The coach can later match this to a player. When skipped, just the score changes -- no event clutter.
- **`verifyClockPin` for auth** -- both coach and referee can adjust scores. If only the referee should be able to, we'd need a new helper, but allowing both is more practical (coach can fix scores too).
- **Separate file `scoreActions.ts`** -- `matchActions.ts` is at the 300 LOC limit, and score adjustment is a distinct concern.
- **"-" has no prompt** -- Decrement is always a quick correction. No need to ask for a shirt number when removing a goal.