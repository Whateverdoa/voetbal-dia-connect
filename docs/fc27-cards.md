# Spelerskaarten en teamstemmen

Deze uitbreiding geldt voor teams met `isSelectionTeam: true`. De coach opent het beheer onder **Team → Spelerskaarten**. Spelers en ouders gebruiken `/team/[slug]/app`, met **Kaarten** en **Stemmen**. Het bestaande kaartenoverzicht in de presentatie is weer beschikbaar.

**Team van de week** gebruikt het bestaande zwart/gouden DIA-teamportaalschild met stadionlichten. Met een toegestane foto gebruikt de kaart de lege achtergrond `public/team-portal/dia-gold-shield-empty-v2-480.webp` (ook beschikbaar op 960px); zonder foto blijft het originele artwork met geel shirt zichtbaar (`dia-gold-shield-v1`). Een portret staat nooit over het ingebakken shirt. Gewone kaarten gebruiken het abstracte DIA-schild uit de collectie op `/kaarten`; maandkaarten gebruiken het premium Kristal-schild. Beide tonen eveneens óf de toegestane foto óf een geel DIA-shirt. Ook bij een niet-laadbare foto verschijnt het shirt. `FcPlayerShield` koppelt de bestaande `ShieldCard` en `FootballShieldContent` aan de toegestane spelergegevens en actieve bonussen. Deze keuze geldt ook voor compacte veld- en bankkaarten. De ontwerpgalerij toont lege frames; foto en shirt zijn spelerinhoud.

## Beoordelingen

De coach beoordeelt SNL, SCH, PAS, DRI, VRD en FYS met gehele getallen van 1–99. Onbeoordeelde kenmerken mogen leeg blijven, ook na opslaan. Pas wanneer alle zes kenmerken zijn ingevuld, verschijnt het afgeronde gemiddelde. Een afzonderlijke totaalscore bestaat niet. De referenties 75/80/85 en observatiehulp staan bij het formulier.

De waarschuwing bij meer dan tien punten verschil gebruikt uitsluitend afgeronde basistotalen van actieve, volledig beoordeelde teamgenoten. De coach bevestigt bewust opslaan; de app trekt scores niet gelijk. Speelstijlen zijn maximaal drie vaste kwaliteiten en veranderen de score niet. XP en seizoensminuten blijven onafhankelijk van de beoordeling.

Weekkaarten verhogen ingevulde kenmerken met twee, maandkaarten met vijf, tot maximaal 99. Bij overlap geldt de hoogste bonus. Daarna wordt het gemiddelde opnieuw berekend. De geldigheid begint bij publicatie en duurt zeven kalenderdagen of één kalendermaand in `Europe/Amsterdam`. Maandultimo wordt begrensd tot de laatste geldige dag. Zomertijdsprongen worden afgehandeld; ontbrekende lokale kloktijden schuiven vooruit en bij een herhaald kloktijdstip geldt de latere instantie.

De kaart blijft zelf de eerstvolgende tijdgrens volgen, ook na een slapend browsertabblad. De scheduler markeert het verval daarnaast in de database. Basisbeoordelingen en gepubliceerde rondes worden niet verwijderd.

## Uitnodigen en stemmen

Per speler bestaan een spelersstemrecht en een gezamenlijke ouderstem. Ouders met meerdere kinderen kunnen meerdere ouderstemrechten gebruiken. De coach maakt een uitnodiging op e-mailadres en deelt de link zelf. De link vervalt na zeven dagen; opnieuw uitgeven maakt de vorige link ongeldig. Acceptatie vereist het passende Clerk-account. Speler en ouder gebruiken voor dezelfde speler verschillende accounts.

Een teamlid krijgt geen coach-, scheidsrechter- of adminrol. Een bevoegde coach of admin kan het teamportaal bekijken zonder extra stembiljetten te krijgen. Intrekken, een inactieve speler of het opnieuw koppelen van een account blokkeert ook eerder vastgelegde stemrechten. Een nieuwe koppeling doet vanaf een volgende ronde mee.

Er is één ronde per team, week/maand en periode. De coach kiest direct spelers of opent een stemming met een aantal kaarten en sluitmoment. Kandidaten en geactiveerde stemrechten worden bij openen vastgelegd. Een stemmer kiest maximaal het aantal beschikbare kaarten; iedere verschillende keuze telt één punt. Spelers kunnen zichzelf niet kiezen. Ouders mogen hun eigen kind kiezen. Het eigen biljet kan tot de deadline worden aangepast, ook als automatische afsluiting vertraging heeft.

De scheduler publiceert alle positief scorende kandidaten boven de grens, inclusief gelijke scores op de laatste plaats. Nul stemmen geeft geen kaart. Een veto verwijdert een winnaar uit de selectie en laat de volgende kandidaten met stemmen doorschuiven. Terugdraaien berekent de uitslag opnieuw. De oorspronkelijke vervaldatum blijft voor iedereen gelden; actor, reden en tijdstip blijven intern bewaard.

## Privacy en techniek

Publieke foto's vereisen foto- én publiekeweergavetoestemming. Scores, speelstijlen, onderscheidingen en verkiesbaarheid vereisen gamificatie- én publiekeweergavetoestemming. Intrekking wordt bij iedere query opnieuw toegepast, ook op kandidaten, winnaars en opgeslagen eigen keuzes. Publieke kaarten bevatten geen contactgegevens, uitnodigingen, stemtotalen of coachminuten. Alleen staff ziet de ranglijst; individuele biljetten worden uitsluitend aan hun eigenaar teruggegeven.

De gedeelde regels staan in `src/lib/cards/fc27.ts`, `footballRatings.ts` en `cardPeriods.ts`; de schermen gebruiken `FcPlayerShield`. Backendtoegang en expliciete projecties staan in `convex/playerCards.ts` en de kaarthelpers. Unieke geïndexeerde zoekopdrachten binnen Convex-transacties bewaken ronde- en biljetuniciteit. Schedulerfuncties zijn intern en herhaalbaar. Het beheer leest maximaal 64 spelers, 128 stemrechten en de laatste 100 rondes per team; oudere rondes blijven opgeslagen.

Schemawijzigingen aan bestaande spelers zijn optioneel. Bij uitrol moeten de frontend en Convex-backend samen worden bijgewerkt via de bestaande productie-buildworkflow. Deze featurebranch voert zelf geen productie-deploy of wijzigingen aan bestaande teamgegevens uit.

## Controle

### Afzonderlijke reviewomgeving

De branch `codex/fc27-cards-voting` heeft een eigen Convex-project `dia-fc27-review`, ontwikkeldeployment `sincere-spider-515`. Alleen de branchgebonden Vercel Preview-variabelen `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` en `DIA_TEST_MODE=true` wijzen hierheen. Productie `nautical-condor-5` en andere previews behouden hun eigen instellingen.

De omgeving toont een gele testbalk en bevat `FC27 Testteam` (`fc27-test`) met zes fictieve spelers en een getekend voorbeeldportret. De bestaande beheerdersaccounts uit de lokale configuratie hebben uitsluitend in deze testdatabase coachtoegang gekregen. Er zijn geen spelersgegevens uit productie gekopieerd. Automatische Clerk-rolwijzigingen, clubimports en herinneringscrons zijn uitgeschakeld; de kaartenscheduler voor sluiten en vervallen blijft werkzaam.

De interne CLI-seed `ops/seedFc27Review:apply` vereist zowel testmodus als de exacte testdeployment-URL. Herhalen reset geen beoordelingen. Gebruik bij backendupdates altijd een afzonderlijk genegeerd env-bestand met `CONVEX_DEPLOY_KEY=<ignore_deploy_key>` en `CONVEX_DEPLOYMENT=dev:sincere-spider-515`:

```powershell
npx convex dev --env-file .env.fc27-test --once
```

De Vercel-build blijft alleen de frontend bouwen; push de backend naar deze testdeployment vóór een frontendupdate die nieuwe functies nodig heeft. De reviewomgeving is geen productie-uitrol.

De gerichte tests controleren scoreberekening, gedeeltelijke beoordelingen, bonusmaximum, overlap, tijdgrenzen, Amsterdamse zomer-/wintertijd en maandultimo. Backendtests roepen de echte handlers aan met geïndexeerde testgegevens en controleren toegang, uitnodigingen, snapshots, biljetten, zelfstemmen, nul stemmen, gelijke standen, veto's en privacy. UI-tests bewaken de beoordeling, het stemformulier, navigatie, modaltoegang en bestaande wisselbediening.

Het schild, overzicht, detail en compacte veldkaarten zijn daarnaast met fictieve spelers in een lokale browser bekeken op telefoon- en tabletformaat. Een echte Clerk/Convex-smoketest na deployment blijft onderdeel van de gebruikelijke releasecontrole.

## Aansluiting op de parallelle teamportaaltaak

De interne coachwerkplek beoordeelt vijf ontwikkelonderdelen op 1–5. Die feedback blijft intern en wordt niet omgerekend naar de zes kaartkenmerken. Deze feature leest of publiceert geen interne ontwikkelbeoordelingen. Voor kaartbeoordelingen geldt het goedgekeurde plan: gehele scores 1–99, referenties 75/80/85 en zichtbaarheid na bewust opslaan volgens de bestaande toestemmingen. De coach ziet dit vooraf bij het formulier.

De zes lange ontwerpkeys (`pace`, `shooting`, `passing`, `dribbling`, `defending`, `physical`) worden via `toFootballShieldStats` alleen vertaald vanuit de korte opgeslagen keys (`snl`, `sch`, `pas`, `dri`, `vrd`, `fys`). Er is één gedeelde gemiddeldeberekening. De galerij blijft een lokale ontwerpomgeving met 0–99 als demonstratieschaal; opgeslagen coachbeoordelingen accepteren alleen 1–99. Geen onbedoelde migratie van nul, ontbrekende scores, XP of 1–5-feedback.

Het voorstel uit de andere taak voor afzonderlijke privéconcepten, publicatiemomenten en beoordelingshistorie is een aanvullende vervolgrichting. Dat wijzigt de hier goedgekeurde opslag- en toestemmingsregels niet stilzwijgend. De bestaande week-/maandhistorie en veto-audit blijven behouden.

De oorspronkelijke schildbestanden zijn als momentopname overgenomen uit de hoofdcheckout. De taak voor nieuwe iconen blijft eigenaar van die nieuwe ontwerpen. Deze integratie behoudt de bestaande twaalf stabiele speelstijl-ID's en `PlayStyleIcon`; de latere pictogrammen kunnen daar worden aangesloten zonder scores, stemregels of opgeslagen badge-ID's te wijzigen.
