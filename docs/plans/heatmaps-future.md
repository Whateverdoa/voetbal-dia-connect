# Future — Heatmaps / tactische zones

**Status:** future (niet in huidige bouwronde)  
**Roadmap:** [open-roadmap.md](./open-roadmap.md)  
**Afhankelijk van:** stabiele tactiek-presentatie ([tactiek-presentatie.plan.md](./tactiek-presentatie.plan.md))

## Wat we beloven (later)

Tactische **zone-overlays** op het veld (bijv. druk / opbouw / afronding) die de coach kiest of die afgeleid worden uit formatie + geplande posities / events.

## Wat we níet beloven in v1

- Geen GPS- of video-spelertracking
- Geen echte “heat” van loopafstanden zonder externe data

## Richting datamodel (schets)

- Zones gekoppeld aan `matchId` of tactiek-snapshot: type, intensiteit, poly/grid op pitch
- Weergave op presentatie/portaal als optionele laag
- AVG: geen nieuwe persoonslocatie; alleen teamtactiek / geaggregeerde zones

## Wanneer oppakken

Na: Wisselplan op `/present` + stabiel plat veld. Eventueel tonen in selectie-portaal als “coach tip”, niet als tracking-product.
