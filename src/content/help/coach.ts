import type { HelpPageDef } from "./types";

export const helpCoachPage: HelpPageDef = {
  title: "Coach",
  subtitle: "Opstelling, wissels en wat er op het veld gebeurt.",
  blocks: [
    {
      heading: "Wat is jouw rol",
      paragraphs: [
        "Jij houdt de wedstrijd van jouw team bij. Is er een scheidsrechter gekoppeld, dan bedient die klok, stand, doelpunten en kaarten. Jij gaat over de selectie, opstelling en wissels.",
      ],
    },
    {
      heading: "Inloggen",
      steps: [
        "Tik op Inloggen en gebruik het e-mailadres dat de club voor jou heeft vastgelegd.",
        "Kies Coach in het menu bovenaan.",
        "Je ziet alleen de teams en wedstrijden waar jij aan gekoppeld bent.",
      ],
    },
    {
      heading: "Dashboard",
      bullets: [
        "Bovenaan staan actieve wedstrijden (opstelling, live of rust).",
        "Per team zie je geplande wedstrijden en recente uitslagen.",
        "Tik op een wedstrijd om het wedstrijdscherm te openen.",
        "Nieuwe wedstrijd is bedoeld voor een extra oefenwedstrijd. Het gewone programma komt van de club.",
      ],
    },
    {
      heading: "Voor de aftrap",
      bullets: [
        "Open de wedstrijd ruim van tevoren, het liefst vanaf de zijlijn op je telefoon.",
        "Controleer datum, thuis/uit en speeltijd (bijvoorbeeld 4×15 of 2×30) onder de wedstrijdgegevens.",
        "Zet de opstelling: wie staat op het veld, wie op de bank, wie is afwezig of geblesseerd.",
        "Je kunt kiezen tussen lijst en veldweergave, en een formatie kiezen. Dezelfde formatie zie je via Presenteren; het grote wisselveld open je via Plannen (beide alleen op iPad of laptop).",
        "Zet Opstelling tonen aan als ouders de opstelling op de live-pagina mogen zien.",
        "Wijs een scheidsrechter toe als de club dat nog niet heeft gedaan.",
        "Claim Wedstrijdleider als jij de wissels en de wedstrijd aanstuurt. Bij twee coaches kan maar één tegelijk leider zijn.",
      ],
    },
    {
      heading: "Tijdens de wedstrijd",
      bullets: [
        "Doelpunt of kaart: alleen als er geen scheidsrechter in de app zit. Anders doet de scheidsrechter dat.",
        "Wisselplan: op iPad of laptop open je Plannen (naast Presenteren) voor het grote veld. Op de telefoon zie je hetzelfde plan en voer je ze uit.",
        "Speeltijd toont hoe lang iedereen op het veld staat. Bij live geeft de app soms een wisselsuggestie.",
        "Gebeurtenissen (doelpunten, kaarten, wissels) zie je in de tijdlijn.",
        "Live view opent de publieke pagina, handig om te delen via WhatsApp.",
      ],
    },
    {
      heading: "Wie bedient de klok",
      paragraphs: [
        "Is er een scheidsrechter gekoppeld, dan is die de wedstrijdleiding: klok, stand, doelpunten en kaarten. Jij kunt die knoppen dan niet meer gebruiken. Jij houdt opstelling en wissels bij.",
      ],
      bullets: [
        "Geen scheidsrechter: de wedstrijdleider mag klok, stand, doelpunten en kaarten zelf bedienen.",
        "Einde wedstrijd vraagt altijd om een bewuste bevestiging, zodat je niet per ongeluk afrondt.",
      ],
    },
    {
      heading: "Status van een wedstrijd",
      bullets: [
        "Gepland — nog niet begonnen.",
        "Opstelling — selectie en veldbezetting worden klaargezet.",
        "LIVE — de wedstrijd loopt.",
        "Rust — pauze tussen helften of kwarten.",
        "Afgelopen — de wedstrijd is afgerond.",
      ],
    },
    {
      heading: "Geen toegang of lege lijst",
      bullets: [
        "Log in met hetzelfde e-mailadres als in de clubadministratie.",
        "Zie je een wedstrijd wel, maar ontbreken spelers: voeg ze toe onder Speler later toevoegen, ook tijdens of na de wedstrijd. Op de teamlijst staan is niet genoeg; ze moeten in díe wedstrijd zitten.",
        "Nog steeds vast: vraag TC/admin je e-mail aan het juiste team te koppelen.",
      ],
    },
  ],
};
