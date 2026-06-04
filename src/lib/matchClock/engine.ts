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
  if (snapshot.status === "halftime" || snapshot.status === "finished") {
    return snapshot.frozenClockMs ?? null;
  }

  if (snapshot.status !== "live" || snapshot.quarterStartedAt == null) {
    return null;
  }

  const quarterElapsedMs = Math.max(0, now - snapshot.quarterStartedAt);
  return getQuarterBaseMs(snapshot) + quarterElapsedMs;
}
