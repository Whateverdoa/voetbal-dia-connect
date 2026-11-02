# Shared Timing Review - 2 November 2026

Scope: protected incident display, shared interruption timing, extra-time choices,
and the required canonical web clock/correction display. Stacked on PR #73.
This is not a deployment approval. The reviewed trial pin now selects UT5KGP on both clients. No scopes, users,
assignedReferee/API v2, TestFlight or privacy-page publication are changed.

## Findings Resolved

- P2: the halftime clock could show remaining added time after a period had ended.
  Remaining added time is now rendered only during live play. Regression test
  preserves the chosen amount while hiding the incorrect remaining-time label.
- P2: reviewing an earlier measurement while the official clock was really paused
  rejected the unchanged already-open interval. The validator now distinguishes
  an existing open interval from a prohibited new interval on a stopped clock.
- Native companion: exact server/cache confirmation clears a redundant conflict
  state, and unchanged overlapping begin actions no longer publish no-op writes.

## Verification On This PR Snapshot

- 932 web/backend tests across 122 files pass.
- Root and Convex TypeScript checks pass; changed production code lint passes.
- Real localhost Convex backend schema/function push with synthetic JWTs passes:
  same mobile/public timing, fixed retries, concurrent version conflict and revoked
  registration rights. The fixture exists only in a disposable local project;
  it does not introduce a public seed route or the unrelated assignedReferee API.
- Native companion PR is tested independently on its exact snapshot.

## Release Constraints

- Draft PR; base is codex/2p23bs-iphone-trial, not main. Review/merge prerequisite
  PR #73 first and revalidate after rebasing. Do not merge this stack for a release
  without a separate explicit decision.
- vercel.json disables Git deployments only for codex/shared-timing-web-review.
  Other branches/settings are unchanged. GitHub checks are test-only.
- New schema fields are optional. Old clients/rows remain valid. Old mobile
  backends do not advertise shared timing, so the native client stays local there.
- Only the current official registrar writes. Existing scopes and wrapper gates
  remain in force. No automatic role/account creation or scope expansion.
- Public incidents expose only allowlisted category/time data; no free text,
  actor identity or clinical details. Full private notes remain authenticated.
- Old local journals are not silently imported into completed matches. The
  physical iPhone remains build 13; live UT5KGP data is untouched by this work.
- Old selective-release scripts are not sufficient: reconcile the full current
  production source/module/schema set before any separately approved deployment.

## Combined Base-PR Follow-Up

The code changes live in stacked PR #75, with native companion #14. The historical
base snapshots #73 and #13 must not be deployed independently as the current trial.

- Web referee and coach control surfaces route policy matches to the same protected
  mobileReferee contract. Legacy official routes still refuse policy writes.
  Coach substitution controls/tabs remain separate. No admin registration bypass.
- Immutable command intents retain version, content and correlationId on uncertain
  retries. Structured rejections are not silently replayed. Expired client access is
  blocked, and receipts must be observed before a subsequent write.
- The only selected trial is UT5KGP (jn75fpd7q5gm8e5byn6ced8vg18hcegm). No new scope
  is granted, no expiry is renewed and no real match is reset by this change.
- BreakClock keeps hook order stable when scheduledBreakEndAt appears/disappears.
- The local release/E2E allowlist now validates the exact optional timingChanges
  shape. Required timing audits, extra private fields and unrelated indexes are
  rejected. All 15 original real-local trial checks and eight release guards pass.
- Historical remote 2P23BS release/finalizer scripts now refuse the new trial
  before reading credentials. A production reconciliation and separate deployment
  decision remain mandatory; this is not a newly enabled remote release route.

## Joint Local UT5KGP Evidence

Run from this backend worktree:

```sh
node scripts/ut5kgp-local-e2e.mjs --native /absolute/path/to/ios-review-worktree --roundtrip --serve
```

Open only the printed loopback web URL. Start the synthetic UT5KGP using the actual
web button. The harness runs the Swift repository/view model over real HTTP/JWT
against the same disposable Convex instance, then prompts for a web extra-time
choice of 90 seconds before a second native pass reads that choice. This uses a
new synthetic match ID, not production records or credentials. Existing native
configuration pins are substituted only in the temporary backend copy. Fixtures
and synthetic tokens never enter production modules or Git.

Observed in both directions: start; goal and optional selected scorer; opponent
card; incident; interruption with the main clock continuing; chosen extra time;
exact append-only correction. The public reader uses an anonymous Convex client
and real MatchClock/TimelineSection components. Authenticated/private incident
notes are absent from that public projection. During live ticking, independent
render timers may show a one-second display difference; server clock anchors are
identical. At rest/finish both displays agree exactly.

Browser checks additionally verified an absolute web choice of 90 seconds reaching
Swift, web scorer enrichment without a second goal, exact web correction, explicit
end confirmation, halftime and second-half nominal start at 30:00. The synthetic
match was finished at 0-0; the pending substitution plan and the other match stayed
intact. No production read/write, website release or physical iPhone install.

Native integration retries use incidentStore:nil to isolate the disposable run
from a prior simulator notebook. A repeat run initially encountered the expected
cache-reconciliation block; the harness now has an isolated notebook rather than
bypassing production conflict handling. Existing cache/conflict tests remain.

Local logs/results are in ignored .artifacts; they are not release credentials or
authorization. The local harness was shut down after verification. A full Next.js
production deployment, physical haptics and real Clerk authentication to production
are not claimed by this synthetic local acceptance test.
