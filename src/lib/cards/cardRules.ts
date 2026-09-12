/** O13 Cat A/B tijdstraf notes and countdown helpers. */

export type CardType = "yellow_card" | "red_card";

export type CardResolution = {
  eventType: CardType;
  note: string;
  alsoYellow?: boolean;
};

export const YELLOW_PENALTY_MS = 5 * 60 * 1000;
export const SECOND_YELLOW_REPLACE_MS = 5 * 60 * 1000;
export const DIRECT_RED_REPLACE_MS = 10 * 60 * 1000;
/** Keep a short "ready" banner after the timer hits zero. */
export const PENALTY_READY_GRACE_MS = 60 * 1000;

/** Yellow = 5 min; second yellow / direct red = sent off, replace after 5 / 10 min. */
export function cardNoteFor(
  requested: CardType,
  priorYellows: number
): CardResolution {
  if (requested === "yellow_card" && priorYellows >= 1) {
    return {
      eventType: "red_card",
      alsoYellow: true,
      note: "2x geel · uitsluiting · vervangen na 5 min",
    };
  }
  if (requested === "yellow_card") {
    return {
      eventType: "yellow_card",
      note: "gele kaart · tijdstraf 5 min",
    };
  }
  return {
    eventType: "red_card",
    note: "direct rood · uitsluiting · vervangen na 10 min",
  };
}

/** Opponent cards are logged for the timeline only (no time-penalty notes). */
export function opponentCardNote(requested: CardType): CardResolution {
  if (requested === "yellow_card") {
    return { eventType: "yellow_card", note: "tegenstander · geel" };
  }
  return { eventType: "red_card", note: "tegenstander · rood" };
}

export type TimePenaltyKind = "sit_out" | "replace_wait";

export type CardEventLike = {
  type: string;
  playerId?: string;
  playerName?: string;
  note?: string;
  timestamp: number;
  isOpponentCard?: boolean;
};

export type ActiveTimePenalty = {
  playerId: string;
  playerName: string;
  kind: TimePenaltyKind;
  cardType: CardType;
  startedAt: number;
  durationMs: number;
  endsAt: number;
  remainingMs: number;
  frozen: boolean;
  /** True when timer finished but still within grace window. */
  ready: boolean;
};

export function penaltyDurationMs(
  cardType: CardType,
  note?: string
): number | null {
  if (cardType === "yellow_card") {
    if (note === "tweede gele kaart") return null;
    return YELLOW_PENALTY_MS;
  }
  if (note?.includes("2x geel") || note?.includes("na 5 min")) {
    return SECOND_YELLOW_REPLACE_MS;
  }
  return DIRECT_RED_REPLACE_MS;
}

export function penaltyKindFor(
  cardType: CardType,
  note?: string
): TimePenaltyKind | null {
  if (cardType === "yellow_card") {
    if (note === "tweede gele kaart") return null;
    return "sit_out";
  }
  if (cardType === "red_card") return "replace_wait";
  return null;
}

/** Freeze countdown during pause, active stoppage, or half-time. */
export function matchPenaltyClockNow(
  now: number,
  match: {
    status: string;
    pausedAt?: number;
    activeStoppageStartedAt?: number;
    halftimeStartedAt?: number;
  }
): { clockNow: number; frozen: boolean } {
  if (match.status === "halftime") {
    return {
      clockNow: match.halftimeStartedAt ?? now,
      frozen: true,
    };
  }
  if (match.status !== "live") {
    return { clockNow: now, frozen: false };
  }
  const freezeAt = match.pausedAt ?? match.activeStoppageStartedAt;
  if (freezeAt != null) {
    return { clockNow: Math.min(now, freezeAt), frozen: true };
  }
  return { clockNow: now, frozen: false };
}

export function deriveActiveTimePenalties(
  events: ReadonlyArray<CardEventLike>,
  clockNow: number,
  frozen: boolean,
  graceMs: number = PENALTY_READY_GRACE_MS
): ActiveTimePenalty[] {
  const out: ActiveTimePenalty[] = [];

  for (const event of events) {
    if (event.type !== "yellow_card" && event.type !== "red_card") continue;
    if (event.isOpponentCard) continue;
    if (!event.playerId) continue;
    const cardType = event.type;
    const kind = penaltyKindFor(cardType, event.note);
    const durationMs = penaltyDurationMs(cardType, event.note);
    if (!kind || durationMs == null) continue;

    const endsAt = event.timestamp + durationMs;
    const remainingMs = endsAt - clockNow;
    if (remainingMs > 0) {
      out.push({
        playerId: event.playerId,
        playerName: event.playerName?.trim() || "Speler",
        kind,
        cardType,
        startedAt: event.timestamp,
        durationMs,
        endsAt,
        remainingMs,
        frozen,
        ready: false,
      });
      continue;
    }
    if (clockNow - endsAt <= graceMs) {
      out.push({
        playerId: event.playerId,
        playerName: event.playerName?.trim() || "Speler",
        kind,
        cardType,
        startedAt: event.timestamp,
        durationMs,
        endsAt,
        remainingMs: 0,
        frozen,
        ready: true,
      });
    }
  }

  return out.sort((a, b) => a.endsAt - b.endsAt);
}

export function formatPenaltyCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export type DisciplineBadge = "yellow" | "red";

/** Own-team card status for UI badges on player shields (red wins over yellow). */
export function disciplineBadgeByPlayerId(
  events: ReadonlyArray<{
    type: string;
    playerId?: string;
    isOpponentCard?: boolean;
  }>
): Map<string, DisciplineBadge> {
  const yellowCounts = new Map<string, number>();
  const redIds = new Set<string>();

  for (const event of events) {
    if (event.isOpponentCard || !event.playerId) continue;
    if (event.type === "yellow_card") {
      yellowCounts.set(
        event.playerId,
        (yellowCounts.get(event.playerId) ?? 0) + 1
      );
      continue;
    }
    if (event.type === "red_card") {
      redIds.add(event.playerId);
    }
  }

  const out = new Map<string, DisciplineBadge>();
  for (const [playerId, count] of yellowCounts) {
    if (!redIds.has(playerId) && count >= 1) {
      out.set(playerId, "yellow");
    }
  }
  for (const playerId of redIds) {
    out.set(playerId, "red");
  }
  return out;
}
