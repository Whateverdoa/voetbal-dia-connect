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

/** Real coaches for JO12-1 + placeholder coaches for other teams */
export const COACH_CONFIGS: SeedCoach[] = [
  { name: "Remco Hendriks", pin: "1234", teamSlugs: ["jo12-1"] },
  { name: "Martin Nieuwenhuizen", pin: "5678", teamSlugs: ["jo12-1"] },
  { name: "Mike ten Hoonte", pin: "2468", teamSlugs: ["jo12-1"] },
  { name: "Serdar Sarica", pin: "1357", teamSlugs: ["jo12-1"] },
  { name: "Coach JO11", pin: "3456", teamSlugs: ["jo11-1"] },
  { name: "Coach JO13", pin: "7890", teamSlugs: ["jo13-2"] },
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

/** Fallback player count (used when no real roster available) */
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

/** Full match schedule for JO12-1 (voorjaar 2026) — real data */
export const MATCH_SCHEDULE: SeedMatch[] = [
  // === Gespeeld ===
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
  // === Komend ===
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
