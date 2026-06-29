import { resolveRegulationMinutes } from "./matchTiming";

type MatchTimingSnapshot = {
  quarterCount: number;
  regulationDurationMinutes?: number;
};

export function getBreakMinutesAfterQuarter(
  match: MatchTimingSnapshot,
  completedQuarter: number
): number | null {
  const regulationMinutes = resolveRegulationMinutes(match);

  if (match.quarterCount === 4 && regulationMinutes === 60) {
    if (completedQuarter === 1 || completedQuarter === 3) return 3;
    if (completedQuarter === 2) return 15;
    return null;
  }

  if (match.quarterCount === 2 && completedQuarter === 1) {
    return 15;
  }

  return null;
}
