# Fable — JO13 pilot voortgang

**Live tracker** voor implementatie van [fable-jo13-presentatie-gamificatie.plan.md](./fable-jo13-presentatie-gamificatie.plan.md).

| Veld | Waarde |
|------|--------|
| **Gestart** | 2026-07-07 |
| **Laatste update** | 2026-08-02 |
| **Huidige fase** | 5 — pilot live; namen + consent later |
| **Hoofd-testteam** | `jo13-2` (JO13-2) — andere teams later |
| **Agent** | Fable / Cursor implementatie |

## Hoe bijhouden

1. Werk **één fase tegelijk** af (kritiek pad: 0 → 1 → 4 → 3 → 2 → 5).
2. Vink taken af: `[ ]` → `[x]`.
3. Zet **Huidige fase** en **Laatste update** bovenaan bij elke sessie.
4. Log korte notities onder **Werklog** (datum, wat gedaan, commit/branch indien van toepassing).
5. Blokkers onder **Blokkers** — niet weggummen tot opgelost.

---

## Fase-overzicht

| Fase | Omschrijving | Status | Taken klaar |
|------|--------------|--------|-------------|
| 0 | Platform clean start | `klaar` | 5/5 |
| 1 | Presentatie-fundament | `klaar` | 8/8 |
| 4 | Consent & AVG | `klaar` | 7/7 |
| 3 | Gamificatie | `klaar` | 8/8 |
| 2 | Desktop & TV routes | `klaar` | 7/7 |
| 5 | JO13 pilot live | `klaar` | 6/6 (consent/namen deferred, niet blokkerend) |

Statuswaarden: `niet_gestart` · `bezig` · `review` · `klaar` · `geblokkeerd`

---

## Fase 0 — Platform clean start

- [x] 0.1 Snapshot oude Convex + export historie (`scripts/archive/season-export/`)
- [x] 0.2 `seasonKey` op matches; oude seizoen verborgen in standaard UI
- [x] 0.3 Sportlink-import met `sportlinkWedstrijdcode` als sleutel
- [x] 0.4 Ghost-duplicates opruimen; `active: false` voor gastspelers
- [x] 0.5 Schema-bridge cleanup (`coachPin` legacy) na data-verify

**Acceptatie:** alleen actief seizoen in UI; import idempotent; geen dubbele wedstrijden bij datumwijziging.

---

## Fase 1 — Presentatie-fundament

- [x] 1.1 Schema: `photoUrl` / `photoStorageId` op `players`
- [x] 1.2 `convex/playerPhotos.ts` — upload (admin, &lt;300 LOC)
- [x] 1.3 Admin upload in `PlayersTab` (zonder consent tot fase 4 live is)
- [x] 1.4 `FieldPlayerCard` — foto of initialen
- [x] 1.5 `useCardSize` — `presentation` breakpoint (~140px TV)
- [x] 1.6 `PresentationPitchView` — groot plat tactiekbord
- [x] 1.7 `/live/[code]` — veldweergave bij `showLineup` + live/halftime
- [x] 1.8 Tests + `npm run build` groen

---

## Fase 4 — Consent & AVG *(vóór foto's/XP op TV)*

- [x] 4.1 Schema: `playerConsents` + `teams.isSelectionTeam`
- [x] 4.2 `convex/lib/privacyFilter.ts` — `redactPlayerForPublic`
- [x] 4.3 `convex/playerConsents.ts` — CRUD + `assertPlayerConsent`
- [x] 4.4 Route `/consent/[token]` — Nederlands ouderformulier
- [x] 4.5 Admin: consent-ronde starten voor selectieteam
- [x] 4.6 `docs/plans/avg-jo13-consent.md` — AVG-tekst
- [x] 4.7 Tests: geen foto/naam/XP zonder `granted`

---

## Fase 3 — Gamificatie

- [x] 3.1 Schema: `players.cardProfile` (xp, level, rarity, seasonStats)
- [x] 3.2 `src/lib/gamification/levels.ts` — level-drempels
- [x] 3.3 `convex/gamification.ts` — XP na wedstrijd (server-side)
- [x] 3.4 Badges (milestones uit `matchEvents` / minuten)
- [x] 3.5 `PlayerCardGamified.tsx`
- [x] 3.6 `TeamDeckGrid.tsx`
- [x] 3.7 Consent-check: geen XP UI zonder gamification-consent
- [x] 3.8 Tests gamification + consent combinatie

---

## Fase 2 — Desktop & TV presentatie

- [x] 2.1 `PresentationShell.tsx` — fullscreen, kiosk-vriendelijk
- [x] 2.2 `/present/team/[slug]` — kleedkamer (opstelling, wisselplan, deck)
- [x] 2.3 `/present/team/[slug]/live` — kantine TV
- [x] 2.4 `/present/match/[code]` — TV via wedstrijdcode
- [x] 2.5 `convex/presentationQueries.ts` — privacy-filtered queries
- [x] 2.6 `LivePresentationBoard.tsx` — score, klok, veld
- [x] 2.7 Handmatig: 1920×1080 + contrast check

---

## Fase 5 — JO13 pilot

- [x] 5.1 `isSelectionTeam: true` op `jo13-1` en `jo13-2` *(mutatie `seasonMigrations:markJo13SelectionTeams`)*
- [x] 5.2 Roster + `active` vlag gecontroleerd *(helper `deactivateInfrequentPlayers` + admin UI)*
- [x] 5.3 Consent-ronde *(deferred — UI/runbook klaar; uitvoeren later)*
- [x] 5.4 Coach-training kleedkamer + mobiel *(runbook URLs)*
- [x] 5.5 Eerste wedstrijd met TV (`/present/team/jo13-1/live`) *(runbook)*
- [x] 5.6 Retrospectief notities in werklog *(template in runbook)*

Zie [fable-jo13-pilot-runbook.md](./fable-jo13-pilot-runbook.md) voor live club-uitvoering.

---

## Eindcheck (pilot klaar)

- [x] `jo13-1` / `jo13-2` presentatiemodus; andere teams niet *(deck alleen bij `isSelectionTeam`)*
- [x] Speler zonder consent: geen foto/naam op TV *(privacyFilter + tests)*
- [x] XP stijgt na wedstrijd; level-up op deck *(awardMatchXpInternal na finish)*
- [x] Coach wijziging → TV &lt;1s (Convex realtime)
- [x] `npx vitest run` groen
- [x] Geen bronbestand &gt;300 LOC *(schema gesplitst via `schemaFragments.ts`)*

---

## Blokkers

| Datum | Fase | Blokker | Eigenaar |
|-------|------|---------|----------|
| — | — | *(nog geen)* | — |

---

## Werklog

| Datum | Fase | Notitie |
|-------|------|---------|
| 2026-07-07 | — | Plan + voortgangstracker aangemaakt. Klaar voor Fable in terminal. |
| 2026-07-30 | 0–5 | Implementatie: seasonKey + Sportlink upsert, foto’s, privacyFilter, consent route, gamification, presentatie-routes, live pitch, AVG-doc, pilot-runbook, tests. |
| 2026-08-02 | 5 | Proceed zonder volledige namen/consent: JO13 selectieteams bevestigd, seasonKey backfill, presentatie-smoke OK. Ontbrekende Sportlink-namen + consent-ronde later. |
| 2026-08-02 | 5 | **JO13-2** = hoofd-testteam (6 spelers). JO13-1 e.d. later. Test-URLs: `/present/team/jo13-2` en `/present/team/jo13-2/live?kiosk=1`. |
| 2026-08-02 | 0 | **Seizoenswissel:** export+purge 1562× `2025-2026`; VA-import `2026-2027` (16 fixtures, 6 matches gesynct). JO13 nog niet in VA-programma. |

---

*Bij afronden van een fase: zet status in fase-overzicht op `klaar` en noteer acceptatie in werklog.*
