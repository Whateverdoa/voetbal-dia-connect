import type { DemoMatch, DemoState } from "./types";

export interface LocalRosterMatch {
  id: string;
  opponent: string;
  scheduledAt: number;
  isHome: boolean;
  status: "scheduled" | "lineup" | "live" | "halftime" | "finished";
  homeScore: number;
  awayScore: number;
  participantIds: string[];
}

export interface LocalRosterStandings {
  competitionName: string;
  klassepoule: string;
  sportlinkTeamName: string;
  fetchedAt: number;
  rows: Array<{
    position: number;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }>;
}

/** Minimal local snapshot: deliberately excludes contact, assessment and family data. */
export interface LocalDemoRoster {
  version: 1;
  teamSlug: "jo13-2";
  importedAt: string;
  players: Array<{
    id: string;
    name: string;
    number: number | null;
    position: string;
  }>;
  matches?: LocalRosterMatch[];
  standings?: LocalRosterStandings | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(text) ? text : null;
}

const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
const wholeNumber = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const timestamp = (value: unknown): value is number => wholeNumber(value) && Number.isFinite(new Date(value).getTime());
const matchStatuses: readonly LocalRosterMatch["status"][] = ["scheduled", "lineup", "live", "halftime", "finished"];

function parseMatches(value: unknown): LocalRosterMatch[] | null {
  if (!Array.isArray(value) || value.length > 1000) return null;
  const matches: LocalRosterMatch[] = [];
  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row) || !validId(row.id) || ids.has(row.id)) return null;
    const opponent = cleanText(row.opponent, 150);
    if (!opponent || !timestamp(row.scheduledAt) || typeof row.isHome !== "boolean" || typeof row.status !== "string" || !matchStatuses.includes(row.status as LocalRosterMatch["status"])) return null;
    if (!wholeNumber(row.homeScore) || !wholeNumber(row.awayScore) || !Array.isArray(row.participantIds) || !row.participantIds.every(validId) || new Set(row.participantIds).size !== row.participantIds.length) return null;
    ids.add(row.id);
    matches.push({
      id: row.id, opponent, scheduledAt: row.scheduledAt, isHome: row.isHome,
      status: row.status as LocalRosterMatch["status"], homeScore: row.homeScore, awayScore: row.awayScore,
      participantIds: [...row.participantIds],
    });
  }
  return matches;
}

function parseStandings(value: unknown): LocalRosterStandings | null {
  if (!isRecord(value)) return null;
  const competitionName = cleanText(value.competitionName, 200);
  const klassepoule = cleanText(value.klassepoule, 100);
  const sportlinkTeamName = cleanText(value.sportlinkTeamName, 150);
  if (!competitionName || !klassepoule || !sportlinkTeamName || !timestamp(value.fetchedAt) || !Array.isArray(value.rows) || value.rows.length > 100) return null;
  const rows: LocalRosterStandings["rows"] = [];
  for (const row of value.rows) {
    if (!isRecord(row)) return null;
    const teamName = cleanText(row.teamName, 150);
    if (!teamName || !wholeNumber(row.position) || row.position === 0 || !wholeNumber(row.played) || !wholeNumber(row.won) || !wholeNumber(row.drawn) || !wholeNumber(row.lost) || !wholeNumber(row.goalsFor) || !wholeNumber(row.goalsAgainst) || !wholeNumber(row.points) || typeof row.goalDifference !== "number" || !Number.isSafeInteger(row.goalDifference)) return null;
    rows.push({ position: row.position, teamName, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference, points: row.points });
  }
  return { competitionName, klassepoule, sportlinkTeamName, fetchedAt: value.fetchedAt, rows };
}

/** Parse untrusted local data and retain only the fields the demo needs. */
export function parseLocalDemoRoster(value: unknown): LocalDemoRoster | null {
  if (!isRecord(value) || value.version !== 1 || value.teamSlug !== "jo13-2") return null;
  if (typeof value.importedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.importedAt) || !Number.isFinite(Date.parse(value.importedAt))) return null;
  if (!Array.isArray(value.players) || value.players.length === 0 || value.players.length > 60) return null;

  const players: LocalDemoRoster["players"] = [];
  const ids = new Set<string>();
  for (const row of value.players) {
    if (!isRecord(row)) return null;
    const id = cleanText(row.id, 100);
    const name = cleanText(row.name, 100);
    const position = typeof row.position === "string" && row.position.trim() === "" ? "" : cleanText(row.position, 80);
    if (!id || !validId(id) || ids.has(id) || !name || position === null) return null;
    if (row.number !== null && (typeof row.number !== "number" || !Number.isInteger(row.number) || row.number < 1 || row.number > 99)) return null;
    ids.add(id);
    players.push({ id, name, position, number: row.number });
  }
  const roster: LocalDemoRoster = { version: 1, teamSlug: "jo13-2", importedAt: value.importedAt, players };
  if (value.matches !== undefined) {
    const matches = parseMatches(value.matches);
    if (!matches) return null;
    roster.matches = matches;
  }
  if (value.standings !== undefined) {
    const standings = value.standings === null ? null : parseStandings(value.standings);
    if (value.standings !== null && !standings) return null;
    roster.standings = standings;
  }
  return roster;
}

const positions: Record<string, string> = {
  GK: "Keeper", CB: "Centrale verdediger", LB: "Linker verdediger", RB: "Rechter verdediger",
  CDM: "Verdedigende middenvelder", CM: "Centrale middenvelder", CAM: "Aanvallende middenvelder",
  LM: "Linker middenvelder", RM: "Rechter middenvelder", LW: "Linker aanvaller", RW: "Rechter aanvaller", ST: "Spits",
};

function rosterMatches(roster: LocalDemoRoster): DemoMatch[] {
  const playerIds = new Set(roster.players.map((player) => player.id));
  const date = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });
  const matches: DemoMatch[] = (roster.matches ?? [])
    .filter((match) => match.status === "finished")
    .slice().sort((a, b) => b.scheduledAt - a.scheduledAt)
    .map((match) => ({
      id: match.id,
      opponent: match.opponent,
      dateLabel: `${date.format(match.scheduledAt)} · ${match.isHome ? "Thuis" : "Uit"}`,
      score: `${match.isHome ? match.homeScore : match.awayScore} – ${match.isHome ? match.awayScore : match.homeScore}`,
      phase: "preparing",
      participantIds: match.participantIds.filter((id) => playerIds.has(id)),
    }));
  return matches.length > 0 ? matches : [{
    id: "m1", opponent: "Demo-tegenstander", dateLabel: "Testwedstrijd · geen echte uitslag", score: "—",
    phase: "preparing", participantIds: roster.players.map((player) => player.id),
  }];
}

/** Start with real identities and no invented claims about a player or a match. */
export function createRosterDemoState(roster: LocalDemoRoster): DemoState {
  return {
    version: 1,
    players: roster.players.map((player) => ({ ...player, position: positions[player.position] ?? (player.position || "Positie nog niet ingevuld"), qualities: [], motto: "" })),
    guardians: roster.players.map((player) => ({
      id: `parent-${player.id}`,
      name: `Oudersimulatie · ${player.name}`,
      childrenIds: [player.id],
    })),
    matches: rosterMatches(roster),
    feedback: [],
    playerReviews: [],
    observationsEnabled: false,
    observations: [],
    highlights: [],
    votes: [],
  };
}
