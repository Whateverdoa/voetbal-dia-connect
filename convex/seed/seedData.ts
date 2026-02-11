/**
 * Static seed configuration — coaches, referees, teams, schedule.
 *
 * All data is defined here so it can be reviewed and updated in one place.
 */

export const SEED_ADMIN_PIN = "9999"; // Default dev admin PIN

export const CLUB = { name: "DIA", slug: "dia" } as const;

export const TEAM_CONFIGS = [
  { name: "JO11-1", slug: "jo11-1" },
  { name: "JO12-1", slug: "jo12-1" },
  { name: "JO13-2", slug: "jo13-2" },
];

/** Coach seed config */
export interface SeedCoach {
  name: string;
  pin: string;
  teamSlugs: string[];
}

/** Map coach → teams by slug */
export const COACH_CONFIGS: SeedCoach[] = [
  { name: "Coach Mike", pin: "1234", teamSlugs: ["jo12-1"] },
  { name: "Coach Lisa", pin: "5678", teamSlugs: ["jo11-1", "jo13-2"] },
  { name: "Coach Jan", pin: "2468", teamSlugs: ["jo12-1"] },
  { name: "Coach Sandra", pin: "1357", teamSlugs: ["jo13-2"] },
];

/** Referee seed config */
export interface SeedReferee {
  name: string;
  pin: string;
}

export const REFEREE_CONFIGS: SeedReferee[] = [
  { name: "Scheidsr. De Vries", pin: "7777" },
  { name: "Scheidsr. Jansen", pin: "8888" },
  { name: "Scheidsr. Bakker", pin: "6666" },
  { name: "Scheidsr. Visser", pin: "5555" },
];

/** Players per team (shirt numbers 1-14) */
export const PLAYERS_PER_TEAM = 14;

/** Single match entry in the seed schedule */
export interface SeedMatch {
  date: string;
  opponent: string;
  isHome: boolean;
  finished?: boolean;
  homeScore?: number;
  awayScore?: number;
  refereeSlug: string;
}

/** Match schedule for JO12-1 (voorjaar 2026) */
export const MATCH_SCHEDULE: SeedMatch[] = [
  // Finished
  {
    date: "2026-01-24T10:00:00",
    opponent: "SCO JO12-2",
    isHome: true,
    finished: true,
    homeScore: 3,
    awayScore: 2,
    refereeSlug: "scheidsr-de-vries",
  },
  // Upcoming
  {
    date: "2026-02-28T08:30:00",
    opponent: "Oosterhout JO12-2",
    isHome: false,
    refereeSlug: "scheidsr-jansen",
  },
  {
    date: "2026-03-07T11:30:00",
    opponent: "Baronie JO12-4",
    isHome: false,
    refereeSlug: "scheidsr-bakker",
  },
];
