# Plan: logo’s in coach-, scheidsrechter- en admin-view

## Doel

Dezelfde **DIA + tegenstander** logo’s als op de publieke site (`MatchBrowser`, `LiveMatch`) ook tonen in:

- **Coach:** dashboard + wedstrijdkaarten + (optioneel) wedstrijdpagina-header  
- **Scheidsrechter:** wedstrijdlijst + wedstrijdpagina (score-header)  
- **Admin:** assignment board (tabel + side panel) en evt. overige match-lijsten

## Huidige situatie

| Surface | Databron | Logo-velden nu? |
|--------|----------|------------------|
| Publiek | `listPublicMatches`, `getByPublicCode` | `teamLogoUrl`, `clubLogoUrl`, `opponentLogoUrl` |
| Coach dashboard | `coachQueries.verifyCoachPin` | **Nee** — ruwe `matches`-docs + aparte `teams`-lijst zonder `logoUrl` |
| Coach wedstrijd | `matches.getForCoach` | **Nee** |
| Scheidsrechter | `refereeQueries.getMatchesForReferee`, `getForReferee` | **Nee** |
| Admin board | `adminMatches.listAssignmentBoard`, `listAllMatches` | **Nee** (wel `teamName` / `clubName`) |

`matches.opponentLogoUrl` en `teams.logoUrl` / `clubs.logoUrl` staan al in het schema; alleen **queries verrijken** en **UI** ontbreken.

## Fase 1 — Convex: één bron van waarheid

Voeg overal dezelfde drie optionele velden toe (consistent met publiek):

- `teamLogoUrl` — `team.logoUrl ?? null`  
- `clubLogoUrl` — `club.logoUrl ?? null`  
- `opponentLogoUrl` — `match.opponentLogoUrl ?? null`

**Aanpassingen (per functie):**

1. **`convex/coachQueries.ts` — `verifyCoachPin`**  
   Na het ophalen van matches: voor elke match `team` + `club` laden (index `by_team` al bekend via `teamId`) en bovenstaande drie velden **meegeven** op elk match-object (naast bestaande velden). Let op: return type is nu “raw match”; wordt “enriched match” — frontend types aanpassen.

2. **`convex/matches.ts` — `getForCoach`**  
   `team` + `club` zijn deels al geladen; retourneer expliciet `teamLogoUrl`, `clubLogoUrl`, `opponentLogoUrl` (en evt. `teamName` blijft zoals nu).

3. **`convex/refereeQueries.ts`**  
   - `getMatchesForReferee`: idem verrijking per match.  
   - `getForReferee`: idem voor de detail-response.

4. **`convex/adminMatches.ts`**  
   - `listAssignmentBoard` en `listAllMatches`: in de bestaande `enriched` mappen de drie logo-velden toevoegen aan het return-type (`AssignmentBoardRow` / `AdminMatchRow`).

**Herbruikbare helper (aanbevolen)**  
Nieuwe kleine module bijv. `convex/lib/matchLogoFields.ts`:

```ts
export function logoFieldsFromMatchTeamClub(
  match: Doc<"matches">,
  team: Doc<"teams"> | null,
  club: Doc<"clubs"> | null,
) {
  return {
    teamLogoUrl: team?.logoUrl ?? null,
    clubLogoUrl: club?.logoUrl ?? null,
    opponentLogoUrl: match.opponentLogoUrl ?? null,
  };
}
```

Zo blijft de logica op één plek. **Let op:** `adminMatches.ts` is al >300 LOC — geen grote copy-paste; alleen helper aanroepen of toekomstige split van `adminMatches` plannen (buiten scope van dit plan tenzij nodig).

**Security:** geen wijziging aan autorisatie; alleen extra read-only velden op al bestaande gated queries.

## Fase 2 — Gedeelde UI (frontend)

**Optie A (snel):** in elke view `TeamLogo` + `resolveLogoUrl` uit `src/lib/logos.ts` gebruiken, zelfde patroon als `MatchBrowser` / `LiveMatch` (thuis/uit uit `isHome`, `teamName`, `opponent`).

**Optie B (schoner):** nieuw component `MatchVersusLogos` (of `CompactMatchHeader`) in `src/components/`:

- Props: `isHome`, `teamName`, `opponent`, `teamLogoUrl`, `clubLogoUrl`, `opponentLogoUrl`, `size?`, `layout?: "row" | "stack"`  
- Binnenin: `resolveLogoUrl` voor DIA-kant + `opponentLogoUrl` voor de ander.

Houd het bestand **< 300 LOC**; anders alleen de row-variant hier en hergebruik `TeamLogo`.

## Fase 3 — Coach UI

| Bestand / gebied | Actie |
|------------------|--------|
| `CoachDashboard.tsx` | `DashboardMatch` uitbreiden; in `DashboardMatchRow` (inline) of `MatchCard.tsx` twee `TeamLogo`’s + namen/score (vergelijkbaar met horizontale mobiele strip). |
| `MatchCard.tsx` | Zelfde props als dashboard; optioneel compacte variant met kleinere logo’s. |
| `coach/match/[id]/page.tsx` of gedeelde header-component | Boven scorebord: logo’s + “thuis vs uit” (consistent met live view). |

## Fase 4 — Scheidsrechter UI

| Bestand | Actie |
|---------|--------|
| `RefereeMatchList.tsx` | Per rij: logo’s naast of boven teamnamen. |
| `scheidsrechter/match/[id]/page.tsx` | Headerblok met `MatchVersusLogos` of dubbele `TeamLogo`. |
| `RefereeScoreControls.tsx` (optioneel) | Kleine logo naast `homeName` / `awayName` voor snelle herkenning op het veld. |

## Fase 5 — Admin UI

| Bestand | Actie |
|---------|--------|
| `AssignmentBoardTable.tsx` | In de wedstrijd-kolom: mini-logo’s + bestaande tekst (let op tabelbreedte / truncate). |
| `AssignmentBoardPanel.tsx` | In de header naast `teamName` / tegenstander: logo’s. |
| `admin/MatchRow.tsx`, `MatchesTab.tsx` | Indien daar nog “vs opponent” zonder logo: gelijk trekken. |

## Fase 6 — Types & tests

- TypeScript: frontend types voor coach/referee dashboard matches gelijkzetten met Convex `FunctionReturnType` waar mogelijk.  
- **Vitest:** `coach/page.test.tsx`, `AssignmentBoard.test.tsx` — mocks uitbreiden met optionele logo-URL’s; geen harde afhankelijkheid van echte images (initials-fallback blijft werken).  
- Handmatig: coach/ref/admin inloggen, één wedstrijd met bekende lokale `/logos/...` URLs.

## Acceptatiecriteria

- [ ] Coach ziet op dashboard en wedstrijdkaart beide logo’s (waar data aanwezig is).  
- [ ] Scheidsrechter ziet logo’s in lijst en op wedstrijdpagina.  
- [ ] Admin ziet logo’s in assignment board (tabel + panel).  
- [ ] Geen PIN’s of extra gevoelige data in responses.  
- [ ] Geen regressie als `opponentLogoUrl` ontbreekt (fallback initialen).

## Geschatte volgorde

1. `convex/lib/matchLogoFields.ts` + Convex-query updates + `npx convex dev` / deploy.  
2. Shared UI-component (optioneel).  
3. Coach → Referee → Admin.  
4. Tests + `HANDOFF.md` (sectie logo’s: coach/ref/admin afgevinkt).

## Referenties

- Bestaand: `src/components/TeamLogo.tsx`, `src/lib/logos.ts`, `convex/lib/localLogos.ts`  
- Publieke referentie-UI: `src/components/MatchBrowser.tsx`, `src/components/live/LiveMatch.tsx`
