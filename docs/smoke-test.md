# DIA Live Smoke Test Checklist

Actuele handmatige smoke test voor de Clerk + `userAccess` setup.

## Preflight
- [ ] `npx convex dev` of backend draait
- [ ] frontend draait
- [ ] Clerk is geconfigureerd voor deze omgeving
- [ ] er is minimaal 1 admin, 1 coach en 1 scheidsrechter met correct `userAccess` record
- [ ] testdata is aanwezig via seed of import

## Seed / Import
### Seed
```bash
npx convex run seed:init
```
- [ ] seed draait zonder foutmelding
- [ ] club, teams, coaches, referees, players en matches zijn aangemaakt

### Players import
```bash
node scripts/import-players.mjs path/to/players.csv --dry-run
node scripts/import-players.mjs path/to/players.csv --ops-secret <CONVEX_OPS_SECRET>
```
- [ ] dry-run toont aantallen per team
- [ ] commit-run maakt spelers aan zonder authfout

### Matches import
```bash
node scripts/import-matches.mjs path/to/matches.csv --dry-run
node scripts/import-matches.mjs path/to/matches.csv --ops-secret <CONVEX_OPS_SECRET> --coach-email coach@dia.nl
```
- [ ] dry-run toont aantallen per team
- [ ] commit-run maakt wedstrijden aan met `coachId`

## Admin
1. Log in via `/sign-in`
2. Open `/admin`

Verwacht:
- [ ] geen PIN-scherm zichtbaar
- [ ] admin workspace opent
- [ ] `Toewijzing` is standaard actief
- [ ] team-tabs en speeldag-tabs zijn zichtbaar
- [ ] search en statusfilter werken

### Assignment board
- [ ] team kiezen filtert wedstrijden
- [ ] speeldag kiezen filtert wedstrijden
- [ ] rij opent side panel
- [ ] side panel toont `Wedstrijd`, `Toewijzing`, `Acties`
- [ ] scheidsrechter toewijzen slaat op
- [ ] annuleren herstelt lokale wijzigingen

### Beheer
- [ ] teams CRUD werkt
- [ ] coaches CRUD werkt met e-mail
- [ ] referees CRUD werkt met e-mail en kwalificaties
- [ ] spelers CRUD werkt

## Coach
1. Log in als coach-account met Clerk
2. Open `/coach`

Verwacht:
- [ ] geen keypad of PIN UI zichtbaar
- [ ] dashboard toont alleen eigen teams
- [ ] nieuwe wedstrijd-link werkt
- [ ] matchkaart opent `/coach/match/[id]`

### Coach match flow
- [ ] wedstrijd starten werkt
- [ ] goal registreren werkt
- [ ] staged substitution werkt
- [ ] speeltijdpaneel laadt
- [ ] publieke code blijft zichtbaar

## Scheidsrechter
1. Log in als referee-account met Clerk
2. Open `/scheidsrechter`

Verwacht:
- [ ] alleen toegewezen wedstrijden zichtbaar
- [ ] match opent referee controls
- [ ] klok start/pauze/hervat werkt
- [ ] score aanpassen werkt

## Publiek
1. Open `/live/[code]`

Verwacht:
- [ ] publieke code-route werkt zonder login
- [ ] live score en timeline laden
- [ ] coach/referee interne data wordt niet getoond

## Access en rollen
- [ ] admin zonder `coachId` of `refereeId` werkt gewoon
- [ ] coach zonder `coachId` in `userAccess` krijgt geen coachtoegang
- [ ] referee zonder `refereeId` in `userAccess` krijgt geen scheidsrechtertoegang
- [ ] gedeactiveerde `userAccess` blokkeert toegang

## Recovery
- [ ] interne recovery-mutatie kan admin-toegang herstellen indien nodig
- [ ] bootstrap admin email kan na backfill nog inloggen

## Cutover Verify
- [ ] `userAccess` records bestaan voor alle actieve coaches/referees/admins
- [ ] wedstrijden gebruiken in runtime `coachId`
- [ ] imports gebruiken `opsSecret` en geen PIN-argumenten
- [ ] frontend toont nergens PIN-auth als primaire flow

## Resultaat
- [ ] geslaagd
- [ ] blokkades genoteerd

Notities:
1.
2.
3.
