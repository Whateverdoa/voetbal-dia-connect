# Voetbal DIA Connect

Next.js and Convex application for youth-football administration, team and match
preparation, live match control, referee workflows, and public results.

This repository is also the backend source of truth for the planned universal
iPhone/iPad application and its versioned `/v1/mobile` adapter.

## Database Safety

The existing Convex production deployment serves the current live application.
Do not use it for development or staging of the new Apple app.

- Create a separate Convex project/deployment for the new app.
- Reuse the version-controlled schema and functions, not the physical live data.
- Seed synthetic data or use an explicitly sanitized snapshot.
- Never copy production `.env.local`, PINs, youth data, contact data, or deploy
  keys into the new environment.
- Verify `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` before running any
  schema push, import, seed, cron, or deployment command.

The confirmed new-app development target is
`mike-ten-hoonte/jeugdvoetbal-apple-dev`, deployment `brainy-buffalo-707`. The
owner authenticated Convex through the `Whateverdoa` GitHub account. Run
`npm run verify:new-app-target` before new-app seed or migration commands.

If `CONVEX_DEPLOYMENT` is unset, `convex dev` asks which project to configure.
For new-app work, create/select the isolated project and never select the current
live project.

## Sportlink Client ID

The fixtures and roster imports already read `SPORTLINK_CLIENT_ID` from the
server-side Convex environment. Never put this value in Swift, a
`NEXT_PUBLIC_*` variable, Git, or browser code.

- Existing live remains the scheduled Sportlink importer during new-app
  development.
- Local new-app environments use seed or sanitized snapshot data.
- Use a separate Sportlink test client ID for staging when available.
- If only the live club client ID exists, use it only in an approved controlled
  staging import window and avoid permanent duplicate polling.
- Exactly one production deployment owns scheduled imports for a club.

## Local Setup

Requirements: supported Node.js/npm versions and access to the intended isolated
Convex project.

```bash
npm ci
npx convex dev --until-success
npm run verify:new-app-target
npm run dev:frontend
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

Running `npm run dev` starts both the frontend and `convex dev`; use it only
after the local deployment target has been verified.

After the existing synthetic DIA seed has been created, add the referee-first
M1 records with:

```bash
npm run seed:new-app
```

This command refuses the protected project, the wrong Convex team, production
deployment kinds, and any local `SPORTLINK_CLIENT_ID`.

Before the first schema push, configure the matching Clerk development issuer
with the guarded workflow documented in `docs/config.md`. It verifies the
`pk_test_` key/issuer pair and the isolated Convex target before changing the
development deployment.

After the reviewed schema/functions have been pushed and both synthetic seeds
exist, run the backend portion of the M2 live exit check with:

```bash
npm run verify:m2-live
```

The verifier is restricted to the configured cloud development deployment. It
uses Convex CLI test identities to exercise the public role-protected functions,
checks that acceptance does not assign, races two planner confirmations, and
requires one assignment plus the expected audit events. It does not replace a
real Clerk sign-in or the physical-device APNs test.

## Quality Checks

```bash
npx tsc --noEmit
npx tsc -p convex/tsconfig.json --noEmit
npm run test:run
npm run lint
npm run build
npm audit
```

The build script deploys Convex only when both `CONVEX_DEPLOY_KEY` is present
and `VERCEL_ENV=production`. Local and preview builds run Next.js only.

## Repository Roles

- Convex schema, queries, mutations, schedulers, imports, and audit behavior.
- Responsive Next.js dashboards for admin, planner, coach, and referee.
- Referee matching and assignment domain.
- Planned stable mobile API DTOs and commands under `/v1/mobile`.
- Shared identity and authorization policy.

The SwiftUI client and cross-repository product specifications live in
[`Whateverdoa/Jeugdvoetbal-app`](https://github.com/Whateverdoa/Jeugdvoetbal-app).
