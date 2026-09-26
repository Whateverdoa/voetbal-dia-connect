# JO13-02 — teamportaalproef

Status: lokale proefversie, 26 september 2026. Nog geen uitrol naar ouders of spelers.

## Inrichting

| Onderdeel | Instelling |
| --- | --- |
| Team in de interface | DIA JO13-02 |
| Bestaande teamcode | `jo13-2` |
| Seizoen | 2026–2027 |
| Proefroute | `/demo/teamportaal/jo13-2` |
| Lokale preview | `http://localhost:3001/demo/teamportaal/jo13-2` |
| Ontwikkeltak | `codex/jo13-02-teamportaal` |
| Browseropslag | `dia-teamportaal-demo-jo13-2-2026-2027-v1` |

De algemene demo blijft beschikbaar op `/demo/teamportaal` met de oorspronkelijke opslag en fictieve voorbeelden. De JO13-02-demo kan uitsluitend lokaal een selectie, wedstrijdprogramma, uitslagen en stand uit DIA Live laden. Reset werkt alleen op de geopende proefversie. Gegevens worden niet gesynchroniseerd tussen browsers of apparaten.

### Lokale teamgegevens

De lokale kopie staat in `.local/teamportaal/jo13-2.json` (genegeerd door Git en uitgesloten van Next.js-deploymenttraces). Deze bevat de 15 vaste spelers, 5 gespeelde wedstrijden, 2 komende wedstrijden en de opgeslagen Sportlink-poulestand van 26 september 2026. De twee gastspelers uit O13-01 zijn op aanwijzing van de coach buiten de selectie gehouden. Hun bestaande DIA Live-registraties zijn niet gewijzigd.

Alleen naam, rugnummer, bekende positie, wedstrijdgegevens, deelnemers-ID's en stand worden overgenomen. Contactgegevens, foto's, toestemmingen, beoordelingen en echte ouderkoppelingen worden niet gekopieerd. De server leest dit bestand uitsluitend tijdens lokale ontwikkeling; gehoste previews blijven de fictieve selectie gebruiken, ook als de demoroute daar expliciet is ingeschakeld.

De echte selectie begint zonder feedback, observaties, kwaliteiten, acties of stemmen. Iedere speler heeft een expliciet gesimuleerd ouderprofiel. Afgeronde wedstrijden krijgen lege nabesprekingen voor de geregistreerde deelnemers uit de vaste selectie. De komende wedstrijden staan in het programma; die krijgen nog geen nabespreking. Het teamdoel blijft herkenbaar als voorbeeld.

Het tijdstip van ophalen staat bij programma en uitslagen; de stand heeft daarnaast de bijwerktijd van de bron. Dit is een lokale momentopname en geen automatische koppeling. Een nieuwe bronkopie kan worden klaargezet in hetzelfde bestand. Wijzigingen aan selectie of wedstrijden krijgen een eigen browseropslag met een fingerprint; eerdere demogegevens blijven apart bewaard. **Reset demo** behoudt de geïmporteerde teamgegevens en wist alleen de lokale demo-invoer.

De proefversie bevat spelerskaarten, ouder-kindweergave, coachfeedback met expliciete publicatie, positieve wedstrijdverkiezingen en optionele observaties voor coach en scout. Observaties staan standaard uit. De rolwisselaar simuleert toegang; dit is geen omgeving voor echte vertrouwelijke verslagen.

## Aansluiting op de herstelde app

De portaalbestanden zijn gericht teruggenomen uit `d71b831`, op basis van de actuele herstelde `main` (`3e84a4b`). De andere wijzigingen van de historische branch zijn niet overgenomen. De bestaande navigatie, coach- en scheidsrechterfunctionaliteit blijven de actuele versie gebruiken.

De demo omzeilt uitsluitend binnen `/demo/teamportaal` de verbonden providers en rol-synchronisatie. De demoroute is alleen beschikbaar tijdens lokale ontwikkeling of op expliciet ingeschakelde previews. De demo blijft in productie geblokkeerd. De echte nabespreking gebruikt de afzonderlijke geautoriseerde route hieronder.

De aparte werkmap draait op 3001 zodat de bestaande ontwikkelserver op 3000 niet hoeft te worden gestopt of gewijzigd. Start alleen nadat poort 3001 en de eventuele eigenaar gecontroleerd zijn:

```powershell
npx next dev --turbopack --hostname localhost -p 3001
```

## Wedstrijdverslag met echte registraties

De coachweergave van de JO13-02-proefversie bevat **Open wedstrijdverslag**. Deze link opent `/team/jo13-2/verslag`, een afzonderlijke pagina met de bestaande Clerk-/Convex-verbinding. De demo zelf blijft zonder providers werken. De rolwisselaar verleent geen toegang tot echte wedstrijdgegevens.

Na inloggen ziet een toegewezen coach of admin de beschikbare afgeronde wedstrijden van het team. De pagina hergebruikt `matches.verifyCoachAccess`, `teams.getBySlug` en de geautoriseerde `matches.getForCoach` voor de wedstrijdregistratie. De wedstrijdkeuze volgt het bestaande coachoverzicht, inclusief de bestaande limieten op recente wedstrijden.

Het verslag toont de opgeslagen eindstand, doelpunten en assists, kaarten, uitgevoerde wissels, geregistreerde minuten en notities bij wedstrijdmomenten. Gecorrigeerde gegevens verschijnen via de bestaande realtime query. Eigen doelpunten, gekoppelde assists en dubbele wisselregistraties worden apart verwerkt. Ontbrekende minuten of een verschil tussen de eindstand en de doelpuntregistratie worden benoemd; ontbrekende gebeurtenissen worden niet verzonnen.

Deze verbonden verslagpagina schrijft geen gegevens naar de lokale demo. De feitelijke wedstrijdregistratie blijft alleen-lezen; het nieuwe spelerformulier heeft eigen opslag, beschreven hieronder. De vragenlijst verandert geen XP of verkiezingen. De lokale teamkopie hierboven blijft daarvan gescheiden: demo-invoer wordt niet naar echte spelerrecords teruggeschreven. Voor gezinsaccounts is nog expliciete serverautorisatie en een publicatiekeuze nodig.

De lokale werkmap gebruikt voor deze verbonden pagina dezelfde bestaande appverbinding als DIA Live, via een genegeerd `.env.local` met de Convex-URL en Clerk-configuratie. Voor de gesprekshulp wordt daarin ook de bestaande Anthropic-sleutel hergebruikt. Er zijn geen deploymentcredentials overgenomen en geen backendwijzigingen uitgerold. De hoofdwerkmap en server op 3000 blijven ongewijzigd.

## Nabespreking per speler — echte wedstrijdopslag

De gekozen richting is opslag bij echte wedstrijden. De pagina `/team/jo13-2/verslag` zet voor iedere niet-afwezige speler van een afgeronde wedstrijd een formulier klaar. Een coach begint met drie kernvragen:

1. Welke concrete actie ging goed?
2. Hoe hielp de speler het team?
3. Wat is één haalbare volgende stap op de training?

Twee optionele vragen gaan over spelen met en zonder bal. De geregistreerde momenten en minuten helpen bij het terugdenken, maar vullen geen antwoorden of beoordelingen automatisch in. Per vraag is **Niet goed kunnen zien** mogelijk. Voor een verslag zijn alle kernvragen beantwoord of expliciet onbekend, met minstens één eigen observatie. Het formulier werkt zelfstandig; tijdens lokale ontwikkeling is daarnaast de gesprekshulp hieronder beschikbaar.

`playerMatchReviews` bewaart per echte auteur, wedstrijd en speler een concept en een afzonderlijke vastgelegde versie. `listForMatch`, `saveDraft` en `finalize` controleren iedere keer Clerk-identiteit, coach-/adminrechten, wedstrijdstatus, team en selectie. Concepten zijn privé per auteur; ook een andere coach of admin krijgt ze niet via deze functies. Registraties van afwezige spelers worden uitgesloten; nul minuten op zichzelf sluit een speler niet uit. Revisienummers voorkomen stil overschrijven vanuit een tweede tabblad.

De coach bewaart het concept, bekijkt het verslag, bevestigt het nalezen en kiest **Verslag vastleggen**. Nieuwere conceptwijzigingen veranderen het eerdere vastgelegde verslag niet. Tekst bij een als onbekend gemarkeerd antwoord blijft uitsluitend in het concept. Het vastgelegde verslag is nog niet aan ouders of spelers gepubliceerd. Dat vereist de latere accountkoppelingen en een aparte publicatiekeuze.

Dezelfde vragen zijn klikbaar in de demo onder **Coach → Nabespreking**, met fictieve spelers of de lokaal geïmporteerde selectie. Daar worden concepten lokaal bewaard en kan publicatie naar de speler- en oudersimulatie worden getest. Deze simulatie schrijft niets naar echte wedstrijden.

Implementatie en validatie zijn beschikbaar op de featurebranch. De live backendfuncties moeten via de afgesproken releaseflow worden geactiveerd voordat echte opslag werkt. De bestaande wedstrijdregistratie blijft bruikbaar als die functies nog ontbreken. De productie-dry-run valideert het toegevoegde schema zonder indexverwijdering; deze controle activeert de nieuwe functies niet.

## Gesprek en dicteren

**Coach → Nabespreking → Gesprek** begint met één open vraag over de geselecteerde speler. De coach kan een lang verhaal typen of op **Dicteer je verhaal** drukken. Herkende Nederlandse tekst blijft eerst bewerkbaar in het tekstvak. Alleen expliciet verzenden stuurt het gesprek en de huidige formulierantwoorden naar Claude. De assistent stelt hoogstens drie gerichte vervolgvragen; **Niet goed gezien** slaat een onbekend onderdeel over en **Maak nu een concept** rondt eerder af.

Claude vat uitsluitend de eigen observaties en bevestigde oefenpunten van de coach samen in de vijf bestaande beoordelingsvelden. Onbekende onderdelen blijven onbekend. Het voorstel staat eerst ter controle in beeld. **Neem over als concept** vult het bewerkbare formulier; bewaren, nalezen en publiceren of vastleggen blijven afzonderlijke stappen. De chat verandert geen wedstrijdregistratie, XP of stemmen. Automatische samenvattingen blijven voorstellen die de coach moet controleren.

De bestaande `ANTHROPIC_API_KEY` blijft uitsluitend op de server in `.env.local`. De directe Anthropic-provider gebruikt standaard `claude-sonnet-5`; `ANTHROPIC_REVIEW_MODEL` kan dit wijzigen. Het endpoint `/demo/teamportaal/api/interview` accepteert alleen lokale ontwikkelverzoeken van dezelfde origin, met begrensde tekstlengte, twee gelijktijdige verzoeken, twintig verzoeken per minuut en een timeout. Het is geblokkeerd in productie en gehoste previews. Daar blijft het formulier beschikbaar. Er worden geen ruwe providerfouten of gesprekken gelogd en het endpoint schrijft geen databasegegevens.

Dicteren gebruikt de browserfunctie `SpeechRecognition` of `webkitSpeechRecognition`, met `nl-NL`. De browser kan daarvoor een eigen spraakdienst gebruiken; dit staat bij de microfoon. De app bewaart geen audio en start de microfoon nooit automatisch. Bij ontbrekende browserondersteuning blijven typen en de dicteerknop van het apparaattoetsenbord beschikbaar. De herkende tekst moet worden gecontroleerd voordat deze wordt verzonden.

In de demo worden invoer, gespreksbeurten en voorstellen per wedstrijd en speler in de bestaande lokale browseropslag bewaard. Wisselen van rol, tabblad of speler en herladen behouden het gesprek; **Reset demo** wist de demo-invoer. De rolwisselaar blijft een simulatie, geen beveiliging voor vertrouwelijke observaties. Op de verbonden verslagpagina blijven gesprekken alleen in het geheugen van het geopende scherm; de coach krijgt een waarschuwing bij verlaten. Alleen de overgenomen en expliciet bewaarde formulierantwoorden gaan naar de bestaande wedstrijdopslag. Voor gehost gebruik van de gesprekshulp zijn echte serverautorisatie en grenzen per coach nodig.

Validatie omvat gespreks- en opslagvalidatie, onbekende antwoorden, maximaal drie vervolgvragen, herhalen na netwerkfouten, expliciete overname, stoppen en opruimen van dicteren, meerdere spraakresultaten vlak achter elkaar en blokkeren van de API buiten lokale ontwikkeling. Een echte Claude-aanroep en de browserflow zijn met fictieve testobservaties gecontroleerd; live microfoonaudio is niet opgenomen tijdens ontwikkeling.

## Stap naar echt gebruik

Voor gebruik door JO13-02-gezinnen is een aparte implementatiefase nodig:

1. Actuele `jo13-2`-selectie, coachtoewijzingen en toestemming verifiëren; historische seedlijsten niet als actuele selectie behandelen.
2. Persoonlijke Clerk-identiteiten koppelen aan expliciete teamrechten en ouder-kindrelaties. Toestemmingstokens of het daarin ingevulde e-mailadres geven geen accounttoegang.
3. Adminbeheer voor toevoegen, controleren en intrekken van koppelingen. Geen automatische uitnodigingen of toegangstoekenning vanuit de demo.
4. Feedback, acties en stemmen in Convex opslaan; de server controleert team, deelnemer, deadline, zelfstemmen, publicatie en zichtbaarheid. Ouders krijgen geen stemrecht.
5. Observaties koppelen aan de individuele maker en toegewezen stafleden van het team. Concepten zijn privé per persoon; een gedeelde coachrol is daarvoor onvoldoende.
6. De echte route `/team/jo13-2/app/*` krijgt login en autorisatie zonder demo-rolwisselaar. Gepubliceerde feedback is alleen voor de juiste speler en gekoppelde ouders.

De bestaande publieke kaart-/historiequeries moeten vóór hergebruik op hun privacyfilters worden beoordeeld. `gamification.awardMatchXp` mist in deze basis autorisatie en bescherming tegen herhaald toekennen; de proefversie gebruikt die mutatie niet. Verkiezingen beïnvloeden geen XP.
