# Plan — Selectie-teamportaal (landing + member gamificatie)

**Status:** publieke teamhub gebouwd; geïsoleerd klikprototype toegevoegd; echte member-integratie later

**Laatste update:** 2026-09-20

**Roadmap:** [open-roadmap.md](./open-roadmap.md)  
**Pilotteam:** `jo13-2` eerst; andere selecties daarna

## Klikprototype (2026-09)

`/demo/teamportaal` verkent de speler-, ouder-, coach- en scoutervaring met fictieve spelers. Rolkeuze simuleert gebruikers; dit is geen account- of autorisatiemodel voor echte kinderen.

- Coachfeedback richt zich op ontwikkeling. Concepten blijven bij de coach; gepubliceerde feedback verschijnt alleen bij de betreffende speler en gekoppelde demo-ouder.
- **Optionele professionele observaties (2026-09-20):** standaard uit. De coach vindt de module via **Observaties** en kan deze aanzetten. Coach en scout krijgen een afzonderlijke werkplek; scouts zien uitsluitend Observaties, geen feedbackpublicatie of stembeheer. Spelers en ouders krijgen geen observatietab of observatiegegevens in hun weergave. Observaties veranderen geen positieve stemmen, XP of gedeelde ontwikkelfeedback.
- Observaties bevatten context (wedstrijd/training), datum, positie, observatieduur en de basis voor de indruk. Negen onderdelen bestrijken techniek, tactiek, bewegen, gedrag en de positierol. Elke ingevulde beoordeling krijgt een concreet voorbeeld; sterke punten, ontwikkelpunten en een vervolgafspraak verbinden de observatie met begeleiding.
- Een observatieconcept blijft bij de makende demorole. Na **Intern vastleggen** lezen coach en scout het verslag; het is dan niet meer wijzigbaar. Een volgende indruk wordt een nieuwe observatie in het spelersdossier. Uitschakelen verbergt de werkplek en bewaart bestaande verslagen. Bestaande opgeslagen v1-demo's blijven bruikbaar.
- Spelers kiezen één **Speler van de wedstrijd** en één **Actie van de wedstrijd** per ronde; niet zichzelf of hun eigen actie. Gelijke scores geven gedeelde winnaars. Er zijn geen zichtbare stemtotalen, ranglijsten of XP-wijzigingen.
- De coach kan positieve acties direct toevoegen. Spelers kunnen een actie van een teamgenoot voordragen; die verschijnt pas na coachgoedkeuring op het stembiljet. Bij openen worden de kandidatenlijsten vastgezet. De ronde duurt 24 uur; de demo-coach kan direct naar de uitslag springen.
- De ouderweergave wisselt tussen twee fictieve kinderen (`p1` en `p10`) en toont alleen lezen: feedback van het eigen kind, volgende wedstrijd, uitslagen en winnaars. Geen ouderstemmen of coachbewerkingen.
- De demo verandert geen bestaande wedstrijdgegevens, XP of publieke spelerskaarten.
- Alle wijzigingen blijven in lokale browseropslag; de demo heeft een reset naar fictieve startgegevens. Er zijn geen Clerk-/Convex-koppelingen of serveracties vanuit de demo.
- De route omzeilt de bestaande providers, navigatie en automatische rol-synchronisatie. Lokale development werkt zonder backendconfiguratie. Een Vercel-preview vereist `VERCEL_ENV=preview` en `TEAM_PORTAL_DEMO_ENABLED=true`; production blijft uitgeschakeld, ook met die vlag. De pagina is `noindex` en ondersteunt inzoomen.
- Echte integratie volgt pas na productvalidatie: speleridentiteit, guardian-koppeling, serverautorisatie en uniforme privacy-/toestemmingsregels. Lokale rolkeuze en filtering bieden geen beveiliging voor echte gegevens.
- Dat geldt ook voor de stafobservaties: lokale browseropslag en vrij wisselbare demorollen maken deze demo niet werkelijk vertrouwelijk. Gebruik alleen fictieve notities; echte coach-/scoutaccounts en toegangscontrole komen bij latere integratie. Concepten worden dan aan een individuele maker gekoppeld en gedeelde verslagen alleen aan bevoegde stafleden binnen het betreffende team.
- Vóór hergebruik van de huidige backend: consentregels van publieke queries gelijk trekken met de gekozen zichtbaarheid; `gamification.awardMatchXp` van rolcontrole en idempotente verwerking voorzien. De huidige openbare mutatie mag geen ingang voor deze demo worden.

De publieke `/team/[slug]` is al gebouwd voor teams: bondstand, gespeelde wedstrijden en seizoensoverzicht. De member-route `/team/[slug]/app/*` en echte uitnodigingen zijn nog niet gebouwd. De productvisie hieronder beschrijft die latere koppeling; de demobouw is geen uitrol daarvan.

## Productvisie

Voor teams met `teams.isSelectionTeam === true`:

| Laag | Route | Wie | Inhoud |
|------|-------|-----|--------|
| **Landing (openbaar, gebouwd)** | `/team/[slug]` | Iedereen | Teamnaam, seizoen, bondstand, gespeelde wedstrijden; member-CTA en extra programmaweergave later |
| **Member (SaaS-achtig)** | `/team/[slug]/app/*` | Clerk + guardian↔speler | Eigen kaart (XP/level), teamdeck, seizoensstats — geen coach-controls |
| **Staff (bestaand)** | `/coach`, `/present/...` | Coach/admin | Wedstrijd + kleedkamer/TV — blijft gescheiden |

Niet hetzelfde als `/present` (kiosk) of `/consent/[token]` (eenmalig). Portaal = doorlopende relatie.

## Defaults

1. **Auth:** bestaande Clerk; actor `parent`/`member` via `userAccess` + koppeling aan `playerId`(s)
2. **Geen billing** in v1 — SaaS-achtig = product-UX, geen Stripe
3. **Alleen selectieteams** in v1; zie uitbreidbaarheid hieronder
4. **AVG:** member toont namen/foto/XP alleen bij `granted`; landing streng gefilterd
5. **Invite:** admin/coach nodigt guardian uit; accounts persistent
6. **Identiteit bij integratie:** één of meer guardians per speler. De demo bevat ook spelersrollen; echte spelerlogin en koppeling moeten vóór het aansluiten van stemmen worden uitgewerkt.

## Uitbreidbaarheid

| Uitbreiding | Hoe |
|-------------|-----|
| Andere selectieteams | Zelfde routes; `isSelectionTeam: true` + consent + invites |
| Gewone teams later | Zelfde shell, **feature tiers** |

**Tiers:**

- **Selectie (volledig):** landing + member + gamificatie + consent
- **Standaard (licht):** optioneel landing / live-link; member/gamificatie uit tot product dat aanzet
- Later optioneel: `teams.portalFeatures` (`landing` \| `member` \| `gamification`)

Architectuurregel: alles scoped op `teamId`; UI leest features van het team — geen fork per teamtype.

## Hergebruik

- `cardProfile`, `convex/gamification.ts`
- `TeamDeckGrid`, `PlayerCardGamified`
- `privacyFilter`, `playerConsents`
- Presentatie-queries als referentie voor publieke payloads

## Nieuw

- Member-routes + beveiligde shell (prototype bestaat los)
- Schema: guardian↔player (of `userAccess.playerIds` + rol)
- Bestaande publieke teamhub hergebruiken; nieuwe member-queries scoped
- Invite-flow + NL copy
- Korte update [`docs/actors-and-access.md`](../actors-and-access.md)

## Fasering

| Fase | Inhoud |
|------|--------|
| P0 | Klikprototype `/demo/teamportaal` met fictieve speler-, ouder- en coachervaring; productvalidatie |
| P1 | Bestaande publieke `/team/[slug]` hergebruiken; member-ingang voor pilotteam |
| P2 | Clerk member + guardian↔player |
| P3 | Member dashboard: eigen kaart + teamdeck |
| P4 | Invite-flow admin |
| P5 | Soft launch JO13-2 (na consent-ronde) |

## Buiten scope v1

- Betalingen / multi-club billing
- Chat, foto-album, trainingsinschrijving
- Heatmaps ([heatmaps-future.md](./heatmaps-future.md))
- Coach-edits vanuit member-app
- Gamificatie voor gewone teams (pas bij tier)

## Acceptatie (P5)

- JO13-2 landing bereikbaar zonder login
- Guardian ziet eigen kind-kaart met consent; zonder consent geen XP/foto
- Andere (niet-selectie) teams: geen member-gamificatie-routes actief
