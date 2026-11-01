# Standenpolling — productie, 1 november 2026

Mike gaf na de testfase expliciet akkoord: “kunnen we dit dan daar toepassen”. De standenfix is vervolgens op `nautical-condor-5` geplaatst. De Vercel-frontend is niet opnieuw gebouwd.

## Behoud van bestaande productie

Productie bevat al selectief geplaatste backendcode voor de beperkte iPhone-proef uit PR #73. Een volledige deploy vanaf `origin/main` zou die code en drie indexes verwijderen en strandde bij de validatie op het bestaande veld `matchPlayers.dismissed`. Daarom is geen volledige branchdeploy uitgevoerd.

De actuele gedeployde configuratie en alle 284 modules zijn eerst opgehaald. Daarnaast is een volledige Convex-snapshot geëxporteerd naar de oorspronkelijke werkmap: `tmp/standings-production-backup-20261101.zip`.

De gecontroleerde release vervangt zes bestaande modules en voegt één helper toe:

- `crons.js`
- `import/sportlinkStandingsFetch.js`
- `import/standingsWrite.js`
- `schemaFragments.js`
- `standings.js`
- `schema.js`
- nieuw: `lib/standingsPolling.js`

Alle 278 overige modules zijn na de uitrol bytegelijk vergeleken, inclusief sourcemaps. Authenticatieconfiguratie, runtime `1.44.0`, Node-runtimekeuze en bestaande Node-modules bleven gelijk. Alleen de goedgekeurde optionele velden van `standings` en `standingsPollState` zijn toegevoegd. Geen bestaande schema-velden of indexes gewijzigd of verwijderd.

`scripts/standings-release-bundle.mjs` bouwt het beperkte pakket op de daadwerkelijk gedeployde modules en het bestaande schema. De releasecontrole weigert onverwachte schema-, index- of cronwijzigingen. Broncode en actief schema zijn direct vóór de commit opnieuw vergeleken. Deze legacy-deployroute biedt geen atomair slot tegen een gelijktijdige andere deployment.

## Verificatie

- 56 gerichte Vitest-tests en zeven extra releaseveiligheidstests geslaagd; volledige TypeScript-controle en gerichte ESLint geslaagd.
- De zes gedeelde schema-/functiemodules zijn eerst exact op `insightful-spoonbill-193` getest; alleen de testcronlijst bleef beperkt tot de drie standencrons.
- De herhaalde cloudproef om 13:36 Nederlandse tijd: twee teams, twee poules, geen fouten; inhoudstijd bleef gelijk bij ongewijzigde inhoud; dubbele poging geblokkeerd; interne query anoniem geweigerd.
- Productie: pakket, actief schema en alle acht crondefinities na de uitrol gecontroleerd. De vijf overige crons behielden zowel hun record-ID als hun geplande volgende uitvoering.
- Eerste begrensde productieronde voltooid om **13:38:41 Nederlandse tijd**: **47 teamstanden opgehaald**. JO13-2 (`846592`) werd succesvol vernieuwd; de inhoud was gelijk aan de bestaande cache.
- De echte automatische cron startte om **13:45:12** en rondde om **13:45:27** succesvol af: poging 2, opnieuw 47 teamstanden opgehaald en elders in de poules ook een echte inhoudswijziging gezien. JO13-2 is bijgehaald tot 13:45:27; de bestaande publieke standenquery retourneert dezelfde ophaaltijd en acht rijen. De volgende cron staat op 14:00:12. Dit is rechtstreeks via de cronhistorie en de openbare query bevestigd.
- Vijftien poules leverden HTTP 200 met een lege array op. Afzonderlijk gecontroleerd: dit betreft JO7–JO10, samen zeventien teams. Daarom meldt de globale ronde `partial`. De laatste geldige caches blijven behouden. Dit is geen aanwijzing dat de JO13-2-opvraag mislukte.
- Anonieme monitoring werkt op productie; een onbekend team meldt `hasStanding: false`; de interne pollquery blijft afgeschermd.

`lastContentChangedAt` is voor JO13-2 nog `null`: de oude historie is onbekend en er is sinds plaatsing nog geen echte inhoudswijziging gezien. De nieuwe ophaaltijd mag niet als inhoudswijziging worden gepresenteerd.

## Monitoring voor Wedstrijdbot DIA

Stuur zonder authenticatie een POST naar `https://nautical-condor-5.convex.cloud/api/query`:

```json
{
  "path": "standings:getMonitoringByTeamSlug",
  "args": { "teamSlug": "jo13-2", "asOf": 1793536740000 },
  "format": "json"
}
```

Vervang `asOf` telkens door de actuele tijd in milliseconden, afgerond op een minuut: `Math.floor(Date.now() / 60000) * 60000`. Controle per kwartier is voldoende. De query schrijft niets en bevraagt Sportlink niet. Let op `lastSuccessfulFetchAt` per team én de globale `polling.lastOutcome`; `partial` kan uitsluitend andere poules betreffen.

## Belasting en vervolgbeheer

Er zijn 62 unieke bekende poules, inclusief de vijftien lege poules. De bovengrens is daarmee 63 aanvragen per ronde, 252 per uur en 2.772 per volledige weekenddag. Er zijn geen directe retries. De handmatige interne action blijft een operatoroverride; automatische acties delen de daglimiet.

De openbare [Sportlink-integratiebeschrijving](https://sportlinkservices.freshdesk.com/nl/support/solutions/articles/9000062943-toepassen-club-dataservice-en-werken-met-de-javascript-library) en [voorwaarden](https://sportlink-help.freshdesk.com/nl/support/solutions/articles/9000110291-standaardvoorwaarden-sportlink-verenigingen) bevatten geen concreet numeriek clubquotum. Een accountspecifieke limiet is dus niet bevestigd; er is geen limiet verzonnen. Lege jeugdstanden als aparte toestand behandelen kan later het monitoringssignaal verduidelijken.

**Geen volledige deploy vanaf main voordat de al aanwezige iPhone-backend met main is verzoend.** De standenbranch bevat alleen deze wijziging; de overige productiemodules zijn bewust uit de actieve configuratie behouden. Een rollback moet de nieuwe optionele schemavelden behouden zodra records die bevatten.
