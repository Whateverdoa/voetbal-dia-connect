# Opbouwlogica van DIA-spelersschilden

Dezelfde componenten verzorgen basis-, week- en maandkaarten op alle schermen:

1. `ShieldCard`: leeg frame, verhouding 3:4, één schaalcontainer met `container-type:inline-size`.
2. Inhoudsmarges: links/rechts 14%, boven/onder 15% (`contentLayout="football"`).
3. `FootballShieldContent`: gemiddelde en positie linksboven; afzonderlijke foto- of shirtlaag in het midden; vast onderblok met naam, scores, logo en badges.

`FcPlayerShield` gebruikt abstract DIA voor basis, premium Kristal voor maand en het bestaande lege zwart/gouden weekframe via `backgroundSrc`. Het berekent eerst de geldige bonus met de bestaande gedeelde kaartlogica. Daarna ontvangt `FootballShieldContent` de toegestane gegevens. Maak geen afwijkende grote kaartindeling per thema of scherm.

## Vaste maten en ankers

`1cqw` is 1% van de buitenste kaartbreedte. Voeg binnen het schild geen tweede schaalcontainer toe.

- Gemiddelde: linksboven, 17cqw. Positie: eronder, 5cqw, tussenruimte 1cqw.
- Midden: uitsluitend een losse toegestane foto of `PlayerShirt`, achter de tekst. De galerij laat dit vlak leeg. `PlayerShirt` gebruikt de vrijgemaakte realistische `dia-yellow-shirt-v1-480.webp` uit het goedgekeurde weekshirt; vervang dit niet door een vereenvoudigde tekening. `media` is een optionele ReactNode van `FootballShieldContent`.
- Onderblok: absoluut aan de onderzijde van de inhoudslaag. Naam 7cqw, maximaal twee regels; extra tekst groeit naar boven.
- Statistieken: 3cqw onder de naam, zes gelijke kolommen met 0.5cqw afstand. Volg `FOOTBALL_SHIELD_STATS`: SNL SCH PAS DRI VRD FYS. Label boven waarde; label `max(9px,3.8cqw)`, waarde 5.3cqw en 0.5cqw tussenruimte.
- DIA-logo: `/logos/dia.png`, gecentreerd, verhouding 180:200, hoogte 13cqw, 2.5cqw onder scores.
- Badgerij: 1.5cqw onder logo, altijd 9cqw hoog. `PlayStyleStrip` toont maximaal drie bekende unieke IDs; iconen 9cqw, tussenruimte 1.5cqw. Ook zonder badges blijft de ruimte gereserveerd.

Kenmerkiconen blijven beschikbaar naast de beoordelingsvelden. Speelstijlbadges staan binnen het schild onder het logo, nooit in het midden of in een los vak buiten de kaart. De bestaande icoonontwerpen en stabiele IDs blijven behouden; nieuwe beeldtaal uit de parallelle ontwerptaak is nog niet geïntegreerd.

## Gegevenscontract

Gebruik `averageFootballShieldRating` voor het afgeronde gemiddelde van alle zes waarden. Ontbrekende of ongeldige waarden geven `null` en worden als `—` getoond. Echte nul blijft nul in ontwerpvoorbeelden (0–99); opgeslagen coachscores blijven 1–99. `toFootballShieldStats` vertaalt alleen veldnamen. Geen waarden afleiden uit XP, minuten of doelpunten. Badges geven geen bonus.

`FootballShieldContent` ontvangt `name`, optioneel `position`, `stats`, `playStyleIds` en `media`. `PlayStyleStrip` normaliseert alleen de presentatie; de bestaande servervalidatie blijft verplicht voor opslag. Compacte veldkaarten behouden hun leesbare identiteit, discipline en wedstrijdstatus.

## Controle

Controleer beide collecties, het weekframe, lange namen, ontbrekende/nulwaarden en nul tot drie badges op telefoon en desktop. Logo en badges blijven binnen de rand; de onderste vaste ankers verschuiven niet bij badgekeuze. Bij margeaanpassing synchroniseer je `design-tokens.json` en genereer je het manifest via `scripts/generate-abstract-shields.mjs`. Originele schildafbeeldingen blijven ongewijzigd.
