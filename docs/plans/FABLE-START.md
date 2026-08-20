# Fable — start hier (terminal)

## Eerste commando in de repo

```bash
cd c:/PROJECTS/VOETBAL/Voetbal-dial-connect/voetbal-dia-connect
```

## Lees volgorde

1. **[fable-jo13-presentatie-gamificatie.plan.md](./fable-jo13-presentatie-gamificatie.plan.md)** — wat bouwen (masterplan)
2. **[fable-jo13-progress.md](./fable-jo13-progress.md)** — wat al klaar is (live tracker)
3. **[../../HANDOFF.md](../../HANDOFF.md)** — architectuur en conventies

## Werkwijze per sessie

1. Open `fable-jo13-progress.md` → kies **één fase** met status `niet_gestart` of `bezig` (kritiek pad: **0 → 1 → 4 → 3 → 2 → 5**).
2. Implementeer taken uit die fase.
3. Vink af in `fable-jo13-progress.md` (`[ ]` → `[x]`).
4. Werk **Werklog** bij (datum + korte notitie + branch/commit).
5. Zet fase-status op `bezig` / `klaar`; update **Huidige fase** en **Laatste update** bovenaan.

## Regels

- Nederlands in UI; Engels in code/comments.
- Bestanden **&lt;300 LOC**; splits indien nodig.
- Consent (fase 4) **vóór** foto's/XP op TV.
- `npx convex dev` voor backend; `npm run dev:frontend` voor UI.
- Geen commit van `.diag.json`, `.why.json`, `.dupes.json`.

## Prompt voor Fable (kopieer/plak)

```
Implementeer DIA Live JO13-pilot volgens docs/plans/fable-jo13-presentatie-gamificatie.plan.md.
Houd voortgang bij in docs/plans/fable-jo13-progress.md na elke afgeronde taak.
Start met fase 0 tenzij progress aangeeft dat een latere fase al bezig is.
Lees HANDOFF.md voor Convex/Clerk-conventies.
```
