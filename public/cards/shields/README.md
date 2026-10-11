# DIA-schildencollectie 26–27

Zes eigen ontwerpen, geïnspireerd op moderne voetbalverzamelkaarten: Brons, Zilver, Goud, DIA, Kristal en Elite. Zonder spelersfoto, silhouet, shirt, tekst of logo in de afbeelding.

- `dia-shield-*-v1.png`: transparante PNG, 1152 × 1536 pixels, voor hergebruik/download.
- `dia-shield-*-v1.webp`: transparante WebP, 768 × 1024 pixels, voor de app.
- `manifest.json`: afmetingen, transparantiecontrole en de volledige generatieprompts. Gemaakt met ingebouwde Codex ImageGen; geen externe API in de app.

De buitenkant is transparant, het binnenvlak dekkend. Verhouding 3:4. Alle exports bevatten extra transparante ruimte rond de schildpunten. De individuele artistieke randen kunnen enkele pixels verschillen.

Bekijk de collectie op `/kaarten`. Hier kun je achtergrond wisselen, voorbeeldgegevens aanzetten en lege PNG's downloaden. De voorbeeldgegevens worden alleen lokaal in de pagina getoond en niet opgeslagen.

## Gebruik in React

Gebruik `ShieldCard` uit `src/components/cards/ShieldCard.tsx` met `theme="bronze"`, `"silver"`, `"gold"`, `"dia"`, `"crystal"` of `"elite"`. Zonder children verschijnt een leeg schild. Geef children mee voor eigen appinhoud. Houd de buitencontainer relatief en geef hem een breedte; de component schaalt mee.

De component heeft geen invoer voor foto's of shirts. Voeg namen, rugnummer en statistieken als aparte tekstlaag toe. Het veilige inhoudsvlak ligt binnen 14% van de zijkanten, 15% van boven en 22% van onder. Zo blijft tekst vrij van de schuine onderrand. Toon alleen gegevens die in de betreffende appweergave zijn toegestaan. De collectie verandert bestaande spelerskaarten niet automatisch.

Gebruik voor de FC-indeling `contentLayout="football"` op `ShieldCard` en voeg `FootballShieldContent` uit `src/components/cards/FootballShieldContent.tsx` als child toe. Deze component toont naam, de zes labels SNL/SCH/PAS/DRI/VRD/FYS met waarden eronder, en het DIA-logo gecentreerd daaronder. Linksboven staat het afgeronde gemiddelde van de zes statistieken, geen rugnummer. De speciale ondermarge van 13% biedt ruimte voor dit logo. Beide series gebruiken dezelfde inhoudscomponent. Zie `abstract/README.md` voor een volledig React-voorbeeld en de statkeys.

## Opnieuw exporteren

`node scripts/export-shields.mjs <receipts.json>`

Geef een array met `{ "id": "gold", "source": "absoluut/pad/naar/gegenereerd.png", "prompt": "volledige prompt" }` door. Lever alle zes varianten aan voor een volledig manifest. Het script bewaart de illustratie en alpha, voegt een transparante veiligheidsmarge toe en maakt de PNG- en WebP-exports. Originele ImageGen-bestanden blijven intact.
