import type { StandingRow } from "../import/sportlinkStandingsMapper";

export const STANDINGS_POLL_INTERVAL_MS = 15 * 60_000;
export const STANDINGS_POLL_LEASE_MS = 10 * 60_000;
export const MAX_STANDINGS_TEAMS = 500;

export type StandingsPollWindow = {
  amsterdamDate: string;
  slot: number;
  maxAttempts: number;
};

/** Daily budgets remain visible to monitoring after that day's window closes. */
export function maxStandingsPollAttemptsForDay(now: number): number {
  if (!Number.isFinite(now)) return 0;
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
  }).format(new Date(now));
  if (day === "Sun" || day === "Sat") return 44;
  return day === "Mon" || day === "Wed" ? 1 : 0;
}

function attemptsForWindow(now: number): number | null {
  const date = new Date(now);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  if ((day === 0 || day === 6) && hour >= 10 && hour <= 20) return 44;
  if (date.getUTCMinutes() >= 15) return null;
  if (day === 1 && hour === 10) return 1;
  if (day === 3 && hour === 20) return 1;
  return null;
}

/** UTC windows match the cron schedule; attempt budgets reset by Amsterdam date. */
export function getStandingsPollWindow(now: number): StandingsPollWindow | null {
  if (!Number.isFinite(now)) return null;
  const maxAttempts = attemptsForWindow(now);
  if (maxAttempts === null) return null;
  return {
    amsterdamDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now)),
    slot: Math.floor(now / STANDINGS_POLL_INTERVAL_MS),
    maxAttempts,
  };
}

/** Next scheduled boundary, never the current slot or a time in the past. */
export function nextStandingsPollAt(now: number): number {
  if (!Number.isFinite(now)) throw new Error("Ongeldige tijd voor standencontrole");
  const firstSlot = Math.floor(now / STANDINGS_POLL_INTERVAL_MS) + 1;
  for (let offset = 0; offset < 8 * 24 * 4; offset++) {
    const candidate = (firstSlot + offset) * STANDINGS_POLL_INTERVAL_MS;
    if (attemptsForWindow(candidate) !== null) return candidate;
  }
  throw new Error("Geen volgend controlemoment gevonden");
}

type StandingContent = {
  poulecode: string;
  competitionName: string;
  klassepoule: string;
  sportlinkTeamName: string;
  rows: readonly StandingRow[];
};

/** Compare table contents independently of signed logo URLs and source row order. */
export function standingContentFingerprint(standing: StandingContent): string {
  const rows = standing.rows.map((row) => ({
    position: row.position,
    teamName: row.teamName,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
    isOwnClub: row.isOwnClub,
  }));
  rows.sort((left, right) => {
    const leftKey = JSON.stringify(left);
    const rightKey = JSON.stringify(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return JSON.stringify({
    poulecode: standing.poulecode,
    competitionName: standing.competitionName,
    klassepoule: standing.klassepoule,
    sportlinkTeamName: standing.sportlinkTeamName,
    rows,
  });
}
