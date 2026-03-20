/**
 * Static seed configuration - coaches, referees, teams, schedule.
 *
 * All data is defined here so it can be reviewed and updated in one place.
 */

export const CLUB = { name: "DIA", slug: "dia" } as const;

export const TEAM_CONFIGS = [
  { name: "JO11-1", slug: "jo11-1" },
  { name: "JO12-1", slug: "jo12-1" },
  { name: "JO13-2", slug: "jo13-2" },
];

export interface SeedCoach {
  name: string;
  email: string;
  teamSlugs: string[];
}

export const COACH_CONFIGS: SeedCoach[] = [
  { name: "Remco Hendriks", email: "remco.hendriks@dia.local", teamSlugs: ["jo12-1"] },
  { name: "Martin Nieuwenhuizen", email: "martin.nieuwenhuizen@dia.local", teamSlugs: ["jo12-1"] },
  { name: "Mike ten Hoonte", email: "mike.tenhoonte@dia.local", teamSlugs: ["jo12-1"] },
  { name: "Serdar Sarica", email: "serdar.sarica@dia.local", teamSlugs: ["jo12-1"] },
  { name: "Coach JO11", email: "coach.jo11@dia.local", teamSlugs: ["jo11-1"] },
  { name: "Coach JO13", email: "coach.jo13@dia.local", teamSlugs: ["jo13-2"] },
];

export interface SeedReferee {
  name: string;
  email: string;
}

export const REFEREE_CONFIGS: SeedReferee[] = [
  { name: "Scheidsr. De Vries", email: "ref.devries@dia.local" },
  { name: "Scheidsr. Jansen", email: "ref.jansen@dia.local" },
  { name: "Scheidsr. Bakker", email: "ref.bakker@dia.local" },
  { name: "Scheidsr. Visser", email: "ref.visser@dia.local" },
];

export const PLAYERS_PER_TEAM = 14;

export interface SeedMatch {
  date: string;
  opponent: string;
  isHome: boolean;
  finished?: boolean;
  homeScore?: number;
  awayScore?: number;
  refereeSlug: string;
}

export const MATCH_SCHEDULE: SeedMatch[] = [
  {
    date: "2026-01-24T10:00:00",
    opponent: "SCO JO12-2",
    isHome: true,
    finished: true,
    homeScore: 3,
    awayScore: 2,
    refereeSlug: "scheidsr-de-vries",
  },
  {
    date: "2026-01-31T10:00:00",
    opponent: "VOAB JO12-2",
    isHome: false,
    finished: true,
    homeScore: 4,
    awayScore: 5,
    refereeSlug: "scheidsr-jansen",
  },
  {
    date: "2026-02-07T10:00:00",
    opponent: "Terheijden JO12-1",
    isHome: true,
    finished: true,
    homeScore: 3,
    awayScore: 6,
    refereeSlug: "scheidsr-bakker",
  },
  {
    date: "2026-02-28T08:30:00",
    opponent: "Oosterhout JO12-2",
    isHome: false,
    refereeSlug: "scheidsr-visser",
  },
  {
    date: "2026-03-07T11:30:00",
    opponent: "Baronie JO12-4",
    isHome: false,
    refereeSlug: "scheidsr-de-vries",
  },
  {
    date: "2026-03-14T09:00:00",
    opponent: "Boeimeer JO12-2",
    isHome: true,
    refereeSlug: "scheidsr-jansen",
  },
  {
    date: "2026-03-21T09:00:00",
    opponent: "Madese Boys JO12-1",
    isHome: false,
    refereeSlug: "scheidsr-bakker",
  },
];
