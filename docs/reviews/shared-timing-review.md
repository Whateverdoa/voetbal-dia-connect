# Shared Timing Review - 2 November 2026

Scope: protected incident display, shared interruption timing, extra-time choices,
and the required canonical web clock/correction display. Stacked on PR #73.
This is not a deployment approval. No changes to trial match pins, scopes, users,
assignedReferee/API v2, TestFlight or privacy-page publication are included.

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

- 920 web/backend tests across 120 files pass.
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
