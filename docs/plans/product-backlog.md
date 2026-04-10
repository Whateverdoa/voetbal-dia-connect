# Product backlog & plan — DIA Live

Samenvatting van **openstaande** product- en techniekwerk, naast **HANDOFF.md** (architectuur, cutover, import, auth). Dit document mag groeien; voor **status per item** kan later een issue-tracker (GitHub Projects, Linear, …) worden gekoppeld.

## Voorgestelde prioriteit

1. **Admin werkplek — UX & demo** (filters, frictie, scanbare demo-flow).
2. **Operationeel / data** (bank-rosters, gasten `active`; mobiel spelersnaamveld).
3. **Schema-bridge cleanup** (na veilige data-migratie).
4. **Grotere productfeatures** (opstelling site, **meer formatie-templates in UI**, live veld, foto’s, pre-match plan).
5. **Platform / schaal** (speelweek-model, optioneel assignments-audit).

---

## 1. Admin werkplek — UX & demo-geschiktheid

**Doel:** `/admin` voelt **voorspelbaar** aan voor iemand die de app **één keer** ziet (met name assignment board + tabbladen + filters/zoeken).

**Bekende pijnpunten (naar aanleiding van gebruik):**

- Filters: niet altijd duidelijk **wat** er gefilterd wordt, **welke default**, en hoe je **terug naar “alles”** gaat.
- Kleine interacties die twijfel geven (focus states, mobiel vs desktop — naast het aparte portret-naam-issue).

**Mogelijke werkpackages (iteratief):**

| # | Taak | Richting |
|---|------|----------|
| 1.1 | **Filter-inventaris** | Alle filter-/zoek-entrypoints in admin UI opsommen (`AdminWorkspace`, assignment board, teamtabs, eventueel imports). |
| 1.2 | **Gedrag specificeren** | Per filter: bron van data, default bij load, “reset”, en zichtbare **actieve filter**-indicatie (chips of tekstregel). |
| 1.3 | **Implementatie** | Klein beginnen: meest zichtbare flow (meestal **assignment board** + week/dag/team). |
| 1.4 | **Demo-script** | Korte **3–5 stappen** “happy path” voor een rondleiding (optioneel in dit document of `docs/smoke-test.md`). |
| 1.5 | **Regressie** | Vitest/RTL waar al patronen bestaan; handmatig op laptop + telefoon. |

**Acceptatie (globaal):** een nieuwe gebruiker kan binnen **één minuut** begrijpen hoe hij wedstrijden **filtert** en een scheidsrechter **toewijst**, zonder uitleg van een ontwikkelaar.

**Code-pointers (indicatief):** `src/components/admin/AdminWorkspace.tsx`, assignment board-componenten (`AssignmentBoard*`).

---

## 2. Admin mobiel — naamveld spelers (portret)

**Symptoom:** Na tik op speler in spelersbeheer: **naamveld** in **portret** te klein / onbruikbaar; **landschap** OK.

**Richting:** Layout in o.a. `PlayersTab`; testen op fysiek apparaat.

---

## 3. Wedstrijd-bank, `matchPlayers`, gasten `active`

**Symptoom:** Bank bij aftrap zit al in `matchPlayers`; gasten / eenmaligen met `active: true` kunnen breed in rosters/sync blijven terugkomen.

**Richting:** `active: false` voor wie niet wekelijks in selectie hoort; evt. latere productregels (shirtnummer, kern-vlag). Zie HANDOFF *Wedstrijden klaarzetten* / import-sectie.

---

## 4. Openstaande bridge items (schema / `coachPin`)

**Bron:** HANDOFF § *Openstaande Bridge Items*.

- Legacy velden in `convex/schema.ts`.
- Backfill `match.coachPin` → `match.coachId` in `convex/adminAccessManagement.ts`.
- Compat-strip `coachPin` in `convex/matches.ts`.

**Wanneer:** na volledige datamigratie en cutover; opruimen in een **afgesloten cleanup-branch**.

---

## 5. Future product (backlog, groter werk)

**Bron:** HANDOFF § *Future To-Do's (product)*.

- **Opstellingenlijst op de website** — rijkere lineup voor coach/publiek, evt. print.
- **Meer tactische opstellingen / formatie-templates in de UI** — uitbreiden van het aanbod vaste formaties (coach + evt. admin), keuzelijst/templates, afgestemd op `matches.formationId` en veld-plaatsing; los van “alleen weergave op de site”.
- **Live veldsituatie** — visueel veld in `/live/[code]`, aansluiten op `formationId`, `pitchType`, `matchPlayers.fieldSlotIndex`.
- **Spelers met foto’s** — upload in admin, tonen op veld/bank, fallback initialen/rugnummer.
- **Veldlayout plat bovenaanzicht** — designafstemming (o.a. met Roel) vóór bouw.
- **Pre-match planning** — opstelling/wissels per kwart vooraf; draft los van `matchEvents` tot bevestiging; **apart WAT+HOE-document vóór implementatie**.

---

## 6. Speelweek-model voor admin-planning

**Bron:** HANDOFF § *Toekomst: Speelweek-model*.

- Velden `playWeekKey`, `playWeekStart`, `dayKey` + indexen; server-side bij create/update/import.

---

## 7. Optioneel / meta

- **Logo’s:** upload naar Convex storage als statische URLs tekort schieten (HANDOFF § *Club-/teamlogo's*).
- **Tracker:** issues uit dit document naar GitHub Issues / Projects voor voortgangsdates en owners.

---

*Laatste sync met HANDOFF-structuur: backlog-secties (issues, bridge, future, speelweek). Bij grote verschuivingen: dit document of HANDOFF bijwerken en verwijzingen dubbelchecken.*
