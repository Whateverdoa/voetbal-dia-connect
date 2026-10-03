# Native DIA adapter — development only

Baseline: `origin/main` at `e980e1d967518d93ddda0c2065a146f970395152`. Branch `codex/native-dia-current` was created directly from that commit. The production checkout and all web UI files are untouched. Mobile-only admin, event, match-command and planning adapters were selected from `codex/mobile-substitutions-dev`, then reconciled with the current domain.

Only deployment `dev:quaint-barracuda-871` was updated. No production publish, merge, seed, reset or database import was performed.

## Contract and domain ownership

- `mobileNative:getNativeMatch`: validated projection of current role-specific match access, resolved formation slots/presets/templates, roster, timeline, clock and shared card/time-penalty status. Coach mode hides official controls when a referee is assigned. Mutations independently re-authorize every action.
- `mobileMatchEvents`: goals/cards delegate to `matchActions.addGoal` / `addCard`; corrections use the canonical score function; coaches enrich goals through `enrichGoal`. Own-goal beneficiary is independent of the conceding player. Canonical card side effects are preserved. Cards cannot be silently removed after changing lineup/playing time.
- Goal replacement is an optional additive enrichment mode. It replaces canonical scorer/assist details and linked rows together, preserving original goal time and compatibility with existing stats readers.
- `mobileNative:nativeSubstitute` adds revision checking and idempotency around `substituteFromField`. `mobileSubstitutionPlans` executes through `substitutionPlans.executePlanItem`, retaining actual execution game time.
- `mobilePreparation:nativePrepare` delegates preparation/empty-slot entry to existing lineup handlers. Live entry requires match leadership and an empty slot; live formation changes go through neither this adapter nor an alternate rule engine.
- Shared bench/position swaps transfer keeper status. Bench substitutions do not start minutes during halftime/stoppage. Shared card-entry checks reuse `src/lib/cards/cardRules.ts` to prevent penalized/dismissed returns and premature empty-slot filling.
- Additive schema changes retain all old mobile fields and current-main fields (including penalty origin and reported card identities). Generated files were produced by Convex, never hand-edited.

The Expo repository generates its selected public contract from DEV `function-spec` (17 references). It remains hard-limited to this DEV URL for writes.

## Validation, 2026-10-03

- Convex TypeScript and targeted ESLint pass.
- 118 targeted tests pass across mobile commands/events/plans/admin, official duty and shared card rules. Integration fixtures invoke canonical handlers, covering own-goal columns, coach enrichment vs official control, retries, stale lineup rejection, actual planned execution, keeper/time transfer, preparation and card return guards.
- The broader web suite reports 874 passing and 21 failing tests. All 21 failures were reproduced independently in an unmodified archive of `e980e1d` (29 tests in the five affected suites: 8 pass, 21 fail). No web UI fixes were included. Three new targeted tests added after the broad run pass as part of the 118.
- Actual DEV query smoke: the existing linked account can read a scheduled match in coach/referee/admin modes; an unlinked test identity receives `null`. No real match command was submitted during this smoke.
- Before/after DEV snapshots confirm unchanged IDs and values for all 34 matches, 415 matchPlayers, 14 substitutionPlans, 96 matchEvents, 93 match-command dedupes and existing clubs/teams/people/roles. The pre-existing hourly external-results job refreshed the separate 657-row `wedstrijden` import feed while work was in progress; no mobile fixture was replaced.
- Companion Expo changes pass typecheck/lint, 33 model tests and iOS/Android Hermes export. Phone acceptance (iPhone 13, then Android) is outstanding; browser fixture checks are not physical-device results.

Snapshot archives and inspection reports are local in the user's Temp directory, not committed. Production enablement and distribution remain separate work.
