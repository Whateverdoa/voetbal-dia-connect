import type { HelpPageDef } from "./types";

export const helpRefereePage: HelpPageDef = {
  title: "Scheidsrechter",
  subtitle: "Klok en stand — op de zijlijn, op je telefoon.",
  blocks: [
    {
      heading: "Wat is jouw rol",
      paragraphs: [
        "Jij begeleidt de wedstrijd aan de kant van de klok en de stand. In de club wordt dit soms wedstrijdbegeleider genoemd; in het menu staat Scheidsrechter. De coach houdt opstelling en wissels bij.",
      ],
    },
    {
      heading: "Inloggen",
      steps: [
        "Tik op Inloggen met het e-mailadres dat de club voor jou heeft vastgelegd.",
        "Kies Scheidsrechter in het menu.",
        "Je ziet in de basis alleen wedstrijden die aan jou zijn toegewezen of die jij in de claimronde hebt gepakt.",
      ],
    },
    {
      heading: "Drie tabbladen",
      bullets: [
        "Beschikbaar — open wedstrijden tijdens een claimronde, als je in de poule staat.",
        "Mijn wedstrijden — alles wat aan jou hangt. Tik om de wedstrijd te openen.",
        "Meldingen — berichten van de club, bijvoorbeeld dat de ronde open is of dat je bent toegewezen.",
      ],
    },
    {
      heading: "Claimronde",
      paragraphs: [
        "De club opent per speelweek een ronde. Als jij in de claimpoule staat, kun je passende vrije wedstrijden pakken. Past een wedstrijd niet bij je kwalificatie, of botst het met een andere afspraak, dan zie je die niet.",
      ],
      bullets: [
        "Claimen: tik de wedstrijd aan onder Beschikbaar.",
        "Loslaten kan zolang de wedstrijd nog gepland is — daarna is hij van jou tot de club iets wijzigt.",
        "Geen ronde open, of je staat niet in de poule: dan wijst de club (of de coach) je toe.",
      ],
    },
    {
      heading: "Tijdens de wedstrijd",
      bullets: [
        "Start de wedstrijd als beide teams klaarstaan.",
        "Bedien de klok: volgend kwart of helft, rust, hervatten, einde.",
        "Houd de stand bij. Bij een DIA-doelpunt kun je de schutter kiezen.",
        "Onderbrekingen (bijvoorbeeld blessure) kun je registreren; de speelminuten van spelers pauzeren dan, de wedstrijdklok loopt door.",
        "Einde wedstrijd: lees de bevestiging en bevestig bewust.",
      ],
    },
    {
      heading: "Wat jij niet hoeft te doen",
      bullets: [
        "Opstelling, bank en afwezigen — dat is de coach.",
        "Wissels uitvoeren — dat is de wedstrijdleider (coach).",
        "Teams of accounts beheren — dat is admin.",
      ],
    },
    {
      heading: "Geen wedstrijden",
      bullets: [
        "Zonder toewijzing of claim zie je een lege lijst. Dat is normaal.",
        "Vraag de club je in de poule te zetten, of een wedstrijd toe te wijzen.",
        "Log altijd in met hetzelfde e-mailadres als in de administratie.",
      ],
    },
  ],
};
