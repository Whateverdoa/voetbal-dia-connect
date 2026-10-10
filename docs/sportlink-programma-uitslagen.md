# Sportlink programma + uitslagen (fase 1)

## Beslissingen

- Sportlink is **leading** voor programma; club blijft live uitslagen bijhouden.
- Bij conflict: **Sportlink overschrijft** + `scoreDiscrepancy*` op de match.
- Architectuur A: Sportlink → staging `wedstrijden` → `syncWedstrijdenToMatches`.
- Swap-punt: `convex/import/resultsFetch.ts` (kiest Sportlink als `SPORTLINK_CLIENT_ID` gezet is).

## Env

- `SPORTLINK_CLIENT_ID` (Convex env) — verplicht voor Sportlink-pad
- `SPORTLINK_BASE_URL` — optioneel, default `https://data.sportlink.com`

## Flow

1. `sportlinkFixturesFetch` paget `programma` (weekoffset 0…12) + `uitslagen` (−1…−20)
2. Mapper slaat trainings over; zet `sportlink_wedstrijdcode` + synthetische `voetbalassist_id = -code`
3. Sync matcht eerst op `sportlinkWedstrijdcode`, anders op (team, opponent, Amsterdam-dag)
4. Bij `gespeeld`: scores toepassen; bij afwijking t.o.v. lokale uitslag → flag
5. Bij tijdverzetting (`scheduled`/`lineup`): `scheduledAt` wordt bijgewerkt

## Planning (crons)

| Job | Wanneer | Wat |
|-----|---------|-----|
| `sportlink-programma-midday` | Elke dag 11:00 UTC (~13:00 NL) | Fetch + sync (programma/verzettingen) |
| `sportlink-programma-evening` | Elke dag 17:00 UTC (~19:00 NL) | Fetch + sync (tweede check die dag) |
| `weekend-results-hourly` | Za/zo 08–20 UTC, alleen als wedstrijd die dag klaar is | Fetch + sync (uitslagen) |

Handmatig: `npx convex run import/weeklyUpdate:runNow '{"opsSecret":"…"}'`

## Later (niet in deze fase)

- Standen-UI (`poulestand`)
- Roster sync (veel namen “Afgeschermd”)
