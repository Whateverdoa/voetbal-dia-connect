import { guardOfficialClock, playingElapsedMs } from "../../../convex/lib/officialMatchClock";
import type { MatchClockSnapshot } from "./types";

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatWallTime(date: Date, options: { seconds?: boolean } = {}): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    ...(options.seconds ? { second: "2-digit" as const } : {}),
  });
}

export function getQuarterBaseMs(snapshot: Pick<
  MatchClockSnapshot,
  "currentQuarter" | "quarterCount" | "regulationDurationMinutes"
>): number {
  const regulationMinutes = snapshot.regulationDurationMinutes ?? 60;
  const quarterDurationMs =
    (regulationMinutes * 60 * 1000) / Math.max(1, snapshot.quarterCount);
  return Math.max(0, snapshot.currentQuarter - 1) * quarterDurationMs;
}

export function computeElapsedMs(snapshot: MatchClockSnapshot, now: number): number | null {
  if (snapshot.refereeClock) {
    const actual = computeActualElapsedMs(snapshot, now);
    const anchor = snapshot.refereeClock.periodStartedElapsedMs;
    if (actual === null || anchor === undefined) return null;
    if (snapshot.status === "halftime") {
      return Math.min(snapshot.currentQuarter, snapshot.quarterCount - 1) *
        ((snapshot.regulationDurationMinutes ?? 60) / snapshot.quarterCount) * 60_000;
    }
    return getQuarterBaseMs(snapshot) + Math.max(0, actual - anchor);
  }
  if (snapshot.status === "halftime" || snapshot.status === "finished") {
    return snapshot.frozenClockMs ?? null;
  }

  if (snapshot.status !== "live" || snapshot.quarterStartedAt == null) {
    return null;
  }

  const quarterElapsedMs = Math.max(0, now - snapshot.quarterStartedAt);
  return getQuarterBaseMs(snapshot) + quarterElapsedMs;
}

/** Actual play is separate from nominal football-clock presentation. */
export function computeActualElapsedMs(snapshot: MatchClockSnapshot, now: number): number | null {
  const clock = snapshot.refereeClock;
  if (!clock) return computeElapsedMs(snapshot, now);
  if (clock.clockReviewReason === "unknown_anchor") return null;
  const source = { ...clock, status: snapshot.status === "halftime" ? "break" : snapshot.status,
    period: snapshot.currentQuarter, periodCount: snapshot.quarterCount,
    periodMinutes: (snapshot.regulationDurationMinutes ?? 60) / snapshot.quarterCount };
  // Validate even a finished snapshot; missing anchors must not fabricate a clock.
  if (guardOfficialClock({ ...source, status: "live" }, now).state.clockReviewReason === "unknown_anchor") return null;
  return playingElapsedMs(guardOfficialClock(source, now).state, now);
}
