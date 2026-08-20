/**
 * Dutch help copy — short, role-based, aligned with current product goals.
 * Core: live wedstrijd (coach + begeleider), admin-toewijzing, publiek meekijken.
 * Pilot (JO13 selectie / presentatie / kaarten): bewust kort gehouden.
 */

export type HelpBlock = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  screenshot?: { file: string; alt: string; caption?: string };
};

export type HelpPageDef = {
  title: string;
  subtitle: string;
  blocks: HelpBlock[];
};

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
    title: "Wedstrijdbegeleider",
    description: "Klok en score (in het menu: Scheidsrechter).",
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
  subtitle: "Kort per rol — lezen kan zonder account.",
  blocks: [
    {
      heading: "In één zin",
      paragraphs: [
        "DIA Live houdt de wedstrijd live bij: coach en wedstrijdbegeleider bedienen, ouders en supporters kijken mee.",
      ],
    },
    {
      heading: "Inloggen",
      bullets: [
        "Coach, begeleider en admin: knop Inloggen met het e-mailadres dat de club voor jou heeft vastgelegd.",
        "Rollen regel je niet zelf — dat doet TC/admin. Verkeerde omgeving? Check je e-mail of vraag TC.",
      ],
    },
    {
      heading: "Kies je uitleg",
      paragraphs: ["Open hieronder wat bij jou hoort."],
    },
  ],
};

export const helpCoachPage: HelpPageDef = {
  title: "Coach",
  subtitle: "Voor, tijdens en na de wedstrijd.",
  blocks: [
    {
      heading: "Wat doe je?",
      bullets: [
        "Open Coach → kies je wedstrijd.",
        "Zet opstelling en wissels klaar (veld/bank).",
        "Tijdens de wedstrijd: stand en gebeurtenissen volgen; afronden als dat gevraagd wordt.",
      ],
    },
    {
      heading: "Geen toegang?",
      bullets: [
        "Inloggen met je club-e-mail.",
        "Anders: TC/admin laten controleren of je aan het team hangt.",
      ],
    },
  ],
};

export const helpRefereePage: HelpPageDef = {
  title: "Wedstrijdbegeleider",
  subtitle: "Klok en score — in het menu: Scheidsrechter.",
  blocks: [
    {
      heading: "Wat doe je?",
      bullets: [
        "Open Scheidsrechter → alleen wedstrijden die aan jou zijn toegewezen.",
        "Bedien de klok (kwarten/rust) en de stand.",
        "Afronden: lees de bevestiging en bevestig bewust.",
      ],
    },
    {
      heading: "Geen wedstrijden?",
      bullets: [
        "Toewijzing doet de club (admin). Zonder toewijzing zie je niets.",
        "Log in met hetzelfde e-mailadres als in de clubadministratie.",
      ],
    },
  ],
};

export const helpAdminPage: HelpPageDef = {
  title: "Admin / TC",
  subtitle: "Organisatie rondom wedstrijden.",
  blocks: [
    {
      heading: "Wat doe je?",
      bullets: [
        "Teams, coaches en begeleiders beheren.",
        "Wedstrijden toewijzen (wie doet klok/score).",
        "Zorgen dat de juiste spelers in de wedstrijdselectie staan — anders ziet de coach ze niet.",
      ],
    },
    {
      heading: "Tip",
      paragraphs: [
        "Nieuwe coach of begeleider: e-mail + rol in Admin zetten, daarna laten inloggen met dat adres.",
      ],
    },
  ],
};

export const helpClubRollenPage: HelpPageDef = {
  title: "Rollen en e-mail",
  subtitle: "Wie mag wat — kort.",
  blocks: [
    {
      heading: "Regels",
      bullets: [
        "De club (TC/admin) koppelt e-mail aan coach, begeleider of admin.",
        "Begeleider ziet alleen toegewezen wedstrijden.",
        "Publiek meekijken: geen account nodig.",
      ],
    },
  ],
};

export const helpPublicPage: HelpPageDef = {
  title: "Meekijken",
  subtitle: "Geen account nodig.",
  blocks: [
    {
      heading: "Hoe?",
      bullets: [
        "Startpagina → kies een wedstrijd uit de lijst.",
        "Of: «Heb je een code?» → zes tekens → Live.",
        "Deel de live-link (WhatsApp) met familie — zij hoeven niet in te loggen.",
      ],
    },
  ],
};
