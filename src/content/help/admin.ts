import type { HelpPageDef } from "./types";

export const helpAdminPage: HelpPageDef = {
  title: "Admin / TC",
  subtitle: "Organisatie: wie mag wat, en welke wedstrijd hoort bij wie.",
  blocks: [
    {
      heading: "Wat is jouw rol",
      paragraphs: [
        "Jij houdt de clubkant bij: teams, mensen en toewijzingen. Coaches en scheidsrechters werken op de zijlijn; jij zorgt dat zij de juiste wedstrijden en de juiste spelers zien.",
      ],
    },
    {
      heading: "Twee werkplekken",
      bullets: [
        "Toewijzing — het wekelijkse overzicht: wedstrijden, wie de klok doet, claimronde.",
        "Beheer — stamgegevens: teams, spelers, coaches, scheidsrechters.",
      ],
    },
    {
      heading: "Toewijzing",
      bullets: [
        "Filter op team, speeldag, status of ‘nog geen scheidsrechter’.",
        "Wijs per wedstrijd een scheidsrechter (en zo nodig een coach) toe.",
        "Maak een extra wedstrijd aan als die niet in het programma staat.",
        "Open of sluit de claimronde voor de speelweek, zodat de poule zelf kan claimen.",
        "Kopieer WhatsApp-teksten voor open ronde of nog openstaande wedstrijden.",
      ],
    },
    {
      heading: "Beheer",
      bullets: [
        "Teams — namen, logo’s, koppeling met Sportlink waar dat klaarstaat.",
        "Spelers — de vaste teamlijst. Actief/inactief, rugnummer, foto.",
        "Coaches — naam, e-mail, teams. Dat e-mailadres is hun login.",
        "Scheidsrechters — naam, e-mail, actief, kwalificatietags, wel/niet in de claimpoule.",
      ],
    },
    {
      heading: "Toegang geven",
      steps: [
        "Zet het juiste e-mailadres bij de coach of scheidsrechter.",
        "Laat die persoon inloggen met dát adres (niet een privé-alias).",
        "Eerste keer kan een korte rolkeuze verschijnen; daarna staan Coach of Scheidsrechter in het menu.",
      ],
      paragraphs: [
        "Rollen zet de club, niet de gebruiker zelf. Eén persoon mag meerdere rollen hebben (bijvoorbeeld admin én coach).",
      ],
    },
    {
      heading: "Programma en uitslagen",
      paragraphs: [
        "Het speelschema komt uit Sportlink. De club vult tijdens de wedstrijd de live-stand in. Sportlink blijft leidend voor het programma (tijden, tegenstander, veld).",
      ],
      bullets: [
        "Wijzigt Sportlink de aftrap, dan volgt de app mee.",
        "Wijkt de officiële uitslag af van wat live is ingevuld, dan overschrijft Sportlink de stand. Je ziet dan een waarschuwing bij die wedstrijd.",
        "Spelers die alleen op de teamlijst staan, verschijnen niet automatisch in een wedstrijd. Bij een nieuwe, nog niet gespeelde wedstrijd vult de sync meestal alle actieve spelers. Controleer dat vóór de aftrap. Ontbreekt iemand tijdens of na de wedstrijd, dan kan coach of admin die achteraf nog toevoegen.",
      ],
    },
    {
      heading: "Alles controleren (deze fase)",
      paragraphs: [
        "Als admin kun je Coach en Scheidsrechter openen. Kies zelf of je als admin alle wedstrijden ziet, of als je gewone rol (alleen jouw teams of toewijzingen).",
      ],
      bullets: [
        "Bovenaan: Bekijk als Admin of Coach/Scheidsrechter.",
        "Als admin: zoek op team, tegenstander of code, en filter op status.",
        "Gewone coaches en scheidsrechters blijven alleen hun eigen wedstrijden zien.",
      ],
    },
    {
      heading: "Als iets niet klopt",
      bullets: [
        "Coach ziet de wedstrijd niet — e-mail aan het team gekoppeld?",
        "Coach ziet de wedstrijd wel, maar geen spelers — wedstrijdselectie leeg?",
        "Scheidsrechter ziet niets — niet toegewezen, niet in de poule, of ronde dicht?",
        "Verkeerde tijd of tegenstander — eerst Sportlink, daarna even wachten op de sync of de wedstrijd handmatig aanpassen.",
      ],
    },
  ],
};
