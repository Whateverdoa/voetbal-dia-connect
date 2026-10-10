# Onderzoek: wissel-/tijdswaarschuwingen in een oortje

**Status:** research only — geen productie-feature in deze ronde.  
**Datum:** 2026-09-12  
**Context:** coaches willen discrete alerts (wisselmoment, tijdstraf klaar, periode-einde) via oortje. HANDOFF plant dit niet; alleen een voice-schets in agent-architectuur.

## Triggers (kandidaten)

| Trigger | Bron in app | Urgentie |
|---------|-------------|----------|
| Geplande wissel-minuut nadert | `substitutionPlans.targetMinute` + matchklok | Hoog |
| Tijdstraf klaar (“Mag terug”) | `TimePenaltyPanel` / cardRules | Hoog |
| Kwart / helft bijna voorbij | Matchklok + `regulationDurationMinutes` | Medium |
| Stillegging te lang | Stoppage advisory | Laag |

Alleen **wedstrijdleider** (lead coach) zou audio mogen starten om ruis te vermijden.

## Technische kanalen

### 1. Web Audio + korte NL-zin (PWA / browser) — beste eerste prototype

- Soft chime (`AudioContext`) + optioneel `speechSynthesis` (“Wissel over één minuut”).
- Werkt op laptop/telefoon in de geopende coach-tab.
- **Limieten iOS Safari:** vaak user-gesture nodig vóór audio; achtergrondtabs dempen of pauzeren audio; geen betrouwbare achtergrond-service zoals native.

### 2. Native app later

- Betrouwbaarder Bluetooth-oortje + achtergrondnotificaties.
- Hogere kosten; pas zinvol na bewezen Web-prototype.

### 3. Niet doen

- Specifieke Bluetooth HID/GATT-koppeling in de webapp (fragiel, platform-afhankelijk).
- Altijd-aan microfoon / continue voice agent voor pitch-side (privacy + afleiding).

## UX-schets

- Default: **stil**. Coach zet “Audio-waarschuwingen” aan (expliciete tap = user gesture).
- Keuze: chime only / chime + spraak.
- Mute tijdens rust optioneel.
- Geen harde autoplay bij page load.

## Risico’s

- Afleiding op de lijn (te veel alerts).
- Valse triggers bij klok-pauze / stillegging (hergebruik bestaande freeze-logica van tijdstraf).
- Privacy: spraak lokaal houden; geen cloud-TTS met wedstrijddata tenzij expliciet gekozen.
- iOS betrouwbaarheid: prototype eerst op Android + desktop Chrome; iPhone als “best effort”.

## Go / no-go voor prototype

**Go voor een beperkt prototype** als:

1. Alleen lead coach, opt-in, chime-first.
2. Max 3 trigger-types (wissel-minuut, tijdstraf klaar, periode-einde).
3. Geen afhankelijkheid van native app in v0.

**No-go voor “productie-oortje”** tot:

- iOS achtergrondgedrag acceptabel is getest, of
- een dunne native wrapper bestaat.

## Volgende stap (na go)

1. Feature flag + settings toggle op coach live (telefoon).
2. Hook `useMatchAudioAlerts` die klok + pending plans + penalties leest.
3. Test op TEST Sandbox met geplande wissel over 1 minuut.
4. Meet: hoeveel coaches het aan laten staan na 2 wedstrijden.
