import type { Doc } from "../_generated/dataModel";

const ROSTER_ADD_STATUSES = [
  "scheduled",
  "lineup",
  "live",
  "halftime",
  "finished",
] as const;

export type RosterAddStatus = (typeof ROSTER_ADD_STATUSES)[number];

export function canAddPlayerToMatchStatus(status: string): boolean {
  return (ROSTER_ADD_STATUSES as readonly string[]).includes(status);
}

export function assertMatchAcceptsRosterAdd(status: string): void {
  if (!canAddPlayerToMatchStatus(status)) {
    throw new Error("Spelers kunnen niet worden toegevoegd aan deze wedstrijd");
  }
}

/** First quarter of the second half (2 halves → 2, 4 quarters → 3). */
export function secondHalfStartQuarter(quarterCount: number): number {
  if (quarterCount <= 1) return 1;
  return Math.floor(quarterCount / 2) + 1;
}

export function regulationMinuteAtQuarterStart(
  quarter: number,
  quarterCount: number,
  regulationDurationMinutes: number,
): number {
  if (quarterCount <= 0) return 0;
  const perQuarter = regulationDurationMinutes / quarterCount;
  return Math.max(0, Math.round((quarter - 1) * perQuarter));
}

export function remainingRegulationMinutes(
  fromQuarter: number,
  quarterCount: number,
  regulationDurationMinutes: number,
): number {
  const start = regulationMinuteAtQuarterStart(
    fromQuarter,
    quarterCount,
    regulationDurationMinutes,
  );
  return Math.max(0, regulationDurationMinutes - start);
}

/** Equal share of field-minutes among available players (one decimal). */
export function equalShareMinutes(
  onFieldCount: number,
  regulationMinutes: number,
  availablePlayerCount: number,
): number {
  if (onFieldCount <= 0 || regulationMinutes <= 0 || availablePlayerCount <= 0) {
    return 0;
  }
  const raw = (onFieldCount * regulationMinutes) / availablePlayerCount;
  return Math.round(raw * 10) / 10;
}

export function regulationEndClock(regulationMinutes: number): {
  displayMinute: number;
  gameSecond: number;
  matchMs: number;
  frozenClockMs: number;
} {
  const gameSecond = Math.max(0, regulationMinutes) * 60;
  const matchMs = gameSecond * 1000;
  return {
    displayMinute: Math.max(0, regulationMinutes),
    gameSecond,
    matchMs,
    frozenClockMs: matchMs,
  };
}

export function buildLateGuestMatchPlayer(args: {
  matchId: Doc<"matchPlayers">["matchId"];
  playerId: Doc<"matchPlayers">["playerId"];
  createdAt: number;
  minutesPlayed: number;
  lastSubbedInAt?: number;
}): Omit<Doc<"matchPlayers">, "_id" | "_creationTime"> {
  return {
    matchId: args.matchId,
    playerId: args.playerId,
    isKeeper: false,
    onField: true,
    minutesPlayed: args.minutesPlayed,
    lastSubbedInAt: args.lastSubbedInAt,
    createdAt: args.createdAt,
  };
}
