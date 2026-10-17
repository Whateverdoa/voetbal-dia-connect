# HANDOFF.md — DIA Live (voetbal-dia-connect)

## Afgeschermde iPhone-integratie: tussenstand (15 oktober 2026)

Dit is een **draft, niet activeerbaar als live-proef**. Webbaseline-PR #69 is
gemerged; deze branch bevat ook de actuele main inclusief #70. Mobiele writes
blijven standaard uit: servervlag `MOBILE_REFEREE_WRITES_ENABLED` en de exacte
scope moeten beide expliciet schrijven toestaan, naast de matchpolicy en
actuele registratorrechten. Geen servervlag of live scope ingesteld. Geen
productiedeployment, scope-activering, matchmigratie of toestelinstallatie gedaan.

Lokaal gerealiseerd:
- `mobileReferee`: session/listMatches/getMatch/timeline/command; standaard
  alleen-lezen, echte geverifieerde Clerk-identiteit, bestaande rechten en scopes.
- Scopes standaard leeg, expliciet eindig en intern configureerbaar. Een
  verouderde vervaltaak kan een verlengde scope niet intrekken.
- Optioneel `matches.refereePolicy`: een klok op de bestaande wedstrijd, geen
  tweede match-state/event-table. Nog geen activatiefunctie beschikbaar.
- Hergebruik van de begrensde klok; interne generatiegebonden controle stopt op
  het berekende grensmoment en schrijft een systeemevent zonder gebruikersactor.
- Pure gedeelde klokcommando-regels: echte pauzes, absolute marge, expliciete
  beoordeling van lange onderbrekingen, geen automatische volgende periode.
  De transactionele command-API gebruikt dezelfde regels en voorspelde
  klokcontroleversie als de mobiele query bij vertraagde geplande verwerking.
- Gedeelde officiële registratiekern: goals, exacte append-only correcties,
  kaarten/incidenten met optionele identiteit, latere annotatie en gedeeltelijke
  scorer/assistverrijking. Servercontrole op selectie, beschikbaarheid en zijde;
  expliciete eigen doelpunten behouden. Geen admin-registratiebypass.
- Receipts verwijzen naar het exacte command-event. Identieke retries geven
  dezelfde bevestiging; andere inhoud/actor onder dezelfde sleutel wordt
  geweigerd. Rechten worden ook bij een retry opnieuw gecontroleerd.
- De mobiele tijdlijn markeert gecorrigeerde goals en projecteert latere
  kaart-/incidentgegevens zonder het oorspronkelijke event te wijzigen.
- Oude incompatibele klok/score/kaart/undo/verrijkingsroutes en directe
  adminwijziging/verwijdering weigeren wedstrijden met deze policy. Oude
  auto-resume en pauze-opruiming slaan ze over. Coachwissels blijven gescheiden.
- `refereeDuty.appointCoach`: bestaande actieve adminrechten voor aanwijzing;
  eigen-teamcoach alleen zelf bij lege officiële taak. Versie, vaste sleutel,
  inhoudscontrole, bevestiging en append-only audit. Een toegewezen inactieve
  scheidsrechter geeft niet automatisch toestemming voor coachfallback.

Verificatie: **885 tests in 114 bestanden groen**, inclusief 15 nieuwe
registratiekern-tests en negen aanvullende mobiele boundary-tests. TypeScript,
gerichte ESLint, PIN-guard en diffcontrole slagen. Daarbij: negen tijd/margecombinaties, openen na
600 minuten, verouderde taken, lange pauze met opnemen/afwijzen, absolute marge,
gelijktijdige coachclaims, retries, ingetrokken toegang en oude write-routes.
Dit is lokale convex-test-verificatie, geen gedeployde backend of fysieke proef.
Een eerdere run had 885 geslaagde assertions maar een onbehandelde late
React-update uit twee bestaande wisseltests. Die tests wachten nu ook op het
einde van de mockactie; geen assertion verwijderd. De latere volledige run is
schoon. Beide logs zijn lokaal bewaard onder `.artifacts/`.

Nog verplicht voordat deze draft kan worden gemerged/geactiveerd:
1. Nieuwe command-API integreren met bestaande kaart-/disciplineregels en
   speler-speeltijd. De huidige kern is nog geen volledige coach/discipline-app.
2. Webbediening en alle klok/read/player-time projections aansluiten; overige
   import/archief/claimroutes auditen. De huidige blokkades zijn geen vervanging
   voor bruikbare nieuwe webbediening.
3. Alle tien nieuwe contractgates op de nieuwe opt-in routes laten slagen.
4. Native adapter, apart live-testtarget/cache/outbox en API/capabilitybewaking;
   volledige Swift unit/UI-regressie en geïsoleerde end-to-end test.
5. Exacte Clerk-subject/JWT-claims en teamscope voor mobiel bevestigen; review en afzonderlijke
   deploymentgoedkeuring; pas daarna beperkte scope en toestelinstallatie.

De eigenaar heeft code `Y25MDQ` aangeboden. Alleen-lezen bevestigd: bestaande
match `jn76f7jpdzjq60dm6c8d2bgjf58gbqfa`, TEST Sandbox tegen Nac test,
gepland op 16 oktober om 09:00 Europe/Amsterdam, 0-0, twee perioden.
Na de eigenaarwijziging staat Mike als coach en scheidsrechter op het adminbord.
De ingelogde eigenaar heeft adminwerkplektoegang; zijn accountadres komt overeen
met het actieve scheidsrechterrecord en het coachrecord met TEST Sandbox-scope.
Coachfallback is niet van toepassing zolang die scheidsrechter toegewezen is.
Geen toewijzing of rol door deze agent veranderd. Dit is geen club- of teambrede
toestemming en geen mobiele scope-activering. Privé-identifiers/JWTs niet gekopieerd.
Productielogs zijn met de huidige lokale Convex-accounttoegang niet uitleesbaar.

## Webtestbaseline voor native integratie (15 oktober 2026)

Afzonderlijke herstelbranch vanaf productiecommit `745598b`. De 21 bestaande
testfouten zijn hersteld zonder assertions te verwijderen: veld/bank-kaarten
hebben stabiele speleridentificatie, periodeknoppen worden binnen Planperiode
gezocht en de lijsttest controleert de opgeslagen speler-ID's en volledige
mutation-payload. Naam en rugnummer blijven afzonderlijk zichtbaar.

Interactieve veld- en bankkaarten ondersteunen Enter/Spatie en geven hun selectie
aan assistieve technologie door. Presentatiekaarten zijn geen toetsenbordknoppen.
Vier aanvullende regressietests bewaken identiteit, zichtbare labels en bediening.
Vormgeving, planning en bestaande mutation-routes zijn niet gewijzigd.

Verificatie: 823 tests in 109 bestanden groen (819 bestaand + 4 nieuw), TypeScript,
gerichte ESLint, PIN-guard en `git diff --check` slagen. Geen backend/schema,
productiegegevens, deploymentinstellingen, Android of native app gewijzigd.
De afzonderlijke afgeschermde backend en mobiele adapter zijn nog vervolgwerk;
deze testbaseline is geen goedkeuring om de iPhone naar productie om te zetten.

## Product
DIA Live is een realtime jeugdvoetbal-app voor DIA.

- Coaches beheren wedstrijden via hun telefoon.
- Scheidsrechters bedienen klok en score op toegewezen wedstrijden.
- Admin beheert teams, coaches, scheidsrechters en wedstrijdtoewijzing.
- Publiek volgt wedstrijden via een publieke code.

Repo: Next.js 16 + Convex + Clerk.

## Wisselplan hersteld (3 oktober 2026)

De coachinterface gebruikt dezelfde opgeslagen `substitutionPlans` op beide schermformaten:
- Telefoon: tab **Wisselplan** toont openstaande/afgeronde regels, biedt eenvoudig plannen via de spelerslijst (inclusief minuut/helft aanpassen) en laat de leidende coach tijdens de wedstrijd wissels uitvoeren.
- iPad/laptop: **Plannen** in het dashboard opent de wedstrijdkeuze en het grote planscherm; de wedstrijdtab bevat ook de volledige planner.
- `useDeviceSurface` gebruikt de kortste schermzijde (vanaf 600 px groot scherm), zodat een gedraaide telefoon de compacte bediening behoudt.

Dit is een gerichte terugplaatsing uit `f89f606`, zonder backendwijzigingen of de losse native iPhone-app. Behoud deze interface bij toekomstige integraties van het scheidsrechtersgedeelte.

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

- **Productiebasis vanaf herstel 26 september 2026:** `c4e5318` (19 september), met de ruitopstelling 1-3-4-3 en zonder de globale navigatie op `/live/*`. Het scheidsrechtersdeel is daarna gericht geïntegreerd op deze basis: coach en scheidsrechter zijn twee functies binnen dezelfde app en gebruiken dezelfde wedstrijdgegevens.
- **Frontend (Vercel)** hoort de tip van `main` te volgen. Controleer bij een release de actuele alias én commit; een Vercel-rollback alleen herstelt de backend niet.
- **Convex-backend (productie)** is **niet** hetzelfde als een Vercel-build: schema/mutaties gaan naar het Convex-project via `npx convex deploy` (of CI) naar de juiste deployment. Na schema-wijzigingen: verifiëren dat **productie-Convex** dezelfde versie draait als de code verwacht.
- **Lokale repo:** als er nog **niet-gecommitte** wijzigingen staan (bijv. import team-slug mapping in `syncWedstrijdenToMatches.ts`), staan die **niet** op `main` en dus **niet** op Vercel tot commit + push + nieuwe deploy.

### Gescheiden ontwikkelsporen

- **Productiewebsite:** `main`, Vercel `voetbal-dia-connect`, Convex `nautical-condor-5`.
- **Coach en scheidsrechter:** samen op `main`. De toegewezen scheidsrechter beheert klok, score en kaarten; de coach beheert opstelling/wissels en vult doelpunten aan. Zonder toegewezen scheidsrechter neemt de coach met wedstrijdleiding de officiële bediening over. Admin behoudt de backendoverride. De oude branch `feat/scheids-official-duty` blijft als historische bron bestaan en bevat daarnaast ongeïntegreerde portaal/import/planschermwijzigingen; merge die branch niet blind.
- **iPhone-app:** aparte repository `Whateverdoa/voetbal-iphone-26-27`, branch `codex/mobile-substitutions`. De bijbehorende backenduitbreiding staat hier op `codex/mobile-substitutions-dev` (PR #55), gericht op ontwikkelbackend `quaint-barracuda-871`. Deze uitbreidingen horen niet bij de herstelde productieversie.

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
- **Wedstrijdvorm / speeltijd:** presets (4×15, 2×30, 2×45) in coach- en adminflows; klok gebruikt `regulationDurationMinutes` (default 60). **Wedstrijdklok v2 (lokaal in ontwikkeling):** de hoofdklok loopt door tijdens geregistreerde onderbrekingen, spelersminuten bevriezen via `matchStoppages`, en rust/einde bewaren `frozenClockMs` zodat de klok niet naar `--:--` valt. Rust krijgt optioneel `halftimeStartedAt` / `scheduledBreakEndAt` met auto-hervatten via Convex scheduler. **Einde wedstrijd:** tweestapsbevestiging in coach- en scheidsrechterklok (`MatchControls`, `RefereeMatchConsole`). **Wedstrijdgegevens:** korte “opgeslagen”-feedback in `MatchSettingsEdit`.

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
- **Automatisch (productie-Convex):** twee crons, beiden target `import/weeklyUpdate:runIfMatchesEnded` met dezelfde gate (alleen draaien als er die dag minstens één wedstrijd in `matches` is met `scheduledAt + regulationDurationMinutes + 15 min` verstreken):
  - `weekend-results-hourly` — **elk uur op za + zo**, UTC `8–20` (≈ Amsterdam 10:00–22:00 CEST / 09:00–21:00 CET).
  - `midweek-evening-results` — **elk uur op ma–vr avond**, UTC `17–21` (≈ Amsterdam 19:00–23:00 CEST / 18:00–22:00 CET) voor doordeweekse avond- en inhaalwedstrijden.
  - Logs: Convex function logs → filter op `weeklyUpdate`.
- **Handmatig (alles in één keer):** `npm run results:update` (= `npx convex run import/weeklyUpdate:runNow`). Zonder ingelogde admin: JSON-args met `opsSecret` gelijk aan `CONVEX_OPS_SECRET` (zelfde patroon als `syncAll`).
- **Losse stappen (fallback):** `import/importWedstrijden:fetchAndImport` haalt de DIA-wedstrijden op uit VoetbalAssist; `import/syncWedstrijdenToMatches:syncAll` zet die om naar `matches` — **auth:** `requireAdminOrOps` (ingelogde admin in dashboard óf CLI met `opsSecret` gelijk aan `CONVEX_OPS_SECRET`)
- de sync normaliseert een aantal DIA-importnamen naar bestaande app-teams, o.a. `35+1 -> 35-1`, `VR30+1 -> 30-1`, `1 (zon) -> zo1`, `VR1 (zon) -> vr1`, `O23-1 -> jo23-1`, `O13-2JM / JO13-2JM -> jo13-2`, `G Team -> g-team`
- bewust niet automatisch gemapt: ambigue bronvarianten zoals kale `JO10` of `JO12`; die vragen handmatige teamkeuze of extra mapping
- nieuwe niet-gespeelde wedstrijden krijgen tijdens de sync automatisch `matchPlayers` voor alle actieve teamspelers
- bestaande wedstrijden zonder `matchPlayers` kunnen tijdens dezelfde sync een roster-backfill krijgen zolang ze nog niet gespeeld zijn
- een geïmporteerde uitslag mag een bestaande wedstrijd alleen naar `finished` zetten als er lokaal nog geen uitslag/stand is vastgelegd
- als er lokaal al een score of afgeronde uitslag bestaat, wordt die match overgeslagen (`skippedExistingWithResult`)
- **match-key is (team, tegenstander, Europe/Amsterdam-dag)** — niet ms-precisie. Zo matcht de sync nog steeds als DIA de aftrap-tijd verzette.
- **periodieke drift-checks (draaien mee in dezelfde cron):**
  - _tijd-drift:_ als DIA een nieuwe `datum_ms` doorgeeft voor een lokaal `scheduled`/`lineup` match, wordt `scheduledAt` bijgewerkt (`updatedScheduledAt` in de log). Bij finalisatie idem.
  - _afgelasting:_ als DIA `status: "afgelast"` rapporteert voor een bestaande lokale match (niet `live`/`finished`), wordt `cancelledAt` gezet (`cancelledMatches` in de log). Trekt DIA de afgelasting later terug, dan clearet de sync `cancelledAt` weer (`uncancelledMatches`).
  - _zichtbaarheid:_ Convex function logs → filter op `[sync] tijd-drift`, `[sync] afgelast`, `[sync] hervat`.

Toekomst — Sportlink als bron:
- Het swap-punt zit in `convex/import/resultsFetch.ts` (`fetchLatestResults`); de rest van de pipeline (`syncAllInternal`, `weeklyUpdate`, cron) blijft gelijk.
- Zie `docs/sportlink-integration.md` voor het uitgewerkte plan (dataformaat, endpoints, auth). De `wedstrijden`-stagingtabel en de statusset (`gespeeld | gepland | afgelast`) zijn Sportlink-compatibel gekozen.

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

## Tech-schulden (niet-urgent)

- **Next.js `middleware.ts` → `proxy.ts`** — Next.js 16 deprecatet de `middleware`-file-conventie; breaking in 17. Huidige file: `src/middleware.ts` (Clerk). Later: hernoemen naar `src/proxy.ts` en de export. Geen haast zolang we op Next 16 blijven.
- **Convex** — staat op `^1.44`. De upgrade uit PR #38 (`1.31.6` → `1.35.1`) is achterhaald; die PR is gesloten.

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

### JO13-pilot: presentatie, gamificatie, consent (Fable)

Actief implementatietraject voor selectieteams (presentatie, gamificatie, consent). **Hoofd-testteam nu: JO13-2** (`jo13-2`); andere teams later.

- **Masterplan:** [`docs/plans/fable-jo13-presentatie-gamificatie.plan.md`](docs/plans/fable-jo13-presentatie-gamificatie.plan.md)
- **Voortgang (live tracker):** [`docs/plans/fable-jo13-progress.md`](docs/plans/fable-jo13-progress.md) — Fable werkt taken af en logt in dit bestand.
- **Open roadmap (2026-08):** [`docs/plans/open-roadmap.md`](docs/plans/open-roadmap.md) — inventaris + tactiek-presentatie, selectie-teamportaal, heatmaps-future.

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


## Optional opponent scorer number (local only, 17 October)

The draft enrich_goal contract now accepts scorerNumber (integer 0-999) only
for an opponent-beneficiary normal goal, without scorerId/assistId. It appends
reportedNumber metadata on the exact goal; corrections, score and clock remain
unchanged. Projection retains latest supplied number per field and exposes
"Nr. N" without inventing a player ID. getMatch advertises the optional
opponentScorerNumberEnabled capability; older native APIs default it off.
All 911 tests pass, plus root/Convex TypeScript, changed-file ESLint and PIN guard.
The iOS branch prepares a separate default-closed Live Test target, not a backend
activation. Neither this addition nor the original pilot has been deployed or
allowlisted. All earlier review, writer/playing-time and real isolated E2E gates
remain open. Never enable mobile access merely because the app is installed.

## Current Selected Test Supersedes Y25MDQ - 17 October

Owner explicitly requested assigning the existing active Mike referee to public
code 2P23BS, TEST Sandbox - test iphone 2 (jn7cw69dexmjjmg88jbwsxj4kx8gecgr).
Saved through the real signed-in owner's existing DIA Live admin assignment UI.
The active referee email matches the owner account, and this exact match appears
in the owner's referee match list. Public read-only recheck: scheduled, 0-0, zero
events, referee assigned. No account, roles, coach, dates, clock, score or claim
round were changed. This was a single authorized assignment, not a deployment or
mobile-scope activation. Coachfallback does not apply while a referee is assigned.

The closed native preparation build now pins only 2P23BS instead of Y25MDQ;
ZVWTQT was explicitly rejected by the owner. Future allowlist/policy setup must
use the new exact match after rechecking actual account/team IDs and expiry.
No server scope, write flag, policy or backend code was activated/deployed.
Native login/JWT/redirect, isolated E2E and all earlier release gates remain open;
the legacy dual-role web detail still labels the account Admin and does not by
itself prove referee-only transactional or native authorization.
