# DIA Live — open roadmap (inventaris)

**Doel:** één plek met open plannen, todos en futures.  
**Laatste sync:** 2026-09-20

**Gerelateerde plannen:** [device-surfaces](./device-surfaces.plan.md) · [tactiek-presentatie](./tactiek-presentatie.plan.md) · [heatmaps-future](./heatmaps-future.md) · [selectie-teamportaal](./selectie-teamportaal.plan.md)

---

## A. Actieve / deels klaar (restwerk)

| Bron | Status | Nog open |
|------|--------|----------|
| [fable-jo13-presentatie-gamificatie.plan.md](./fable-jo13-presentatie-gamificatie.plan.md) + [fable-jo13-progress.md](./fable-jo13-progress.md) | Codefasen 0–5 `klaar` | Sportlink-namen; JO13-1 later |
| [fable-jo13-pilot-runbook.md](./fable-jo13-pilot-runbook.md) | Runbook klaar | Club-uitvoering 5.4–5.6 (consent JO13-2 gedaan) |
| [avg-jo13-consent.md](./avg-jo13-consent.md) | Beleid klaar | JO13-2 consent-ronde gedaan; JO13-1 later |
| [coach_scheids_admin_logos.plan.md](./coach_scheids_admin_logos.plan.md) | Deels gebouwd | Acceptatiecriteria afvinken |
| Tactiekstudio (Fable fase 2 rest) | Presentatie-basis klaar | Wisselplan-tab op `/present` — zie [tactiek-presentatie](./tactiek-presentatie.plan.md) (in uitvoering) |
| [Selectie-teamportaal](./selectie-teamportaal.plan.md) | Publieke teamhub gebouwd; fictief klikprototype `/demo/teamportaal` toegevoegd | Productvalidatie; echte speler-/guardian-koppeling, autorisatie en consent vóór integratie |

## B. Product backlog — prioriteit 1–3

Zie [product-backlog.md](./product-backlog.md):

1. Admin UX & demo (filters)
2. Admin mobiel naamveld (`PlayersTab`)
3. Bank / gasten `active`
4. Schema-bridge cleanup (`coachPin`)

## C. Future product (groot)

- Opstellingenlijst, meer formaties, live veld `/live`, foto’s+consent, plat veld overal
- Pre-match kwart-planning (apart WAT+HOE)
- Speelweek-model, logo storage
- **[Selectie-teamportaal](./selectie-teamportaal.plan.md)** — prototype eerst valideren; echte JO13-2-integratie later
- **[Heatmaps](./heatmaps-future.md)** — zones, geen GPS

## D. Andere open docs

| Doc | Open |
|-----|------|
| [sportlink-programma-uitslagen.md](../sportlink-programma-uitslagen.md) | Standen-UI; roster sync (Afgeschermd) |
| [sportlink-integration.md](../sportlink-integration.md) | Open dependency / fallback UX |
| [coach-toegang-en-wedstrijdenplan.md](../coach-toegang-en-wedstrijdenplan.md) | Snellere “geen toegang”; admin-override; overzicht wedstrijden |
| [match-clock-spec.md](../match-clock-spec.md) | ET-label; rustduur override |
| [knvb-sportlink-capabilities.md](../knvb-sportlink-capabilities.md) | Next steps |
| Venue/veld (thuis) | Sync + smoke op live data |

## E. Buiten huidige Fable-pilot

- Gamificatie niet-selectieteams (tenzij tier later)
- Native TV apps
- Automatische ouder-mails
- Volledige pre-match kwart-studio

## F. Nieuw (2026-08) — selectie-teamportaal

De publieke `/team/[slug]` met bondstand en gespeelde wedstrijden is gebouwd. Sinds 2026-09-19 staat de afzonderlijke speler-/ouder-/coachverkenning op `/demo/teamportaal`: fictieve data, ontwikkelgerichte coachfeedback en positieve waardering, lokaal opgeslagen. Alleen lokale development of expliciet ingeschakelde Vercel-preview; geen production-route of backendkoppeling. Echte member-toegang voor selectieteams volgt later. Details: [selectie-teamportaal.plan.md](./selectie-teamportaal.plan.md).

Uitbreiding 2026-09-20: optionele professionele observaties, standaard uit, met een aparte coach-/scoutwerkplek. Geen observaties in de speler-/ouderweergave; echte vertrouwelijkheid vraagt later eigen accounts en serverautorisatie. De demo blijft uitsluitend voor fictieve gegevens.

## Voorgestelde volgorde

1. **Device surfaces fase 0** — coach-mobile vs coach-pc (iPad = PC) — [device-surfaces.plan.md](./device-surfaces.plan.md)
2. Spraak + oortjes (fase 1, alleen lead-coach)
3. Social: spelers + ouders (fase 2)
4. Referee-app mobile + pc (fase 3)
5. Heatmaps (future)
