import type { HelpPageDef } from "./types";

export const helpIntroCards: Array<{
  href: string;
  title: string;
  description: string;
}> = [
  {
    href: "/help/coach",
    title: "Coach",
    description: "Opstelling, wissels en wedstrijd bijhouden.",
  },
  {
    href: "/help/scheidsrechter",
    title: "Scheidsrechter",
    description: "Klok en stand (soms: wedstrijdbegeleider).",
  },
  {
    href: "/help/admin",
    title: "Admin / TC",
    description: "Teams, toegang en toewijzingen.",
  },
  {
    href: "/help/publiek",
    title: "Meekijken",
    description: "Live volgen zonder account.",
  },
];

export const helpIndexPage: HelpPageDef = {
  title: "Hoe werkt DIA Live?",
  subtitle: "Handleiding per rol — lezen kan zonder in te loggen.",
  blocks: [
    {
      heading: "In één zin",
      paragraphs: [
        "DIA Live houdt jeugdwedstrijden live bij. De coach doet opstelling en wissels, de scheidsrechter doet klok en stand, admin/TC regelt wie wat mag, en ouders kijken mee zonder account.",
      ],
    },
    {
      heading: "Hoe de onderdelen samenwerken",
      bullets: [
        "Admin zet teams, e-mailadressen en toewijzingen klaar, en houdt het programma bij.",
        "Coach opent de wedstrijd van het eigen team, zet de selectie en volgt wat er gebeurt.",
        "Scheidsrechter start de klok en houdt de stand bij op de toegewezen wedstrijd.",
        "Publiek volgt via de startpagina of een code van zes tekens — geen login.",
      ],
    },
    {
      heading: "Een speeldag, stap voor stap",
      steps: [
        "Admin controleert het programma en wie de klok doet (toewijzing of claimronde).",
        "Coach opent de wedstrijd, vinkt afwezigen, zet de opstelling en claimt zo nodig wedstrijdleider.",
        "Scheidsrechter opent dezelfde wedstrijd en start als het fluit.",
        "Tijdens de wedstrijd: scheidsrechter klok/stand, coach wissels en DIA-doelpunten.",
        "Afronden via de klok (met bevestiging). Ouders hebben de live-pagina al kunnen volgen.",
      ],
    },
    {
      heading: "Inloggen",
      bullets: [
        "Coach, scheidsrechter en admin: knop Inloggen met het e-mailadres dat de club heeft vastgelegd.",
        "Rollen regel je niet zelf — dat doet TC/admin.",
        "Meekijken: geen account nodig.",
      ],
    },
    {
      heading: "Kies je uitleg",
      paragraphs: ["Open hieronder de handleiding die bij jou hoort."],
    },
  ],
};

export const helpClubRollenPage: HelpPageDef = {
  title: "Rollen en e-mail",
  subtitle: "Wie mag wat — en waarom het e-mailadres telt.",
  blocks: [
    {
      heading: "De drie rollen",
      bullets: [
        "Coach — eigen team: opstelling, wissels, gebeurtenissen. Zie je alleen jouw wedstrijden.",
        "Scheidsrechter — klok en stand op toegewezen of geclaimde wedstrijden.",
        "Admin / TC — hele club: mensen, teams, toewijzing, programma.",
      ],
    },
    {
      heading: "E-mail is de sleutel",
      paragraphs: [
        "De club koppelt jouw e-mailadres aan een coach- of scheidsrechterrecord. Log in met precies dat adres. Een ander Gmail-adres of een typefout betekent: geen toegang, ook al ken je de club.",
      ],
    },
    {
      heading: "Tijdens de wedstrijd",
      bullets: [
        "Scheidsrechter gekoppeld: die doet de klok. Coach doet opstelling en wissels (als wedstrijdleider).",
        "Geen scheidsrechter: de wedstrijdleider (coach) mag de klok zelf doen.",
        "Publiek ziet stand, klok en — als de coach het aanzet — de opstelling. Geen interne clubzaken.",
      ],
    },
    {
      heading: "Meerdere rollen",
      paragraphs: [
        "Eén persoon kan admin én coach zijn, of coach én scheidsrechter. In het menu verschijnen dan meerdere links. Als admin kies je bovenaan Bekijk als Admin (alle wedstrijden) of als Coach/Scheidsrechter (alleen jouw eigen).",
      ],
    },
  ],
};

export const helpPublicPage: HelpPageDef = {
  title: "Meekijken",
  subtitle: "Geen account nodig.",
  blocks: [
    {
      heading: "Hoe",
      bullets: [
        "Startpagina → kies een wedstrijd uit de lijst.",
        "Of: «Heb je een code?» → zes tekens → Live.",
        "Deel de live-link (WhatsApp) met familie — zij hoeven niet in te loggen.",
      ],
    },
    {
      heading: "Wat je ziet",
      bullets: [
        "Stand, tijd en of het rust of live is.",
        "Opstelling alleen als de coach die heeft aangezet.",
        "Geen wissels bedienen en geen interne clublijsten — dat is bewust.",
      ],
    },
  ],
};
