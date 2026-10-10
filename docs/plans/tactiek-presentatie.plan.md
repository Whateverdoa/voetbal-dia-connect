# Plan — Tactiek tonen op presentatie (kleedkamer / TV)

**Status:** in uitvoering (Wisselplan-tab op `/present`)  
**Roadmap:** [open-roadmap.md](./open-roadmap.md)  
**Afhankelijk van:** bestaande `substitutionPlans` + coach `SubstitutionPlanPanel`

## Doel

Coaches plannen wissels al in de app. Op **kleedkamer/TV** (`/present/...`) moet het **te volgen wisselplan** zichtbaar zijn — read-only, realtime.

## Scope

### In scope

- Tab **Wisselplan** op [`/present/team/[slug]`](../../src/app/present/team/[slug]/page.tsx) naast Opstelling / Teamdeck
- Read-only weergave van pending planregels + geprojecteerde opstelling per kwart
- Hergebruik [`projectSubstitutionPlan`](../../src/lib/substitutions/projectSubstitutionPlan.ts) en UI-patronen uit [`ProjectedPitchPlanner`](../../src/components/match/ProjectedPitchPlanner.tsx) / [`SubstitutionPlanPanel`](../../src/components/match/SubstitutionPlanPanel.tsx) **zonder mutaties**
- Data via [`presentationQueries`](../../convex/presentationQueries.ts) + `privacyFilter`
- Optioneel op kantine-live: compacte “volgende wissel”-strip (geen volle planner)

### Buiten scope

- Bewerken vanaf presentatie/TV
- Volledige pre-match kwart-studio (apart WAT+HOE later)
- Heatmaps

## Acceptatie

1. Coach plant wissel op mobiel → kleedkamer toont de actie binnen ~1s
2. Geen edit-knoppen op `/present`
3. Privacy: geen namen/foto’s zonder consent op publieke presentatie-payloads

## Implementatie-notities

1. Query: match + `substitutionPlans` voor live/scheduled wedstrijd van team
2. Present-component: `PresentSubstitutionPlanView` (read-only, &lt;300 LOC)
3. Tests: projectie + presentatie-query smoke
