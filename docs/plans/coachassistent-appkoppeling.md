# Coachassistent — koppeling met wedstrijden

Status 10 oktober 2026: eerste koppeling gebouwd. De frontend staat op de branch `codex/wisselmodule-ontwerp`; de twee nieuwe Convex-functies zijn geactiveerd op de bestaande backend. De frontend is lokaal te gebruiken; publicatie van deze frontend op Vercel volgt apart.

## Wat nu werkt

Open `/coach/assistent` vanuit het coachdashboard of via **Echte wedstrijd kiezen** in de demo. Met `?wedstrijd=UYXS3M` staat Test2 – JO13-2 geselecteerd.

### Lokale voorbereiding voor 7 november

Voor Dongen O13-5 – DIA JO13-2 (zaterdag 7 november 2026, 10:30; code `9Q7WH6`) is de lokale teststand beschikbaar op `/coach/assistent?wedstrijd=9Q7WH6&test=1`. De bestaande coachrechten gelden bij het lezen. De teststand toont de echte bronselectie, maar biedt geen opslagactie naar DIA Live en weigert die ook in de lokale opslaghandler. Voorstellen, formatiekeuzes en simulatie blijven lokaal. Een afdruk bewaart het concept; herladen wist de oefensessie. Deze frontendwijziging blijft op de featurebranch en vereist geen backenddeploy.

Controle op 31 oktober: de productiebackend bevat `coachAssistant.workspace` inmiddels niet meer. Teststand gebruikt daarom de bestaande queries `matches.verifyCoachAccess({})` en `matches.getForCoach`, met de eigen coachteams als selectiegrens. `src/lib/coachAssistant/testWorkspace.ts` vertaalt de gelezen data naar het lokale planformaat. De echte bron voor 7 november heeft 17 spelers, 15 primaire positievoorkeuren en nog geen beginopstelling, keepermarkering, formatie of wisselregels. De getoonde 4-3-3 is dan een te beoordelen voorstel. De gewone schrijfbare koppeling zonder `test=1` vergt later opnieuw een afgestemde backendrelease; die is tijdens deze voorbereiding niet uitgevoerd.

### Gewone wedstrijdkoppeling

### Actualisatie lokale proef — 5 november

- De Coachassistent haalt standaard alle afgeronde eerdere wedstrijden van het gekozen team op via de bestaande alleen-lezen coachqueries. Maximaal vier detailaanvragen tegelijk; geen nieuwe backenddeploy. Wedstrijden van andere teams en latere wedstrijden worden uitgesloten. Bij ontbrekende of foutieve brongegevens verschijnt een controlepunt; nulwaarden die door de oude query uit ontbrekende minuten zijn gemaakt worden niet als bewezen speeltijd gebruikt.
- Vastgelegde speelminuten kunnen als totaal worden meegewogen zonder een onbekend keeperdeel als nul voor te stellen. De volledige huidige selectie moet bruikbare historie hebben voordat historische minuten als eerlijkheidscriterium worden gebruikt. De actuele verdeling blijft eerst zo gelijk mogelijk; positievoorkeuren zijn zachte voorkeuren en mogen geen speler structureel op de bank houden.
- ‘Keeper niet wisselen’ staat standaard aan. In de lokale proef kan de coach dit uitzetten en een tweede keeper voor na de rust kiezen. Beide keepers spelen dan elk één helft op doel en zitten de andere helft op de bank. De gewone schrijfbare koppeling ondersteunt deze keeperwissel nog niet.
- ‘Minuten van coach’ is optioneel en betekent een maximum. De reden (trainerkeuze of disciplinaire afspraak) en notitie blijven in de lokale coachgegevens; ze worden niet toegevoegd aan het overdraagbare of afgedrukte plan. Onuitvoerbare grenzen geven een fout. Herladen wist deze lokale afspraken.
- De bronwedstrijden tonen geregistreerde minuten en de laatst opgeslagen positie per speler. Dit is geen volledige positietijdlijn: `matchLineupCore.swapFieldPositions` overschrijft slot-ID's zonder een positiegebeurtenis op te slaan. Oude eindposities gelden daarom niet als bewezen basisplaatsen. Voor een volledige toekomstige tijdlijn zijn een aftrapmomentopname en gebeurtenissen voor positieruilen, formatie- en keeperwijzigingen nodig.
- Het voorstel toont ook het langste bankblok. Met de ingelezen Dongen-selectie, 17 beschikbare spelers, een vaste keeper en blokken van 10 minuten: 30/40 minuten per veldspeler, 60 keeperminuten, maximaal 20 minuten aaneengesloten bank.
- Verificatie: TypeScript, ESLint, 44 gerichte tests en een geslaagde volledige Next-build. Geen wijziging van de live wedstrijdgegevens of productiepublicatie.

1. De ingelogde coach kiest een nog niet begonnen wedstrijd van de eigen coachteams, of voert een wedstrijdcode in. De Coachassistent gebruikt uitsluitend het eigen coachrecord en de gekoppelde teams, ook als het account daarnaast beheerder is. Een beheerder zonder coachkoppeling krijgt hier geen wedstrijden.
2. De werkplek leest de actuele wedstrijdselectie, beschikbaarheid, keeper, positievoorkeuren, formatie en openstaande wisselregels. Er is geen terugval op een voorbeeldwedstrijd.
3. Een onvolledige beginopstelling vraagt eerst een keeper, formatie en een volledig voorstel. Ontbrekende gegevens worden niet verzonnen. Een ontbrekende wedstrijd-/voorsteldatum moet worden ingevuld voordat de assistent rekent.
4. De coach berekent een voorstel, beoordeelt de posities en minuten en zet het klaar als concept. Bij **Bron controleren** volgt de controle van het volledige beginplan.
5. **Opslaan in de wedstrijd** bewaart beginopstelling, keeper, beschikbaarheid, formatie en wisselregels in één Convex-transactie. Bestaande openstaande regels worden daarbij vervangen. De app gebruikt daarna dezelfde `matchPlayers`, `matches` en `substitutionPlans`.
6. Een plan dat via de bestaande app is aangepast, wordt opnieuw ingelezen met **Actuele selectie en plan opnieuw laden**. Zo werkt de eerste koppeling beide kanten op. Een lokaal concept blijft zichtbaar als de app intussen wijzigt; opslaan blijft dan geblokkeerd totdat de coach de actuele bron opnieuw laadt.

De oefenklok en oefenwissels blijven lokaal. Opslaan start de echte wedstrijd niet. Tijdens of na de echte wedstrijd kan deze functie geen volledig beginplan vervangen.

## Implementatie en controles

- Pagina: `src/app/coach/assistent/page.tsx`; wedstrijdkeuze en conceptbeheer: `CoachAssistantWorkspace.tsx`.
- De wedstrijdkeuze gebruikt `matches.verifyCoachAccess` zonder de clubbrede beheerdermodus. `coachAssistant.workspace` zoekt de code via `matches.by_code` en controleert de coachrol, coachkoppeling en het teamlidmaatschap voordat de selectie wordt gelezen. Dezelfde beperking geldt bij opslaan; een ingevoerde code geeft geen extra rechten.
- `coachAssistant.save` controleert dezelfde rechten opnieuw, plus wedstrijdstatus, afgelasting, spelerslidmaatschap, keeper, formatie en het volledige doorgerekende plan.
- Een bronvingerafdruk omvat de relevante wedstrijdgegevens, selectie, voorkeuren, formatie en wisselregels. Wijzigingen via bestaande appschermen worden hierdoor ook opgemerkt, zonder migratie van die schermen.
- Het opslaan gebruikt een aanvraag-ID in de bestaande `matchCommandDedupes`. Een herhaalde aanvraag maakt geen dubbele wisselregels.
- Wisseltijden blijven absolute wedstrijdminuten; een moment op de kwartgrens valt in het volgende kwart. De volgorde van acties op hetzelfde moment blijft behouden.
- Eigen formaties behouden hun slot-ID's. Voorgestelde of gewijzigde standaardformaties gebruiken de bestaande appformaties. Keeperwissels binnen een plan worden in deze eerste koppeling geweigerd.
- De backend herbouwt namen, rugnummers en formatiecoördinaten uit de database. De client bepaalt deze metadata niet.
- Er is geen schemawijziging nodig voor deze eerste koppeling. De bestaande authenticatie blijft leidend.

## Verificatie van UYXS3M

De publieke pagina toont Test2 – JO13-2 en **Nog niet begonnen**. De geauthenticeerde werkplek moet de selectie van precies deze wedstrijd tonen. Vervolgens controleert de coach datum, aanwezigheid, blessures, keeper en voorkeursposities vóór een voorstel wordt opgeslagen.

De implementatie is gecontroleerd met TypeScript voor frontend en backend, ESLint, de PIN-afhankelijkheidscontrole en gerichte tests voor planner, werkplek, bronisolatie, bevoegdheden, conflicten, opslaan en herhaalde aanvragen. Een echte wedstrijd starten hoort niet bij deze technische controle.

## Vervolg na deze eerste koppeling

1. **Historie betrouwbaar aansluiten.** Een nieuwe geïndexeerde coachquery haalt alleen eerdere wedstrijden van het gekozen team op. Bewaar voortaan bij de aftrap een expliciete beginopstelling. Gebruik eindopstellingen niet als bewijs voor basisplaatsen; ontbrekende aanwezigheid, minuten of keeperminuten blijven onbekend. De huidige handmatige bevestiging blijft beschikbaar voor oudere wedstrijden.
2. **Oorspronkelijk plan en versies bewaren.** Voeg een onveranderlijke momentopname van het goedgekeurde plan en een verwijzing naar de actieve versie toe. De huidige appregels zijn de werkvoorraad voor uitvoering; werkelijk uitgevoerde gebeurtenissen blijven afzonderlijk bewaard. De eerste koppeling bewaart nog geen historische planversies op de server.
3. **Plan naast werkelijkheid.** Sluit de bestaande veldweergave en minutenvergelijking aan op die bewaarde planversie en de echte wedstrijdgebeurtenissen. Ondersteun werkelijk gespeelde tijd en blessuretijd, en het verschil tussen geplande en uitgevoerde wisselmomenten.
4. **Wedstrijdverslag en delen.** Voeg een conceptverslag toe dat de coach kan beoordelen, corrigeren en publiceren op de team-/spelerspagina's. Publicatie gebruikt een afzonderlijk moment en de bestaande publieke privacyregels; coachnotities worden niet vanzelf openbaar.
5. **Veldproef met Codex.** Gebruik de echte wedstrijd als expliciete gegevensbron voor vragen tijdens de wedstrijd. Begin met statusvragen en uitleg van het plan; een gesprek alleen geeft nog geen automatische livekoppeling of notificaties. Werk dit pas verder uit nadat wedstrijdkeuze, opslaan en de vergelijking zijn beoordeeld.

Vóór een gespeelde productieproef controleren we ook of de bedoelde testwedstrijd buiten officiële seizoenstatistieken blijft. Alleen de naam “Test2” is daarvoor geen expliciete testmarkering; in de bestaande code is een apart sandboxteam beschikbaar.
