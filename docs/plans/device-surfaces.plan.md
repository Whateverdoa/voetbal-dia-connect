# Plan — Device surfaces (coach / scheids / later social)

**Status:** ontwerp (uitbreiding coach-slim)  
**Laatste update:** 2026-09-19  
**Was:** telefoon = live, laptop = plan/present  
**Nu:** twee oppervlakken per rol, web blijft; native iOS/Android wrappen dezelfde surfaces

---

## 1. Wat is “PC”?

**PC = groot scherm.** Dat is:

- laptop / desktop
- **iPad** (portret én landschap)
- TV / beamer via Presenteren

**Mobiel = alleen telefoon** (iPhone / Android phone).

iPad is dus **geen** coach-mobile. Op iPad krijg je de volledige plan/present-werkplek.

Huidige `md:` (768px) is te krap: iPad mini portret (~744) kan per ongeluk de telefoon-UI krijgen. Detectie moet op **korte zijde ≥ ~600** (of expliciet tablet), niet alleen `min-width: 768`.

---

## 2. Surfaces (productnamen)

| Surface | Device | Doel |
|---------|--------|------|
| **coach-mobile** | telefoon | Live wedstrijd, groot en foutloos |
| **coach-pc** | laptop + iPad + TV-start | Plannen, presenteren, seizoen, instellingen |
| **referee-mobile** | telefoon | Klok, kaarten, minimale match-control |
| **referee-pc** | laptop + iPad | Poule, claim-week, overzicht, later rijke console |
| **player** | later (fase 2) | Eigen pagina |
| **parent** | later (fase 2) | Team + kind, taken, stand |

Zelfde Convex-backend. Web blijft. Native apps zijn **shells** om dezelfde surfaces, geen tweede product.

---

## 3. Fases

```
Fase 0  Simpel & degelijk (coach + detectie iPad=PC)
Fase 1  Spraak + oortjes (alleen wedstrijdleider, coach-mobile)
Fase 2  Social: spelers + ouders
Fase 3  Referee-app (mobile + pc) als eigen product
```

Niet parallel alles bouwen. Eerst 0, dan 1. Native splits (iOS/Android) lopen ernaast maar blokkeren fase 0 niet.

---

## 4. Fase 0 — klaarstomen (nu)

Doel: één coach-verhaal dat op het veld **simpel** is en op iPad/laptop **compleet**.

### coach-mobile (moet)

- Start / pauze / rust / einde
- Doelpunt, wissel, kaart
- Veld + bank, compacte kaarten
- Speeltijd-overzicht (lezen)
- Lead claimen
- **Minimaal plan:** volgende wissel zien + uitvoeren (geen volle planner)

### coach-mobile (niet / doorverwijzen)

- Volledige wisselplanner
- Presenteren / kleedkamer-TV
- Seizoensstatistiek-diepte, formatie-studio, late roster-bulk
- Admin

Die taken: knop **“Open op iPad of laptop”**.

### coach-pc (iPad + laptop)

- Volledige planner + projectie
- Presenteren (opstelling, wisselplan, kantine)
- Formaties, seizoen, wedstrijdinstellingen
- Zelfde live-controls als backup (niet verplicht op het veld)

### Klaar-criterium fase 0

1. iPhone: alleen live-pad, geen planner-rommel
2. iPad: planner + Presenteren zonder “hoort op laptop”-muur
3. Live wissel blijft plan-regels afvinken (al live)
4. Geen nieuwe social/referee-features in deze fase

---

## 5. Fase 1 — spraak + oortjes

Pas ná fase 0. Onderzoek: [`coach-audio-waarschuwingen-onderzoek.md`](./coach-audio-waarschuwingen-onderzoek.md).

- Alleen **wedstrijdleider**
- Web Audio + korte NL-zin in de geopende coach-tab
- Triggers: wissel-minuut, tijdstraf klaar, periode bijna om
- Native Bluetooth-betrouwbaarheid later; web-prototype eerst

---

## 6. Fase 2 — social (spelers + ouders)

Bestaand startpunt: [`selectie-teamportaal.plan.md`](./selectie-teamportaal.plan.md) + publieke `/team/[slug]`.

**Klikprototype toegevoegd (2026-09-19):** `/demo/teamportaal` bevat fictieve speler-, ouder- en coachrollen. Ontwikkelgerichte coachfeedback wordt na publicatie alleen bij de speler en gekoppelde demo-ouder getoond; spelers kunnen positieve acties waarderen. Lokale browseropslag, geen verbinding met Clerk/Convex en geen wijzigingen aan de live coachflow. Alleen lokale development of expliciet ingeschakelde Vercel-preview; production staat altijd uit. Echte member-integratie blijft een volgende fase.

De publieke `/team/[slug]` met bondstand en gespeelde wedstrijden bestaat inmiddels. Dat is de bestaande ouderingang; het prototype is een afzonderlijke verkenning van de toekomstige member-ervaring.

**Optionele staffobservaties (2026-09-20):** aparte Observaties-werkplek voor coach en scout, standaard uit en door de coach in te schakelen. Scout ziet uitsluitend die werkplek; spelers en ouders krijgen geen observatietab of -gegevens. Dit blijft een fictieve demonstratie met gedeelde lokale browseropslag, geen echte vertrouwelijke omgeving of accounttoegang.

- **Ouder:** stand, programma, later fruit/rijden (research: `ouder-taken-onderzoek.md`)
- **Speler:** eigen kaart / minutes (selectie eerst)
- Geen coach-controls in deze apps
- Native player/parent-apps mogen later dezelfde routes wrappen

---

## 7. Fase 3 — referee-app

Scheids is nu één web-dashboard + matchconsole. Zelfde split:

| referee-mobile | referee-pc (iPad + laptop) |
|----------------|----------------------------|
| Klok, score, kaart | Claim-pool, weekoverzicht |
| Tijdstraf, einde | Toewijzingen, help, later rijke console |
| Alleen toegewezen live match | Alles wat niet op het veld hoeft |

Native referee-app = deze twee surfaces, niet een derde regelset.

---

## 8. Native vs web

- **Web blijft** de bron van waarheid voor UI-logica.
- iPhone-app ≈ coach-mobile (later + referee-mobile).
- iPad-app ≈ coach-pc (later + referee-pc).
- Geen aparte datamodellen per platform.

---

## 9. Eerste bouwslice

1. **Klaar:** surface-detectie (`src/lib/deviceSurface.ts`) — korte zijde ≥ 600 = PC
2. **Klaar:** Presenteren / Planscherm alleen op PC (iPad telt mee)
3. **Klaar:** iPad ziet planner in de Wisselplan-tab; telefoon blijft doorverwijzen
4. **Nu:** één wisselplan (telefoon = lijst + uitvoeren, PC = veld + bewerken). LLM later.
