import {
  signalQuarterExtraMinute,
  signalQuarterNominalEnd,
} from "./clockSignals";
import { getQuarterBaseMs } from "./engine";
import type { MatchClockSnapshot } from "./types";

export type QuarterReminderKind = "nominal" | "extra_1" | "extra_2";

export function getQuarterDurationMs(
  snapshot: Pick<MatchClockSnapshot, "quarterCount" | "regulationDurationMinutes">
): number {
  const regulationMinutes = snapshot.regulationDurationMinutes ?? 60;
  return (regulationMinutes * 60 * 1000) / Math.max(1, snapshot.quarterCount);
}

export function getNominalQuarterEndMs(
  snapshot: Pick<
    MatchClockSnapshot,
    "currentQuarter" | "quarterCount" | "regulationDurationMinutes"
  >
): number {
  return getQuarterBaseMs(snapshot) + getQuarterDurationMs(snapshot);
}

export function getExtraMinutesPastNominal(
  elapsedMs: number,
  nominalEndMs: number
): number {
  if (elapsedMs < nominalEndMs) return 0;
  return Math.floor((elapsedMs - nominalEndMs) / 60_000);
}

export function quarterReminderKey(
  quarter: number,
  kind: QuarterReminderKind
): string {
  return `${quarter}:${kind}`;
}

export function buildQuarterReminderMessage(
  kind: QuarterReminderKind,
  currentQuarter: number,
  quarterCount: number
): string {
  const periodLabel = quarterCount === 2 ? "helft" : "kwart";
  const periodTitle = quarterCount === 2 ? "Helft" : "Kwart";

  switch (kind) {
    case "nominal":
      return `${periodTitle} ${currentQuarter} is af — tik op Einde ${periodLabel} ${currentQuarter}`;
    case "extra_1":
      return `1 minuut extra — bevestig einde ${periodLabel} ${currentQuarter}`;
    case "extra_2":
      return `2 minuten extra — bevestig einde ${periodLabel} ${currentQuarter}`;
  }
}

/** Returns the next reminder that should fire, at most one per evaluation. */
export function detectNextQuarterReminder(
  elapsedMs: number | null,
  snapshot: MatchClockSnapshot,
  fired: ReadonlySet<string>
): QuarterReminderKind | null {
  if (
    snapshot.status !== "live" ||
    snapshot.quarterStartedAt == null ||
    elapsedMs == null
  ) {
    return null;
  }

  const quarter = snapshot.currentQuarter;
  const nominalEndMs = getNominalQuarterEndMs(snapshot);

  if (
    elapsedMs >= nominalEndMs &&
    !fired.has(quarterReminderKey(quarter, "nominal"))
  ) {
    return "nominal";
  }

  const extraMinutes = getExtraMinutesPastNominal(elapsedMs, nominalEndMs);

  if (
    extraMinutes >= 2 &&
    !fired.has(quarterReminderKey(quarter, "extra_2"))
  ) {
    return "extra_2";
  }

  if (
    extraMinutes >= 1 &&
    !fired.has(quarterReminderKey(quarter, "extra_1"))
  ) {
    return "extra_1";
  }

  return null;
}

export function fireQuarterReminderSignal(kind: QuarterReminderKind): void {
  if (kind === "nominal") {
    signalQuarterNominalEnd();
    return;
  }
  signalQuarterExtraMinute();
}
