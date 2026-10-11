# Spelerskaarten en teamstemmen

Deze uitbreiding geldt voor teams met `isSelectionTeam: true`. De coach opent het beheer onder **Team → Spelerskaarten**. Spelers en ouders gebruiken `/team/[slug]/app`, met **Kaarten** en **Stemmen**. Het bestaande kaartenoverzicht in de presentatie is weer beschikbaar.

**Team van de week** gebruikt het bestaande zwart/gouden DIA-teamportaalschild met stadionlichten en geel shirt (`public/team-portal/dia-gold-shield-v1-480.webp` en de 960px-variant). Dit originele artwork is ongewijzigd overgenomen; naam, portret, DIA-logo, beoordeling en speelstijlen worden erboven getoond. Gewone kaarten gebruiken het paarse vectorschild met turquoise/gouden rand; maandkaarten behouden hun gouden accenten. Deze vormgeving geldt ook voor compacte veld- en bankkaarten.

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

De gedeelde regels staan in `src/lib/cards/fc27.ts` en `cardPeriods.ts`; de schermen gebruiken `FcPlayerShield`. Backendtoegang en expliciete projecties staan in `convex/playerCards.ts` en de kaarthelpers. Unieke geïndexeerde zoekopdrachten binnen Convex-transacties bewaken ronde- en biljetuniciteit. Schedulerfuncties zijn intern en herhaalbaar. Het beheer leest maximaal 64 spelers, 128 stemrechten en de laatste 100 rondes per team; oudere rondes blijven opgeslagen.

Schemawijzigingen aan bestaande spelers zijn optioneel. Bij uitrol moeten de frontend en Convex-backend samen worden bijgewerkt via de bestaande productie-buildworkflow. Deze featurebranch voert zelf geen productie-deploy of wijzigingen aan bestaande teamgegevens uit.

## Controle

De gerichte tests controleren scoreberekening, gedeeltelijke beoordelingen, bonusmaximum, overlap, tijdgrenzen, Amsterdamse zomer-/wintertijd en maandultimo. Backendtests roepen de echte handlers aan met geïndexeerde testgegevens en controleren toegang, uitnodigingen, snapshots, biljetten, zelfstemmen, nul stemmen, gelijke standen, veto's en privacy. UI-tests bewaken de beoordeling, het stemformulier, navigatie, modaltoegang en bestaande wisselbediening.

Het schild, overzicht, detail en compacte veldkaarten zijn daarnaast met fictieve spelers in een lokale browser bekeken op telefoon- en tabletformaat. Een echte Clerk/Convex-smoketest na deployment blijft onderdeel van de gebruikelijke releasecontrole.
