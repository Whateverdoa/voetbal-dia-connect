# Plan: Centrale club-/teamlogo’s (DIA Live)

## Doel

Logo’s niet alleen als losse strings op geïmporteerde `wedstrijden`-rijen, maar **centraal** op `clubs` en/of `teams`, zodat publieke en interne schermen overal dezelfde afbeelding tonen.

## Huidige situatie (baseline)

- `wedstrijden`: optioneel `thuisteamLogo`, `uitteamLogo` (import).
- `clubs`: geen logoveld.
- `teams`: geen logoveld.

## Aanbevolen datamodel

1. **`teams.logoUrl`** (optioneel `string`)  
   - Primaire plek voor jeugdteams: elk DIA-team heeft één logo (vaak clublogo).
2. Optioneel **`clubs.logoUrl`** (optioneel `string`)  
   - Als fallback: team zonder eigen logo gebruikt clublogo.

**Resolve-volgorde in UI/helpers:** `team.logoUrl ?? club.logoUrl ?? null`.

## Migratie / backfill (fases)

| Fase | Wat | Risico |
|------|-----|--------|
| A | Schema toevoegen (alleen nieuwe optionele velden) | Laag |
| B | Admin-UI: logo-URL bewerken per team (en evt. club) | Laag |
| C | Eenmalige backfill: uit `wedstrijden` waar `dia_team` matcht met team-slug/naam, meest voorkomende URL kiezen | Medium (naamnormalisatie) |
| D | Bij nieuwe VoetbalAssist-import: optioneel `teams` patchen als betrouwbare match gevonden | Medium |

## UI

- Publiek: `MatchBrowser`, `MatchCard`, live header — kleine avatar links/rechts van teamnaam.
- `next/image`: alleen als `remotePatterns` in `next.config` de host(s) toestaan; anders gewone `<img>` met `referrerPolicy` waar nodig.
- Altijd **fallback** (initialen of generiek icoon) bij lege of kapotte URL.

## Niet in scope (tenzij expliciet gewenst)

- Logo’s hosten in Convex storage (upload) — kan later; start met URL’s.
- Rechten op hotlinked images — accepteer dat sommige URLs kunnen breken.

## Acceptatiecriteria

- [ ] `teams` (en evt. `clubs`) hebben optioneel logoveld; bestaande data blijft geldig.
- [ ] Minstens één scherm toont teamlogo uit centrale data, niet uit `wedstrijden` alleen.
- [ ] Geen wit scherm bij ontbrekende logo: fallback zichtbaar.
- [ ] Documentatie in `HANDOFF.md` blijft in sync.

## Geschatte moeilijkheid

- **Schema + admin veld + één UI-component:** klein tot middel (1–2 dagen iteratief).
- **Betrouwbare backfill uit `wedstrijden`:** middel (naam/slug-matching goed testen).
- **Volledig consistent over alle schermen:** middel (meerdere PR’s).

## Volgorde aanbevolen

1. Schema + admin bewerken.  
2. Eén publieke plek (bijv. `MatchCard` of `MatchBrowser`).  
3. Backfill script + dry-run op dev.  
4. Rest van UI + opschonen dubbele logica.
