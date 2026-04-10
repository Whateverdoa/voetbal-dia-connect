/**
 * Dutch copy for public /help pages (no auth). Task-focused onboarding.
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
    description: "Wedstrijden, opstelling, wissels en meer.",
  },
  {
    href: "/help/scheidsrechter",
    title: "Wedstrijdbegeleider",
    description: "Klok en score (vaak ouder of vrijwilliger; in de app: scheidsrechter).",
  },
  {
    href: "/help/admin",
    title: "Admin / TC",
    description: "Teams, accounts, toewijzingen en wedstrijdselectie.",
  },
  {
    href: "/help/publiek",
    title: "Ouders, begeleiders & supporters",
    description: "Meekijken zonder account — uit de lijst of met een code.",
  },
  {
    href: "/help/club-en-rollen",
    title: "Club: rollen en e-mail",
    description: "Hoe de club rechten verdeelt en wat je kunt verwachten.",
  },
];

export const helpIndexPage: HelpPageDef = {
  title: "Hoe werkt DIA Live?",
  subtitle: "Korte uitleg per rol — geen account nodig om dit te lezen.",
  blocks: [
    {
      heading: "Wat is het?",
      paragraphs: [
        "DIA Live is de app waarmee coaches en wedstrijdbegeleiders (in de app ook wel scheidsrechter genoemd) een wedstrijd bijhouden: stand, kwarten, rust en events. Ouders, begeleiders, familie en supporters kunnen op de startpagina een wedstrijd uit de lijst kiezen en live meekijken — zonder account en zonder code. Een wedstrijdcode is alleen handig als je die apart hebt gekregen.",
      ],
    },
    {
      heading: "Inloggen met je e-mailadres van de club",
      paragraphs: [
        "Voor Coach, wedstrijdbegeleider (scheidsrechter in het menu) en Admin gebruik je de knop Inloggen bovenaan de site. Vul het e-mailadres in waarmee je bij de club bent geregistreerd — precies hetzelfde adres als in het coachoverzicht, het overzicht voor wedstrijdleiding of andere clubadministratie. Zo kan DIA Live je automatisch de juiste rechten geven.",
        "**Eerste keer inloggen:** je maakt eenmalig een account aan bij de login (bijvoorbeeld via een bevestigingslink in je mail). Welke methode je ziet (link, code, wachtwoord), hangt af van hoe de club de inlog heeft ingericht.",
        "Daarna log je gewoon opnieuw in met datzelfde adres. Geen tweede adres gebruiken tenzij de club je expliciet een ander adres heeft gegeven.",
      ],
      bullets: [
        "Je rollen (coach, wedstrijdbegeleider/scheidsrechter, admin) en koppeling aan teams worden door de club of TC ingesteld — niet zelf in deze app.",
        "Na inloggen zie je niet de juiste omgeving? Controleer het e-mailadres en neem contact op met TC of admin.",
      ],
    },
    {
      heading: "Uitnodiging per mail (optioneel)",
      paragraphs: [
        "**Clerk** (het inlogsysteem) kan ook **uitnodigingsmails** sturen: de club nodigt je uit op een adres en jij maakt daarmee je account aan. DIA Live hoeft daarvoor geen aparte knop in de app te hebben — uitnodigen kan via het **Clerk-dashboard** door wie de login beheert, naast het gewone inloggen met je club-e-mailadres.",
        "Vraag je TC of technische beheerder of de club dit gebruikt en wat de bedoelde workflow is.",
      ],
    },
    {
      heading: "Hoe verdeelt de club de rollen?",
      paragraphs: [
        "DIA Live geeft je geen rollen zelf: de club zet vooraf vast wie coach is, wie wedstrijden mag begeleiden (klok en score) en wie admin rechten heeft. Dat gebeurt in de clubadministratie en in deze app door het juiste e-mailadres aan je account te koppelen.",
      ],
      bullets: [
        "Nieuw bij de club: wacht tot TC of admin je e-mail heeft ingevoerd; log daarna in met precies dat adres.",
        "Wedstrijden voor de begeleider verschijnen pas als de club je aan een wedstrijd heeft gekoppeld (toewijzing).",
        "Meer uitleg: zie de pagina Club: rollen en e-mail in het overzicht hieronder.",
      ],
    },
    {
      heading: "Uitleg verder lezen",
      paragraphs: [
        "Hieronder staat per taak wat je in de app doet. Open het onderdeel dat bij jou hoort.",
      ],
    },
  ],
};

export const helpCoachPage: HelpPageDef = {
  title: "Uitleg voor coaches",
  subtitle: "Wedstrijd voorbereiden en tijdens de wedstrijd bijhouden.",
  blocks: [
    {
      heading: "Dashboard",
      paragraphs: [
        "Open Coach via het menu. Je ziet je wedstrijden. Kies een wedstrijd om te starten of verder te gaan.",
      ],
      screenshot: {
        file: "coach-dashboard.png",
        alt: "Schermafbeelding coach-dashboard",
        caption: "Voorbeeld: overzicht met je wedstrijden.",
      },
    },
    {
      heading: "Wedstrijdpagina",
      bullets: [
        "Stel de opstelling en wissels in (wie speelt, wie wisselt).",
        "De wedstrijdleider voor deze wedstrijd voert bepaalde acties uit (zoals wissels) — dat zie je in de app als je die rol hebt.",
        "Aan het einde bevestig je dat de wedstrijd klaar is als daar om gevraagd wordt.",
      ],
      screenshot: {
        file: "coach-match.png",
        alt: "Schermafbeelding wedstrijdbediening coach",
        caption: "Voorbeeld: bediening tijdens de wedstrijd.",
      },
    },
    {
      heading: "Inloggen",
      bullets: [
        "Gebruik het **e-mailadres waarmee je bij de club als coach staat geregistreerd** (zie ook de uitleg op de hoofdpagina van Help).",
        "Eerste keer: volg de stappen van de login (bevestigingsmail e.d.); daarna hetzelfde adres blijven gebruiken.",
      ],
    },
    {
      heading: "Zonder coachtoegang?",
      bullets: [
        "Controleer of je met het juiste e-mailadres bent ingelogd.",
        "Vraag de TC of admin om je koppeling als coach te controleren.",
      ],
    },
  ],
};

export const helpRefereePage: HelpPageDef = {
  title: "Uitleg voor wedstrijdbegeleiders",
  subtitle:
    "Klok en score op de wedstrijden die de club aan jou toewijst (in het menu: Scheidsrechter).",
  blocks: [
    {
      heading: "Dashboard",
      paragraphs: [
        "Open via het menu de pagina Scheidsrechter. Je ziet alleen wedstrijden die de club jou heeft toegewezen.",
      ],
      screenshot: {
        file: "scheids-dashboard.png",
        alt: "Schermafbeelding scheidsrechter-overzicht",
        caption: "Voorbeeld: lijst met jouw wedstrijden.",
      },
    },
    {
      heading: "Tijdens de wedstrijd",
      bullets: [
        "Start of verzet de klok per kwart (volgens de afspraak met de coach/vereniging).",
        "Voer de stand bij.",
        "Afronden vraagt vaak een bevestiging — lees de melding en bevestig bewust.",
      ],
      screenshot: {
        file: "scheids-match.png",
        alt: "Schermafbeelding klok en score scheidsrechter",
        caption: "Voorbeeld: klok en score.",
      },
    },
    {
      heading: "Geen wedstrijden of geen toegang?",
      bullets: [
        "Toewijzing gebeurt door de club (admin). Zonder toewijzing zie je geen wedstrijd.",
        "Log in met het e-mailadres waarmee je bij de club als wedstrijdbegeleider staat geregistreerd — hetzelfde als in de clubadministratie (zie ook Help-startpagina).",
      ],
    },
  ],
};

export const helpAdminPage: HelpPageDef = {
  title: "Uitleg voor admin / TC",
  subtitle: "Organisatie: teams, mensen, wedstrijden en toewijzingen.",
  blocks: [
    {
      heading: "Admin-omgeving",
      paragraphs: [
        "Vanuit Admin beheer je teams, coaches, scheidsrechters en wedstrijden. Het toewijzingsbord gebruik je om scheidsrechters aan wedstrijden te koppelen.",
      ],
      screenshot: {
        file: "admin-board.png",
        alt: "Schermafbeelding admin toewijzingsbord",
        caption: "Voorbeeld: overzicht en toewijzing (desktop).",
      },
    },
    {
      heading: "Spelers in een wedstrijd",
      bullets: [
        "Spelers op de teamlijst zijn niet automatisch beschikbaar in elke wedstrijd.",
        "Zorg dat voor een wedstrijd de juiste wedstrijdselectie staat (wie meedoet), anders ziet de coach ze niet bij die wedstrijd.",
      ],
    },
    {
      heading: "Tips",
      bullets: [
        "Nieuwe coach of scheidsrechter: stel toegang en rollen in de admin-omgeving in en zet het juiste e-mailadres vast; laat de persoon daarna inloggen.",
        "Meer technische details over rollen: in de repo docs/roles.md en docs/actors-and-access.md.",
      ],
    },
  ],
};

export const helpClubRollenPage: HelpPageDef = {
  title: "Club: rollen en e-mail",
  subtitle: "Hoe de vereniging bepaalt wie wat mag in DIA Live.",
  blocks: [
    {
      heading: "Wie zet rollen vast?",
      paragraphs: [
        "De technische commissie, coördinator of een andere admin binnen de club gebruikt de admin-omgeving om teams, coaches en wedstrijdbegeleiders te beheren. Jij kiest je rol niet zelf in de app: je logt in met het e-mailadres dat de club voor jou heeft vastgelegd.",
      ],
    },
    {
      heading: "Coach",
      bullets: [
        "De club koppelt je e-mail aan een coachprofiel en aan de juiste team(en).",
        "Meerdere coaches op hetzelfde team kan; per wedstrijd kan er een wedstrijdleider zijn voor bepaalde acties.",
      ],
    },
    {
      heading: "Wedstrijdbegeleider (scheidsrechter in het menu)",
      bullets: [
        "Vaak een ouder of vrijwilliger die klok en score bedient — niet per se een officiële KNVB-scheidsrechter.",
        "Je ziet alleen wedstrijden waaraan de club je heeft toegewezen.",
        "Op de openbare site (meekijken zonder login) wordt geen naam van de begeleider getoond; alleen of er iemand is toegewezen.",
      ],
    },
    {
      heading: "Iets mis met je toegang?",
      bullets: [
        "Controleer of je met hetzelfde e-mailadres inlogt als in het cluboverzicht.",
        "Neem contact op met TC of admin als je wel een account hebt maar niet de juiste omgeving ziet.",
      ],
    },
  ],
};

export const helpPublicPage: HelpPageDef = {
  title: "Live meekijken (publiek)",
  subtitle: "Geen account nodig — ook geen wedstrijdcode.",
  blocks: [
    {
      heading: "Wedstrijd kiezen op de startpagina",
      paragraphs: [
        "Op de startpagina staat een overzicht van wedstrijden (bijvoorbeeld LIVE, gepland en afgelopen). Tik op de wedstrijd die je wilt volgen: je gaat direct naar de live weergave. Je hoeft daarvoor niet in te loggen en je hebt geen code nodig.",
      ],
      bullets: [
        "Je ziet stand en voortgang zoals de club die live publiceert.",
        "Verversen is meestal niet nodig — de pagina werkt live bij.",
      ],
      screenshot: {
        file: "match-browser.png",
        alt: "Schermafbeelding wedstrijdlijst op de startpagina",
        caption: "Voorbeeld: uit de lijst een wedstrijd openen.",
      },
    },
    {
      heading: "Alleen een code?",
      paragraphs: [
        "Heb je wel een zescijferige code gekregen (bijvoorbeeld op het veld of via de club), dan kun je op de startpagina op «Heb je een code?» tikken, de code invoeren en naar Live gaan — nog steeds zonder account.",
      ],
      screenshot: {
        file: "home-code.png",
        alt: "Schermafbeelding invoer wedstrijdcode",
        caption: "Optioneel: rechtstreeks met een code.",
      },
    },
    {
      heading: "Delen met familie en vrienden",
      paragraphs: [
        "Wil je dat opa, oma, vrienden of andere bekenden meekijken? Open de live wedstrijd in je browser en **deel de link** (bijvoorbeeld via WhatsApp). Zij hoeven ook geen account te hebben.",
      ],
      screenshot: {
        file: "live-view.png",
        alt: "Schermafbeelding publieke live-weergave",
        caption: "Optioneel: live-scherm om de link van te delen.",
      },
    },
  ],
};
