# DiaLive wedstrijdregistratie — rollen en rechten

**Status:** concept / draft — **niet geïmplementeerd**  
**Datum:** 2026-11-08  
**Bron:** concept v0.2 (overdracht naar de repo; de repo is nu de bron van deze spec)  
**Verificatie:** dit document beschrijft een **voorstel**. Er is geen implementatie in deze wijziging en er wordt **geen getest gedrag** geclaimd.

Niets in dit bestand wijzigt app, backend, configuratie, workflows of secrets. Bestaande rollen- en toegangsspecs blijven leidend tot een expliciet akkoord én een aparte implementatie-PR.

## 1. Doel

Vastleggen hoe vrijwilligers (ouders) wedstrijden mogen registreren op de DiaLive-website, zonder de officiële DIA REF-scheidsrechter of bestaande globale beheerrollen te ondermijnen.

- Op de DiaLive-website wordt **“Scheidsrechters”** hernoemd naar **“Wedstrijdregistratie”**. De bestaande scheidsrechterbediening is de **basis** voor vrijwilligers: **breed**, niet alleen doelpunten. De precieze functies moeten nog worden geïnventariseerd.
- **DIA REF** (native iPhone) blijft de app voor echte scheidsrechters.
- Inloggen gaat via **Clerk met een e-mailadres**. De bestaande wedstrijddata is de bron van waarheid voor alle apps.
- Een **wedstrijdcode geeft nooit schrijfrecht**.

## 2. Verwante bestaande specs (niet herschreven)

Lees deze documenten als de huidige, geverifieerde productbeschrijving. Dit voorstel **vervangt ze niet**.

| Document | Wat het nu vastlegt |
|---|---|
| [HANDOFF.md](../../../HANDOFF.md) | Productrollen: toegewezen scheidsrechter bedient klok/score/kaarten; coach opstelling/wissels; zonder toegewezen scheidsrechter neemt de **wedstrijdleider-coach** de officiële bediening over; admin behoudt de bestaande backendoverride |
| [docs/roles.md](../../roles.md) | Drie Clerk/Convex-rollen: **admin**, **coach**, **scheidsrechter**; e-mailkoppeling; bootstrap-adminallowlist |
| [docs/actors-and-access.md](../../actors-and-access.md) | Actoren, Clerk vs Convex-merge, publieke privacy; geplande parent/member voor het **selectie-teamportaal** |
| [docs/coach-toegang-en-wedstrijdenplan.md](../../coach-toegang-en-wedstrijdenplan.md) | Huidige coachtoegang; **gewenste** admin-als-coach override (apart, niet ingevoerd door dit voorstel) |
| [docs/plans/selectie-teamportaal.plan.md](../../plans/selectie-teamportaal.plan.md) | Ouder/guardian als portaalactor (gamificatie), **niet** wedstrijdregistratie |
| [docs/plans/ouder-taken-onderzoek.md](../../plans/ouder-taken-onderzoek.md) | Fruit/rijden/taken — andere vrijwilligersbetekenis |
| [docs/match-clock-spec.md](../../match-clock-spec.md) | Klokgedrag voor coach-, scheidsrechter- en publieke weergave |

## 3. Status van keuzes

| Keuze | Status |
|---|---|
| Prioriteit: **toegewezen scheidsrechter > coach > ouder/vrijwilliger** | **Bevestigd** |
| Coach accepteert een toegewezen scheidsrechter en pakt de registratie **niet** terug, ook niet als die scheidsrechter **offline** is | **Bevestigd** |
| Vrijwilliger is vangnet en registrator, geen wedstrijdleider | **Bevestigd** |
| Coach mag registratie overdragen, maar **niet buiten de toegewezen scheidsrechter om** | **Bevestigd** |
| Vrijwilliger kan **eigen** claim vrijgeven zodat een andere ouder atomair kan claimen | **Bevestigd** |
| Ouder kiest zelf een team, zonder verplichte goedkeuring | **Werkhypothese** (open) |
| No-show van de scheidsrechter: expliciet vastgesteld door bevoegde coach/admin met reden | **Voorstel**, te bevestigen |
| Lijst van vrijwilligersfuncties (breed, niet alleen doelpunten) | **Nog te inventariseren** |

## 4. Begrippen

| Term | Betekenis in dit voorstel |
|---|---|
| **Toegewezen scheidsrechter** | Officiële scheidsrechter op de wedstrijd (DIA REF / bestaande `matches.refereeId`). Hoogste prioriteit op **die** wedstrijd. |
| **Coach** | Bestaande coachkoppeling (`coaches` + team). Mag registreren en overdragen **alleen als** er geen toegewezen scheidsrechter is (tenzij een bevestigde no-show, zie §8). |
| **Ouder / vrijwilliger** | Clerk-account met **team-scoped** koppeling. Mag claimen of een overdracht krijgen binnen dat team; geen globale coach- of adminbevoegdheid. |
| **Actieve registrator** | De ene account die op een gegeven moment schrijfrecht heeft op die wedstrijd. |
| **Wedstrijdleider** | Bestaand coach-concept (`matches.leadCoachId`). **Niet** hetzelfde als vrijwilligersclaim. Zie HANDOFF. |
| **Bezoeker** | Publiek, eventueel met wedstrijdcode. Alleen lezen. |

Teamkoppeling, of een bestaande coach- of scheidsrechterkoppeling, is iets anders dan **actieve registratie per wedstrijd**.

## 5. Gebruikersflow ouder (voorstel)

1. **Account:** inschrijven met e-mailadres via Clerk. Zonder Clerk-account is schrijven uitgesloten.
2. **Team kiezen:** koppelen aan een team. Dat geeft **geen globale coach- of adminrechten** (zie §9).
3. **Claimen of overdracht krijgen:** zelf claimen alleen als er geen toegewezen scheidsrechter is en geen coach actief leidt of registreert. Anders alleen via een overdracht door de coach, en **nooit** buiten een toegewezen scheidsrechter om.
4. **Registreren** met de vrijwilligersbediening (functielijst volgt; breed, niet alleen doelpunten).
5. **Afmelden:** de ouder geeft **alleen de eigen claim** vrij, zodat een andere ouder de wedstrijd atomair kan kiezen.

## 6. Prioriteit en rollen (voorstel)

| Rol | Mag | Mag niet |
|---|---|---|
| Toegewezen scheidsrechter (DIA REF) | Hoogste prioriteit bij de **eigen** wedstrijd | — |
| Coach | Registreren en overdragen als er geen toegewezen scheidsrechter is | Een toegewezen scheidsrechter overrulen of diens registratie terugnemen (ook als de scheidsrechter offline is); een vrijwilliger inzetten buiten de scheidsrechter om |
| Ouder/vrijwilliger | Bij het **eigen team** claimen of een overdracht krijgen; **eigen** claim vrijgeven | Andere teams; een claim tegen een hogere rol in; andermans claim vrijgeven |
| Admin | Bestaande beheeruitzonderingen volgens [docs/roles.md](../../roles.md) / HANDOFF (o.a. koppelingen beheren). No-show vaststellen is een **voorstel** binnen die bestaande bevoegdheid, **geen nieuwe bypass** | Een scheidsrechter impliciet overrulen; nieuwe schrijfrechten verzinnen buiten geverifieerd beleid |
| Bezoeker | Meekijken | Schrijven, ook niet met een code |

## 7. Actieve registrator

- Per wedstrijd is er maximaal **één** actieve registrator.
- Claimen, vrijgeven en overnemen gebeuren **atomair**. Bij twee gelijktijdige claims wint er één; de ander kan na vrijgave opnieuw claimen.
- Je geeft **alleen je eigen claim** vrij. Eerder werk blijft staan (geschiedenis behouden) en de oude sessie **verliest direct haar schrijfrecht**.
- **Geen** automatisch vrijgeven of overnemen omdat een sessie inactief is of de verbinding wegvalt.
- Elke servermutatie controleert account, team, rol en actieve registrator. Actor, overdracht, vrijgave en overname worden gelogd.

## 8. No-show (voorstel, te bevestigen)

Er is **geen** automatische time-out of claim.

- Dat een toegewezen scheidsrechter **niet online** is, is **niet** genoeg om de claim over te nemen.
- De coach **kan de registratie niet terugnemen** van een toegewezen scheidsrechter, ook niet bij offline-zijn.
- Alleen na een **expliciete vaststelling** door een **bevoegde coach of admin**, met een **gelogde reden**, mag de coach daarna registreren of overdragen.
- No-show wordt **nooit afgeleid** uit inactiviteit, verbindingsverlies of ontbrekende heartbeat.

Deze no-showprocedure is **open** tot productakkoord.

## 9. Teaminschrijving en “geen globale rollen”

**Werkhypothese:** de ouder kiest zelf een team, zonder verplichte goedkeuring.

| Optie | Voordeel | Nadeel | Status |
|---|---|---|---|
| Zelf kiezen | Eenvoudig | Iedereen met een account kan elk team kiezen | **Werkhypothese** |
| Coachgoedkeuring | Coach weet wie er registreert | Extra stap | Alternatief |
| Uitnodiging | Alleen bekenden | Meeste werk | Alternatief |

Misbruik wordt in dit voorstel beperkt doordat er één schrijver per wedstrijd is, hogere rollen voorgaan, alles gelogd wordt en de admin een **teamkoppeling** kan intrekken. Er worden **geen extra gegevens over kinderen** verzameld voor deze registratieflow.

### Wat “geen globale rollen” wél en níet betekent

De zinsnede in concept v0.2 (“er zijn geen globale rollen”) betekent **alleen**:

> Teamselectie door een vrijwilliger verleent **geen globale coach- of adminbevoegdheid**. Rechten van de vrijwilliger zijn **team-scoped** (en daarna per wedstrijd via de actieve-registratorclaim).

Het betekent **niet**:

- bestaande **globale adminrollen** afschaffen of verzwakken;
- bestaande coach- of scheidsrechterkoppelingen uit [docs/roles.md](../../roles.md) verwijderen;
- een nieuwe admin-bypass invoeren om wedstrijdschrijven te forceren.

**Team-scoped (vrijwilliger):** schrijven alleen voor wedstrijden van het gekozen team, en alleen als de claimregels in §6–§7 dat toestaan.

**Wedstrijd-scoped (toegewezen scheidsrechter):** de toegewezen scheidsrechter heeft de hoogste registratieprioriteit op **eigen** wedstrijden, niet clubbreed als impliciete super-coach.

**Admin:** blijft onderworpen aan het **bestaande geverifieerde beleid** in HANDOFF, [docs/roles.md](../../roles.md) en [docs/actors-and-access.md](../../actors-and-access.md). Dit voorstel voegt geen extra override toe.

## 10. Bekende spanningen met bestaande documentatie

Deze punten zijn **bewust niet stilzwijgend “opgelost”**. Het gevraagde beleid in §3 blijft staan; implementatie mag bestaande specs niet overschrijven tot er een akkoord is.

1. **Twee betekenissen van “ouder”.** [docs/actors-and-access.md](../../actors-and-access.md) plant parent/member voor het **selectie-teamportaal**. Dit voorstel gaat over **wedstrijdregistratie**. Dat zijn verschillende productsporen.
2. **“Wedstrijdbegeleider” vs officiële scheidsrechter.** `actors-and-access.md` noemt de referee-rol in de UI soms **wedstrijdbegeleider** (ouder/vrijwilliger die klok en score bedient). Dit voorstel **scheidt** toegewezen DIA REF van de team-scoped vrijwilliger. Naamgeving van `/scheidsrechter` is een latere migratie, geen stille rename in die bestaande spec.
3. **Drie rollen vs vierde actor.** [docs/roles.md](../../roles.md) kent `admin` / `coach` / `referee`. Een vrijwilliger is hier een **voorgestelde** teamkoppeling, geen bestaande Clerk-rol en geen opdracht om `userAccess.roles` nu uit te breiden.
4. **Admin-override.** HANDOFF: “Admin behoudt de backendoverride.” [docs/coach-toegang-en-wedstrijdenplan.md](../../coach-toegang-en-wedstrijdenplan.md) **wenst** daarnaast dat admin overal als coach mag muteren — dat is een **ander, ongebouwd** voorstel. Dit document **autoriseert die gewenste override niet** en introduceert geen nieuwe bypass.
5. **Wedstrijdleider ≠ vrijwilligersclaim.** HANDOFF beschrijft `claimMatchLead` / `releaseMatchLead` voor coaches. Dat mag niet worden gelezen als de vrijwilligersclaim in §7.
6. **Huidige taakverdeling.** HANDOFF: zonder toegewezen scheidsrechter neemt de wedstrijdleider-coach de officiële bediening over; met toegewezen scheidsrechter vult de coach doelpunten aan. Dit voorstel **versmalt** coachovername verder: offline zijn van de scheidsrechter is onvoldoende. Dat is aangescherpt beleid, nog niet geverifieerd in code.
7. **Takenbord.** [docs/plans/ouder-taken-onderzoek.md](../../plans/ouder-taken-onderzoek.md) (fruit/rijden) is geen registratieclaim.

## 11. Acceptatietests (concept — niet uitgevoerd)

1. Zonder account of alleen met een code: schrijven wordt geweigerd.
2. Een ouder van team A probeert een wedstrijd van team B: geweigerd.
3. Team kiezen geeft geen coach- of adminrechten (geen globale bevoegdheid).
4. Een toegewezen scheidsrechter is niet online: de coach kan niet claimen en een ouder ook niet.
5. De coach probeert een registratie terug te pakken van een toegewezen scheidsrechter: geweigerd.
6. Een coach leidt de wedstrijd actief zonder scheidsrechter: een ouder kan niet zelf claimen, alleen na overdracht door de coach.
7. De coach draagt over aan een ouder bij een toegewezen scheidsrechter: geweigerd.
8. No-show: er wordt niets automatisch vrijgegeven; pas na een expliciete vaststelling met gelogde reden kan de coach claimen.
9. Twee ouders claimen tegelijk: één wint. Die meldt zich af, waarna de ander kan claimen. De oude sessie wordt geweigerd en de geschiedenis blijft.
10. Een ouder probeert de claim van iemand anders vrij te geven: geweigerd.
11. Bij verbindingsverlies blijft de claim staan.
12. Overdracht, vrijgave en overname worden met actor en tijd gelogd.

## 12. Uitrol (voorstel)

Eerst op de testomgeving met vijf testteams. **Er komt geen live uitrol zonder akkoord.** Dit document alleen is geen akkoord en geen deploy.

## 13. Open beslissingen

1. Welke registratiefuncties krijgen vrijwilligers (breed, nog te inventariseren)?
2. Bevestig de no-show-regel: expliciete vaststelling door bevoegde coach/admin met reden, nooit automatisch.
3. **Belangrijkste vraag:** mag een ouder zich direct zelf aan een team koppelen (werkhypothese: ja), of is coachgoedkeuring nodig?
4. Hoe verhoudt de vrijwilligersactor zich tot `userAccess` / Clerk-metadata zonder bestaande globale rollen te wijzigen? (implementatievraag; geen besluit in dit document)
