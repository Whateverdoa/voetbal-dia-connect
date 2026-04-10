# KNVB-adjacent data: Sportlink Club.Dataservice (research notes)

This is a **capability outline** for planning, not a guarantee of product scope. Official contract and endpoints are owned by Sportlink / the club’s subscription.

## How this relates to “KNVB API”

Youth football competition data in the Netherlands is typically exposed to clubs via **Sportlink Club.Dataservice** (`https://data.sportlink.com/...` with a **client_id**), not a single generic “KNVB REST” consumed by this app today. The repo already has a thin provider direction in [`docs/sportlink-integration.md`](sportlink-integration.md) and [`src/lib/competition/sportlinkClient.ts`](../src/lib/competition/sportlinkClient.ts).

## What you might pull (high level)

| Need | Typical direction | Notes |
| --- | --- | --- |
| Programma / uitslagen / stand | Publieke artikelen with `client_id` | Fits existing polling idea (`SPORTLINK_REFRESH_MINUTES`). |
| Team / speler listings | Sportlink “teams” / related articles | Check **privacy scope**: some articles require member login + token; output may depend on member privacy settings. |
| Wedstrijdselectie in DIA Live | App data (`matchPlayers`) | Not automatically identical to bond roster; coaches still need local overrides. |

## Coach edits vs federation data

- **Club deployment with import/sync**: treat federation data as **input**; DIA Live keeps **authoritative match state** for live score and events unless a deliberate sync rule overwrites (see import rules in `HANDOFF.md`).
- **Standalone / multi-tenant**: each club would need its own **client_id** and mapping; without it, rely on manual entry.

## Next steps (product/engineering)

1. Confirm with the club which Sportlink articles are licensed.
2. Decide **source of truth** for scores (live app vs official result) per scenario.
3. Extend the provider only after env and legal/privacy constraints are clear.
