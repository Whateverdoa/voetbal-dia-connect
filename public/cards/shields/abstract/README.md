# Abstracte DIA-schilden — agent-handoff

Zes lege ontwerpen met een gedeelde geometrische vorm: brons, zilver, goud, DIA, kristal en elite. Geen foto's, silhouetten, shirts, logo's of tekst in de assets. De buitenkant is transparant; het binnenvlak is dekkend.

## Bron en export

- **Bron van waarheid:** `public/cards/shields/abstract/design-tokens.json`.
- **Generator:** `scripts/generate-abstract-shields.mjs`.
- **Appcomponent:** `src/components/cards/ShieldCard.tsx`.
- **FC-inhoud:** `src/components/cards/FootballShieldContent.tsx`: naam, zes statistieken in één rij, DIA-logo daaronder.
- **Galerij:** `/kaarten`, keuze Abstract / Premium.
- **Manifest:** `manifest.json`, met de exacte bestandsnamen, afmetingen en veilige inhoudsmarges.

De SVG's bestaan uit benoembare vlakken, lijnen en één rustig kleurverloop. Ze zijn rechtstreeks leesbaar en bewerkbaar door agents en vectorprogramma's. Voor blijvende wijzigingen pas je de JSON-bron aan: losse aanpassingen in gegenereerde SVG's worden bij de volgende export overschreven.

## Werken als agent

1. Lees deze instructie, `design-tokens.json` en de generator.
2. Pas `themes` aan voor kleuren: `accent` = rand, `base` = donker vlak, `elevated` = bovenkant van het verloop, `facet` = geometrisch accent. Behoud bestaande thema-ID's voor compatibiliteit.
   De tekstkleur van appinhoud staat apart in `src/lib/cards/shieldThemes.ts` (`accent`); pas die zo nodig mee aan en behoud voldoende contrast.
3. Pas `geometry.outline`, `geometry.inset` en `geometry.facets` aan voor de vorm. Alle coördinaten gebruiken hetzelfde 1152 × 1536 vlak. Laat veilige transparante ruimte rondom staan.
4. Voer vanuit de repo `node scripts/generate-abstract-shields.mjs` uit. Dit maakt alle zes SVG-, PNG- en WebP-exports en controleert de alpha. Er is geen netwerkservice, API-sleutel of beeldgeneratie nodig.
5. Maak desgewenst het overzicht met `node scripts/preview-shields.mjs --abstract`.
6. Controleer `/kaarten` op donker, licht en veld, met en zonder voorbeeldgegevens en op telefoonformaat.

PNG is 1152 × 1536; WebP is 768 × 1024; SVG schaalt zonder kwaliteitsverlies. De app gebruikt WebP. De galerij biedt PNG en SVG als download.

## Gebruik in de app

```tsx
import { ShieldCard } from "@/components/cards/ShieldCard";
import { FootballShieldContent } from "@/components/cards/FootballShieldContent";

<ShieldCard theme="dia" series="abstract" />

<ShieldCard theme="gold" series="abstract" contentLayout="football">
  <FootballShieldContent
    name="JOUW NAAM"
    position="CM"
    stats={{ pace: 81, shooting: 84, passing: 79, dribbling: 82, defending: 61, physical: 73 }}
  />
</ShieldCard>
```

Zonder `series` blijft `ShieldCard` de bestaande premiumserie gebruiken. De galerij start op Abstract. Bestaande wedstrijd- en spelersschermen worden niet automatisch vervangen.

De standaardinhoudsmarges zijn links/rechts 14%, boven 15% en onder 22%. Met `contentLayout="football"` is de ondermarge 13%: alleen het gecentreerde DIA-logo staat in dit lagere, schuine gedeelte. Houd `contentInsetsPercent`, `footballContentInsetsPercent` en de marges in `ShieldCard.tsx` gelijk bij een vormwijziging.

`FootballShieldContent` toont exact deze volgorde: naam → SNL, SCH, PAS, DRI, VRD, FYS (labels boven waarden, in één rij) → DIA-logo. De statkeys zijn respectievelijk `pace`, `shooting`, `passing`, `dribbling`, `defending`, `physical`. Een ontbrekende waarde verschijnt als een streepje; nul blijft zichtbaar als 0. Het voorbeeld hierboven bevat alleen ontwerpwaarden. De galerij laat ze lokaal aanpassen en slaat ze niet op.

Linksboven staat het afgeronde rekenkundige gemiddelde van de zes statistieken, geen rugnummer. `averageFootballShieldRating` berekent dit alleen als alle zes waarden beschikbaar en eindig zijn en binnen 0–99 liggen. Anders verschijnt een streepje. De positie staat onder het gemiddelde.

De opbouw volgt de aangeleverde referentie: https://www.futbin.com/27/fut-card-creator. Render namen en statistieken als aparte appinhoud, nooit vast in een asset. Behoud de bestaande privacy- en toestemmingsregels van de app.
