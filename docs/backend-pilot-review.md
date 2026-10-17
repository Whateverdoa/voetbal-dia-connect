# Backend pilot review - 17 October 2026

## Scope and outcome

Reviewed the pending backend delta on `codex/dia-live-mobile-pilot`: pre-activation
rights diagnosis, protected player-minute accounting, identified red-card effects,
legacy import guards, schema compatibility and isolated integration harness.
No blocking defect found in that delta after code inspection and local tests.
This is not a claim that every remaining product/activation gate is complete.

- Diagnosis requires strict verified identity, current access, existing match read
  rights and an active team. It resolves only the caller's exact-match scope via
  the compound index. It performs no writes and grants no role, scope or policy.
- Registrar identity is independent from eligibility for a current match action.
  Admin read access is not registration authority. Assigned inactive referees do
  not silently grant coach fallback. Every official write rechecks its own rights.
- Existing query/mutation exports and write gates remain intact. Ordinary web
  and mobile commands do not gain a bypass from the diagnostic endpoint.
- Optional schema fields preserve old rows. Pilot playing time is based on bounded
  playing elapsed time, not wall time; old non-pilot behavior remains separate.
- A selected red card closes the correct interval and prevents re-entry. Skipped
  identity and opponent jersey numbers cannot dismiss an unrelated local player.
  Goal enrichment deliberately permits historical attribution after dismissal.
- Import guards leave opted-in match results, assignments and clocks intact.
- Local harness uses fresh loopback SQLite, synthetic JWT/JWKS and fake fixtures,
  excludes production auth/http/crons, and never imports production credentials.

## Verification

939 tests / 120 files pass; root and Convex TypeScript pass; changed application
files lint clean; PIN guard and diff checks pass. The separate actual local Convex
run passed 16 HTTP checks, including pre-activation rights and unchanged snapshots.
Three harness safety tests pass. Native source verification is tracked separately
in the iOS worktree: 172 units pass, one optional localhost test skips, live-test
build compiles with normal reads/writes disabled.

## Remaining gates and risks

- The diagnostic is a point-in-time read, not a reusable authorization grant.
  Scope expiry and role changes must still be checked at every official action.
- Production token-to-role acceptance was reported by the owner on the iPhone;
  strict production claims, registrar and exact scope are not yet confirmed.
- Existing CLI account is valid but cannot access nautical-condor-5. Its visible
  team does not contain the DIA Live project. Do not create a replacement project
  or bypass access checks; sign into the owning account/team instead.
- Review/merge and deployment are separate gates. Current production build runs
  `convex deploy` when its production key is configured. Do not merge this draft
  merely to make the read-only endpoint available.
- Remaining complete native command parity/field-trial and accessibility points
  are not cleared by these backend tests. Android/Watch remain out of scope.
- No live deployment, policy/scope/flag/role/assignment change or device update
  is authorized by this review. Keep production activation separately approved.
