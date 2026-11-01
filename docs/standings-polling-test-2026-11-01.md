# Standenpolling — testrapport 1 november 2026

Status van de testfase: gebouwd en getest op een afzonderlijke Convex-developmentdeployment, zonder productiewijzigingen. Mike gaf daarna expliciet akkoord voor toepassing op productie. Zie [productierapport](standings-polling-production-2026-11-01.md) voor die afzonderlijke uitrol.

## Testomgeving

- Deployment: `insightful-spoonbill-193`, type `dev`, geen standaarddeployment.
- Referentie: `mike-7d692:voetbal-dia-connect:dev/standings-poll-test-20261101`.
- [Dashboard](https://dashboard.convex.dev/t/mike-7d692/voetbal-dia-connect/insightful-spoonbill-193).
- Tijdelijke deployment, vervalt op 5 november 2026.
- Alleen de betrokken backendmodules, hun schema-afhankelijkheden en de drie standencrons zijn geplaatst. Andere applicatiecrons zijn niet op deze testdeployment geïnstalleerd.
- Twee synthetische teamrecords: `jo13-1` en `jo13-2`. Hun openbare poulestanden zijn rechtstreeks bij Sportlink opgehaald. Geen productiegegevens gekopieerd, geen spelers of contactgegevens geïmporteerd.
- De testkopie staat in `tmp/standings-poll-test-20261101/`; de CLI-wrapper controleert de exacte developmentdeployment, verwijdert overgeërfde Convex-credentials en weigert productiecommando's. De hoofdmap en haar `.env.local` zijn niet omgezet naar een andere omgeving.

## Uitgevoerde wijzigingen

- Weekendpolling blijft elk kwartier lopen van 10:00 tot en met 20:45 UTC. Een eerder waargenomen wijziging of het ontbreken van DIA-wedstrijden stopt de polling niet.
- Atomische reservering vóór netwerkverkeer: maximaal één poging per kwartierslot en 44 pogingen per Amsterdamdag in het weekend. Ook fouten tellen mee. Een lease voorkomt overlap; verlopen of vervangen reserveringen kunnen niet succesvol worden afgerond.
- Maandag 10:00 UTC één inhaalronde; woensdag 20:00 UTC één vangnetronde. Deze gebruiken dezelfde reservering, met maximaal één poging op die dagen.
- Eén `/teams`-request en één request per unieke bekende poule per ronde. Geen directe retries. Timeout per request: 8 seconden; opvragen van de bron heeft een budget van 8 minuten.
- Lege, ongeldige of mislukte bronresponses behouden de laatste geldige stand. Polling verwijdert geen caches meer.
- Vergelijking van poule, teams, posities en statistieken negeert logo-URL's en rijvolgorde. `fetchedAt` en logo's worden wel vernieuwd.
- `lastContentChangedAt` registreert een waargenomen inhoudelijke wijziging. Bij nieuwe records is dit de eerste waarneming; bij ongewijzigde legacyrecords blijft de onbekende historie `null` in monitoring.
- Nieuwe openbare query `standings:getMonitoringByTeamSlug`. Geen authenticatie vereist; geen schrijfacties of rechtstreekse Sportlink-aanvragen. Interne statusvelden, fingerprints en secrets worden niet gepubliceerd.

## Testresultaten

| Controle | Resultaat |
|---|---|
| `npx --no-install tsc --noEmit --incremental false` | Geslaagd, volledige werkboom |
| Gerichte Vitest-suite | 56/56 geslaagd, vijf testbestanden |
| `git diff --check -- convex` | Geslaagd |
| Convex-codegeneratie en deploy met typecheck | Geslaagd op uitsluitend `insightful-spoonbill-193` |
| Geïnstalleerde crondefinities via private leesquery gecontroleerd | Alle drie aanwezig met juiste cronexpressie, action en geplande volgende uitvoering |
| Echte Sportlink-import in testomgeving | Twee teams, twee poules, nul mislukte poules |
| Begrensde geplande action direct aangeroepen | Poging 1 voltooid; ongewijzigde inhoud correct herkend |
| Herhaling in hetzelfde kwartier | `already_attempted`; teller niet verhoogd |
| Tweede broncontrole | Ophaaltijd vernieuwd; inhoudelijke wijzigingstijd bleef gelijk |
| Anonieme HTTP-monitoring | Geldige respons voor JO13-2; ontbrekend team expliciet aangegeven |
| Interne query anoniem aanroepen | Geweigerd |
| Monitoring over tijdgrens zonder DB-wijziging | `asOf` verandert de afgeleide status; Amsterdam-middernacht geeft maandagbudget 1 |

De geautomatiseerde scenario's omvatten twee latere wijzigingen op dezelfde dag ondanks `sawUpdate=true`, geen lokale wedstrijden, gedeelde poules, gedeeltelijke bronfouten, ongeldige/lege antwoorden, ontbrekende teams, een hangend request, verlopen reservering, dubbele/concurrerende pogingen, 44-pogingenlimiet, dagwissel, wintertijd, logo-only wijzigingen en legacyrecords.

Testbestanden:

- `convex/import/sportlinkStandingsFetch.test.ts` — 14 tests.
- `convex/import/standingsWrite.test.ts` — 13 tests.
- `convex/lib/standingsPolling.test.ts` — 17 tests.
- `convex/standings.test.ts` — 5 tests.
- `convex/import/sportlinkStandingsMapper.test.ts` — 7 bestaande regressietests.

De cloudproef is uitgevoerd op 1 november om 13:18 Nederlandse tijd; de laatste helperwijziging is om 13:21 opnieuw gedeployed en anoniem op de cloud gecontroleerd. De crondefinities zijn afzonderlijk bevestigd met `_system/frontend/listCronJobs:default`; de eerste automatische weekendrun stond gepland voor 13:30:20. De geplande action is tijdens de cloudproef direct aangeroepen. Deterministische tijdscenario's en foutscenario's zijn in `convex-test` getest; een volledige weekenddag met echte Sportlink-wijzigingen is niet afgewacht.

## Gebruik door Wedstrijdbot DIA

Voorbeeld voor de testomgeving (de productie-URL staat in het productierapport):

```js
const response = await fetch("https://insightful-spoonbill-193.convex.cloud/api/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    path: "standings:getMonitoringByTeamSlug",
    args: {
      teamSlug: "jo13-2",
      asOf: Math.floor(Date.now() / 60_000) * 60_000,
    },
    format: "json",
  }),
});
const { status, value } = await response.json();
```

De query retourneert onder andere `lastSuccessfulFetchAt`, `lastContentChangedAt`, `polling.attempts`, `polling.maxAttempts`, `polling.lastOutcome`, `polling.status` en `polling.nextPollAt`. Alle tijdstempels zijn Unix-milliseconden. `nextPollAt` is het nominale cronmoment; daadwerkelijke uitvoering kan iets later starten. `polling.scope` is altijd `global`: de status bewijst niet dat alle wedstrijden van dit team verwerkt zijn.

`asOf` is optioneel en wordt in de respons herhaald. De bot moet per aanvraag de actuele minuut meegeven, zodat tijdafhankelijke status ook zonder databasewijziging opnieuw wordt berekend. Dit volgt de [Convex-richtlijn voor tijdafhankelijke queries](https://docs.convex.dev/understanding/best-practices/#dont-use-datenow-in-queries). Een controle per kwartier is voldoende; deze query belast Sportlink niet.

## Grenzen vóór een productiebesluit

- Automatische bovengrens: `44 × (1 + P)` bronaanvragen per weekenddag, met `P` unieke bekende poules. De clubspecifieke Sportlink-limiet was in deze testfase niet vastgesteld; zie de controle in het productierapport.
- De bestaande interne handmatige action `syncStandings` blijft een bewuste operatoroverride buiten het automatische pogingenbudget.
- Een verdwenen team of poule behoudt de laatst bekende cache tot afzonderlijke, expliciete opschoning. De oude ophaaltijd blijft zichtbaar.
- De huidige mapper kiest de hoogste poulecode bij meerdere reguliere fases; dit bestaande gedrag is niet aangepast.
- Tot het einde van deze testfase draaide productie de oude implementatie. De latere, afzonderlijk goedgekeurde productie-uitrol staat in het productierapport.
