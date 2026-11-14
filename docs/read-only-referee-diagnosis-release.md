# Read-only referee diagnosis release - 18 October 2026

This patch adds only `refereeRegistration:diagnose`. It is separate from the full
backend pilot PR #71 and contains no schema, index, auth-provider, clock-command,
match write, role grant, scope grant, planner or mobile-registration rollout.
The public query requires a verified Clerk identity, the explicitly approved
owner account and exact 2P23BS match ID, existing active access and active team.
It uses existing role resolution; admin read access does not confer duty.
Registrar identity and current match eligibility remain separate. The response
never grants a command. Mobile API status is unavailable, not a claim that
undeclared legacy tables have no rows. No normal mobile command API is deployed.

## Controlled deployment

The owner approved diagnosis-only deployment and separately approved cleanup of
exactly three prepared, non-active indexes. A loopback-only test with signed
synthetic JWTs verified auth/authorization cases, actual query behavior, unchanged
existing modules/schema/active indexes and cleanup limited to those three indexes.

Production deployment reused all 278 existing modules byte-for-byte (including
source maps), current active schema, auth providers and runtime version, adding
one self-contained query bundle. Post-deploy hashes/contracts/schema/active
indexes matched. Only the approved prepared indexes were removed:
- mobilePilotScopes.by_subject
- mobilePilotScopes.by_subject_and_match
- matchEvents.by_match_and_target_and_type

2P23BS remained scheduled 0-0 and its public read fingerprint unchanged. No
match actions, scope grants, role changes, env writes or mobile writes were run.
The installed iPhone build 5 has login/diagnostics enabled; normal reads/writes
are disabled. True native identity verification requires the owner to tap its
manual diagnostic button; a synthetic JWT/admin record read is not that proof.

## Maintenance / rollback

Keep this source when planning future production releases. Do not overwrite it
with pre-patch main. This PR is source preservation/review, not permission to
merge/deploy the full pilot. Standard builds may rebundle other modules; this
controlled release did not. Any removal of the diagnostic query needs separate
approval; preserve all unrelated modules, schema, indexes, match data and auth.
The full pilot's future diagnose endpoint must explicitly review the temporary
owner/match pins instead of accidentally widening this production test access.

Verification for this minimal source PR: 832 tests across 110 files pass, including
nine focused endpoint guard tests; root/Convex TypeScript and targeted lint pass.
The separate real-local release harness passes seven integration checks, including
signed JWT behavior and source/schema/index invariants. The related iPhone suite
has 172 passes and one optional localhost transport skip; 20 build guards pass.
