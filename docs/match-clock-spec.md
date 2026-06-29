# Wedstrijdklok-spec

Status: draft  
Doel: expliciet vastleggen hoe de wedstrijdklok, kwart/helft-ankers en extra tijd zich moeten gedragen in coach-, scheidsrechter- en publieke weergave.

## Waarom dit document

In de huidige code zit de logica verdeeld over:

- [HANDOFF.md](/C:/PROJECTS/VOETBAL/Voetbal-dial-connect/voetbal-dia-connect/HANDOFF.md)
- [convex/lib/matchEventGameTime.ts](/C:/PROJECTS/VOETBAL/Voetbal-dial-connect/voetbal-dia-connect/convex/lib/matchEventGameTime.ts)
- frontendcomponenten zoals `MatchClock`, `ScoreDisplay`, `LiveMatch` en `RefereeMatchConsole`

Daardoor is de bedoeling deels impliciet:

- speelvormen hebben vaste ankers (`4x15`, `2x30`, `2x45`)
- rust/nieuw kwart begint op nominale speeltijd
- extra tijd bestaat wel degelijk
- maar het is nog niet overal expliciet vastgelegd hoe de hoofdklok dat moet tonen tijdens live, rust en na afloop

Dit document maakt die regels expliciet voordat verdere klokwijzigingen worden gebouwd.

## Begrippen

- `regulationDurationMinutes`
  - totale reguliere speeltijd van de wedstrijd
  - voorbeelden: `60` bij `4x15` of `2x30`, `90` bij `2x45`
- `quarterCount`
  - aantal periodes: `4` of `2`
- `quarterDuration`
  - `regulationDurationMinutes / quarterCount`
- nominale speeltijd
  - de officiële ankerlijn van de wedstrijdklok
  - voorbeelden:
    - `4x15`: `00:00`, `15:00`, `30:00`, `45:00`
    - `2x30`: `00:00`, `30:00`
    - `2x45`: `00:00`, `45:00`
- echte wedstrijdtijd
  - de doorlopende tijd binnen een live periode; geregistreerde onderbrekingen stoppen de hoofdklok niet
- extra tijd
  - tijd voorbij de nominale duur van een kwart/helft of voorbij de reguliere wedstrijdduur
- onderbreking
  - een door scheidsrechter/wedstrijdleider geregistreerde spelstop tijdens `live`; telt mee voor advies extra tijd en bevriest spelersminuten, maar pauzeert de hoofdklok niet
- rustklok
  - aparte countdown tussen periodes; de wedstrijdklok blijft dan bevroren op de laatst gespeelde stand
- `gameSecond`
  - nominale wedstrijdtijd voor eventstempels
- `displayExtraMinute`
  - extra-tijdsindicator voor eventweergave zoals `45+2`
- `bankedOverrunSeconds`
  - al opgebouwde overrun uit eerdere afgeronde periodes; nu gebruikt in de backend-helper voor extra tijd aan het einde van de wedstrijd

## Canonieke productregels

### 1. De hoofdklok gebruikt nominale ankers

De wedstrijdklok is een oplopende matchklok met vaste ankers per kwart/helft.

Voorbeelden:

- `4x15`
  - kwart 1 begint op `00:00`
  - kwart 2 begint op `15:00`
  - kwart 3 begint op `30:00`
  - kwart 4 begint op `45:00`
- `2x30`
  - helft 1 begint op `00:00`
  - helft 2 begint op `30:00`
- `2x45`
  - helft 1 begint op `00:00`
  - helft 2 begint op `45:00`

Belangrijk:

- een nieuwe helft of een nieuw kwart begint altijd op nominale speeltijd
- extra tijd uit de vorige periode verschuift het startanker van de volgende periode niet

Voorbeeld:

- bij `2x30`, als helft 1 eindigt op `31:12`, dan begint helft 2 alsnog op `30:00`

### 2. Extra tijd hoort bij de gespeelde tijd

Extra tijd telt mee als echt gespeelde tijd.

Voorbeelden:

- `4x15`, kwart 1 loopt door tot `16:10`
  - dat is 1 minuut en 10 seconden extra speeltijd
- `2x45`, match eindigt op `92:14`
  - dat is 2 minuten en 14 seconden extra speeltijd

### 3. De hoofdklok en eventtijd mogen verschillend presenteren

We maken onderscheid tussen:

- hoofdklok
  - toont doorlopende `MM:SS`
  - voorbeeld: `46:12`, `61:08`, `92:14`
- eventtijd
  - toont voetbalnotatie voor gebeurtenissen
  - voorbeelden: `45+1`, `45+2`, `90+3`

Dat betekent:

- een doelpunt kan in de timeline `45+2` tonen
- terwijl de grote hoofdklok op dat moment `47:08` toont

Dat is toegestaan en gewenst, zolang de regels consistent zijn.

### 4. Tijdens rust staat de klok stil op de laatst gespeelde tijd

Bij `halftime` loopt de klok niet door.

Gedrag:

- de klok toont de laatst gespeelde stand van de vorige periode
- dus niet `--:--`
- dus ook niet meteen het anker van de volgende periode

Voorbeelden:

- kwart 1 eindigt op `15:00`
  - rust toont `15:00`
- helft 1 eindigt op `31:12`
  - rust toont `31:12`

### 5. Na afloop blijft de klok staan op de eindtijd

Bij `finished` moet de hoofdklok blijven staan op de laatste echt gespeelde tijd.

Gedrag:

- geen `--:--`
- geen reset naar reguliere tijd
- eindstand van de klok blijft zichtbaar

Voorbeelden:

- `4x15`, wedstrijd fluit af op `60:00`
  - klok blijft op `60:00`
- `4x15`, wedstrijd fluit af op `62:05`
  - klok blijft op `62:05`
- `2x45`, wedstrijd fluit af op `91:34`
  - klok blijft op `91:34`

### 6. Onderbrekingen pauzeren de hoofdklok niet

Tijdens `live` blijft de hoofdklok altijd doorlopen. Een scheidsrechter of wedstrijdleider kan wel een onderbreking registreren met:

- `Onderbreking starten`
- `Spel hervat`

Die registratie heeft twee effecten:

- spelersminuten op het veld worden bevroren zolang de onderbreking loopt
- de duur telt op in `Advies extra tijd`

De registratie heeft nadrukkelijk geen effect op de grote wedstrijdklok. Er is dus geen hoofdklok-flow meer waarbij iemand na een blessure of discussie eerst opnieuw op `Hervat klok` moet drukken.

### 7. Rust tussen periodes krijgt een eigen rustklok

Bij `halftime` blijft de wedstrijdklok bevroren op de laatste gespeelde stand. Daarnaast kan een aparte rustklok aftellen tot het volgende kwart of de volgende helft.

Default voor coaches:

- rustklok aan
- automatisch hervatten aan

Rustduur per wedstrijdvorm:

| Vorm | Na periode | Rust |
| --- | --- | --- |
| `4x15` | kwart 1 en 3 | 3 minuten |
| `4x15` | kwart 2 | 15 minuten |
| `2x30` / `2x45` | helft 1 | 15 minuten |

Als automatisch hervatten uit staat, geeft de rustklok na afloop alleen een signaal en blijft de handmatige knop `Start kwart/helft` leidend.

### 8. Scheidsrechter krijgt herinneringen aan einde kwart/helft

Tijdens `live` op de scheidsrechterpagina:

- bij **nominale** eindtijd van de lopende periode: trilling + korte toon + banner (“Einde kwart/helft X”)
- bij **+1** en **+2 minuten** extra speeltijd daarna: korter signaal + bijgewerkte banner
- de hoofdklok stopt niet automatisch; de scheidsrechter bevestigt nog steeds handmatig via `Einde kwart/helft`

## Normatieve voorbeelden

### Scenario A — 4x15 zonder extra tijd

- Q1 start `00:00`
- Q1 einde `15:00`
- Q2 start `15:00`
- Q3 start `30:00`
- Q4 start `45:00`
- fulltime `60:00`

### Scenario B — 4x15 met extra tijd in Q1

- Q1 start `00:00`
- Q1 loopt door tot `16:10`
- rust na Q1 toont `16:10`
- Q2 start daarna op `15:00`

Interpretatie:

- extra tijd hoort bij de gespeelde tijd
- maar het anker van het volgende kwart blijft nominaal

### Scenario C — 2x30 met extra tijd in H1 en H2

- H1 start `00:00`
- H1 eindigt op `31:12`
- rust toont `31:12`
- H2 start op `30:00`
- match eindigt op `61:48`
- eindklok blijft na afloop op `61:48`

Eventnotatie kan zijn:

- laat doelpunt in H1: `30+2`
- laat doelpunt in H2: `60+2`

### Scenario D — 2x45 zonder extra tijd

- H1 start `00:00`
- H2 start `45:00`
- einde `90:00`

## Huidige implementatie: wat al klopt

De backend-helper in [convex/lib/matchEventGameTime.ts](/C:/PROJECTS/VOETBAL/Voetbal-dial-connect/voetbal-dia-connect/convex/lib/matchEventGameTime.ts) volgt al deels deze richting:

- kwart/helft-ankers zijn nominaal
- `gameSecond` wordt geclamped op reguliere tijd binnen de lopende periode
- extra tijd voor events loopt via `displayExtraMinute`
- eerdere overrun kan worden meegenomen via `bankedOverrunSeconds` in de eindfase

## Huidige implementatie: doelstatus

### A. Hoofdklok na `finished`

Bij `finished` schrijft de backend `frozenClockMs`, zodat frontendweergaven de laatste echt gespeelde stand blijven tonen.

### B. Hoofdklok tijdens `halftime`

Bij `halftime` schrijft de backend `frozenClockMs`, `halftimeStartedAt` en `scheduledBreakEndAt`. De hoofdklok blijft op `frozenClockMs`; de rustklok gebruikt de break-velden.

### C. Notatie van extra tijd in de hoofdklok

Nog te bevestigen, maar aanbevolen:

- hoofdklok blijft `MM:SS`
- extra tijdnotatie met `+` wordt alleen gebruikt voor eventweergave en eventueel kleine labels, niet voor de grote lopende klok

Aanbevolen omdat:

- de grote klok dan eenvoudig, leesbaar en scheidsrechter-proof blijft
- de timeline nog steeds voetbalnotatie kan tonen

## Aanbevolen technische richting

### Datamodel

Voeg een expliciete vastgelegde klokwaarde toe voor het einde van een periode of het einde van de wedstrijd, zodat frontendweergaven niet afhankelijk zijn van velden die bij `halftime` of `finished` worden geleegd.

Mogelijke velden:

- `finalElapsedMs`
- of generieker: `frozenClockMs`

### Frontend

`MatchClock` moet kunnen renderen op basis van:

- live berekening wanneer de periode loopt
- bevroren berekening tijdens rust
- bevroren eindtijd na afloop

### Backend

Bij overgang naar:

- `halftime`
- `finished`

moet de zichtbare klokstand van dat moment expliciet worden vastgelegd.

## Beslissingen in dit document

Deze regels zijn met dit document leidend tenzij later expliciet herzien:

1. Een nieuwe helft of een nieuw kwart begint op nominale speeltijd.
2. Extra tijd hoort bij de echt gespeelde tijd.
3. De grote hoofdklok toont doorlopende `MM:SS`.
4. Eventweergave mag `45+2` / `90+3` gebruiken.
5. Tijdens rust blijft de klok staan op de laatst gespeelde tijd.
6. Na afloop blijft de klok staan op de eindtijd.
7. Onderbrekingen tijdens live spel pauzeren de hoofdklok niet.
8. De rustklok is standaard aan en hervat standaard automatisch.

## Open vragen voor latere verfijning

1. Willen we in de UI ergens expliciet `ET` / `extra tijd` labelen, of alleen via timeline-notatie?
2. Moet de rustduur later per wedstrijd handmatig overschrijfbaar worden, of blijven de DIA-defaults genoeg?

## Onderbrekingsteller / advies extra tijd

Naast de hoofdklok heeft de scheidsrechter of wedstrijdleider een aparte helper voor relevante spelonderbrekingen.

Doel:

- niet de hoofdklok vervangen
- niet automatisch affluiten
- wel helpen om extra tijd consistenter te schatten

### Productgedachte

De hoofdklok blijft de echte doorlopende speeltijd.

Daarnaast kan een tweede kleine teller bestaan:

- `Onderbreking starten`
- `Spel hervat`

De app telt dan de som van geregistreerde onderbrekingen op en toont die als:

- `Advies extra tijd: 02:10`
- of compacter: `+2 min advies`

### Regels

1. De onderbrekingsteller is de vervanging voor de oude hoofdklok-pauze.
2. De onderbrekingsteller pauzeert de hoofdklok niet.
3. De onderbrekingsteller is adviserend, niet beslissend.
4. Alleen de scheidsrechter bepaalt wanneer een periode of wedstrijd echt wordt afgefloten.
5. De aanbevolen extra tijd is gebaseerd op geregistreerde onderbrekingen, maar de scheidsrechter mag daarvan afwijken.

### Wanneer gebruiken

Geschikt voor:

- blessurebehandeling
- langdurig oponthoud
- discussie / opstootje
- materiaal- of veldprobleem
- andere duidelijke vertragingen

Niet bedoeld voor:

- normale uitballen
- korte spelstops die binnen het gewone ritme vallen

### UI-richting

Aanbevolen plaats:

- onder de grote wedstrijdklok
- visueel kleiner dan de hoofdklok
- duidelijk gelabeld als hulpmiddel

Aanbevolen bediening:

- één knop om onderbreking te starten
- één knop om spelhervatting te registreren
- duidelijke status als een onderbreking nog loopt

### Relatie met reguliere speeltijd bereikt

Als de nominale speeltijd is bereikt:

- de hoofdklok loopt gewoon door
- de app mag een waarschuwing geven
- de app mag ook het actuele advies extra tijd tonen
- maar de scheidsrechter beslist zelf of hij meteen affluit of laat doorspelen
