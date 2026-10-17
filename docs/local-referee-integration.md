# Isolated referee integration verification

Run `node scripts/local-referee-e2e.mjs` from this backend checkout. Add `--native`
only from the linked backend worktree inside the iOS checkout. It uses the owned
simulator and installed Xcode/package cache paths specified in the script.
Prerequisites: locked node_modules and the cached Convex local backend binary.
No package installation is performed. Never substitute a production URL/key.

The harness creates a fresh loopback-only Convex database, copies application
sources with production auth/http/crons excluded, and uses ephemeral local JWTs.
Only fake matches/accounts are seeded. This exercises actual HTTP and database
transactions, rather than mocked Convex calls. `--native` additionally runs the
existing Swift repository/GUI bridge over real URLSession HTTP. Its temporary
manifest is exclusive, contains only synthetic identity data and is removed on
exit. Artifacts remain ignored and must not be published. Keep one native run at
a time. No cloud deployment or mobile access activation occurs.

Results are saved to `.artifacts/local-referee-e2e-*/result.json`. Exit 0 means
all checked gates pass; exit 2 means transport checks pass but product readiness
blockers remain; exit 1 indicates a harness/check failure. A skipped native test
is never accepted as successful network integration. Regular native baseline
runs skip that one test when the local manifest is absent.

## 17 October 2026 results

14 server contract checks pass: JWT/scope denial, official registrar, retry and
payload conflict, no repeated kickoff reset, pause accounting, explicit coach
fallback, append-only goal correction, roster/enrichment, concurrent commands,
revocation, nine clock formats/margins, stale scheduled checks, absolute margin,
600-minute running/paused reopening, and protected legacy imports.

Two real local counterexamples block release: kickoff does not initialize
matchPlayers.lastSubbedInAt; red-card registration leaves the player onField.
Native report/abandon/non-goal corrections also need contract parity before a
complete field trial. Synthetic JWT verification does not prove hosted Clerk
login, redirects or real account claims. Those and exact expiring server scope,
review/deployment approval and separate read/write authorization remain required.

Import hardening is source-only: protected matches are skipped by Sportlink
upsert, weekly synchronization and score application. Eleven new regression
cases pass; the complete backend suite has 922 passing tests. TypeScript and
changed-file lint pass. Generated `.artifacts` copies are excluded from Vitest,
not application assertions. Do not interpret green tests as live approval.

## Three-blocker repair - 17 October 2026 (supersedes earlier failures)

The two player-state counterexamples now pass as hard assertions: kickoff opens
on-field intervals and red cards close exactly the identified player's interval,
remove field position and prevent re-entry. The nine clock-format/margin cases
now verify player minutes too. Red retries preserve the same receipt, event and
minute total. Coach swaps during pauses and sub-minute checkpoint precision have
additional transaction regressions. All 931 backend tests pass, root/Convex TS
and changed-file lint pass. Optional schema additions require no production
backfill; existing non-pilot accounting is retained.

The consolidated actual local HTTP run is
`.artifacts/local-referee-e2e-SAzAma/result.json`: 15 server checks and one real
Swift URLSession/GUI-bridge test PASS, blockers empty, exit 0. The native test
includes an identified red card and immutable event display. This clears only
these local gates, not hosted Clerk auth or production activation gates.

## Read-only eligibility diagnosis

The loopback harness now seeds a separate scheduled fixture with no referee policy
and no mobile scope. With a signed synthetic JWT, `refereeRegistration:diagnose`
confirms the assigned active referee, rejects incomplete identity claims, reports
an unassigned admin/coach as not registrar, and leaves the entire match/event
snapshot unchanged. The normal mobile match query still denies this fixture.
This test deploys source only to a fresh local SQLite Convex instance; production
credentials, auth configuration, crons, flags and data are excluded.
