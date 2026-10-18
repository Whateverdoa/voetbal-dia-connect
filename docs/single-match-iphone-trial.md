# Controlled iPhone trial: 2P23BS

## Approval and scope

18 October 2026: owner explicitly authorizes required match actions for 2P23BS
only, using the previously confirmed real Clerk login and assigned referee.
This supersedes diagnosis-only permission for this fixture, not for the club.

- Production: nautical-condor-5; exact existing match
  `jn7cw69dexmjjmg88jbwsxj4kx8gecgr`, public code `2P23BS`.
- Server module hard-pins the selected match and verified owner email. An internal
  operator mutation approves a maximum 24-hour ticket, rechecking existing active
  user/referee/team records. It changes no role or referee assignment.
- A manual checked-login connection on the iPhone binds that one ticket to the
  real Clerk subject transactionally. Another subject cannot reuse it afterwards.
- Every mobile query/command rechecks the exact match/account, subject scope,
  deadline, team and current duty. Registration additionally checks command
  version, stable correlation/payload, active match state and roster availability.
- Match policy opt-in adds only bounded-clock state and a system audit. Match
  start, score, existing events, selected players and assignments are not reset.
- The global mobile writer switch is not sufficient to grant another match:
  immutable server pins and the specific live scope remain mandatory.
- Expiry/revocation closes mobile reads/writes. The policy, events and durable
  clock guards stay intact. No unsafe legacy fallback is available.
- Existing web writer endpoints and their facade refuse official actions for
  opted-in matches; ordinary non-pilot behavior is retained. No new web writer
  flag or frontend deployment is part of this iPhone-only trial. The web public
  score/read API uses the same records; the older production web clock renderer
  is not certified by this release. Full web console rollout remains separate.

## Release process

1. Full existing web/backend test baseline plus new policy/core tests must pass.
2. Run `node scripts/single-match-trial-e2e.mjs`: isolated loopback Convex, fresh
   SQLite, synthetic signed JWT/JWKS and fake fixture IDs substituted only in an
   ephemeral source copy. No production data, config, auth/http/crons or tokens.
3. The real selective release route is exercised locally: preserve unrelated
   original module bytes/auth/runtime, add optional schema and the three required
   indexes, and overlay every entry point depending on changed helpers, including
   historical facades. Export removal and old field/index changes fail closed.
4. Native unit tests, seven adapter GUI scenarios, checked-login trial gate,
   twenty configuration guards and signed physical build must pass.
5. `node scripts/deploy-single-match-trial.mjs --check-only` is read-only and
   refuses any concurrent source drift, existing policy/scope, nonzero/started
   fixture, wrong assignment, already-open gate or non-additive schema.
6. Explicit operator mode `--apply-owner-approved-2p23bs-trial` repeats prechecks,
   preserves existing modules not requiring guarded behavior and adds the optional
   schema/indexes. Auth, runtime, crons and existing function names/args remain.
   Code-only record fingerprints must match before activation. Only then the
   exact-match ticket/policy is approved and the fenced mobile gate enabled.
7. Install build 6 over `com.jeugdvoetbal.livetest`; do not remove apps or cached
   Clerk identity. Verify embedded auth/read/write YES and diagnostics NO.
8. Owner checks login, opens the single approved fixture and starts it manually.
   Test goals, skip/scorer selection, opponent numeric jersey, exact correction,
   cards, pause/resume and periods. No agent-generated test goal/start in live.

## Rollback and operational limits

Set `MOBILE_REFEREE_WRITES_ENABLED=false` to stop mobile official actions.
Do not remove the policy/schema/scheduler or delete audit/events/scores. Do not
restore legacy writers for this fixture. On a partially failed deployment keep
writes closed, retain evidence and repair forward. Release scripts never print
or persist admin credentials or end-user tokens. Ignored protected artifacts
contain source snapshots/fingerprints, not credentials; never attach them to PRs.

The backend production patch must be preserved when reconciling future main
releases. Do not casually deploy an older source or merge the broad PR71 merely
because the trial passes. Android, Watch and non-selected matches are untouched.
Remaining report/abandon/non-goal-correction parity and accessibility points are
not certified by the limited trial; unsupported native actions fail closed.

## Verification notes (18 October 2026)

- Existing and new web/backend suite: 885 tests / 114 files pass. All genuine
  source tests remain included. Temporary local-harness copies and their symlinked
  third-party dependencies are excluded along with generated `.next` output;
  otherwise Vitest incorrectly discovers vendor tests inside ignored artifacts.
- Root and Convex TypeScript plus changed backend ESLint pass.
- Fifteen real local checks pass, including the selective schema/code release.
- Native: 175 unit tests pass, one optional localhost test skipped; seven adapter
  UI scenarios and one explicit login-gate UI scenario pass; twenty build guards
  pass. The red-card UI test waits for actual hit testing after menu transitions;
  all original player/score assertions remain. No GUI redesign was made.
- Signed physical build 6 and embedded flags independently verified.
- Entire frontend build passes with `next build --webpack`. Default Turbopack
  cannot build this nested worktree's out-of-root node_modules symlink.
- Whole-repository ESLint still reports the pre-existing conditional hook in
  unchanged `src/components/match/BreakClock.tsx`, plus 168 existing warnings.
  This is not represented as a green global lint or a certified frontend rollout.

## Preview-install schema preparation discovered and contained

The first activation attempt stopped before code/data/flag changes because an
in-progress schema appeared. Read-only Vercel evidence attributes this to our own
PR73 preview (`981a89e`, deployment `dpl_9Bc45SKFcaixLnRA7m8ntGuU1ZGL`): the old
npm postinstall executed `convex codegen`, whose installed CLI implementation
starts schema preparation even though it does not finish a code deployment.
The prepared schema is exactly the reviewed trial schema, not another change.

Removed automatic postinstall codegen and the root lockfile install-script flag.
Six release-safety tests prevent lifecycle backend calls and reject adopting any
non-identical pending schema. The real local selective-release harness also
verifies that repeating the identical preparation reuses its schema ID. Reuse of
this known own-preview preparation requires an explicit narrow operator flag and
provenance; unknown preparations still stop the release. No unrelated prepared
schema/index is cancelled or overwritten. Future explicit development `convex dev`
or an intentionally approved deployment can generate code normally.

## Actual narrow activation and physical acceptance

18 October: the code/schema release completed while writes remained closed. Its
postcheck stopped on the new goal-correction index's expected backfilled -> done
transition, incorrectly classifying it as an old active index. The old active
schema proves it did not previously contain that index; the approved prepared
schema did. No blanket index exception was accepted or applied.

A separate `finish-single-match-trial.mjs` performs read-only source/schema and
index verification, then only the tested pinned activation and mobile kill-switch
change. It has no code/schema/index mutation capability. All 53 truly pre-existing
active indexes and all three newly approved indexes were verified intact, exact
deployed sources matched the tested overlay, other matches and all existing
roles/referees/coaches matched preflight fingerprints. Only 2P23BS received policy,
a pending subject ticket and system audit. Scheduled 0-0 state and metadata stayed
unchanged. The ticket expires **19 October 2026 11:19 Europe/Amsterdam**.

Build 6 installed and launched successfully on the connected iPhone. Owner then
confirmed: "Ja, Start wedstrijd is actief". Fresh server inspection confirms
exactly one enabled writer scope, bound by the real verified login rather than a
pending subject, for 2P23BS only. No JWT/subject value was exported. This establishes
real-device login, enrollment, exact API/clock-policy compatibility and access to
the native controls; it does NOT certify physical goal/clock action scenarios yet.
The agent has not started the live match or entered any goal/card/correction.

Evidence is ignored/protected: production-trial-0n6OiO (partial release),
index-transition-readonly-proof.json, verified-trial-activation-lXGvYk (activation),
physical-trial-ready.json. No production records or credentials are committed.
