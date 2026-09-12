# Onderzoek: ouder-tab (fruit / rijden / taken + standen)

**Status:** research only — geen implementatie in deze ronde.  
**Datum:** 2026-09-12  
**Context:** coaches willen match-dag taken zichtbaar voor ouders; HANDOFF heeft geen fruit/rijden/taken-feature.

## Wat er al is

| Behoefte | Nu in product |
|----------|----------------|
| Ouders / guardians | Gepland als **selectie-teamportaal** (`docs/plans/selectie-teamportaal.plan.md`), niet als coach-tab |
| Standen | `/standen` = **scoreboard** (live uitslagen). Sportlink **poulestand** = latere track |
| Fruit / rijden / vrijwilligerstaken | **Niet** genoemd in HANDOFF of product-backlog |

## Doel (MVP-schets)

Match-dag takenbord per team/wedstrijd:

- Fruit meenemen
- Rijden / carpool-slots
- Overige taken (vrij tekst + verantwoordelijke)
- Optioneel: link naar wedstrijdscore (`/standen` of match live)

Niet: chat, album, training-inschrijving (al buiten scope teamportaal v1).

## Opties

### A — Publieke team-tab onder `/team/[slug]`

- Voordeel: bereikbaar zonder coach-app; past bij ouders die alleen team volgen.
- Nadeel: wie mag bewerken? Coach-only edit + publiek read is veiligste start.

### B — Uitbreiding selectie-portaal (guardians)

- Voordeel: rollen/consent al voorzien voor selectieteams.
- Nadeel: JO13-breed / breedte-teams zonder portaal vallen buiten; langere afhankelijkheden.

### C — Losse Convex-tabel `matchDuties` + coach-edit / ouder-read

- Velden (MVP): `matchId`, `teamId`, `kind` (`fruit` \| `rijden` \| `other`), `label`, `assigneeName`, `assigneeContact?`, `notes?`, `updatedAt`, `updatedBy`.
- UI: coach-tab “Taken” op desktop-plan of team-pagina; publieke read-only kaart op team/match.
- Standen: géén nieuwe “standen bijhouder” — hergebruik `/standen` + later Sportlink-poule.

**Aanbeveling:** **C als eerste MVP**, met publieke read op team/match-pagina (A-achtige surface). Portaal (B) later koppelen als guardians live zijn.

## AVG / rollen

- Geen medische data.
- Contactgegevens van ouders alleen met expliciete toestemming / minimale velden (naam + optioneel telefoon).
- Bewerken: coach/admin; lezen: publiek of gedeelde teamcode.
- Log wie laatst wijzigde.

## Niet-doelen v1

- Push/WhatsApp-herinneringen
- Automatische rooster-rotatie over het seizoen
- Chat tussen ouders
- Vervanging van Sportlink-poulestand

## Volgende stap (na go)

1. Schema `matchDuties` + indexes `by_match`, `by_team`.
2. Coach desktop UI (niet telefoon-live).
3. Read-only blok op team- of match-publiekspagina.
4. Smoke: TEST Sandbox-wedstrijd met 1 fruit + 1 rijtaak.
