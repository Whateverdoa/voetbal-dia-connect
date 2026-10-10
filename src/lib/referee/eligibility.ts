/**
 * Shared eligibility + overlap helpers for referee pool claims.
 */
import {
  deriveMatchQualificationTags,
  getQualificationState,
} from "../admin/assignmentBoard";

export function isQualificationEligible(
  teamName: string,
  quarterCount: number,
  refereeTags?: string[] | null
): boolean {
  const matchTags = deriveMatchQualificationTags(teamName, quarterCount);
  return getQualificationState(matchTags, refereeTags) === "geschikt";
}

export function matchIntervalMs(
  scheduledAt: number,
  regulationDurationMinutes?: number
): { start: number; end: number } {
  const durationMs = (regulationDurationMinutes ?? 60) * 60 * 1000;
  return { start: scheduledAt, end: scheduledAt + durationMs };
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function hasScheduleOverlap(
  candidate: { scheduledAt: number; regulationDurationMinutes?: number },
  existing: Array<{
    scheduledAt?: number;
    regulationDurationMinutes?: number;
  }>
): boolean {
  const cand = matchIntervalMs(
    candidate.scheduledAt,
    candidate.regulationDurationMinutes
  );
  for (const match of existing) {
    if (match.scheduledAt === undefined) continue;
    const other = matchIntervalMs(
      match.scheduledAt,
      match.regulationDurationMinutes
    );
    if (intervalsOverlap(cand.start, cand.end, other.start, other.end)) {
      return true;
    }
  }
  return false;
}
