# Coach-toegang (waarschuwing + admin) en plan alle DIA-wedstrijden

## 1. Waarom duurde het lang voor je een waarschuwing kreeg?

### Huidige flow

- Je gaat naar **/coach** en bent ingelogd met Clerk (account mode).
- De pagina zet meteen `submitted = true` en roept **`verifyCoachAccess`** aan. Convex kijkt dan:
  - E-mail van je Clerk-identiteit → zoekt in tabel **coaches** op `coaches.email`.
  - Geen coach met die e-mail → query retourneert **null**.
- Tot Convex klaar is blijft **coachData** `undefined` → je ziet **"Coachrechten controleren..."**.
- Pas als de query **null** teruggeeft → scherm **"Geen coachtoegang"**.

De vertraging komt dus door:

1. **Convex-verbinding**: WebSocket moet opstarten voordat de query loopt.
2. **Geen vroege check**: Er is geen snelle client-check; we wachten altijd op de server.
3. **Geen admin-uitzondering**: Ook als je **admin** bent (e-mail in `CLERK_BOOTSTRAP_ADMIN_EMAILS`), telt alleen of je een **coach-record** hebt. Geen coach-record → na dezelfde wachttijd als iedereen krijg je "Geen coachtoegang".

### Hoe het nu werkt (toegang coach vs admin)

| Plek | Wie mag erbij? |
|------|----------------|
| **/coach** (dashboard) | Alleen als je een **coach** bent (e-mail in `coaches`). |
| **/coach/match/[id]** | Alleen als je **coach bent van het team van die wedstrijd** (`getForCoach` → `verifyCoachTeamMembership`). |
| **/admin** | Alleen als je e-mail in **CLERK_BOOTSTRAP_ADMIN_EMAILS** staat. |

PIN-login is verwijderd; toegang loopt nu alleen via Clerk-identiteit en coach/admin-koppelingen. Daardoor:

- Je wacht net zo lang als een niet-coach tot Convex null teruggeeft.
- Zelfs met admin-rechten kun je niet via /coach bij een wedstrijd van een team waar je geen coach van bent.

---

## 2. Gewenste aanpassingen (kort)

### 2.1 Snellere / duidelijker waarschuwing

- **Optie A – Alleen UX**: Duidelijker loading-state (bijv. “Toegang controleren… kan een paar seconden duren”) en eventueel de timeout (nu 6 s) iets verlagen of eerder een “Geen verbinding”-melding tonen.
- **Optie B – Lichte query**: Een aparte, lichte query die alleen kijkt of de huidige gebruiker een coach (of admin) is; als die snel “nee” teruggeeft, meteen “Geen coachtoegang” tonen zonder op de zware `verifyCoachAccess` te wachten.

### 2.2 Admin mag overal als “coach” (aanbevolen)

Dan hoef je als admin niet te wachten op “Geen coachtoegang” en kun je overal bij:

1. **Convex – Admin-check**
   - In **adminAuth**: een helper (bijv. `isAdmin(ctx)`) die `true` geeft als de ingelogde e-mail in `CLERK_BOOTSTRAP_ADMIN_EMAILS` staat (geen throw, alleen boolean).

2. **Coach-dashboard (/coach)**
   - In **verifyCoachAccess** (in `convex/coachQueries.ts`):
     - Als **geen** coach gevonden wordt op e-mail → als `isAdmin(ctx)` → retourneer een **synthetisch** dashboard:
       - Alle teams van de club(s) (bijv. via bestaande admin-queries) en alle wedstrijden (of recente), zodat je dezelfde dashboard-UI ziet en op elke wedstrijd kunt klikken.
     - Zo zie je als admin direct het overzicht en geen “Geen coachtoegang” na lange wacht.

3. **Wedstrijdpagina (/coach/match/[id])**
   - In **getForCoach** (in `convex/matches.ts`):
     - Als `verifyCoachTeamMembership(ctx, match, "")` **null** geeft → als `isAdmin(ctx)` → toch de **match-data** retourneren (zelfde payload als voor de team-coach).
   - Dan kun je als admin elke wedstrijd openen, ook van teams waar je geen coach van bent.

4. **Mutations (klok, wissels, etc.)**
   - Overal waar nu **requireCoachTeamAccess** wordt gebruikt: als `isAdmin(ctx)` → toegang toestaan (geen coach-doc nodig, of een “admin”-placeholder).
   - Zo blijft één plek voor “mag deze actie”: coach van het team **of** admin.

Gevolg: als admin log je in, zie je (na dezelfde Convex-ronde) het coach-dashboard met alle wedstrijden, en krijg je geen lange wacht gevolgd door “Geen coachtoegang”. De waarschuwing voor echte niet-coaches blijft; voor jou (admin) verdwijnt die situatie.

---

## 3. Plan: alle wedstrijden van DIA netjes onderverdeeld

Als **alle** DIA-wedstrijden in het systeem staan, moet het overzicht blijvend bruikbaar blijven. Hieronder een eenvoudig plan zodat het “netjes onderverdeeld” is.

### 3.1 Huidige structuur

- **clubs** (bijv. DIA) → **teams** (JO12-1, JO12-2, …) → **matches** (per team).
- Match heeft o.a.: `teamId`, `status`, `scheduledAt`, `opponent`, `publicCode`.
- Seizoen wordt nu **afgeleid** uit datum (bijv. jaar van `scheduledAt` / `finishedAt`) in o.a. `convex/historyActions.ts`; er is geen apart veld `season` op de match.

### 3.2 Doel

- Alle DIA-wedstrijden in één systeem.
- Overzichtelijk: **per team**, **per periode/seizoen**, en eventueel **per status** (live, gepland, afgelopen).
- Geen eindeloze platte lijst; duidelijke groepen en filters.

### 3.3 Voorstel indeling

1. **Groeperen op scherm**
   - **Coach-dashboard** (nu al): wedstrijden per **team** (alle teams van jouw coach-account; bij admin: alle teams).
   - **Admin “Wedstrijden”**: behoud sortering (live → lineup → scheduled → finished, binnen groep op `scheduledAt`), maar voeg **filter/group-by** toe:
     - **Per team** (dropdown of tabs): “Alle teams” of kies JO12-1, JO12-2, …
     - **Per seizoen** (afgeleid jaar): bijv. 2024, 2025, 2026.
     - Optioneel: **datumrange** (van–tot) voor kalenderweergave.

2. **Data / schema (optioneel)**
   - Blijft het bij afgeleid seizoen (jaar uit `scheduledAt`/`finishedAt`) → geen schema-wijziging.
   - Wil je expliciet filteren op seizoen of competitie:
     - Optie: veld **season** (bijv. `2025`) op **matches** (backwards-compatible: optioneel; indien leeg, afleiden uit datum).
     - Later eventueel **competition** of **competitionId** als DIA meerdere competities bijhoudt.

3. **Queries**
   - Bestaande **listAllMatches** (admin): eventueel uitbreiden met optionele args, bijv.:
     - `teamId?: Id<"teams">` — filter op team.
     - `season?: number` — filter op jaar (afgeleid of nieuw veld).
   - Voor “alle DIA”-wedstrijden: teams ophalen van club DIA, dan per team (of in één query) wedstrijden ophalen. Index **by_team** bestaat al; eventueel **by_team + scheduledAt** voor snelle sortering per team op datum.

4. **UI**
   - **Admin → Wedstrijden**: filters bovenaan (team, seizoen); lijst of kaarten per groep (bijv. “JO12-1 – 2025”, “JO12-2 – 2025”).
   - **Coach**: blijft “eerst team, dan wedstrijden”; bij veel wedstrijden per team: “meest recente 10” (zoals nu) + “Bekijk alle” naar een team-specifieke pagina indien gewenst.

### 3.4 Stappen (implementatie)

| Stap | Wat |
|------|-----|
| 1 | Admin-override voor coach (zie sectie 2.2): `isAdmin`, aanpassen `verifyCoachAccess` en `getForCoach`, en mutations waar `requireCoachTeamAccess` zit. |
| 2 | (Optioneel) Loading/waarschuwing verbeteren (sectie 2.1). |
| 3 | Admin-wedstrijdenlijst: filter op **team** (dropdown met alle teams van de club). |
| 4 | Admin-wedstrijdenlijst: filter op **seizoen** (jaar uit `scheduledAt`/`finishedAt`). |
| 5 | (Optioneel) Schema: veld **season** op matches voor expliciete seizoenen; migratie bestaande wedstrijden (jaar uit datum). |
| 6 | (Optioneel) Groepering in de UI: groep per team + seizoen in plaats van één platte lijst. |

Zo blijft het bij “alle wedstrijden van DIA” netjes onderverdeeld (per team, per seizoen, duidelijke filters) zonder dat de lijst onoverzichtelijk wordt.
