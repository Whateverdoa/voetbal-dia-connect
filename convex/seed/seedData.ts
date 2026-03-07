/**
 * Static seed configuration — coaches, referees, teams, schedule.
 *
 * All data is defined here so it can be reviewed and updated in one place.
 */

export const SEED_ADMIN_PIN = "9999"; // Default dev admin PIN

export const CLUB = { name: "DIA", slug: "dia" } as const;

/** All teams (legacy: includes JO11, JO13) */
export const TEAM_CONFIGS = [
  { name: "JO11-1", slug: "jo11-1" },
  { name: "JO12-1", slug: "jo12-1" },
  { name: "JO13-2", slug: "jo13-2" },
];

/** Only JO12 teams for seed — used when seeding JO12 + full schedules */
export const JO12_TEAM_CONFIGS = [
  { name: "JO12-1", slug: "jo12-1" },
  { name: "JO12-2", slug: "jo12-2" },
  { name: "JO12-3", slug: "jo12-3" },
  { name: "JO12-4", slug: "jo12-4" },
];

/** Coach seed config */
export interface SeedCoach {
  name: string;
  pin: string;
  teamSlugs: string[];
}

/** Coaches for all four JO12 teams (from DIA leiders en trainers 25-26) */
export const COACH_CONFIGS: SeedCoach[] = [
  { name: "Remco Hendriks", pin: "1234", teamSlugs: ["jo12-1"] },
  { name: "Martin Nieuwenhuizen", pin: "5678", teamSlugs: ["jo12-1"] },
  { name: "Mike ten Hoonte", pin: "2468", teamSlugs: ["jo12-1"] },
  { name: "Serdar Sarica", pin: "1357", teamSlugs: ["jo12-1"] },
  { name: "Marcel Harreman", pin: "2001", teamSlugs: ["jo12-2"] },
  { name: "Bas Kock", pin: "2002", teamSlugs: ["jo12-2"] },
  { name: "Kriste Berkhout", pin: "2003", teamSlugs: ["jo12-2"] },
  { name: "Marc Lauwerys", pin: "3001", teamSlugs: ["jo12-3"] },
  { name: "Armin Hasanovic", pin: "3002", teamSlugs: ["jo12-3"] },
  { name: "Emiel Deckers", pin: "3003", teamSlugs: ["jo12-3"] },
  { name: "Patrick van der Velden", pin: "4001", teamSlugs: ["jo12-4"] },
  { name: "Jacky Musters", pin: "4002", teamSlugs: ["jo12-4"] },
  { name: "Tim Gregoor", pin: "4003", teamSlugs: ["jo12-4"] },
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

/** Per-team match schedules (gespeeld + komend) voor alle JO12-teams */
export const MATCH_SCHEDULE_JO12_1: SeedMatch[] = [
  { date: "2026-01-31T10:00:00", opponent: "VOAB JO12-2", isHome: false, finished: true, homeScore: 4, awayScore: 5, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T10:00:00", opponent: "Terheijden JO12-1", isHome: true, finished: true, homeScore: 3, awayScore: 6, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T10:00:00", opponent: "Oosterhout JO12-2", isHome: false, finished: true, homeScore: 4, awayScore: 3, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T11:30:00", opponent: "Baronie JO12-4", isHome: false, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T09:00:00", opponent: "Boeimeer JO12-2", isHome: true, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T09:00:00", opponent: "Madese Boys JO12-1", isHome: false, refereeSlug: "scheidsr-jansen" },
];

export const MATCH_SCHEDULE_JO12_2: SeedMatch[] = [
  { date: "2026-01-24T10:00:00", opponent: "Waspik JO12-1", isHome: true, finished: true, homeScore: 9, awayScore: 0, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-01-31T10:00:00", opponent: "TSC JO12-3", isHome: false, finished: true, homeScore: 4, awayScore: 7, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-07T10:00:00", opponent: "Viola JO12-1", isHome: true, finished: true, homeScore: 3, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-02-28T10:00:00", opponent: "SCO JO12-3", isHome: false, finished: true, homeScore: 2, awayScore: 1, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-07T11:30:00", opponent: "Beek Vooruit JO12-2", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-14T10:45:00", opponent: "Olympia'60 JO12-1", isHome: true, refereeSlug: "scheidsr-jansen" },
  { date: "2026-03-21T10:30:00", opponent: "Oosterhout JO12-3", isHome: false, refereeSlug: "scheidsr-bakker" },
];

export const MATCH_SCHEDULE_JO12_3: SeedMatch[] = [
  { date: "2026-01-31T10:00:00", opponent: "VOAB JO12-4", isHome: true, finished: true, homeScore: 2, awayScore: 6, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T10:00:00", opponent: "Gesta JO12-1JM", isHome: true, finished: true, homeScore: 6, awayScore: 3, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T10:00:00", opponent: "Oosterhout JO12-4", isHome: false, finished: true, homeScore: 6, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T09:00:00", opponent: "Bavel JO12-3", isHome: true, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T09:30:00", opponent: "Advendo JO12-1", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T10:45:00", opponent: "Unitas'30 JO12-6", isHome: true, refereeSlug: "scheidsr-jansen" },
];

export const MATCH_SCHEDULE_JO12_4: SeedMatch[] = [
  { date: "2026-01-31T10:00:00", opponent: "Sprundel JO12-2", isHome: true, finished: true, homeScore: 3, awayScore: 5, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T10:00:00", opponent: "DSE JO12-2", isHome: true, finished: true, homeScore: 1, awayScore: 5, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T10:00:00", opponent: "Baronie JO12-6", isHome: false, finished: true, homeScore: 4, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T09:00:00", opponent: "Boeimeer JO12-3", isHome: true, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T10:00:00", opponent: "Groen Wit JO12-4", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T09:00:00", opponent: "Unitas'30 JO12-8", isHome: true, refereeSlug: "scheidsr-jansen" },
];

/** Map team slug -> schedule for JO12 seed */
export const JO12_SCHEDULES: Record<string, SeedMatch[]> = {
  "jo12-1": MATCH_SCHEDULE_JO12_1,
  "jo12-2": MATCH_SCHEDULE_JO12_2,
  "jo12-3": MATCH_SCHEDULE_JO12_3,
  "jo12-4": MATCH_SCHEDULE_JO12_4,
};

/** Backwards compatibility: default schedule = JO12-1 */
export const MATCH_SCHEDULE: SeedMatch[] = MATCH_SCHEDULE_JO12_1;
