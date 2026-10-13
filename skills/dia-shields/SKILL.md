---
name: dia-shields
description: Gebruik of wijzig de abstracte en premium FC-geïnspireerde spelersschilden in DIA Live, met zes voetbalstatistieken, gemiddeld cijfer en DIA-logo. Voor appintegratie, schildindeling, kleuren en assetexports; niet voor gele/rode kaarten of tijdstraffen.
---

# DIA-spelersschilden

Werk in de huidige DIA Live-checkout. Lees de lokale `AGENTS.md` en de relevante Next.js-documentatie voordat je code wijzigt. De oorspronkelijke collectie staat in `C:/PROJECTS/VOETBAL/Voetbal-dial-connect/voetbal-dia-connect`; gebruik bij werk in een andere checkout de bestanden uit die checkout. Ontbreken daar de componenten of assets, controleer eerst de branch en beschikbare bestanden.

## Opbouwlogica

Lees [references/build-logic.md](references/build-logic.md) voor de gedeelde laagopbouw, vaste ankers en badgeplaatsing.

## Bestaande onderdelen gebruiken

- `src/components/cards/ShieldCard.tsx`: schaalbaar schildframe met losse inhoudslaag.
- `src/components/cards/FootballShieldContent.tsx`: gemiddelde, positie, naam, zes statistieken en clublogo.
- `src/lib/cards/shieldThemes.ts`: thematypes, tekstkleuren en assetpaden.
- `src/components/cards/ShieldCollection.tsx`: werkend voorbeeld op `/kaarten`.
- `public/cards/shields/abstract/README.md`: details voor exports en vormwijzigingen; lees deze bij assetwerk.

Gebruik deze componenten voor het gevraagde scherm; vervang andere kaarten alleen wanneer dat bij de opdracht hoort. Ondersteunde series zijn `abstract` en `premium`. Thema's zijn `bronze`, `silver`, `gold`, `dia`, `crystal` en `elite`. Kies bij een nieuwe integratie zonder stijlvoorkeur de abstracte serie. Een bestaande `ShieldCard` zonder serie blijft premium.

```tsx
import { ShieldCard } from "@/components/cards/ShieldCard";
import { FootballShieldContent } from "@/components/cards/FootballShieldContent";

<div className="w-full max-w-72">
  <ShieldCard theme="dia" series="abstract" contentLayout="football">
    <FootballShieldContent
      name={displayName}
      position={positionLabel}
      stats={footballStats}
    />
  </ShieldCard>
</div>
```

`displayName`, `positionLabel` en `footballStats` komen uit de gegevens die op het betreffende scherm zijn toegestaan. Een leeg frame maak je door de children weg te laten. Gebruik `shieldAsset` voor losse PNG/WebP-paden en `shieldVectorAsset` voor de abstracte SVG.

## Afgesproken indeling

- Bak geen shirt, spelersfoto, persoon of silhouet in de lege collectieframes. Echte spelerskaarten tonen in een aparte laag óf een toegestane spelersfoto óf een DIA-shirt als vervanging. Toon nooit beide tegelijk.
- Linksboven staat het **afgeronde rekenkundige gemiddelde van alle zes statistieken**, geen rugnummer. `averageFootballShieldRating` berekent dit; pas geen eigen formule toe bij de integratie.
- De positie staat onder het gemiddelde. Het grote middenvlak is gereserveerd voor de foto of het vervangende shirt; in de ontwerpgalerij blijft het vrij.
- Onderaan staat de naam, daaronder één horizontale rij **SNL SCH PAS DRI VRD FYS**. Labels staan boven hun waarden.
- Het **DIA-logo staat gecentreerd onder de statistieken**, via `/logos/dia.png`, met verhouding 180:200 en hoogte 13cqw.
- Direct onder het logo staat een vaste rij van 9cqw hoog voor maximaal drie unieke speelstijlbadges, op 1.5cqw afstand. Reserveer deze ruimte ook zonder badges; scores en logo blijven op hun plek.
- Gebruik `contentLayout="football"`; huidige marges zijn links/rechts 14%, boven 15% en onder 15%. De ondermarge houdt het onderste blok vrij van de schildpunt. De gewone `safe`-inhoudslaag heeft onder 22%.
- Houd de huidige, iets verhoogde onderkant aan. Controleer bij wijzigingen vooral de eerste en laatste statistiek en het logo tegen de schuine randen.

Dit volgt de gebruikersreferentie: https://www.futbin.com/27/fut-card-creator. De referentie is voor indeling; de lokale collectie bevat eigen ontwerpen. Routine-integratie vereist geen download van externe FC-assets.

## Statistieken en echte gegevens

`FootballShieldStats` is een gedeeltelijk object met deze keys:

| Label | Key | Betekenis |
| --- | --- | --- |
| SNL | `pace` | Snelheid |
| SCH | `shooting` | Schieten |
| PAS | `passing` | Passen |
| DRI | `dribbling` | Dribbelen |
| VRD | `defending` | Verdedigen |
| FYS | `physical` | Fysiek |

De huidige ontwerpschaal is 0–99. Ontbrekende waarden verschijnen als `—`; nul blijft 0. Het gemiddelde verschijnt alleen als alle zes waarden beschikbaar, eindig en binnen de schaal zijn. Bewaar dit onderscheid; vul geen ontbrekende waarden met nul.

In deze featurebranch staan echte kaartbeoordelingen in `players.fcRatings`: optionele gehele waarden van 1–99 met keys `snl`, `sch`, `pas`, `dri`, `vrd`, `fys`. `toFootballShieldStats` in `src/lib/cards/footballRatings.ts` vertaalt deze naar de ontwerpkeys zonder waarden te veranderen. `FcPlayerShield` verwerkt toestemming-gefilterde gegevens, actieve week-/maandbonussen en verval. Gebruik die component voor echte spelers; gebruik `ShieldCard` en `FootballShieldContent` voor de ontwerpgalerij. Bestaande doelen, assists, minuten, XP en levels zijn andere gegevens. Leid daar geen voetbalratings uit af en verzin geen waarden. Gebruik bij ontbrekende beoordelingen lege waarden; ontwerpvoorbeelden moeten expliciet herkenbaar blijven. Interne coachbeoordelingen van 1–5 staan hier los van. Opslaan verloopt via `playerCards.updatePlayerCard` met servercontrole van coach-/adminrechten en teamtoegang. Volg bij wijzigingen de Convex-projectinstructies. De galerijvelden zijn alleen lokale voorbeelden; ze slaan niets op.

## Kleuren, vorm en exports

De abstracte serie heeft bewerkbare SVG-bronnen. Pas `public/cards/shields/abstract/design-tokens.json` aan en voer vanuit de repo uit:

```powershell
node scripts/generate-abstract-shields.mjs
node scripts/preview-shields.mjs --abstract
```

De generator maakt SVG, transparante PNG (1152 × 1536), WebP (768 × 1024) en het manifest. Wijzig gegenereerde SVG's niet als permanente bron. Apptekstkleuren staan apart in `shieldThemes.ts`; controleer die bij een paletwijziging. Houd beide inhoudsmarges in de JSON, het manifest en `ShieldCard.tsx` gelijk bij een indelingswijziging.

Premiumillustraties zijn rasterassets in `public/cards/shields`; hergebruik ze voor gewone integratie. Voor creatieve wijzigingen aan die illustraties gebruik je de beschikbare imagegen-workflow. Bak naam, ratings en logo niet in de achtergrondafbeelding: ze blijven appinhoud.

## Gerichte controle en oplevering

Controleer de gewijzigde kaart in `/kaarten` en het daadwerkelijke doelscherm: telefoonformaat, lange naam, beide relevante series, één ontbrekende stat en een profiel met nul. De zes labels blijven op één rij; het logo staat eronder en binnen het schild. Houd de afzonderlijke tekst toegankelijk voor schermlezers.

Gebruik gerichte lint- en TypeScriptchecks voor codewijzigingen. Test een gewijzigde gemiddeldeberekening op afronding, ontbrekende waarden en nul. Voor een exportwijziging controleer je transparantie en downloadbestanden. Hergebruik een bestaande lokale server; controleer poort en eigenaar vóór een eventuele start of herstart, zoals `AGENTS.md` voorschrijft.

Rapporteer wat is veranderd, waar het zichtbaar is en welke controles zijn geslaagd. Een lokale integratie is geen productiedeploy.

## Kaartsoorten in de featurebranch

Basis: abstract DIA. Maand: premium Kristal. Week: het eerder door de gebruiker gekozen zwart/gouden teamportaalschild. Alle weekkaarten gebruiken het bestaande lege `dia-gold-shield-empty-v2`-frame met dezelfde `ShieldCard`-inhoudslaag. Een toegestane foto of het DIA-shirt wordt los in het midden geplaatst; de oorspronkelijke assets blijven bewaard. Publieke foto's vereisen foto- én publiekeweergavetoestemming; gebruik uitsluitend servergefilterde URL's. Nieuwe pictogrammen worden parallel ontwikkeld en kunnen via `PlayStyleIcon` worden aangesloten; behoud de twaalf stabiele speelstijl-ID’s.
