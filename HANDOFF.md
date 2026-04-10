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

### Afstemming main ↔ Vercel (controle)

- **Frontend (Vercel)** volgt doorgaans de **tip van `main`** na merge/push. Laatste **Production**-deployment in GitHub is gekoppeld aan commit **`adec0d2`** (merge o.a. PR #31: speeltijd-presets, einde-wedstrijd-bevestiging, sync-`requireAdminOrOps`, HANDOFF-backlog). Controleer actuele production status in het Vercel-dashboard of bijv. `gh api repos/Whateverdoa/voetbal-dia-connect/deployments`.
- **Convex-backend (productie)** is **niet** hetzelfde als een Vercel-build: schema/mutaties gaan naar het Convex-project via `npx convex deploy` (of CI) naar de juiste deployment. Na schema-wijzigingen: verifiëren dat **productie-Convex** dezelfde versie draait als de code verwacht.
- **Lokale repo:** als er nog **niet-gecommitte** wijzigingen staan (bijv. import team-slug mapping in `syncWedstrijdenToMatches.ts`), staan die **niet** op `main` en dus **niet** op Vercel tot commit + push + nieuwe deploy.

## Routes
- `/`: homepage / publieke ingang
- `/help`, `/help/coach`, `/help/scheidsrechter`, `/help/admin`, `/help/publiek`, `/help/club-en-rollen`: publieke uitleg (geen login)
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
- **UX / demo:** er zitten nog **vreemde hoekjes** vooral rond **filters** en gerelateerde flows (ontdekbaarheid, defaults, feedback). *Prioriteit:* **polish vóór demo’s** aan mensen buiten het kernteam. Uitgewerkt stappenplan en overige open punten staan in **`docs/plans/product-backlog.md`**.

## Communicatie: coaches (eerste inlog)

**In deze repo:** er is **geen** automatische welkomstmail vanuit de app; dat regelt de **club/TC** (bijv. via eigen mail of WhatsApp).

**Aanbevolen om klaar te zetten richting coaches:**
- Korte stappen: open de **productie-URL** -> **Inloggen** (globale balk) -> het **zelfde e-mailadres** gebruiken als in het coach-/teamoverzicht bij DIA.
- Eerste keer: na Clerk-login kan **`/onboarding/rol`** verschijnen -- doorlopen tot het **Coach**-dashboard bereikbaar is (via `ClerkNav`: Coach).
- Geen toegang: admin/TC controleert of het adres in Convex staat als coach met `userAccess` (rol `coach` + `coachId`); bootstrap-admins via `CLERK_BOOTSTRAP_ADMIN_EMAILS` zijn alleen voor admins.
- Optioneel in de mail: directe link naar `/sign-in` of alleen home (nav heeft altijd Inloggen).

## Auth Model
Runtime-auth is nu `Clerk + userAccess`.

Uitgebreid overzicht voor ontwikkelaars (actoren, merge-gedrag, publieke privacy): **`docs/actors-and-access.md`**. Clerk-metadata bepaalt routes; Convex **`resolveRuntimeUserAccess`** (`convex/lib/userAccess.ts`) merge’t het `userAccess`-document met **afgeleide** rollen uit `coaches` / `referees` (zelfde e-mail als Clerk) en bootstrap-adminlijst — niet alleen de snapshot-tabel.

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
- `matches` (o.a. optioneel **`regulationDurationMinutes`** voor speelduur per wedstrijdvorm; validatie in `convex/lib/matchTiming.ts`)
- `matchPlayers`
- `matchEvents`
- `matchCommandDedupes`

### Match ownership
Wedstrijden horen nu functioneel bij een coach via `matches.coachId`.

### Wedstrijdleiding (wedstrijdleider)
Als er **meerdere coaches** bij hetzelfde team op een wedstrijd kunnen, bepaalt **`matches.leadCoachId`** wie de **wedstrijdleider** is voor die wedstrijd.

- **Claim / release:** **`convex/matchLeadActions.ts`** — `claimMatchLead`, `releaseMatchLead` (alleen coaches van het team).
- **Rechten:** de wedstrijdleider krijgt o.a. **wissels uitvoeren** (server check: `verifyIsMatchLead` in **`convex/pinHelpers.ts`**, gebruikt o.a. in **`convex/matchEvents.ts`**). Zonder toegewezen scheidsrechter kan de wedstrijdleider ook de **klok** bedienen (zie `getForCoach`: `canControlClock`).
- **UI:** o.a. **`MatchLeadBadge`** (`src/components/match/MatchLeadBadge.tsx`); coach-matchdata bevat `leadCoachId`, `leadCoachName`, `hasLead`, `isCurrentCoachLead` (zie **`convex/matches.ts`** `getForCoach`).

Geen aparte rol in `userAccess`: het blijft **coach**, met per-wedstrijd **lead** op de match-doc.

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
- **Wedstrijdvorm / speeltijd:** presets (4×15, 2×30, 2×45) in coach- en adminflows; klok gebruikt `regulationDurationMinutes` (default 60). **Einde wedstrijd:** tweestapsbevestiging in coach- en scheidsrechterklok (`MatchControls`, `RefereeClockControls`). **Wedstrijdgegevens:** korte “opgeslagen”-feedback in `MatchSettingsEdit`.

## Verificatie
Laatste beknopte check **april 2026** (lokaal):

- `npm run build` — gebruikelijk voor release-candidate.
- `npx vitest run` — **412** tests totaal; **408 geslaagd**, **4 gefaald** (o.a. `SignInGateway.test.tsx`, `TeamsTab.test.tsx` — nader herstellen of mocks bijwerken). Geen vaste garantie dat CI groen is zonder deze fixes.
- `npm run test:run` — voert ook **pin-guard** uit; die kan in deze repo falen op verwijzingen naar legacy PIN in code (`check-no-pin-deps`). Gebruik `npx vitest run` als je alleen testlogica wilt draaien.

`npx convex codegen` na schema-wijzigingen blijven verplicht voor type-sync.

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

### Wedstrijden klaarzetten voor de club
Belangrijk onderscheid:
- `players` per team = vaste teamlijst van de club
- `matchPlayers` = selectie voor die ene wedstrijd

Gevolg:
- spelers die alleen in `players` staan zijn nog niet automatisch zichtbaar in een coach-wedstrijd
- een coach ziet in een wedstrijd alleen spelers die aan `matchPlayers` voor die wedstrijd gekoppeld zijn

Adminflow:
- bij handmatig aanmaken van een wedstrijd moet de wedstrijdselectie expliciet worden aangevinkt
- in de regel: alle actieve teamspelers aanvinken, tenzij bewust een kleinere wedstrijdselectie wordt gekozen
- niet aannemen dat `op teamlijst staan` genoeg is; ze moeten in de wedstrijdselectie zitten

Importflow voor VoetbalAssist/KNVB:
- `import/importWedstrijden:fetchAndImport` haalt de DIA-wedstrijden op uit VoetbalAssist
- `import/syncWedstrijdenToMatches:syncAll` zet die om naar `matches` — **auth:** `requireAdminOrOps` (ingelogde admin in dashboard óf CLI met `opsSecret` gelijk aan `CONVEX_OPS_SECRET`)
- de sync normaliseert een aantal DIA-importnamen naar bestaande app-teams, o.a. `35+1 -> 35-1`, `VR30+1 -> 30-1`, `1 (zon) -> zo1`, `VR1 (zon) -> vr1`, `O23-1 -> jo23-1`, `JO13-2JM -> jo13-2`, `G Team -> g-team`
- bewust niet automatisch gemapt: ambigue bronvarianten zoals kale `JO10` of `JO12`; die vragen handmatige teamkeuze of extra mapping
- nieuwe niet-gespeelde wedstrijden krijgen tijdens de sync automatisch `matchPlayers` voor alle actieve teamspelers
- bestaande wedstrijden zonder `matchPlayers` kunnen tijdens dezelfde sync een roster-backfill krijgen zolang ze nog niet gespeeld zijn
- een geïmporteerde uitslag mag een bestaande wedstrijd alleen naar `finished` zetten als er lokaal nog geen uitslag/stand is vastgelegd
- als er lokaal al een score of afgeronde uitslag bestaat, wordt die match overgeslagen (`skippedExistingWithResult`)

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

## Issues & operationele backlog

Open punten uit gebruik / data (geen volledige specs; vastgelegd voor opvolging).

### Issue: wedstrijd-bank en spelers die “een keer” meespeelden

**Symptoom:** Wie bij **aftrap** op de **bank** staat, zit al in **`matchPlayers`** (create/sync-backfill/pregame). Gasten of eenmaligen met **`active: true`** op het team kunnen via brede selectie of sync weer in elke nieuwe wedstrijd terechtkomen.

**Richting:** **`active: false`** voor wie niet wekelijks in de selectie hoort; optioneel latere productregels (shirtnummer, kern-vlag). Zie ook *Wedstrijden klaarzetten* hierboven.

### Issue: admin werkplek — filters en overige UX-frictie

**Symptoom:** Filter- en zoekgedrag (en aanverwante kleine interacties) voelt op sommige plekken nog niet **intuïtief**; dat hindert vooral als je **`/admin`** aan iemand wilt **laten zien**.

**Status:** hoog **prioriteit demo**; concrete acties in **`docs/plans/product-backlog.md`** (§ Admin UX).

### Issue: admin mobiel — naamveld spelers (portret)

**Symptoom:** Bij spelers beheren in **`/admin`**: na tik op een speler wordt het **naamveld** in **portret** onbruikbaar klein; in **landschap** lijkt het OK.

**Status:** *future to-do* — layout in o.a. `PlayersTab`, testen op fysiek device. Zie ook **`docs/plans/product-backlog.md`**.

## Future To-Do's (product)

Items voor later traject (o.a. na “first sell” / uitbreiding live-ervaring). *Status: backlog — nog niet geprioriteerd of ingepland tenzij anders vermeld.*

### Bestaande bullets (behouden)

- **Opstellingenlijst op de website** — De lineup-/opstellingsweergave verder uitbreiden op de site (coach en/of publiek): rijkere weergave, evt. print of vaste formats, afstemming met `matchPlayers` en beschikbare posities.
- **Live veldsituatie** — In **`/live/[code]`** de **opstelling op het veld** tonen (visueel veld + spelersposities), zodat toeschouwers de actuele veldsituatie herkennen. Sluit aan bij bestaande data zoals `matches.formationId`, `pitchType`, `matchPlayers.fieldSlotIndex` en positievelden op spelers.
- **Meer tactische opstellingen (formatie-templates)** — Het aanbod **vaste formaties** in de coach- (en evt. admin-)UI uitbreiden: keuzelijst / templates (bijv. extra systemen naast wat er nu is), consistent met `matches.formationId` en het kiezen/plaatsen van spelers op het veld. *Niet* hetzelfde als alleen “lijst op de website tonen”; dit gaat om **keuze en beschikbaarheid** van formaties in de app.

### Aanvulling (backlog voice note → gestructureerd)

1. **Spelersschilden met foto’s** — Spelerscards kunnen een foto tonen (avatar/schild-stijl). Prioriteit: **foto uploaden per speler (admin-flow)**; tonen op **veldoverzicht en bank**; **fallback** initialen of rugnummer (vergelijkbaar patroon als `TeamLogo` / initialen nu al voor logo’s).
2. **Veldlayout — plat bovenaanzicht** — Het veld is nu **perspectivisch**; gewenst: terug naar een **plat, vlak bovenaanzicht** (traditioneel tactiekbord). *Dit is een UI-designbeslissing, geen datawijziging.* **Volgende stap:** afstemmen met Roel over de gewenste layout vóór implementatie (sluit aan bij “live veldsituatie” hierboven, maar specificeert de weergave-richting).
3. **Wedstrijdplan vooraf (pre-match planning)** — Nu vooral wissels **tijdens** de wedstrijd. Gewenst: **vooraf** een vollediger plan: **opstelling per kwart**, **geplande wissels** (uit/in, moment/timing), bewerkbaar **tijdens** de wedstrijd; plan = **startpunt**, geen dwangbuis. **Technisch (richting):** een **draft**-volgorde die **los staat** van de **append-only** `matchEvents` tot de coach een geplande actie **bevestigt**; uitgevoerde acties blijven gewone events. *Complex — verdient een apart **WAT+HOE**-document vóór bouwen.*
4. **Backlog & planning** — Volledige uitwerking van open punten staat in **`docs/plans/product-backlog.md`**. Optioneel later: koppeling aan GitHub Projects, Linear, enz. zodat dit document vooral “wat en waarom” blijft en tickets de status bijhouden.

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
- `MatchBrowser` -- thuis/uit met `teamLogoUrl` / `clubLogoUrl` / `opponentLogoUrl`
- Live header (`LiveMatch.tsx`) -- beide teams

**Component:** `src/components/TeamLogo.tsx` -- `<img>` met `onError` fallback naar initialen; vierkant met afgeronde hoeken (`rounded-md`, `object-contain`).

**Lokale logo's:** `public/logos/*.png` + mapping in `convex/lib/localLogos.ts` en `src/lib/logos.ts`; `matches.opponentLogoUrl` kan naar `/logos/...` wijzen.

**Coach / scheidsrechter / admin:** logo's via dezelfde velden (`teamLogoUrl`, `clubLogoUrl`, `opponentLogoUrl`). Convex: `convex/lib/matchLogoFields.ts` + verrijking in `verifyCoachPin`, `getForCoach`, `getForReferee`, `getMatchesForReferee`, `listAllMatches`, `listAssignmentBoard`. UI: o.a. `MatchVersusLogos`, `ScoreDisplay` (coach), `RefereeMatchList` + scheidsrechter match-header, admin `AssignmentBoardTable` / `AssignmentBoardPanel` / `MatchRow`.

Plan (referentie): **`docs/plans/coach_scheids_admin_logos.plan.md`**.

**Optioneel later:** upload naar Convex storage als statische `/logos/` niet genoeg is.


