# AVG — toestemming JO13 selectieteams (DIA Live)

**Doelgroep:** ouders/verzorgers van spelers in JO13-1 en JO13-2  
**Versie document:** 1.0 (2026-07)  
**Verwerkingsverantwoordelijke:** de club (DIA / aangesloten vereniging) via DIA Live

---

## Waarom vragen we toestemming?

DIA Live toont tijdens wedstrijden op **TV in de kantine** en op een **desktop in de kleedkamer** informatie over spelers. Voor selectieteams (JO13) gaat dat verder dan alleen rugnummer: optioneel **foto**, **naam**, en **speelstatistieken / XP-kaarten** (gamificatie).

Omdat het om **minderjarigen** gaat, vragen we per speler expliciete toestemming vóór deze weergave.

---

## Welke keuzes zijn er?

Via de unieke link `/consent/[token]` kun je per optie **ja** of **nee** kiezen:

| Optie | Betekenis | Als je **nee** zegt |
|-------|-----------|---------------------|
| **Publieke weergave** | Naam zichtbaar op TV / presentatie | Alleen initialen + rugnummer + positie |
| **Foto** | Profielfoto op spelerskaart | Silhouet / geen foto |
| **Gamificatie** | XP, level, badges, “teamdeck” | Gewone wedstrijdkaart zonder XP |

**Foto** en **gamificatie** gelden alleen als publieke weergave ook is toegestaan.

---

## Wie mag toestemming geven?

- Bij voorkeur een **ouder of verzorger**
- De speler zelf mag meekiezen waar dat clubbeleid toelaat (veld “verleend door”)

Toestemming is **herroepbaar**: neem contact op met de club / TC. Na herroeping verdwijnen foto en XP uit publieke schermen; de club kan intern nog een auditspoor houden.

---

## Wat doen we níet?

- Geen automatische e-mails vanuit de app (de club stuurt de link)
- Geen verkoop of doorgeven van persoonsgegevens aan derden voor marketing
- Geen gamificatie voor niet-selectieteams in deze pilot

---

## Bewaartermijn (richtlijn)

- Toestemmingsstatus: zolang de speler bij het team speelt + redelijke seizoensafsluiting
- Foto’s: zolang toestemming geldt; bij revoke niet meer in publieke queries
- Wedstrijdgegevens (doelpunten, minuten): clubadministratie / seizoensarchief

Exacte termijnen volgen club-AVG-beleid; dit document is de producttekst voor ouders.

---

## Technische waarborgen (voor ontwikkelaars)

- Tabel `playerConsents` met types `photo` | `gamification` | `public_display`
- Presentatie-queries via `convex/lib/privacyFilter.ts` → `redactPlayerForPublic`
- Alleen teams met `isSelectionTeam: true` gebruiken dit consent-model voor TV/deck

Zie ook: [fable-jo13-presentatie-gamificatie.plan.md](./fable-jo13-presentatie-gamificatie.plan.md), [actors-and-access.md](../actors-and-access.md).
