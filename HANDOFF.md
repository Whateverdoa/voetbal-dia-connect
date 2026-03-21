# HANDOFF.md — DIA Live (voetbal-dia-connect)

## Product
DIA Live is een realtime jeugdvoetbal-app voor DIA.

- Coaches beheren wedstrijden via hun telefoon.
- Scheidsrechters bedienen klok en score op toegewezen wedstrijden.
- Admin beheert teams, coaches, scheidsrechters en wedstrijdtoewijzing.
- Publiek volgt wedstrijden via een publieke code.

Repo: Next.js 16 + Convex + Clerk.

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript strict
- Convex realtime backend
- Clerk voor identity
- Tailwind CSS 4
- Vitest + RTL

## Deployment (Vercel + Convex)

**Standaardworkflow:** wijzigingen op een **feature branch** → **Pull Request** op GitHub → review/CI → **merge naar `main`**.  
Production-deploy op Vercel wordt getriggerd door die merge (push naar `main`). Geen structurele directe pushes naar `main` zonder PR (alleen afgesproken hotfixes).

**Technische details** (build script, `CONVEX_DEPLOY_KEY` alleen Production, preview vs production, env-vars): zie **`.cursor/agents/vercel-deployer.md`**. Daar ook gebruiken vóór release of bij mislukte builds.

## Routes
- `/`: homepage / publieke ingang
- `/live/[code]`: publieke live-weergave
- `/standen`: scoreboard
- `/team/[slug]/history`: teamhistorie
- `/sign-in`: Clerk gateway
- `/coach`: coachdashboard op basis van Clerk + rol
- `/coach/new`: nieuwe wedstrijd
- `/coach/match/[id]`: coach match control
- `/scheidsrechter`: scheidsrechterdashboard
- `/scheidsrechter/match/[id]`: scheidsrechter controls
- `/admin`: admin workspace met assignment board + beheer

### Admin-werkplek (desktop)
- De layout gebruikt een **brede container** (ongeveer tot **1600px**) op groot scherm, zodat toewijzingstabel en filters meer horizontale ruimte hebben (Airtable-achtig). Op mobiel blijft het volle breedte met scroll waar nodig.

## Communicatie: coaches (eerste inlog)

**In deze repo:** er is **geen** automatische welkomstmail vanuit de app; dat regelt de **club/TC** (bijv. via eigen mail of WhatsApp).

**Aanbevolen om klaar te zetten richting coaches:**
- Korte stappen: open de **productie-URL** -> **Inloggen** (globale balk) -> het **zelfde e-mailadres** gebruiken als in het coach-/teamoverzicht bij DIA.
- Eerste keer: na Clerk-login kan **`/onboarding/rol`** verschijnen -- doorlopen tot het **Coach**-dashboard bereikbaar is (via `ClerkNav`: Coach).
- Geen toegang: admin/TC controleert of het adres in Convex staat als coach met `userAccess` (rol `coach` + `coachId`); bootstrap-admins via `CLERK_BOOTSTRAP_ADMIN_EMAILS` zijn alleen voor admins.
- Optioneel in de mail: directe link naar `/sign-in` of alleen home (nav heeft altijd Inloggen).

## Auth Model
Runtime-auth is nu `Clerk + userAccess`.

### Bron van waarheid
`convex/schema.ts` bevat `userAccess` met:
- `email`
- `roles: ("admin" | "coach" | "referee")[]`
- `coachId?`
- `refereeId?`
- `active`
- `source`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

### Semantiek
- `admin` mag bestaan zonder `coachId` of `refereeId`
- `coach` vereist `coachId`
- `referee` vereist `refereeId`
- een e-mailadres heeft exact een access-record
- `source` en `lastSyncedAt` zijn auditvelden, niet leidend voor runtime-auth

### Runtime checks
Belangrijkste helpers staan in `convex/lib/userAccess.ts`:
- `requireUserAccess()`
- `requireRole()`
- `requireCoachForMatch()`
- `requireRefereeForMatch()`
- `upsertUserAccess()`

### Bootstrap en herstel
- `CLERK_BOOTSTRAP_ADMIN_EMAILS` wordt alleen gebruikt voor bootstrap/backfill
- interne herstel-mutatie: `internal.adminRecovery.grantAdminAccess`
- import/seed-operaties kunnen via `CONVEX_OPS_SECRET`

## Data Model
Belangrijkste tabellen:
- `clubs`
- `teams`
- `userAccess`
- `coaches`
- `referees`
- `players`
- `matches`
- `matchPlayers`
- `matchEvents`
- `matchCommandDedupes`

### Match ownership
Wedstrijden horen nu functioneel bij een coach via `matches.coachId`.

### Tijdelijke migratiebrug
De schema-definitie bevat nog legacy velden voor cutover/backfill:
- `coaches.pin`
- `referees.pin`
- `matches.coachPin`

Deze velden zijn niet meer bedoeld als runtime-auth pad. Ze bestaan nog om bestaande data veilig naar `userAccess` en `coachId` te migreren.

## Belangrijke Backend Modules
- `convex/adminAuth.ts`: admin auth via `requireRole(ctx, "admin")`
- `convex/lib/userAccess.ts`: centrale access-laag
- `convex/adminAccessManagement.ts`: backfill + recovery
- `convex/clerkLink.ts`: synchroniseert Clerk identity met coach/referee records
- `convex/adminMatches.ts`: admin CRUD + assignment board dataset
- `convex/coachQueries.ts`: coachdashboard op basis van identity
- `convex/refereeQueries.ts`: referee dashboard op basis van identity
- `convex/pinHelpers.ts`: compat-laag; gebruikt geen PIN-verificatie meer voor runtime-auth

## Frontend Status
- Admin gebruikt geen PIN UI meer.
- Coach- en scheidsrechterpagina's zijn identity-based.
- `SignInGateway` stuurt naar `/admin`.
- Admin heeft een assignment board met team-tabs, speeldag-tabs en side panel.
- Oude keypad/PIN session UI is verwijderd uit `src/components` en `src/lib`.

## Verificatie
Gevalideerd op 14 maart 2026:
- `npx convex codegen` ✅
- `npm run test:run` ✅ `393/393`

## Dev Commands
```bash
npm run dev
npm run dev:restart
npm run dev:frontend
npm run dev:backend
npm run build
npm run lint
npm run test:run
npx convex dev
npx convex codegen
```

## Import / Seed
### Seed
```bash
npx convex run seed:init
```

### Players import
```bash
node scripts/import-players.mjs path/to/players.csv --dry-run
node scripts/import-players.mjs path/to/players.csv --ops-secret <CONVEX_OPS_SECRET>
```

### Matches import
```bash
node scripts/import-matches.mjs path/to/matches.csv --dry-run
node scripts/import-matches.mjs path/to/matches.csv --ops-secret <CONVEX_OPS_SECRET> --coach-email coach@dia.nl
```

## Cutover Checklist
### 1. Preflight
- Clerk keys staan correct in omgeving
- alle coaches en scheidsrechters hebben een uniek e-mailadres
- minimaal een admin-email staat in `userAccess` of in `CLERK_BOOTSTRAP_ADMIN_EMAILS`
- `CONVEX_OPS_SECRET` is beschikbaar voor seed/import/noodherstel
- snapshot/backup van productie is gemaakt

### 2. Migrate
- deploy schema + backend
- run `adminAccessManagement.backfillUserAccess`
- controleer dat bootstrap admins, coaches en referees `userAccess` records hebben
- controleer dat wedstrijden zonder `coachId` zijn bijgewerkt waar mogelijk
- gebruik alleen bij noodgeval `internal.adminRecovery.grantAdminAccess`

### 3. Verify
- admin kan inloggen en `/admin` openen
- coach ziet alleen eigen teams/wedstrijden
- scheidsrechter ziet alleen toegewezen wedstrijden
- publieke `/live/[code]` flow werkt nog
- assignment board werkt: filteren, paneel openen, scheidsrechter toewijzen
- imports werken met `opsSecret` en `coachEmail`

### 4. Rollback
- herstel admin-toegang via `internal.adminRecovery.grantAdminAccess`
- restore vorige deployment of snapshot indien nodig
- laat legacy bridge-velden intact tot de data correct is
- fix data, run backfill opnieuw, verifieer opnieuw

## Openstaande Bridge Items
Deze repo is runtime-pinloos, maar niet volledig schema-pinloos totdat de cutover en data cleanup klaar zijn.

Concreet nog aanwezig:
- legacy velden in `convex/schema.ts`
- backfill van `match.coachPin -> match.coachId` in `convex/adminAccessManagement.ts`
- compat-strip van `coachPin` in `convex/matches.ts`

Als de data volledig gemigreerd is, kunnen die bridge-paden verwijderd worden in een laatste cleanup-branch.

## Toekomst: Speelweek-model voor admin planning
Voor nu werkt adminfiltering op `matches.scheduledAt` met runtime-afgeleide week/dag.
Als planning en schaal belangrijker worden, pas dan dit model toe:

- Voeg aan `matches` toe:
  - `playWeekKey` (bijv. `2026-W12`)
  - `playWeekStart` (ISO-datum van maandag)
  - `dayKey` (`monday` t/m `sunday`)
- Bereken deze velden server-side in Convex mutations bij create/update/import.
- Voeg indexen toe:
  - `by_team_and_week` (`teamId`, `playWeekKey`)
  - `by_week` (`playWeekKey`)
  - `by_team_and_startsAt` (`teamId`, `scheduledAt`)
- Houd `scheduledAt` als bron van waarheid en gebruik `playWeek*`/`dayKey` voor query-performance en consistente week-UI.
- Overweeg een aparte assignments-collectie alleen als audit/history van toewijzingen nodig is; anders blijft embedded op `matches` voldoende.

## Club-/teamlogo's (geimplementeerd)

**Schema:** `clubs.logoUrl` en `teams.logoUrl` -- optioneel `string`, backwards-compatible.

**Resolve-volgorde:** `team.logoUrl ?? club.logoUrl ?? null` -- via `src/lib/logos.ts`.

**Opslag:** externe URL's (geen upload/storage). Fallback: initialen-cirkel bij ontbrekende of broken URL.

**Admin:** TeamsTab toont logo-preview en een inline URL-editor (knop met image-icoon).

**Publiek:** logo's zichtbaar in:
- `MatchBrowser` (MatchRow) -- links van teamnaam
- Live header (`LiveMatch.tsx`) -- boven het DIA-team

**Component:** `src/components/TeamLogo.tsx` -- `<img>` met `onError` fallback naar initialen, 3 maten (sm/md/lg).

**Nog open (aparte branch/PR):**
- Backfill-script: uit `wedstrijden.thuisteamLogo` -> `teams.logoUrl` via naam-matching
- Import-uitbreiding: nieuwe wedstrijden optioneel `teams` patchen
- Tegenstander-logo: alleen eigen DIA-team heeft nu logo; externe clubs nog niet
- Upload naar Convex storage: als hotlinked URL's onbetrouwbaar worden
