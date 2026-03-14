/**
 * Static seed configuration — coaches, referees, teams, schedule.
 *
 * All data is defined here so it can be reviewed and updated in one place.
 */

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
  email?: string;
  teamSlugs: string[];
}

/** Coaches for all four JO12 teams (from DIA leiders en trainers 25-26) */
export const COACH_CONFIGS: SeedCoach[] = [
  { name: "Remco", email: "remco@example.com", teamSlugs: ["jo12-1"] },
  { name: "Remco Hendriks", email: "remco.hendriks@example.com", teamSlugs: ["jo12-1"] },
  { name: "Martin Nieuwenhuizen", email: "martin.nieuwenhuizen@example.com", teamSlugs: ["jo12-1"] },
  { name: "Mike ten Hoonte", email: "mike.tenhoonte@example.com", teamSlugs: ["jo12-1"] },
  { name: "Serdar Sarica", email: "serdar.sarica@example.com", teamSlugs: ["jo12-1"] },
  { name: "Marcel Harreman", email: "marcel.harreman@example.com", teamSlugs: ["jo12-2"] },
  { name: "Bas Kock", email: "bas.kock@example.com", teamSlugs: ["jo12-2"] },
  { name: "Kriste Berkhout", email: "kriste.berkhout@example.com", teamSlugs: ["jo12-2"] },
  { name: "Marc Lauwerys", email: "marc.lauwerys@example.com", teamSlugs: ["jo12-3"] },
  { name: "Armin Hasanovic", email: "armin.hasanovic@example.com", teamSlugs: ["jo12-3"] },
  { name: "Emiel Deckers", email: "emiel.deckers@example.com", teamSlugs: ["jo12-3"] },
  { name: "Patrick van der Velden", email: "patrick.vandervelden@example.com", teamSlugs: ["jo12-4"] },
  { name: "Jacky Musters", email: "jacky.musters@example.com", teamSlugs: ["jo12-4"] },
  { name: "Tim Gregoor", email: "tim.gregoor@example.com", teamSlugs: ["jo12-4"] },
];

/** Referee seed config */
export interface SeedReferee {
  name: string;
  email?: string;
}

export const REFEREE_CONFIGS: SeedReferee[] = [
  { name: "Scheidsr. De Vries", email: "ref.devries@example.com" },
  { name: "Scheidsr. Jansen", email: "ref.jansen@example.com" },
  { name: "Scheidsr. Bakker", email: "ref.bakker@example.com" },
  { name: "Scheidsr. Visser", email: "ref.visser@example.com" },
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

/** Per-team match schedules. Tijden staan 1 uur eerder (UTC); app toont ze als NL (UTC+1). */
export const MATCH_SCHEDULE_JO12_1: SeedMatch[] = [
  { date: "2026-01-31T09:00:00.000Z", opponent: "VOAB JO12-2", isHome: false, finished: true, homeScore: 4, awayScore: 5, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T09:00:00.000Z", opponent: "Terheijden JO12-1", isHome: true, finished: true, homeScore: 3, awayScore: 6, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T09:00:00.000Z", opponent: "Oosterhout JO12-2", isHome: false, finished: true, homeScore: 4, awayScore: 3, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T10:30:00.000Z", opponent: "Baronie JO12-4", isHome: false, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T08:00:00.000Z", opponent: "Boeimeer JO12-2", isHome: true, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T08:00:00.000Z", opponent: "Madese Boys JO12-1", isHome: false, refereeSlug: "scheidsr-jansen" },
];

export const MATCH_SCHEDULE_JO12_2: SeedMatch[] = [
  { date: "2026-01-24T09:00:00.000Z", opponent: "Waspik JO12-1", isHome: true, finished: true, homeScore: 9, awayScore: 0, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-01-31T09:00:00.000Z", opponent: "TSC JO12-3", isHome: false, finished: true, homeScore: 4, awayScore: 7, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-07T09:00:00.000Z", opponent: "Viola JO12-1", isHome: true, finished: true, homeScore: 3, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-02-28T09:00:00.000Z", opponent: "SCO JO12-3", isHome: false, finished: true, homeScore: 2, awayScore: 1, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-07T10:30:00.000Z", opponent: "Beek Vooruit JO12-2", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-14T09:45:00.000Z", opponent: "Olympia'60 JO12-1", isHome: true, refereeSlug: "scheidsr-jansen" },
  { date: "2026-03-21T09:30:00.000Z", opponent: "Oosterhout JO12-3", isHome: false, refereeSlug: "scheidsr-bakker" },
];

export const MATCH_SCHEDULE_JO12_3: SeedMatch[] = [
  { date: "2026-01-31T09:00:00.000Z", opponent: "VOAB JO12-4", isHome: true, finished: true, homeScore: 2, awayScore: 6, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T09:00:00.000Z", opponent: "Gesta JO12-1JM", isHome: true, finished: true, homeScore: 6, awayScore: 3, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T09:00:00.000Z", opponent: "Oosterhout JO12-4", isHome: false, finished: true, homeScore: 6, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T08:00:00.000Z", opponent: "Bavel JO12-3", isHome: true, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T08:30:00.000Z", opponent: "Advendo JO12-1", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T09:45:00.000Z", opponent: "Unitas'30 JO12-6", isHome: true, refereeSlug: "scheidsr-jansen" },
];

export const MATCH_SCHEDULE_JO12_4: SeedMatch[] = [
  { date: "2026-01-31T09:00:00.000Z", opponent: "Sprundel JO12-2", isHome: true, finished: true, homeScore: 3, awayScore: 5, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-02-07T09:00:00.000Z", opponent: "DSE JO12-2", isHome: true, finished: true, homeScore: 1, awayScore: 5, refereeSlug: "scheidsr-jansen" },
  { date: "2026-02-28T09:00:00.000Z", opponent: "Baronie JO12-6", isHome: false, finished: true, homeScore: 4, awayScore: 2, refereeSlug: "scheidsr-bakker" },
  { date: "2026-03-07T08:00:00.000Z", opponent: "Boeimeer JO12-3", isHome: true, refereeSlug: "scheidsr-visser" },
  { date: "2026-03-14T09:00:00.000Z", opponent: "Groen Wit JO12-4", isHome: false, refereeSlug: "scheidsr-de-vries" },
  { date: "2026-03-21T08:00:00.000Z", opponent: "Unitas'30 JO12-8", isHome: true, refereeSlug: "scheidsr-jansen" },
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
