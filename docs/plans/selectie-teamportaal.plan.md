# Plan — Selectie-teamportaal (landing + member gamificatie)

**Status:** gepland (documentatie; nog niet gebouwd)  
**Roadmap:** [open-roadmap.md](./open-roadmap.md)  
**Pilotteam:** `jo13-2` eerst; andere selecties daarna

## Productvisie

Voor teams met `teams.isSelectionTeam === true`:

| Laag | Route | Wie | Inhoud |
|------|-------|-----|--------|
| **Landing (openbaar)** | `/team/[slug]` | Iedereen | Teamnaam, seizoen, aankomende wedstrijden (privacy-safe), CTA inloggen, link live/TV |
| **Member (SaaS-achtig)** | `/team/[slug]/app/*` | Clerk + guardian↔speler | Eigen kaart (XP/level), teamdeck, seizoensstats — geen coach-controls |
| **Staff (bestaand)** | `/coach`, `/present/...` | Coach/admin | Wedstrijd + kleedkamer/TV — blijft gescheiden |

Niet hetzelfde als `/present` (kiosk) of `/consent/[token]` (eenmalig). Portaal = doorlopende relatie.

## Defaults

1. **Auth:** bestaande Clerk; actor `parent`/`member` via `userAccess` + koppeling aan `playerId`(s)
2. **Geen billing** in v1 — SaaS-achtig = product-UX, geen Stripe
3. **Alleen selectieteams** in v1; zie uitbreidbaarheid hieronder
4. **AVG:** member toont namen/foto/XP alleen bij `granted`; landing streng gefilterd
5. **Invite:** admin/coach nodigt guardian uit; accounts persistent
6. **v1 guardians:** één of meer guardians per speler; speler-eigen login later optioneel

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

- Routes + member shell
- Schema: guardian↔player (of `userAccess.playerIds` + rol)
- Landing public query; member queries scoped
- Invite-flow + NL copy
- Korte update [`docs/actors-and-access.md`](../actors-and-access.md)

## Fasering

| Fase | Inhoud |
|------|--------|
| P0 | Wireframes landing vs app (dit document = start WAT+HOE) |
| P1 | Landing `/team/[slug]` (public, alleen selectie) |
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
