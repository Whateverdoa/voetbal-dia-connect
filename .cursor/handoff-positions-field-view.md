# Handoff: Positions & Field View (feature/positions-field-view)

## Done (backend, this branch)

- **Schema** ([convex/schema.ts](convex/schema.ts)): `players.positionPrimary`, `positionSecondary`; `matchPlayers.fieldSlotIndex`; `matches.formationId`, `pitchType`.
- **Position codes** ([src/lib/positions.ts](src/lib/positions.ts)): K, V, M, A + Dutch labels + `POSITION_GROUP` / `isPositionMatch` for substitution logic.
- **Formations** ([src/lib/formations.ts](src/lib/formations.ts)): `8v8_3-3-1`, `8v8_1-4-2-1`, `8v8_1-3-2-2`, `11v11_4-3-3` with slots `{ id, x, y, role }`.
- **Admin players**: createPlayer/createPlayers/updatePlayer accept optional positionPrimary/positionSecondary.
- **Seed**: First 8 players per team get sample positions (K, V, V, V, M, M, M, A).

## Next: convex-specialist

1. ~~**getSuggestedSubstitutions**~~ — Done. Position-aware: for each player out (most minutes), prefer bench player with matching positionPrimary/positionSecondary, then sort by least minutes; fallback time-only. No reuse of same player in across suggestions.
2. **Mutation: assign player to slot** (new or extend existing): set `onField: true` and `fieldSlotIndex` for a matchPlayer; when moving to bench, clear `fieldSlotIndex` and set `onField: false`. Coach PIN required.

## Next: frontend-designer

1. **PitchView component** (e.g. `src/components/match/PitchView.tsx`):
   - SVG with `viewBox="0 0 100 150"` (or match formations), pitch lines, slot circles from `getFormation(match.formationId)`.
   - Use Tailwind in SVG where possible; add `@dnd-kit` for drag-and-drop.
   - **Tap-to-Move**: tap slot → show player picker (bench); tap player → assign to slot. Primary interaction on mobile.
2. **Coach match page** ([src/app/coach/match/[id]/page.tsx](src/app/coach/match/[id]/page.tsx)):
   - Formation/pitch selector (formationId, pitchType); field view as default or first tab; list view toggle.
   - Call new mutation to assign player to slot / clear slot.
3. **Player edit (admin)**:
   - Add "Positie 1" and "Positie 2" dropdowns using [src/lib/positions.ts](src/lib/positions.ts) (e.g. in admin player form).

## Plan reference

Full plan: [.cursor/plans/positions_and_field_view_1d30c790.plan.md](.cursor/plans/positions_and_field_view_1d30c790.plan.md).

## Test

- `npx convex dev` then re-run seed: `npx convex run seed:init` (idempotent; if club exists, no-op). To test new positions, clear club or use a new deployment.
- Coach match page: ensure getForCoach returns formationId, pitchType, and player positionPrimary/positionSecondary (extend query if needed).
