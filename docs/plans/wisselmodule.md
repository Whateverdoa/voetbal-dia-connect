# Wisselmodule — foto, wisselblad en print

Status op 30 september 2026: ontwerpvoorstel, uitgewerkt praktijkvoorbeeld, zelfstandige controlefunctie en een werkende lokale demonstratie op **`/demo/wisselmodule`**. De demo laat verificatie, uitvoering en plan versus demowerkelijkheid interactief zien. De volledige module, automatische fotoherkenning en de appkoppeling zijn nog niet gebouwd. De aangeleverde handgeschreven lijst is visueel overgenomen en intern gecontroleerd; een geslaagde berekening geeft geen automatische bronbevestiging door de coach.

## Wat de coach ermee kan

1. Een foto maken van een handgeschreven wissellijst of een bestaande foto kiezen.
2. De herkende inhoud controleren en aanpassen in een bewerkbaar wisselblad.
3. Een veldplaatje met instructies voor ieder wisselmoment bekijken, als afbeelding opslaan en afdrukken.
4. De hele wissellijst netjes op A4 afdrukken of als PDF bewaren.
5. Later het gecontroleerde plan in het wisselgedeelte van DIA Live laden.
6. Direct vanuit de wedstrijd op de telefoon een foto toevoegen en het concept daar verifiëren.
7. Tijdens en na de wedstrijd het oorspronkelijke plan vergelijken met de werkelijk geregistreerde wissels en speelminuten.

De voorgestelde stappenkaart combineert een veldopstelling met wie eruit en erin gaat. Als alleen een tekstuele stappenlijst gewenst is, kan die dezelfde gegevens gebruiken.

## Gebruiksflow

**Nieuw plan → Foto → Spelers en bron controleren → Beginopstelling → Plan doorrekenen → Meldingen oplossen → Coach beoordeelt → Afdrukken / exporteren.**

Bij een nieuw plan vult de coach team, tegenstander, wedstrijdvorm en speelduur in. Spelers kunnen aanvankelijk handmatig worden toegevoegd; de latere appkoppeling haalt de wedstrijdselectie op.

### Foto en herkenning

- Camera op de telefoon en kiezen uit bestaande foto's.
- De bronfoto naast het herkende blad op groot scherm; op mobiel eenvoudig tussen beide wisselen.
- Herkenningsresultaat is altijd een concept. Onduidelijke namen, pijlen en tijden worden gemarkeerd en blijven onbevestigd.
- De coach kan namen koppelen, tijden corrigeren, regels toevoegen/verwijderen en de volgorde aanpassen.
- Spelers worden overal getoond met **naam én rugnummer**, bijvoorbeeld `Lucas 7`: bij broncontrole, op het veld, op de bank, in wisselregels, op papier en bij plan versus werkelijkheid. De coach koppelt de combinatie aan de wedstrijdselectie; ook een naam-rugnummercombinatie vervangt nooit de vaste spelers-ID.
- Ontbrekende rugnummers staan als `?` en vragen controle. De module gebruikt de rugnummers uit de gekoppelde spelerslijst. Een verschil met de foto of hetzelfde rugnummer bij meerdere geselecteerde spelers vraagt eerst een keuze van de coach; er worden geen nummers verzonnen.
- Een tabel met opstellingen per kwart vereist een andere omzetting dan een lijst ‘A eruit, B erin’. Het controlescherm toont welke interpretatie wordt gebruikt.
- Als herkenning mislukt, blijven de foto en handmatige invoer beschikbaar. Een ongelezen foto krijgt nooit de status ‘verwerkt’.

### Het bewerkbare blad

| Stap | Moment | Soort | Eruit / speler A | Erin / speler B | Notitie |
|---|---|---|---|---|---|
| 1 | Kwart 1, wedstrijdminuut 8 | Wissel | Daan 4 | Sam 8 | Sam neemt de plek van Daan over |
| 2 | Start kwart 2, wedstrijdminuut 15 | Wissel | Milan 9 | Daan 4 | Daan komt terug |
| 3 | Kwart 2, wedstrijdminuut 20 | Positiewissel | Sam 8 | Noah 6 | Beiden blijven op het veld |

Fictief voorbeeld voor 4 × 15 minuten. Alle regels vormen samen één plan. Aanpassingen werken door in de stappenkaartjes, printlijst en export.

Tijden worden zichtbaar als wedstrijdminuten opgeslagen. ‘Kwart 2, 5 minuten gespeeld’ wordt bij 4 × 15 minuten wedstrijdminuut 20. Rust telt niet mee. Bij een onduidelijke tijd kiest de coach eerst de betekenis. Zonder tijd blijft de regel ‘moment nog bepalen’; zonder minuut maar met kwart geldt ‘start kwart’.

### Beginopstelling en stappenkaartjes

Voor een correct veldplaatje zijn selectie, keeper, bank en posities bij de start nodig. Als de foto die niet bevat, vult de coach ze aan. Ontbrekende posities worden zichtbaar aangegeven en niet verzonnen.

- Stap 0 toont de beginopstelling en bank.
- Elk volgend kaartje toont het moment, de wisselopdracht en de verwachte veldopstelling erna, met de bank eronder.
- Meerdere wissels op hetzelfde moment kunnen op één kaartje staan. De volgorde binnen dat moment blijft expliciet.
- Een gewone wissel geeft de plek van de uitgaande speler door aan de invaller.
- Een positiewissel verwisselt twee veldposities; beide spelers blijven op het veld.
- Een keeperwissel vraagt expliciete keepertoewijzing. De huidige projectie draagt alleen de veldpositie over en is hiervoor nog niet voldoende.
- Veldplaatjes worden vanuit de plangegevens getekend. Daardoor blijven namen, rugnummers, posities en volgorde gelijk aan het blad. De bestaande exports gebruiken cirkelvormige spelerssymbolen met positie, rugnummer zonder voorvoegsel en naam. De lokale interactieve demo gebruikt de hieronder beschreven voetbalgame-schilden; de afdrukken zijn daarmee nog niet bijgewerkt.
- Export: één PNG per wisselmoment; print: één of meer kaartjes per A4-pagina, met een leesbare ondergrens voor tekst.

Elk kaartje is herkenbaar als **gepland**, met plannaam en versienummer. Uitvoering tijdens de wedstrijd kan van het plan afwijken.

Het document bewaart de oorspronkelijke beginopstelling en alle geplande stappen. De bestaande appprojectie begint bij de actuele wedstrijdopstelling en gebruikt alleen openstaande regels; die kan na uitgevoerde wissels niet rechtstreeks de volledige oorspronkelijke printreeks reconstrueren.

### Nette printlijst

- A4 met team, tegenstander, datum indien bekend, wedstrijdvorm en planversie.
- Beginopstelling en bank, gevolgd door een tabel met tijd, eruit, erin en notitie.
- Afvinkvakje per wissel voor gebruik langs het veld.
- Duidelijke tekst en symbolen die ook in zwart-wit te begrijpen zijn.
- Lange namen blijven volledig leesbaar; regels en kaartjes worden niet halverwege door een pagina-einde gesplitst.
- De coach kan de lijst, de kaartjes of beide afdrukken. De printweergave bevat geen bedieningsknoppen.
- **Voorkeur van de gebruiker:** alle zes veldsituaties met korte wisselinstructies en bank op één A4. De uitgebreidere wissellijst is optioneel een tweede A4. Cirkelvormige spelerssymbolen houden dezelfde liniekleuren, namen en nummers; avatars worden voor leesbaarheid weggelaten. Het rugnummer heeft geen `#` ervoor.

## Ontwerp voor een zelfstandige module

Vier onderdelen delen één plandocument:

| Onderdeel | Verantwoordelijkheid |
|---|---|
| Foto-invoer en herkenning | Foto omzetten naar een concept met bronverwijzingen en onzekere velden |
| Planbewerking en controle | Namen, tijden, beginopstelling, volgorde en wissellogica controleren |
| Weergave en export | Bewerkbaar blad, veldkaartjes, PNG en A4-print uit hetzelfde plan maken |
| DIA-adapter | Lokale spelers koppelen aan de wedstrijdselectie en het plan veilig importeren |

De eerste module gebruikt eigen lokale spelerssleutels. Daardoor heeft zelfstandig plannen geen Convex-wedstrijd-ID nodig. De domeinlogica krijgt geen afhankelijkheid van React, Clerk of Convex. De adapter verzorgt de vertaalslag naar DIA Live.

Handschriftherkenning wordt een vervangbaar onderdeel met een vast resultaatformaat. `AGENTS.md` schrijft momenteel voor: ‘Don't add external APIs yet — keep it self-contained’. Dit ontwerp voegt geen externe herkenningsdienst toe. Vóór de bouw van automatische herkenning moet een lokale oplossing met echte lijsten worden onderzocht, of de projectgrens expliciet worden aangepast. Foto-upload met handmatige overname telt niet als voltooide automatische herkenning.

## Uitwisselformaat, versie 1

Voorstel: een JSON-bestand met `format: "dia-substitution-plan"` en `version: 1`. Dit bewaart ook de beginopstelling en posities. Een extra CSV-export kan het wisselblad leesbaar maken voor Excel, maar vervangt het volledige plandocument niet.

| Veld | Betekenis |
|---|---|
| `documentId`, `revision` | Unieke planidentiteit en oplopende versie |
| `match` | Teamlabel, tegenstander, optionele datum, aantal perioden en totale reguliere speelduur |
| `players` | Lokale spelerssleutel, naam, `number` (rugnummer, `null` indien onbekend) en beschikbaarheid |
| `formation` | Veldvorm en posities met sleutel, positienaam en x/y-coördinaten |
| `startingLineup` | Speler per veldpositie, expliciete keeper en bankspelers |
| `steps` | Geordende wisselmomenten met stabiele sleutel, kwart/helft, absolute wedstrijdminuut en acties |
| `review` | Welke bronvelden nog onzeker zijn en of de coach het plan heeft gecontroleerd |

Elke actie heeft `id`, `kind` (`substitution` of `positionSwap`), `playerOutKey`, `playerInKey` en optioneel `note`. Bij een positiewissel betekenen de spelerssleutels speler A en B. De arrayvolgorde bepaalt de uitvoering, ook bij gelijke tijden. Als een regel wordt verplaatst, controleert de module de hele daaropvolgende reeks opnieuw.

Een concept mag onvolledige gegevens bevatten en lokaal worden opgeslagen. Appimport vereist een volledig gecontroleerd plan. Exporteer standaard geen foto in het uitwisselbestand; de oorspronkelijke foto is niet nodig om wissels in de app te zetten. Concepten op het apparaat hebben expliciete functies voor bewaren, openen en verwijderen.

`players.number` sluit aan op het bestaande rugnummer in `convex/schema.ts`. Voor oudere concepten geldt een ontbrekend veld als onbekend. Een rugnummer is een eindig, niet-negatief geheel getal; nul is toegestaan en er is geen willekeurige bovengrens. Ontbrekende, dubbele of ongeldige nummers vragen beoordeling en verhinderen publicatie, terwijl de minutenberekening op basis van spelerssleutels kan doorgaan. Spelers met dezelfde naam blijven afzonderlijke personen. Bewaar bij een goedgekeurde planversie de toen gebruikte naam en het rugnummer, zodat latere teamwijzigingen de oorspronkelijke vergelijking niet stilzwijgend veranderen.

## Aansluiting op de huidige app

De gewenste hoofdroute is inmiddels **vanuit de coachwedstrijd zelf**: open de wedstrijd, tik op ‘Foto wissellijst’, maak of kies een foto en ga naar verificatie. De zelfstandige module en bestanden blijven bruikbaar, maar de coach hoeft op het veld geen Excel-bestanden heen en weer te sturen. Na controle vult de module via de bestaande backend het wisselplan; er is geen schermbesturing nodig om de app voor de coach in te vullen.

De onderstaande mogelijkheden bestaan al; fotoherkenning, bestandsimport en print/export zijn nog toe te voegen.

| Bestaande code | Hergebruik / aandachtspunt |
|---|---|
| `convex/schema.ts` → `players.number` | Bestaande opslag voor rugnummers; samen met de naam tonen en via spelers-ID koppelen |
| `convex/schema.ts` → `substitutionPlans` | Opslag van volgorde, soort, kwart, minuut, spelers, status en notitie |
| `convex/substitutionPlans.ts` | Toevoegen, aanpassen, overslaan en uitvoeren van afzonderlijke planregels |
| `src/components/match/SubstitutionPlanPanel.tsx` | Bestaande coachweergave van het wisselplan; minuutlabel is ‘Wedstrijdminuut’ |
| `src/lib/substitutions/projectSubstitutionPlan.ts` | Virtuele veld/bankprojectie in volgorde; uitbreiden naar snapshots per stap |
| `src/components/match/ProjectedPitchPlanner.tsx` | Veldweergave per kwart, als referentie voor stappenkaartjes |
| `src/lib/formations/types.ts` | Veldposities met genormaliseerde coördinaten en koppeling via `fieldSlotIndex` |

### Importregels

1. De ingelogde coach kiest een wedstrijd waarvoor hij toegang heeft.
2. Lokale spelerssleutels worden gekoppeld aan echte `players`-ID's uit de **wedstrijdselectie** (`matchPlayers`). Alleen op de teamlijst staan is niet voldoende. Toon steeds naam én rugnummer; ontbrekende of dubbele nummers, onduidelijke namen en verschillen tussen foto en selectie vragen handmatige koppeling. Namen of rugnummers alleen zijn geen stabiele identiteit.
3. De coach ziet de gekoppelde spelers, beginopstelling, tijden en nieuwe planregels vóór het importeren.
4. Eén nieuwe servermutatie valideert en schrijft het hele plan atomair. Een reeks losse `addPlanItem`-aanroepen is ongeschikt: bij uitval kan een half plan ontstaan.
5. Iedere actie wordt een `substitutionPlans`-regel met `status: "pending"`. `sequence` volgt de expliciete planvolgorde, `targetQuarter` de periode en `targetMinute` de absolute wedstrijdminuut. De bestaande projectie sorteert op `sequence`, niet op tijd.
6. Bestaande regels blijven standaard behouden. De importpreview controleert de combinatie met het bestaande plan. Vervanging van openstaande regels wordt een afzonderlijke, expliciete keuze; uitgevoerde regels en wedstrijdgebeurtenissen blijven bewaard.
7. Een herhaalde import van dezelfde documentversie in dezelfde wedstrijd veroorzaakt geen dubbele regels. Daarvoor is een servercontrole op documentidentiteit en revisie nodig; die bestaat nog niet.
8. Import wijzigt op zichzelf geen live opstelling, score, speeltijd of wedstrijdgebeurtenissen. Een beginopstelling overnemen is een aparte keuze vóór de wedstrijd. Tijdens een lopende wedstrijd wordt een restplan tegen de actuele veld/banksituatie gecontroleerd.
9. Uitvoering blijft via de bestaande wedstrijdleiderrechten lopen. Opslaan van het plan voert geen wissels uit.

De server verifieert coachidentiteit, teamtoegang en spelerslidmaatschap opnieuw. Bestandsinhoud of frontendcontrole geldt nooit als autorisatie. Eventuele schema-uitbreidingen blijven backwards-compatible en reads gebruiken indexen. Importmetadata is alleen voor bevoegde coaches beschikbaar.

### Foto direct aan een wedstrijd toevoegen

1. **Foto maken:** een ingelogde coach opent de wedstrijd en kiest ‘Foto wissellijst’. De wedstrijd en bijbehorende selectie zijn al bekend.
2. **Concept bewaren:** de foto wordt gekoppeld aan een concept bij die wedstrijd. Upload, herkenning en beoordeling hebben afzonderlijke statussen; een geslaagde upload betekent nog geen herkend of goedgekeurd plan.
3. **Voorstel maken:** herkenning vult namen, zichtbare rugnummers, tijden, beginopstelling, bank, wissels en eventuele positienotities in. De gekoppelde wedstrijdselectie levert ontbrekende rugnummers. Spelerskoppelingen zijn suggesties totdat ambiguïteit is opgelost. De camera hoeft geen Excel-bestand te maken.
4. **Verifiëren:** één overzicht toont de bronfoto, het bewerkbare voorstel, veldstappen, berekende minuten en gerichte meldingen. De coach hoeft niet ieder duidelijk veld apart af te vinken; onzekere of tegenstrijdige velden vragen actie, plus een expliciete bevestiging van het volledige plan.
5. **Klaarzetten:** na actuele servercontrole worden alle planregels in één transactie toegevoegd. De coach ziet een duidelijk resultaat; opnieuw proberen na een verbindingsprobleem maakt geen dubbele regels.

De bronfoto blijft alleen beschikbaar binnen de bevoegde coachomgeving. Opslaan gebruikt de bestaande backend; opslag en uploadbeveiliging moeten nog worden toegevoegd. Stel een praktische bestandslimiet, ondersteunde afbeeldingsformaten en beeldverkleining in. Bewaar een lokaal herstelbaar concept bij een mislukte upload; beloof geen geslaagde synchronisatie zolang de server die niet heeft bevestigd. Automatische herkenning en offline herkenning zijn geen bestaande appfuncties.

Ook tijdens een wedstrijd kan een foto als concept worden toegevoegd. Het overnemen van een beginopstelling mag dan niet met terugwerkende kracht het al gespeelde deel veranderen. Voor een restplan is een actuele veld/banksnapshot nodig. Een achteraf toegevoegde lijst krijgt zichtbaar de datum en wedstrijdstatus van invoer, zodat zij niet wordt voorgesteld als een vooraf vastgelegd plan.

### Vast plan, aanpasbaar vervolg en echte registratie

Bewaar drie afzonderlijke bronnen:

| Bron | Inhoud | Gedrag |
|---|---|---|
| Goedgekeurd oorspronkelijk plan | Beginopstelling, selectie, posities, alle wisselstappen, geplande minuten en bronbeoordeling | Blijft bewaard als vaste vergelijkingsbasis |
| Aangepast vervolgplan | Nieuwe keuzes tijdens de wedstrijd, met versienummer en vanaf-moment | Nieuwe versie; overschrijft het oorspronkelijke plan niet |
| Werkelijk geregistreerde gebeurtenissen | Werkelijke startopstelling, in/uit, positiewissels, klok-/rust-/onderbrekingsmomenten en eventuele correcties | Worden door de app vastgelegd wanneer ze gebeuren |

De coach kan bij een geplande wissel kiezen voor **uitvoeren**, **uitstellen**, **overslaan** of **aanpassen**. Een ongeplande wissel blijft mogelijk via de gewone wisselknop. Een regel die open blijft staan na afloop wordt ‘niet bevestigd’, niet automatisch ‘overgeslagen’. Op het geplande tijdstip gebeurt er nooit vanzelf een wissel.

Bij ‘uitvoeren’ legt de app vast welke planversie en planactie erbij horen, welke spelers daadwerkelijk wisselen en op welk geregistreerd moment. Uitstellen laat het oorspronkelijke doelmoment behouden; het gewijzigde doel hoort bij het vervolgplan. Een afwijkingsreden, zoals blessure of tactiek, is optioneel en wordt niet door de module verzonnen.

Na elke echte wissel worden werkelijke minuten bijgewerkt en wordt het resterende plan vanuit de actuele veld/banksituatie opnieuw gecontroleerd. Het oorspronkelijke plan blijft hetzelfde. Een speler die door een blessure eerder is gewisseld, kan dus een foutmelding in een latere geplande regel veroorzaken; de module vraagt dan om aanpassing van het vervolg.

### Tijdens de wedstrijd: plan en uitvoering naast elkaar

- Per wissel: oorspronkelijke geplande minuut, geregistreerde uitvoering, verschil, spelers en status.
- Per speler: gepland tot het vergelijkbare wedstrijdmoment, werkelijk geregistreerd tot nu, afwijking, resterende planning en verwacht eindtotaal.
- Bij geen of onvolledige registratie: ‘onbekend’ of ‘nog niet bevestigd’. Het systeem neemt niet aan dat een geplande wissel ook werkelijk gebeurde.
- Werkelijke speeltijd komt uit de bestaande registratie, niet uit foto- of planningstijden. De UI moet lopende minuten tussen gebeurtenissen blijven verversen; alleen `Date.now()` in een reactieve backendquery is daarvoor geen zelfstandige secondeklok.
- Bewaar wedstrijdklok, wandkloktijd en actieve spelersminuten als verschillende grootheden. Toon een te late wissel op de wedstrijdklok; bereken spelersminuten zonder rust en geregistreerde onderbrekingen. Extra tijd wordt zichtbaar vermeld.

### Eindrapport: dit was het plan, zo is het gegaan

Na afloop verschijnt een tab **Plan en uitvoering**. Standaard vergelijkt deze met het oorspronkelijke goedgekeurde plan; een latere planversie is desgewenst selecteerbaar en wordt duidelijk genoemd.

| Onderdeel | Inhoud |
|---|---|
| Per speler | Geplande speel- en bankminuten, werkelijk geregistreerde minuten en verschil |
| Per wisselmoment | Geplande spelers en tijd, uitgevoerde spelers en tijd, op tijd/verschoven/aangepast/overgeslagen/niet bevestigd |
| Extra wissels | Uitgevoerde acties die niet bij een planregel horen |
| Opstelling | Gepland veld tegenover de geregistreerde veldsituatie op gekozen momenten, waar de historie compleet is |
| Datakwaliteit | Ontbrekende registratie, openstaande correcties, bronbeoordeling en welke planversie de basis is |

Het rapport krijgt een compacte afdruk op één A4; uitgebreidere wisseldetails of veldvergelijkingen kunnen op een tweede A4. Half veld en appbeeldtaal blijven gelden. Een rapport met onvolledige registratie blijft herkenbaar onvolledig, ook als de totalen toevallig sluiten.

De app weet wat er is geregistreerd. Als een coach een wissel pas later aanklikt, kan het registratiemoment afwijken van het echte moment. Daarom is een geautoriseerde correctie met werkelijk wisselmoment nodig, inclusief een bewaard correctiespoor. Na zo'n correctie worden de betrokken tijdsintervallen opnieuw berekend en op geldigheid gecontroleerd. Niet tegelijk de oude tellers én opnieuw afgespeelde gebeurtenissen optellen.

### Nog te bouwen voor betrouwbare vergelijking

De bestaande `substitutionPlans`-regels bewaren vooral de huidige planning en uitvoerstatus. `executePlanItem` bewaart `executedAt`, maar `matchEvents` heeft nog geen vaste verwijzing naar planversie en planactie. Dezelfde twee spelers kunnen meerdere keren wisselen, dus koppelen op alleen namen of ongeveer dezelfde minuut is onvoldoende.

Voorstel voor de uitbreiding, nog niet geïmplementeerd:

- Concept met wedstrijd, fotoreferentie, herkenningsresultaat, bewerkversie en controlebevindingen.
- Onveranderlijke goedgekeurde planversie met beginopstelling, spelerkoppelingen, acties, doelminuten, berekende minuten, bronbevestiging en eventueel een voorganger.
- Vastgelegde werkelijke beginopstelling bij aftrap; een planopstelling is geen bewijs van de echte start.
- Optionele verwijzingen `planVersionId` / `planActionId` en een vaste uitvoeringssleutel bij nieuwe wisselgebeurtenissen. De twee `sub_out` / `sub_in`-records horen bij één echte wissel; tel ze niet als twee wissels.
- Een expliciete gebeurtenis voor positiewissels, inclusief posities vóór en na. Zowel geplande als handmatige positiewissels wijzigen nu alleen `fieldSlotIndex`; die historie kan achteraf niet betrouwbaar uit de huidige stand worden teruggelezen.
- Correctiegebeurtenissen met verwijzing naar de oorspronkelijke uitvoering, actor, tijdstip en reden. Eerdere gegevens blijven herleidbaar.
- Een vergelijking-query op wedstrijd en planversie, met indexen en bestaande coachrechten. Oudere wedstrijden zonder volledige historie krijgen alleen de vergelijking die de aanwezige data ondersteunt.

Schema-uitbreidingen moeten optioneel en backwards-compatible zijn. De leesprojectie kiest één rekenbron voor werkelijke minuten en controleert die tegen de bestaande opgeslagen tellers. Nominale `gameSecond` kan extra tijd afkappen; trek voor precieze actieve speeltijd niet simpelweg twee van die labels van elkaar af. Werk met volledige gebeurtenistijdstippen en rust-/onderbrekingsintervallen. Bewaar intern voldoende precisie en rond af voor weergave.

De bestaande klok- en wisselpaden moeten daarvoor gerichte regressietests krijgen. De gedeelde bankwisselfunctie zet `lastSubbedInAt` momenteel ook bij een wissel in de rust of tijdens een onderbreking. Bij meerdere wissels binnen zo'n periode kan daardoor rusttijd in een spelerstotaal terechtkomen. Verifieer en herstel dit vóór het vergelijkrapport als betrouwbare werkelijke minuten wordt gepresenteerd. Test daarnaast een late bevestiging met correctie, twee wissels op hetzelfde moment, extra tijd, een afgebroken wedstrijd en een ontbrekende beginopstelling. Directe wijzigingen via opstellingsknoppen moeten hetzelfde historische spoor opleveren als wijzigingen via het plan.

## Controles vóór import en definitieve afdruk

**De lijst is invoer die fouten kan bevatten.** Correct herkende tekst, een logisch uitvoerbare reeks en een gewenste verdeling van speeltijd worden afzonderlijk beoordeeld. Een foto of een sluitende totaalsom krijgt nooit automatisch ‘goedgekeurd’.

### 1. Bron en selectie

- Onbekende namen, gelijkende namen, ontbrekende tijden, doorhalingen en dubbelzinnige positieaanwijzingen blijven zichtbaar als te controleren punten.
- Iedere speler heeft een unieke sleutel en staat precies eenmaal op het veld, op de bank of als afwezig geregistreerd. Een afwezige speler is niet beschikbaar voor een wissel.
- Posities en spelers zijn niet dubbel bezet; het aantal spelers past bij de wedstrijdvorm en er is één expliciet toegewezen keeper.
- Menselijke bronbevestiging is afzonderlijk van een geslaagde rekencontrole. Een aanpassing aan de broninterpretatie of het plan maakt de eerdere beoordeling ongeldig voor die nieuwe versie.

### 2. Wissels in volgorde simuleren

- De uitgaande speler staat op het veld; de invaller zit op dat moment op de bank. Een speler kan niet zichzelf vervangen.
- Een positiewissel gebruikt twee verschillende veldspelers met toegewezen posities. Bij een keeperwissel is de nieuwe keeper expliciet nodig; die wordt niet stilzwijgend afgeleid.
- Minuten zijn geldig, vallen binnen de speelduur en lopen niet terug. Gelijke tijden zijn toegestaan met expliciete actievolgorde.
- Een groep wissels op één moment wordt als geheel beoordeeld. Als één actie niet kan, wordt de groep niet deels toegepast.
- Bij de eerste ongeldige groep stoppen afhankelijke veldprojecties en eindtotalen. Toon waar de berekening nog betrouwbaar is; sla een foute regel niet over om daarna een ogenschijnlijk correct eindbeeld te tonen.
- Foutmeldingen noemen het moment, de speler en de reden, bijvoorbeeld: ‘Minuut 20: Sem staat al op het veld en kan niet opnieuw invallen.’

### 3. Minuten onafhankelijk berekenen en vergelijken

- Bereken per speler speeltijd, banktijd, momenten van in- en uitgaan en duur van veld- en bankblokken.
- Vergelijk berekende banken en banktotalen met de apart bewaarde waarden uit de foto. Ontbrekend betekent onbekend, niet nul en niet gecontroleerd.
- Bij een volledig geldig plan geldt voor iedere beschikbare speler speeltijd + banktijd = wedstrijdduur. De totale veldtijd past bij veldbezetting × speelduur; bij gewijzigde bezetting moet per interval worden gerekend.
- Een tijdblok over de rust heet ‘speelminuten zonder bankwissel’. ‘Onafgebroken actief’ kan alleen worden berekend met bekende rusten en onderbrekingen; rust is geen actieve speeltijd.
- Een totaalsom alleen is onvoldoende: ook individuele minuten, banklijsten en alle tussenstappen moeten kloppen.

### 4. Speeltijdverdeling als advies

Toon de verdeling afzonderlijk van structurele fouten. De coach stelt desgewenst een maximaal verschil, minimumspeeltijd of maximum bankduur in. Zonder zo'n keuze wordt ongelijkheid zichtbaar gemaakt als aandachtspunt, niet automatisch als fout. De keeper wordt apart beoordeeld.

In dit voorbeeld: Lukas 30 minuten, Lucas/Max/Krijn 40 minuten en de overige veldspelers 50 minuten; keeper Luc 60 minuten. De spreiding onder veldspelers is 20 minuten. Dat kan een bewuste keuze zijn en vraagt beoordeling, ook wanneer de lijst intern consistent is.

### Status en doorgaan

| Status | Betekenis | Gevolg |
|---|---|---|
| Fout | Onmogelijke wissel, ongeldige selectie of tegenstrijdige bronwaarde | Herstellen; geen definitieve import of betrouwbaar vervolg na de fout |
| Nog controleren | Onzekere broninterpretatie of volledige bronbevestiging ontbreekt | Coach beoordeelt; alleen conceptafdruk |
| Aandachtspunt | Bijvoorbeeld grote spreiding ten opzichte van een ingestelde voorkeur | Coach beslist; niet stilzwijgend aanpassen |
| Intern consistent | Simulatie en beschikbare broncontroles sluiten aan | Nog geen bewijs van juiste foto-overname, gewenste verdeling of appbevoegdheid |

De appadapter controleert ook na goedkeuring opnieuw de actuele selectie, rechten en veldsituatie. Printen en imports vermelden de planversie. De controle werkt vóór iedere export en na iedere wijziging.

### Eerste controlelaag beschikbaar

`src/lib/substitutions/validatePortableSubstitutionPlan.ts` bevat de onafhankelijke functie `validatePortableSubstitutionPlan(input, options)`. Deze accepteert onbekende invoer, controleert het ondersteunde bestandsformaat, simuleert wissels in volgorde en levert fouten, te controleren punten, tussenstanden, minuten en bronvergelijkingen op. De functie heeft geen toegang tot Convex of werkelijk gespeelde minuten. `readyToPublish` vereist ook expliciete bronbevestiging; `appIntegration.status` blijft afzonderlijk `not-validated`.

De voorbeeldexport voert deze controle vóór het tekenen uit en bewaart `lijstcontrole.json` met de gecontroleerde documentidentiteit, revisie en inhoudshash. Een blokkerende fout stopt de nieuwe export. Ontbrekende bronbevestiging houdt de afdruk op **CONCEPT**. De huidige uitvoer is intern consistent, maar geeft geen automatische bron- of appgoedkeuring. De toekomstige editor moet bronbevestiging bij een nieuwe import en na iedere inhoudelijke wijziging opnieuw openzetten. Een geïmporteerd bestand mag zichzelf niet goedkeuren met een meegestuurd `sourceConfirmed`-veld.

### Werkende lokale demonstratie

Open **`/demo/wisselmodule`** op de lokale frontend om de werking te proberen. De route gebruikt een vaste, handmatig overgenomen versie van dit praktijkvoorbeeld en schrijft niets naar Convex of een echte wedstrijd. De demo hoeft geen wedstrijd-ID of appspelers-ID te kennen. Herladen wist de oefenwedstrijd; er is nog geen opslag of synchronisatie van deze sessie.

Wat in de demo werkt:

- **Bron controleren:** een eigen bronfoto naast het voorbeeld tonen, namen en rugnummers aanpassen, de volledige beginopstelling, bank en alle vijf wisselmomenten inclusief positieruil bekijken. De foto blijft lokaal in de browser en wordt niet automatisch uitgelezen. Een foto of naam-/nummerwijziging zet de bronbevestiging opnieuw open. Het hele voorbeeld vraagt een expliciet akkoord voordat de oefenwedstrijd start.
- **Beginopstelling kiezen:** een dropdown boven het veld en in de broncontrole biedt 4-3-3 (uit foto), 4-4-2, 4-2-3-1, 3-5-2, 3-4-3 (ruit) en 5-3-2. Bij 3-4-3 staan de vier middenvelders in een ruit: CDM achter, LM/RM opzij en CAM voor. Alle formaties behouden de compacte veldverhouding 680:525; de ruit gebruikt kleinere schilden zodat het veld niet wordt uitgerekt. De bestaande appformaties zijn passend gemaakt voor het halve veld. Dezelfde spelers krijgen een voorlopige plek in de gekozen indeling; de coach moet hun posities en de latere positieruil opnieuw controleren. Namen, nummers, bank, wisseltijden en geplande minuten blijven behouden. Wijzigen vóór aftrap trekt eerdere goedkeuring in. Tijdens de wedstrijd toont een formatiekeuze eerst een voorbeeld; pas expliciet toepassen wijzigt het actuele veld. Het oorspronkelijke plan blijft bewaard en het uitgevoerde moment krijgt een veldsnapshot.
- **Half veld met schilden:** SVG-spelersschilden in voetbalgame-stijl, zoals de gevraagde FC27-beeldtaal, met naam, rugnummer en positie. Het zijn eigen interface-elementen, zonder spelersratings of koppeling aan een game. De bestaande DIA-veld- en liniekleuren blijven herkenbaar.
- **Vaste vergelijkingsbasis:** na akkoord bewaart de demosessie een onafhankelijke, onveranderlijke kopie van het plan. De lopende opstelling en geregistreerde demoacties veranderen die kopie niet. Dit is nog geen opgeslagen of gesynchroniseerde planversie in de app.
- **Klok en werkelijke demominuten:** de klok kan op 1×, 10×, 20×, 30× of 60× lopen, pauzeren en naar een volgend gepland moment springen. ‘+1 minuut’ telt vanaf het huidige tijdstip één minuut op en pauzeert daarna, zodat herhaald klikken gecontroleerd vooruitgaat. Deze stap telt speelminuten bij de huidige veldspelers, voert geen wissels uit, stopt bij rust/einde en vraagt bij rust expliciet om de tweede helft te starten. Rust stopt automatisch op 30 minuten, telt niet als speeltijd en vraagt hervatten; op 60 minuten eindigt de demo. Naar een moment springen voert geen wissel uit.
- **Uitvoeren of afwijken:** de coach bevestigt één geplande wissel of alle resterende acties van een groep op het huidige demotijdstip, slaat resterende acties over of kiest zelf een speler eruit en een invaller. Een afzonderlijk uitgevoerde actie wordt later niet opnieuw uitgevoerd. Twee veldspelers kunnen ook van positie ruilen; de klok en minuten worden daardoor niet veranderd. Een invaller neemt de huidige positie over; de groep bij 50 minuten voert aansluitend Sem naar CM en Olivier naar LM uit. Iedere groep wordt tegen de actuele veld- en bankbezetting gecontroleerd. Bij een fout verandert niets uit die groep.
- **Direct wisselen met twee tikken:** tik een veldspeler en een bankspeler in willekeurige volgorde. De tweede keuze voert direct uit; een extra bevestigingsknop is niet nodig. Opnieuw dezelfde speler kiezen wist de selectie. Vóór aftrap verandert dit de beginopstelling en vervalt het eerdere akkoord, zonder wedstrijdgebeurtenis. Tijdens de demo legt dit een wissel vast op het actuele tijdstip; een overeenkomende nog open actie in de eerstvolgende plangroep wordt direct afgehandeld, zodat resterende groepsacties geen dubbele wissel uitvoeren. Ook het dropdownalternatief voert uit na de tweede spelerskeuze.
- **Twee minuten te laat:** het 12-minutenscenario begint expliciet een nieuwe oefenwedstrijd met hetzelfde goedgekeurde plan en voert de eerste wisselgroep pas op 12 minuten uit. Het vervangt dus de lopende demosessie. De overige stappen kunnen daarna handmatig of via ‘Speel resterend plan uit’ volgen. Die laatste demonstratieknop voert de resterende geldige planstappen uit; bij een conflict blijft de eerdere sessietoestand bewaard en verschijnt een foutmelding.
- **Plan en werkelijk:** tijdens het oefenen worden geplande en uitgevoerde minuten op dezelfde verstreken speeltijd vergeleken, naast de volledige geplande eindtotalen. Na 60 minuten is dat de eindvergelijking. ‘Werkelijk’ betekent hier uitsluitend: geregistreerd binnen de oefenwedstrijd. Openstaande stappen zijn geen bewijs van uitvoering.

De demo bevat geen OCR, serverupload, bestandsimport, wedstrijdselectie-ophaling, appimport of Convex-synchronisatie. De PDF-, Excel-, PNG- en JSON-voorbeeldexports blijven afzonderlijke bestaande bestanden; demoaanpassingen genereren die niet opnieuw. De PDF's en PNG's behouden de cirkelvariant en de compacte indeling op één A4, met de wissellijst als optionele tweede A4.

Code: `src/app/demo/wisselmodule/page.tsx`, `src/components/substitutions/SubstitutionDemo.tsx`, `PlayerShield.tsx`, `src/lib/substitutions/demoPlan.ts` en `demoMatch.ts`. De pure demo-engine heeft geen React-, Clerk-, Convex- of netwerkafhankelijkheid. Zij telt gehele gespeelde seconden per veldspeler en rondt pas af voor de schermweergave; pauze en rust voegen geen seconden toe.

#### Handmatig beginnen en afdrukken (30 september 2026)

- **Speelminuten laatste wedstrijden:** inklapbare naslag met de 14 demospelers voor 26 september (TSV Gudok), 19 september (Dongen) en 12 september (VOAB), read-only opgehaald uit de bestaande appquery. Getypeerde momentopname met zichtbare ophaaldatum; geen live synchronisatie, automatische spelerskeuze of claim over historische keeperminuten. De openbare wedstrijdhistorie is gelinkt. Er ontbreken afzonderlijke beginposities; de actuele/eindopstelling geldt niet als basiself.
- **Beginposities handmatig instellen:** per formatiepositie een dropdown met aanwezige spelers. Een bestaande veldspeler ruilt van plek, een bankspeler neemt de plek over en de vervangen speler gaat naar dezelfde bankplek. Keeperidentiteit blijft consistent. Wijzigen vereist nieuwe broncontrole; bestaande fotowissels blijven staan en eventuele conflicten worden gemeld.
- **Zonder foto starten:** een expliciete knop bewaart selectie en opstelling, verwijdert de fotowissels en bijbehorende bankminuten en trekt akkoord in. Er worden geen wissels vooraf bedacht. Na controle kan de coach starten en zelf wisselen. Volledige bewerking van nieuwe geplande wisselregels komt later.
- **Afdrukken:** kies ‘Wisselplan vooraf’ of ‘Uitvoering achteraf’. Het afdrukvoorbeeld gebruikt dezelfde vectorvelden als de browserafdruk. Per A4 staan maximaal zes halve velden met namen, nummers zonder hekje, bank en wisselinstructies. Een ongecontroleerd plan krijgt CONCEPT; ongeldige opstellingen of niet volledig simuleerbare wissels blokkeren de planprint. De uitvoering bevat uitsluitend opgeslagen uitgevoerde veldsnapshots (ook losse wissels, positieruil en formatiewissel), met werkelijk tijdstip en afwijkend gepland tijdstip. Extra momenten leveren extra A4's op; overgeslagen momenten verschijnen niet als uitgevoerde wissels. Oudere open sessies zonder snapshots vragen een nieuwe demo voor deze afdruk.

De afdruk voor het bronvoorbeeld bevat één A4 met start + vijf wisselmomenten. Dit vernieuwt de eerdere PDF-/PNG-exports op schijf niet automatisch. Fysiek afdrukken en bewaren als PDF lopen via het afdrukvenster van de browser.

#### Korte demo-proef

1. Open ‘Bron controleren’. Controleer de namen en nummers, beginopstelling en alle stappen. Een ontbrekend of dubbel rugnummer moet akkoord blokkeren. Herstel de invoer en bevestig het voorbeeld.
2. Start het scenario met de eerste wissel op 12 minuten. Het plan blijft op 10 minuten staan. In de vergelijking op 12 minuten hebben Revi en Sem ieder **2 minuten meer** gespeeld dan gepland; Macéo en Krijn ieder **2 minuten minder**.
3. Speel het resterende plan uit. Aan het einde zijn de demototalen Revi 52, Sem 52, Macéo 48 en Krijn 38 minuten. De overige spelers volgen hun oorspronkelijke totaal. Alle veldminuten samen blijven **660**, inclusief 60 minuten voor keeper Luc.
4. Begin opnieuw en volg alle stappen op tijd. Eindverschillen moeten nul zijn. Controleer tussendoor dat pauze en rust de spelersminuten stilzetten, en dat Sem na de 50-minutengroep centraal staat en Olivier links.
5. Probeer daarnaast een handmatige wissel die een latere planregel onmogelijk maakt. Die regel moet een melding geven zonder deels te worden uitgevoerd. Controleer dat het oorspronkelijke plan en eerdere demoacties intact blijven.

De engine is op 30 september 2026 gecontroleerd met **15 geslaagde gerichte tests**, gerichte strict TypeScript-controle en ESLint. De tests omvatten late uitvoering, rust/pauze, atomische foutafhandeling, overslaan, handmatige wissels, de positieruil, onveranderlijke gebeurtenissen en behoud van 660 veldminuten. De volledige projectbrede TypeScript-check wordt nog gehinderd door bestaande legacykopieën onder `devoorbereiding/`; een geslaagde lokale demotest is geen bewijs dat de gehele app releaseklaar is. De browserproef op 30 september is geslaagd: een dubbel rugnummer blokkeert akkoord, herstellen en bevestigen opent de demo, de wissel op 12 minuten geeft de verwachte plus/min twee minuten, en de eindvergelijking telt 660 minuten. Ook springen naar 20 minuten, uitvoeren, stoppen bij rust, wisselen in de rust, hervatten op echte snelheid en pauzeren zijn gecontroleerd. De mobiele veldweergave is op 390 pixels breed gecontroleerd zonder horizontale pagina-overloop. Samen slagen 60 gerichte tests (45 validator, 15 engine). Dit is geen test van echte synchronisatie.

#### Later: bewijs van echte appintegratie met twee schermen

Gebruik na het bouwen van de adapter een **afzonderlijke testwedstrijd in de testomgeving**, met gecontroleerde selectie en bevoegde testcoach. Scherm 1 bedient de coachwedstrijd; scherm 2 opent dezelfde wedstrijd als tweede, alleen meekijkende coachweergave. De openbare weergave is een aanvullende controle en mag het privéplan of de bronfoto niet tonen.

1. Voeg de foto vanuit de testwedstrijd toe, verifieer de volledige overname en zet het plan klaar. Controleer op beide schermen dezelfde goedgekeurde versie en openstaande planregels. De live opstelling en werkelijk gespeelde minuten mogen door deze import niet veranderen.
2. Herhaal dezelfde import na een gesimuleerde verbindingsonderbreking: er mag geen dubbele regel ontstaan. Wacht op de bevestiging van de backend voordat het scherm ‘gesynchroniseerd’ meldt.
3. Start de testwedstrijd, voer de eerste groep op 12 minuten uit en controleer op scherm 2 de werkelijke opstelling, één samenhangende wisselregistratie en de bijgewerkte minuten. Test ook rust, positieruil, een handmatige wissel en een correctie van een laat geregistreerd tijdstip.
4. Sluit de wedstrijd af en herlaad beide schermen. Plan, uitvoering en eindvergelijking moeten opnieuw uit opgeslagen gegevens verschijnen. Het oorspronkelijke plan behoudt zijn doelmomenten en totalen.

Die proef levert pas integratiebewijs wanneer beide schermen hun gegevens uit dezelfde backendwedstrijd ontvangen. Twee tabs van de huidige lokale demo hebben ieder hun eigen oefensessie en tonen geen synchronisatie aan.

### Later: vergelijken met werkelijk gespeelde minuten

De geplande minuten uit de foto zijn geen bewijs dat iemand die minuten echt gespeeld heeft. De app registreert al gespeelde minuten via `api.matches.getPlayingTime` (`convex/matchQueries.ts`, geëxporteerd in `convex/matches.ts`). Rust en geregistreerde onderbrekingen worden daarbij afzonderlijk behandeld. De toekomstige module kan daar na koppeling op aansluiten.

Toon per speler afzonderlijk **gepland tot nu**, **werkelijk geregistreerd tot nu**, **afwijking**, **gepland resterend** en **verwacht eindtotaal**. Het verwachte eindtotaal begint bij de werkelijke registratie en simuleert alleen het resterende plan vanuit de actuele veld/banksituatie. Een overgeslagen of te late wissel kan de rest van het plan ongeldig maken.

Werkelijke minuten vereisen een geautoriseerde wedstrijdsnapshot met echte speler-ID's en het moment van ophalen. Zonder die koppeling blijven ze ‘onbekend’, nooit nul of ingevuld vanuit het oude plan. Een coach kan op basis van de verschillen een aanpassing voorgesteld krijgen; er worden geen wissels automatisch uitgevoerd. Speeltijd uit eerdere wedstrijden kan later een apart gekozen vergelijkingsperiode worden en wordt niet bij de huidige wedstrijd opgeteld zonder die keuze.

## Bouwvolgorde en acceptatie

1. **Plan en print:** zelfstandig bewerkbaar blad, selectie/beginopstelling, controle per stap, veldkaartjes, PNG-export en A4-print. Geen appkoppeling nodig om dit te gebruiken.
2. **Fotoherkenning:** camera/fotokeuze, daadwerkelijke extractie en correctiescherm. Toets verschillende echte handgeschreven lijsten, pijlen, afkortingen en onleesbare delen. Alleen een uploadscherm voldoet niet.
3. **DIA-koppeling en wedstrijdfoto:** foto vanuit de wedstrijd toevoegen, selectie ophalen, verifiëren en atomair/herhaalbaar klaarzetten. Leg de vaste planversie en werkelijke beginsituatie direct goed vast.
4. **Uitvoering en vergelijking:** planacties koppelen aan echte gebeurtenissen, volledige positiehistorie, actuele minuten, afwijkingen, correcties en eindrapport. De gegevenskoppeling begint bij stap 3 zodat latere rapportage niet hoeft te gokken.

Klaar wanneer een coach een echte handgeschreven lijst kan fotograferen, fouten corrigeren, het volledige plan inclusief beginopstelling bewaren, consistente stappenkaartjes en een leesbare A4-lijst maken, en datzelfde plan zonder dubbele regels in de gekozen wedstrijd kan laden. Verifieer ook lange namen, meerdere wissels op één moment, terugkerende spelers, positiewissels, keeperwissels, afwezige spelers, 2 en 4 perioden, tijdconversie, mobiele camera-invoer en paginering.

## Praktijkvoorbeeld uit de aangeleverde foto

Het voorbeeld is uitgewerkt in `outputs/wisselmodule-01a0e17c/`: een JSON-plandocument, een bewerkbaar Excel-blad, een CSV-weergave van de acties, een A4-wissellijst, printbare veldkaartjes en zes losse PNG-kaartjes. De afdrukken en PNG's zijn exports van deze versie; wijzigingen in Excel werken daar niet automatisch in door. Ook een appimporter voor JSON of Excel bestaat nog niet.

De bron combineert vier onderdelen op één vel: een ruimtelijke beginopstelling, een beginbank, wissels met banklijsten per tien minuten en een controle van de bankminuten onderaan. Herkenning moet dus ook de betekenis en onderlinge samenhang bewaren.

- **Wedstrijd:** 60 minuten, rust na 30 minuten, 11 spelers op het veld en 3 reserves. Er zijn 12 bankwissels en 1 extra positiewissel; samen leveren ze 6 veldsituaties op. Het aantal perioden voor de app wordt nog uit de gekozen wedstrijd gehaald, niet afgeleid uit de tienminutenblokken.
- **Namen:** gebruiker bevestigt dat Luc (keeper), Lucas (begint voorin) en Lukas (begint op de bank) drie verschillende spelers zijn. Gelijkende namen mogen niet automatisch worden samengevoegd.
- **Richting:** ‘Macéo voor Revi’ betekent Macéo erin, Revi eruit. De tekstvolgorde op de foto is dus omgekeerd aan een UI-tabel met de kolommen Eruit en Erin.
- **Standaardpositie:** gebruiker bevestigt dat een invaller de plek van de uitgaande speler overneemt wanneer geen extra positieaanwijzing is gegeven. De notitie ‘wissel op positie’ bij 10 minuten volgt die regel.
- **Expliciete afwijking bij 50 minuten:** Olivier vervangt Krijn; daarna gaat Sem centraal op het middenveld en neemt Olivier de plek van Sem links over. Gebruiker heeft dit bevestigd. In het model volgen eerst de drie bankwissels en daarna een `positionSwap` tussen Sem en Olivier.
- **Broncontrole:** de bank na elk moment en alle 13 vermelde bankminuten komen overeen met simulatie. Totaal: 180 bankminuten (3 × 60) en 660 speelminuten (11 × 60, inclusief keeper). Luc heeft 0 bankminuten; hij staat niet in de onderste bronlijst.
- **Beginsnapshot:** de eerste rijen geven de ruimtelijke opstelling. Veldkaartjes volgen links/rechts zoals op de foto en de aanval staat boven. De bron bevat geen expliciete positienamen voor ieder vak.

Deze broncontroles worden acceptatiegevallen voor de toekomstige module. De oorspronkelijke handgeschreven banktotalen blijven afzonderlijke bronwaarden; de berekende totalen mogen ze niet overschrijven.

### Bevestigde beeldtaal

De gebruiker kiest een **half veld** voor de afbeeldingen, met de beeldtaal van de bestaande app. De kaartjes tonen het eigen doel en strafschopgebied onderaan; bovenaan staan de middenlijn en een halve middencirkel. Alle elf spelers worden over die helft verdeeld. Dit is een weergavekeuze voor de opstelling, geen wijziging naar een kleinere wedstrijdvorm.

Bronnen in de app: `src/components/match/PitchView.tsx`, `FieldLines.tsx`, `FieldPlayerCard.tsx`, `src/lib/roleColors.ts`, `src/lib/fieldConfig.ts` en `src/app/globals.css`.

- Grasgroen `2d7a3a`, subtiele veldstructuur en witte lijnen.
- De nieuwste schermvariant gebruikt op verzoek van 30 september eigen voetbalgame-schilden met een donkere binnenkant en rand in de liniekleur. Positie, groot rugnummer en naam staan op het schild. De eerdere cirkelvariant blijft aanwezig in de bestaande printbestanden. Het rugnummer heeft in beide varianten geen `#`, ook niet in wisselinstructies of op de bank.
- Keeper amber `#f59e0b`, verdediging blauw `3b82f6`, middenveld groen `10b981`, aanval rood `#ef4444`.
- DIA-groen `1B5E20` voor koppen en accenten. De app gebruikt Inter; de huidige PDF-export gebruikt Arial als beschikbare sans-serif.
- De halve veldgeometrie volgt de onderste helft van de appconfiguratie voor elf tegen elf: 680 × 525. Slotcoördinaten blijven percentages binnen deze weergave.
- Naam én rugnummer zijn de vaste weergave, ook op papier. De voorbeeldfoto bevat geen rugnummers; deze zijn op 27 september 2026 uit de actuele productiespelerslijst van JO13-2 opgehaald. Blad-ID's zijn nooit rugnummers.
- De papieren lijst houdt een witte achtergrond en duidelijke tekst; de veldkaartjes gebruiken de appkleuren.

Revisie 4 van de bestaande exports bewaart deze presentatiekeuze als `playerShape: "circle"` en `numberPrefix: ""`. De veldposities, spelerskoppelingen, liniekleuren en wisselgegevens veranderen hierdoor niet. De op 30 september toegevoegde lokale demo gebruikt op verzoek opnieuw schilden in voetbalgame-stijl. Deze schermvariant heeft de cirkelvormige printbestanden niet vervangen.

### Gecontroleerde rugnummers uit de app

Revisie 3 gebruikt de actuele JO13-2-teamlijst van DIA Live: Tygo 11, Lucas 7, Revi 5, Loek 17, Sem 15, Miloud 8, Jody 2, Max 18, Matteo 3, Olivier 9, Luc 1, Macéo 16, Krijn 10 en Lukas 14. De gebruiker heeft bevestigd dat de aanvankelijk als ‘Milad’ overgenomen naam **Miloud Karmous 8** is. De vaste lokale sleutel `milad` blijft bewaard om bestaande acties niet te verbreken; de zichtbare naam is gecorrigeerd.

De nummers komen uit de actuele productiequery `adminPlayers:listPlayersByTeam`, na teamselectie via `teams:getBySlug`. `wisselplan.json` bewaart de bron, het controlemoment, de volledige appnamen en spelers-ID's. Oude seednummering en de lokale ontwikkelomgeving zijn hiervoor niet gebruikt. Dit controleert de teamkoppeling; voor echte import blijft controle van lidmaatschap van de gekozen wedstrijdselectie nodig. Er is niets in de app gewijzigd.

## Nog af te stemmen

- De lokale demo beoordelen en de volgende bouwstap kiezen: duurzame planopslag, volledige planbewerking of de wedstrijdadapter.
- Herkenning toetsen op meer handgeschreven lijsten, naast het uitgewerkte praktijkvoorbeeld.
- De herkenningsmethode binnen de huidige projectgrens zonder nieuwe externe API's.

## Route zonder foto: voorstel voor de beginopstelling

**Status: handmatige route en gedateerde minutennaslag beschikbaar in de lokale demo; automatische voorstellen en live appkoppeling nog niet gebouwd.** Een ontbrekende foto mag de voorbereiding niet blokkeren. De module krijgt daarom naast fotoherkenning een route voor een uitlegbaar voorstel op basis van gecontroleerde speelminuten, positievoorkeuren en daadwerkelijk bewaarde eerdere beginopstellingen. De huidige demo bevat nog geen werkende historische aanbevelingsfunctie. De foto-opstelling uit het voorbeeld en de demominuten zijn geen historische wedstrijdgegevens.

### Coachproces

1. Kies de doelwedstrijd, formatie en aanwezige selectie. Controleer naam, rugnummer, keeperkeuze en eventuele vastgezette posities. De voorgestelde standaardperiode is de laatste drie afgeronde wedstrijden vóór de doelwedstrijd; de coach ziet en bevestigt de concrete bronwedstrijden en kan de periode veranderen.
2. Controleer de brongegevens per wedstrijd: geregistreerde speelminuten, aanwezigheid, gebruikte wedstrijdduur en beschikbare beginopstelling. Een ontbrekende registratie krijgt ‘onbekend’. Verdachte of onvolledige gegevens krijgen een zichtbare toelichting en worden pas gebruikt nadat de coach ze heeft gecorrigeerd of expliciet bevestigd.
3. Vraag het beginvoorstel op. Toon de elf spelers op de gekozen halve veldweergave, de bank en per speler een reden, bijvoorbeeld ‘minder gespeeld in de gekozen wedstrijden’ of ‘eerder gestart op deze positie’. Vermeld de bronwedstrijden, het aantal bruikbare registraties en ontbrekende informatie. Een voorstel is nog geen coachakkoord.
4. Bespreek het voorstel met de coaches, verwissel spelers of posities en werk het wisselplan uit. Een beginvoorstel genereert niet stilzwijgend een volledig wisselschema. Na iedere wijziging worden de veldbezetting en alle aanwezige planstappen opnieuw gecontroleerd en vervalt het akkoord voor de gewijzigde revisie.
5. Bevestig en bewaar de planversie. Print vóór de wedstrijd de beginopstelling en veldplaatjes per gepland wisselmoment op A4, met naam en nummer, bank en wisselinstructies. Een concept mag ook worden afgedrukt, maar draagt zichtbaar ‘Concept — nog niet bevestigd’. De afdruk noemt versie en doelwedstrijd, zodat coaches dezelfde versie bespreken.
6. Kies afzonderlijk ‘Doorzetten naar wedstrijd’ en bevestig de concrete wedstrijd en planversie. De backend controleert coachbevoegdheid, selectie en wedstrijdstatus en bewaart het plan atomair en herhaalbaar. Deze actie voert geen live wissel uit en overschrijft geen al gespeelde minuten. Achteraf worden dezelfde vaste planversie en de echte wedstrijdregistraties vergeleken.

### Beschikbare gegevens en ontbrekende historie

Een read-only controle van de bestaande productiequery `teams:getMatchHistory` op 30 september 2026 geeft voor JO13-2 negen afgeronde wedstrijden: vijf met spelersminuten en vier zonder spelersminuten. De query retourneert `playerId`, `playerName` en `minutesPlayed`, maar geen aanwezigheid of eerdere beginopstelling. Bovendien gebruikt zij nu `minutesPlayed ?? 0`: een ontbrekende registratie en werkelijk nul minuten zijn in dit antwoord niet te onderscheiden. Deze response is daardoor op zichzelf onvoldoende om een automatisch eerlijkheidsvoorstel te onderbouwen.

Er staan registraties in die coachcontrole vereisen, waaronder één wedstrijd met zestien spelers op precies 41,3 minuten en één met drie spelers op 70,8 minuten. Een getal boven de nominale duur is niet op zichzelf bewijs van een fout: de werkelijke wedstrijdduur en tijdregistratie moeten worden nagegaan. Een nulwaarde bewijst evenmin aanwezigheid of een eerdere bankbeurt. De module leidt uit minuten geen blessure, ziekte, fitheid of reden van afwezigheid af.

De bestaande geautoriseerde route bestaat uit `matches.verifyCoachAccess`, `matches.getCoachTeamSetup({ teamId })` en `matches.getForCoach({ matchId })`. De laatste geeft onder meer `absent`, positievoorkeuren, `fieldSlotIndex` en `formationId`. Dit zijn huidige gegevens; de velden `matchPlayers.onField` en `fieldSlotIndex` en `matches.formationId` worden overschreven. Bij aftrap wordt nog geen beginsnapshot bewaard, en directe positie- en formatiewijzigingen vormen geen volledige historische opstellingsregistratie. Een eindopstelling mag dus niet als eerdere beginopstelling worden gebruikt.

Voor de toekomstige koppeling is een coachbeveiligde historiequery nodig die ontbrekende waarden behoudt en alleen teams van die coach uitleest, met bestaande team-, wedstrijd- en spelerindexen. Geen nieuwe publieke historie-endpoint of omzeiling van coachrechten. Een lokale proef kan een gedateerde, door een coach gecontroleerde export van hetzelfde invoercontract gebruiken. Er is momenteel geen geverifieerde historische opstellingsexport beschikbaar in de demo; fictieve historie mag dat gat niet opvullen.

### Voorgesteld invoercontract

Dit is een nieuw, nog te implementeren contract naast `PortableSubstitutionPlan`; het bestaande plandocument bevat deze historievelden niet.

| Onderdeel | Vereiste velden en betekenis |
| --- | --- |
| Herkomst | `version`, `teamId`, `fetchedAt`, `sourceEnvironment`, `sourceKind` (`coach-query` of `coach-reviewed-export`) en `sourceRevision`; onbekende bron blokkeert automatisch adviseren. |
| Doelwedstrijd | `targetMatchId`, `scheduledAt`, `regulationDurationMinutes`, `fieldPlayerCountIncludingKeeper`, `formationId` en de vaste formatie-`slots` met `id` en geldige `position`. De historie hoort bij hetzelfde team en ligt vóór deze wedstrijd. |
| Beschikbare spelers | Per echte `playerId`: `name`, `number`, `availability` (`present`, `absent`, `unknown`), `primaryPosition`, `secondaryPosition`, `keeperEligible` en optioneel `lockedSlotId`. Aanwezigheid en keepergeschiktheid zijn door de coach bevestigd; ontbrekende posities blijven onbekend. |
| Bronwedstrijden | Per `matchId`: `scheduledAt`, `finishedAt`, `status`, `regulationDurationMinutes`, `recordedPlayingDurationMinutes` of `null`, `selected`, `reviewStatus` (`unreviewed`, `confirmed`, `excluded`) en `reviewNote`. Ontdubbel op wedstrijd-ID, niet op tegenstander of datum. |
| Spelershistorie | Per bronwedstrijd en speler: `minutesPlayed: number \| null`, `keeperMinutes: number \| null`, `attendance` (`present`, `absent`, `unknown`), `eligibleMinutes: number \| null` en `reviewStatus`. `null` betekent onbekend; nul betekent bevestigd nul. Een afwezige speler krijgt voor die wedstrijd geen speelminutentekort. Keeperminuten zijn onderdeel van, niet extra boven op, `minutesPlayed`. |
| Eerdere beginopstelling | `startingLineupSnapshot` of `null`: `snapshotId`, `revision`, `capturedAt`, `source` (`kickoff` of `coach-confirmed-history`), `formationId`, gekopieerde `slots`, `keeperPlayerId`, `field: [{ playerId, slotId }]` en `bench: playerId[]`. Een retrospectieve coachbevestiging blijft herkenbaar als zodanig. |
| Voorkeuren en akkoord | `selectedMatchIds`, `lockedKeeperPlayerId` of `null`, `lockedAssignments`, `reviewedByCoachId`, `reviewedAt` en de exacte `inputRevision`. Een wijziging in selectie, bronnen, formatie of beperkingen maakt het eerdere akkoord ongeldig. |

Geldige minuten zijn eindig, niet negatief en passen bij de gecontroleerde speelduur en aanwezigheid. De historische minuten worden niet begrensd tot zestig om afwijkingen onzichtbaar te maken. Ongeldige positiecodes worden gemeld; de bestaande algemene positiehelper met verdediging als terugval mag een onbekende positie niet stilzwijgend in een verdediger veranderen.

### Voorstelregels en volgorde

De coach bevestigt eerst de beschikbare selectie, precies één keeper en eventuele vaste plaatsen. Afwezige of nog onbevestigde spelers komen niet automatisch op het veld. Keeperselectie blijft apart van de vergelijking tussen veldspelers; een speler wordt nooit alleen wegens weinig minuten tot keeper gemaakt. Ontbreekt een geschikte bevestigde keeper of zijn er te weinig aanwezige spelers, dan vraagt de module om handmatig aanvullen.

De bronwedstrijden worden gesorteerd op `scheduledAt` aflopend, met `finishedAt` als expliciete terugval en `matchId` als stabiele laatste sortering. De interface toont de gebruikte datum. Alleen afgeronde, geselecteerde en bevestigde registraties vóór de doelwedstrijd tellen mee. Geen datum of onduidelijke wedstrijdherkomst betekent broncontrole, geen geraden volgorde.

Voor spelers met bruikbare historie berekent de module zowel totaal gespeelde minuten als het aandeel `som(minutesPlayed) / som(eligibleMinutes)` over hun bevestigde aanwezigheid. Daarmee wordt een gemiste wedstrijd niet als banktijd gerekend. Toon teller, noemer en dekkingsaantal naast het resultaat; nul bruikbare wedstrijden geeft ‘geen historie’, nooit een aandeel van nul. Keeperminuten worden afzonderlijk behandeld en niet gebruikt om een veldspeler oneerlijk met een vaste keeper te vergelijken; gemengde rollen zonder betrouwbare uitsplitsing vragen coachcontrole.

Een volledige veldtoewijzing wordt beoordeeld, zodat vroeg kiezen voor één positie niet een andere positie onbezet laat. De volgorde is: alle vaste afspraken en bezettingsregels respecteren; voldoende passende posities bezetten; binnen gelijkwaardige positiekeuzes het laagste geverifieerde gespeelde aandeel voorrang geven; bij gelijke aandelen het laagste geverifieerde minutentotaal; vervolgens minder eerdere basisplaatsen als betrouwbare beginsnapshots bestaan; vervolgens de meest recente bevestigde start op de betreffende positie. Primaire positie gaat vóór secundaire positie. Alleen historische positie-ervaring zonder passende voorkeur wordt als aparte coachkeuze aangeboden. De laatste technische gelijkspelregel is `playerId`, zodat hetzelfde invoercontract steeds hetzelfde voorstel geeft. Geen willekeur, verborgen kwaliteitscijfer of optimalisatie op doelpunten.

De uitkomst bevat `inputRevision`, toegewezen veld en bank, per speler de gebruikte waarden en bron-ID's, `reasonCodes`, ontbrekende informatie en eventuele conflicten. Coaches kunnen iedere keuze wijzigen. Bij te weinig betrouwbare historie blijft handmatig opstellen mogelijk met de melding ‘Onvoldoende historie voor een onderbouwd voorstel’; voorkeuren en vaste coachkeuzes mogen dan helpen, maar de interface beweert niet dat speelminuten of eerdere basisplaatsen zijn meegewogen.

### Beginsnapshots en acceptatie

Bewaar bij planbevestiging een onveranderlijke **geplande beginopstelling**, verbonden aan de planrevisie. Bewaar bij de werkelijke aftrap daarnaast de **werkelijke beginopstelling**, inclusief selectie, bank, keeper en een kopie van de formatieposities. Deze twee snapshots mogen verschillen en blijven gescheiden. Latere wijzigingen voegen gebeurtenissen of nieuwe revisies toe; zij herschrijven geen eerdere snapshot. Correcties vermelden welk record zij vervangen. Zo kan een latere wedstrijd de echte eerdere basis gebruiken en kan de eindvergelijking het oorspronkelijke plan blijven tonen.

Acceptatiegevallen voor deze route:

1. Zonder foto kan de coach een volledige selectie en formatie voorbereiden, een voorstel controleren, aanpassen, bevestigen en het plan afdrukken. Er wordt geen fotobron vereist of nagebootst.
2. Onbekende minuten en bevestigde nul minuten blijven verschillend, ook na import/export. Afwezigheid verhoogt geen tekort; onbekende aanwezigheid blokkeert het meetellen van die registratie.
3. Minder gespeelde, passende veldspelers krijgen binnen dezelfde bevestigde criteria aantoonbaar voorrang. Keeper en vastgezette plaatsen blijven behouden. Iedere keuze toont de gebruikte bron en reden.
4. Eindopstellingen en het handgeschreven voorbeeld tellen nooit als vroegere basisplaatsen. Zonder echte beginsnapshots toont het voorstel dat eerdere basisplaatsen niet zijn meegewogen.
5. Dezelfde invoerrevisie levert dezelfde toewijzing op. Iedere veldpositie en speler komt hoogstens eenmaal voor; het aantal veldspelers klopt en er is precies één keeper. Onoplosbare beperkingen geven een conflict zonder gedeeltelijke toepassing.
6. Een nieuwe speler, ontbrekende historie of onvolledige registratie leidt tot expliciete coachkeuze. De module verzint geen minuten, afwezigheidsredenen of positie-ervaring en presenteert geen ononderbouwde rangorde.
7. Wijzigingen na bevestiging maken een nieuwe conceptrevisie. Oude planprint, geplande startsnapshot en werkelijke aftrapsnapshot blijven reproduceerbaar; plan en werkelijkheid worden niet samengevoegd.
8. Alleen een bevoegde coach kan een expliciet gekozen plan naar de gekozen wedstrijd doorzetten. Herhalen veroorzaakt geen dubbele regels; fouten wijzigen niets. De koppeling wordt pas als werkend aangeduid na een geslaagde proef met twee schermen op dezelfde testwedstrijd.

### Aanvullende verificatie 30 september 2026

144 tests geslaagd in acht bestanden voor projectie, validatie, demo-engine, formaties, beginopstelling en UI/print. De actuele gerichte TypeScript- en ESLint-controles slagen. Browsercontrole: historische tabel met 42 waarden zichtbaar, handmatige beginposities bereikbaar, en het afdrukvoorbeeld toont zes kaarten op één A4 zonder frame-overloop. Het afdrukvoorbeeld is visueel gecontroleerd; er is geen fysieke afdruk gemaakt. Automatisch opstellingsadvies, OCR en live appoverdracht blijven nog te bouwen.

### Read-only Gilze-import — 2 oktober 2026

De lokale module opent nu met de coachopstelling en het wisselplan voor **DIA JO13-2 – Gilze O13-1, 3 oktober 2026 om 09:00**. Het fotovoorbeeld blijft apart beschikbaar via de bronkeuze. Opnieuw herstelt de gekozen bron, niet automatisch de foto.

Bron: productie-Convex, opgehaald op **2 oktober 2026 om 21:41:57 CEST** via bestaande geautoriseerde projecttoegang en een eenmalige, uitsluitend-lezen query. Alleen de geselecteerde wedstrijd, haar selectie, formatie en planregels zijn gelezen; wedstrijdselectie en planregels via `by_match`. Er zijn geen mutaties, deployments, wijzigingen aan `showLineup` of coachrechten uitgevoerd. De query draaide als sandboxed read-only query; schrijftools waren uitgeschakeld. De module bevat een lokale, gedateerde momentopname en schrijft niet terug naar de app.

De bron heeft status `scheduled`, geen wedstrijdgebeurtenissen en een complete 3-5-2-beginopstelling: 11 veldspelers en 4 bankspelers. De 15 spelers worden overgenomen met voornaam en werkelijk rugnummer; de lokale kopie bundelt geen database-ID’s of achternamen. De slot-ID’s, rollen en links/rechts-toewijzing blijven gelijk aan de app. Alleen de coördinaten zijn passend gemaakt voor de bestaande halve-veldweergave.

Alle 14 planacties (10 wissels en 4 positieruilen) blijven in hun bronvolgorde binnen minuut 10, 20, 30, 40 en 50. `targetMinute` is een absolute wedstrijdminuut; er wordt geen kwart-offset bij opgeteld. De structurele controle en onafhankelijke doorrekening geven 660 veldminuten en 240 bankminuten. **Luuk 4 staat aanwezig maar heeft 0 geplande speelminuten / 60 bankminuten**; dit staat als controlepunt bij de bron en wordt niet automatisch gecorrigeerd. Luc is keeper; Luc, Luuk, Lucas en Lukas blijven afzonderlijke spelers. Het plan begint onbevestigd en vraagt controle vóór een oefenwedstrijd.

Beperking van de oefenklok: de bronwedstrijd staat op 4 × 15 minuten, terwijl de bestaande demo automatisch alleen bij 30 minuten pauzeert. Dit is zichtbaar vermeld; de nominale wisselminuten en eindtotalen blijven correct. De historische tabel van het fotovoorbeeld is verborgen voor deze import, omdat zij slechts 14 spelers bevat. A4-afdrukken noemen wedstrijd en bron; nieuwe live wijzigingen in de app worden niet automatisch opgehaald.

Verificatie van deze import: 126 kern-/importtests en 17 UI-/printtests geslaagd; gerichte TypeScript-controle, ESLint en diff-controle schoon. Browsercontrole bevestigt de coachopstelling, vier bankspelers, zichtbare bronwaarschuwing en zes veldbeelden op één A4-afdrukvoorbeeld. Verse browsersessie zonder consolefouten. Geen fysieke afdruk gemaakt.

### Lokale beschikbaarheidscorrectie — Luuk, 2 oktober 2026

De gebruiker bevestigt dat Luuk 4 geblesseerd is. De oorspronkelijke appmomentopname blijft intact als `GILZE_IMPORTED_PLAN`. In het lokale `GILZE_PLAN` staat Luuk nu niet beschikbaar (`absent: true`, reden `injured`), buiten veld/bank en buiten de minutenverdeling. De 11 basisspelers en 14 geplande acties blijven gelijk; 14 beschikbare spelers leveren 660 veldminuten en 180 bankminuten op. Luuk blijft herkenbaar in de spelerslijst en bij ‘Niet beschikbaar — Geblesseerd’, ook op de afdruk. Opnieuw beginnen behoudt deze bevestigde lokale correctie. Er is niets naar de wedstrijdapp geschreven.


### Papieren Gilze-wissellijst en vaste vergelijking — 2 oktober 2026

`output/pdf/gilze-wissellijst-2026-10-03.pdf` is een apart A4-blad in de stijl van de bestaande `outputs/wisselmodule-01a0e17c/wissellijst.pdf`; het fotovoorbeeld blijft behouden. De afdruk bevat de beginopstelling, 10 wissels en 4 positieruilen in bronvolgorde, bank na ieder moment, afvinkvakjes, geplande minuten en lege kolommen voor de werkelijke minuten. Luuk 4 staat apart als geblesseerd. De inhoud is doorgerekend: steeds 11 op het veld en 3 op de bank, 660 veldminuten en 180 bankminuten. De status blijft concept.

Het bijbehorende plan is afzonderlijk bewaard in `outputs/wisselmodule-01a0e17c/gilze-plan-vooraf-2026-10-03.json`, met de SHA-256 van de afdruk. Dit bestand niet overschrijven met wedstrijdresultaten. Na afloop worden de werkelijke wissels en speelminuten uit de app gelezen en naast dit oorspronkelijke plan gezet. De lokale oefenwedstrijd is daarvoor niet de bron. Deze afdruk voegt geen automatische na-wedstrijdkoppeling toe.

### Read-only Reeshof-import — 9 oktober 2026

De bronkeuze opent nu standaard met **SV Reeshof O13-1 – DIA JO13-2, uit op 10 oktober 2026 om 09:30**. De coachopstelling en alle 15 geplande acties zijn uitsluitend-lezen opgehaald uit de bestaande wedstrijd (code `SZNCWD`) op 9 oktober om 20:55:56 CEST. Gilze en het fotovoorbeeld blijven afzonderlijk selecteerbaar. De app en haar verborgen-opstellinginstelling zijn niet gewijzigd.

`src/lib/substitutions/reeshofPlan.ts` bevat `REESHOF_IMPORTED_PLAN` (15 spelers) en `REESHOF_PLAN` (lokale afgeleide selectie). De gebruiker bevestigt voor deze wedstrijd dat Krijn 10 beschikbaar is en Luuk 4 niet. Daarom staat Luuk lokaal buiten veld, bank en minutenberekening; een blessurereden uit de vorige wedstrijd is niet automatisch overgenomen. Het plan is apart bewaard in `outputs/wisselmodule-01a0e17c/reeshof-plan-vooraf-2026-10-10.json`.

De 4-3-3 behoudt de slot-ID's, rollen en links/rechts-toewijzing uit de app. Luc staat op GK-slot 0 en heeft GK als voorkeursrol; de keepermarkering in de bron staat echter uit. De lokale keeperrol is afgeleid van die expliciete GK-plek en dit is als controlepunt zichtbaar. Een bronactie (sequence 14, Olivier 9 ↔ Jody 2) staat na minuut 50 maar heeft doelminuut 40. De module groepeert op absolute doelminuut en behoudt binnen ieder moment de bronvolgorde; ook dit staat in de bronnotities.

Alle 9 bankwissels en 6 positieruilen zijn uitvoerbaar: steeds 11 op het veld en 3 op de bank. Plan: 660 veldminuten en 180 bankminuten. Luc en Krijn 60; Loek, Revi, Lukas, Sem, Tygo en Lucas 50; Jody, Miloud, Olivier, Maceo, Max en Matteo 40. De bron staat op 4 × 15 minuten; de niet ingevulde totale duur gebruikt de bestaande appdefault van 60 minuten. De lokale oefenklok pauzeert nog alleen bij 30 minuten. De broncontrole blijft onbevestigd totdat de coach het gehele plan heeft beoordeeld.

### Automatisch demonstreren — 9 oktober 2026

‘Wissels automatisch volgens plan’ staat standaard aan. Na broncontrole voert de lopende demoklok bankwissels en positieruilen op hun exacte geplande tijd uit, ook bij versnelde of grote klokstappen. ‘+1 minuut’ en ‘Volgend moment’ nemen de wissels mee en pauzeren daarna. Uitvinken behoudt de handmatige bediening. Rust pauzeert nog steeds bij 30 minuten, nadat eventuele rustwissels zijn uitgevoerd; ‘Start tweede helft’ hervat de demonstratie.

De engine verdeelt speelminuten per interval tussen wisselmomenten en slaat iedere uitvoering met veldsnapshot op. Uitgevoerde, deels uitgevoerde en overgeslagen regels worden gerespecteerd. Bij een conflict met de actuele opstelling pauzeert de demo op dat moment met een foutmelding: de hele conflicterende groep blijft onuitgevoerd, eerdere geldige voortgang blijft behouden. Later inschakelen van automatisch wisselen voert achterstallige regels op de actuele tijd uit, zonder het verleden te herschrijven. Het oorspronkelijke plan blijft intact; er zijn geen writes naar de wedstrijdapp.

Verificatie: 52 engine-tests en 21 UI-tests geslaagd, inclusief twee volledige Reeshof-helften met alle 15 acties, exacte individuele speelminuten en 660 veldminuten. Gerichte TypeScript- en ESLint-controles geslaagd. Browsercontrole bevestigt automatische uitvoering op 10:00 met Lucas op LW, Revi op CM en Krijn op CB.
