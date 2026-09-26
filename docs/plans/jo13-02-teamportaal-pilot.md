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

De algemene demo blijft beschikbaar op `/demo/teamportaal` met de oorspronkelijke opslag. Beide gebruiken voorbeeldspelers, voorbeeldwedstrijden en fictieve beoordelingen. Reset werkt alleen op de geopende proefversie. Gegevens worden niet gesynchroniseerd tussen browsers of apparaten.

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

Echte gegevens komen niet in de lokale demo-opslag. De feitelijke wedstrijdregistratie blijft alleen-lezen; het nieuwe spelerformulier heeft eigen opslag, beschreven hieronder. De vragenlijst verandert geen XP of verkiezingen. Coach- en scoutobservaties uit de demo worden niet aan echte spelers gekoppeld. Voor gezinsaccounts is nog expliciete serverautorisatie en een publicatiekeuze nodig.

De lokale werkmap gebruikt voor deze verbonden pagina dezelfde bestaande appverbinding als DIA Live, via een genegeerd `.env.local` met alleen de Convex-URL en Clerk-configuratie. Er zijn geen deploymentcredentials overgenomen en geen backendwijzigingen uitgerold. De hoofdwerkmap en server op 3000 blijven ongewijzigd.

## Nabespreking per speler — echte wedstrijdopslag

De gekozen richting is opslag bij echte wedstrijden. De pagina `/team/jo13-2/verslag` zet voor iedere niet-afwezige speler van een afgeronde wedstrijd een formulier klaar. Een coach begint met drie kernvragen:

1. Welke concrete actie ging goed?
2. Hoe hielp de speler het team?
3. Wat is één haalbare volgende stap op de training?

Twee optionele vragen gaan over spelen met en zonder bal. De geregistreerde momenten en minuten helpen bij het terugdenken, maar vullen geen antwoorden of beoordelingen automatisch in. Per vraag is **Niet goed kunnen zien** mogelijk. Voor een verslag zijn alle kernvragen beantwoord of expliciet onbekend, met minstens één eigen observatie. Het verslag gebruikt uitsluitend de antwoorden van de coach, zonder externe AI- of spraakdienst.

`playerMatchReviews` bewaart per echte auteur, wedstrijd en speler een concept en een afzonderlijke vastgelegde versie. `listForMatch`, `saveDraft` en `finalize` controleren iedere keer Clerk-identiteit, coach-/adminrechten, wedstrijdstatus, team en selectie. Concepten zijn privé per auteur; ook een andere coach of admin krijgt ze niet via deze functies. Registraties van afwezige spelers worden uitgesloten; nul minuten op zichzelf sluit een speler niet uit. Revisienummers voorkomen stil overschrijven vanuit een tweede tabblad.

De coach bewaart het concept, bekijkt het verslag, bevestigt het nalezen en kiest **Verslag vastleggen**. Nieuwere conceptwijzigingen veranderen het eerdere vastgelegde verslag niet. Tekst bij een als onbekend gemarkeerd antwoord blijft uitsluitend in het concept. Het vastgelegde verslag is nog niet aan ouders of spelers gepubliceerd. Dat vereist de latere accountkoppelingen en een aparte publicatiekeuze.

Dezelfde vragen zijn klikbaar in de fictieve demo onder **Coach → Nabespreking**. Daar worden concepten lokaal bewaard en kan publicatie naar de fictieve speler en diens gekoppelde ouder worden getest. Deze simulatie schrijft niets naar echte wedstrijden.

Implementatie en validatie zijn beschikbaar op de featurebranch. De live backendfuncties moeten via de afgesproken releaseflow worden geactiveerd voordat echte opslag werkt. De bestaande wedstrijdregistratie blijft bruikbaar als die functies nog ontbreken. De productie-dry-run valideert het toegevoegde schema zonder indexverwijdering; deze controle activeert de nieuwe functies niet.

## Stap naar echt gebruik

Voor gebruik door JO13-02-gezinnen is een aparte implementatiefase nodig:

1. Actuele `jo13-2`-selectie, coachtoewijzingen en toestemming verifiëren; historische seedlijsten niet als actuele selectie behandelen.
2. Persoonlijke Clerk-identiteiten koppelen aan expliciete teamrechten en ouder-kindrelaties. Toestemmingstokens of het daarin ingevulde e-mailadres geven geen accounttoegang.
3. Adminbeheer voor toevoegen, controleren en intrekken van koppelingen. Geen automatische uitnodigingen of toegangstoekenning vanuit de demo.
4. Feedback, acties en stemmen in Convex opslaan; de server controleert team, deelnemer, deadline, zelfstemmen, publicatie en zichtbaarheid. Ouders krijgen geen stemrecht.
5. Observaties koppelen aan de individuele maker en toegewezen stafleden van het team. Concepten zijn privé per persoon; een gedeelde coachrol is daarvoor onvoldoende.
6. De echte route `/team/jo13-2/app/*` krijgt login en autorisatie zonder demo-rolwisselaar. Gepubliceerde feedback is alleen voor de juiste speler en gekoppelde ouders.

De bestaande publieke kaart-/historiequeries moeten vóór hergebruik op hun privacyfilters worden beoordeeld. `gamification.awardMatchXp` mist in deze basis autorisatie en bescherming tegen herhaald toekennen; de proefversie gebruikt die mutatie niet. Verkiezingen beïnvloeden geen XP.
