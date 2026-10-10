# JO13 pilot runbook (fase 5)

Uit te voeren op **dev of productie** door een admin (Clerk + `userAccess` admin).

**Hoofd-testteam:** `jo13-2` (JO13-2). Andere teams (JO13-1 e.d.) later.

## 5.1 Markeer selectieteams

```bash
npx convex run seasonMigrations:markJo13SelectionTeams '{"dryRun": true}'
npx convex run seasonMigrations:markJo13SelectionTeams '{"dryRun": false}'
```

Verwacht: `updated` bevat o.a. `jo13-2`. Ontbrekende slugs → eerst teams aanmaken/importeren.

## 5.2 Roster & active

1. Admin → Spelers voor **JO13-2** (hoofd-test)
2. Controleer `active`; gastspelers uit:  
   `npx convex run seasonMigrations:deactivateInfrequentPlayers '{"dryRun": true}'`  
   daarna met `dryRun: false` per team indien gewenst

## 5.3 Consent-ronde *(deferred — not blocking pilot)*

Pilot mag starten **zonder** consent-ronde. Tot die tijd:
- Coach/admin ziet volledige namen in de app
- Presentatie/TV/deck toont initialen (geen foto/XP) — privacyFilter

Wanneer klaar:
1. Admin → Spelers → team **JO13-2** → **Consent-ronde starten**
2. Deel tokens/links handmatig (mail via club, niet vanuit app)
3. Doel vóór TV-foto’s: **≥ 80% granted** op `public_display` (+ photo waar gewenst)

Ontbrekende Sportlink-namen (`Afgeschermd`) later bijvullen via CSV/admin.

## 5.4 Coach-training

- Mobiel: bestaande coach match-control
- Kleedkamer: `/present/team/jo13-2` (desktop)
- Kantine: `/present/team/jo13-2/live?kiosk=1` of `/present/match/[code]?kiosk=1`

## 5.5 Eerste wedstrijd

1. Coach start wedstrijd zoals gewoonlijk
2. TV op kantine-URL; desktop op kleedkamer-URL
3. Check: speler zonder consent toont initialen, geen foto/XP

## 5.6 Retrospectief

Noteer in [fable-jo13-progress.md](./fable-jo13-progress.md) werklog: XP-feedback, layout, consent-frictie.

## Seizoen clean-start (fase 0, eenmalig)

```bash
npx convex run seasonMigrations:backfillSeasonKeys '{"dryRun": true}'
npx convex run seasonMigrations:backfillSeasonKeys '{"dryRun": false}'
# coachPin legacy (na verify):
npx convex run adminMigrations:cleanupLegacyPinFields '{"dryRun": true}'
```

Export-historie: `scripts/archive/season-export/` (zie README daar).
