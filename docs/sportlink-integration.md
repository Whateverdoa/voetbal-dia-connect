# Sportlink Integratievoorbereiding

## Doel

Standen en uitslagen extern kunnen ophalen via Sportlink Club.Dataservice, zonder
de huidige matchflow te blokkeren.

## Contract

- Provider interface: `src/lib/competition/provider.ts`
- Sportlink client: `src/lib/competition/sportlinkClient.ts`
- Config contract: zie `docs/config.md`
- **Convex uitslagen-pipeline:** wanneer Sportlink live gaat, vervang alleen de implementatie in `convex/import/resultsFetch.ts` (staging `wedstrijden` vullen); cron (`convex/crons.ts`) en sync naar `matches` blijven hetzelfde.

## Pollingstrategie

- Basisinterval: 5 minuten (`SPORTLINK_REFRESH_MINUTES`)
- Alleen refreshen voor competities die zichtbaar zijn in UI
- `cache: "no-store"` gebruiken om stale data te voorkomen

## Fallback UX

- Als Sportlink niet geconfigureerd is of faalt:
  - bestaande interne data tonen
  - geen harde fout in paginaflow
  - optioneel later: subtiele melding “Externe stand tijdelijk niet beschikbaar”

## Open dependency

- `SPORTLINK_CLIENT_ID` moet vanuit bestuur worden aangeleverd.
