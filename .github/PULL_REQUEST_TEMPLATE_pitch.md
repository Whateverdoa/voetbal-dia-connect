## PR: Coach Pitch View & formation placement

**Branch:** `feature/positions-field-view`  
**Commit:** `feat(coach): PitchView with formation placement and field styling`

### Summary
- **PitchView**: SVG veld met formatieslots (cirkel + naamlabel per slot), tap-to-move (tik op lege slot = speler van bank toewijzen, tik op speler = van veld).
- **Veldstyling**: 0.5pt witte omlijning, rechte hoeken, geen doellijn onder.
- **Spelers**: schaal 0.5×, labels één volle hoogte onder de cirkel, Y-offset +36 zodat formatie vanaf onder (ons doel) naar boven staat.
- **Coach matchpagina**: formatiekeuze + toggle veld/lijst.
- **Posities**: Positie 1 & 2 in admin Spelers-tab; Convex-actions voor slot toewijzen/leegmaken.

### Checklist (code review)
- [x] Build: `npm run build` OK
- [x] PitchView: geen lint-errors
- [ ] Tests: `npm run test:run` — enkele bestaande failures (CoachDashboard, TeamsTab e.d.), niet door deze wijzigingen
- [ ] Handmatig: coach match → formatie kiezen → veldweergave, spelers toewijzen/verwijderen

### Uncommitted (optioneel)
- `HANDOFF.md` (lokaal gewijzigd — meenemen in PR indien gewenst)
