This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Referee Pilot: Web And Native Bridge (Draft)

The opt-in `refereeRegistration:getMatch/timeline/command` web endpoints share
read projections and the transaction core with `mobileReferee`. Web writes
additionally require `WEB_REFEREE_PILOT_WRITES_ENABLED=true` and an enrolled
match policy v1; the default is closed. Mobile still requires its separate
server flag, exact authenticated-subject/match/team scope and expiry. No flag
or scope is enabled by adding these modules. Do not deploy the older example
backend or import its parallel match tables.

Pilot web controls retain a pending command's exact correlation ID, revision,
account binding and payload when acknowledgement is uncertain. A saved goal
precedes optional player selection. Public clocks receive only elapsed time,
running anchor and limit; private actor/audit metadata is not exposed. Legacy
non-pilot clock behavior remains unchanged.

Local verification on 2026-10-15: 908 tests pass in 118 files, app and Convex
TypeScript pass, PIN dependency guard passes. New-component lint passes; wider
changed-file lint retains two existing LiveMatch render-ref warnings. This is
local fixture/simulator evidence, not a deployment or field-test acceptance.

Release remains blocked on disciplinary/playing-time integration, remaining
import/archive/claim writer audit, isolated real deployment and browser/native
acceptance, and separate owner-approved live rollout. Current draft must not be
used to enable test scopes or switch a phone to production without those gates.
