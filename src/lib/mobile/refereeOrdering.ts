type OfferOrderable = {
  status: string;
  expiresAt: number;
  sentAt: number;
};

type AssignmentOrderable = {
  status: string;
  confirmedAt: number;
  match: { scheduledAt: number | null };
};

export type AssignmentDateRange = {
  from?: number;
  to?: number;
};

function offerPriority(status: string) {
  if (status === "pending") return 0;
  if (status === "accepted") return 1;
  return 2;
}

export function sortRefereeOffersByUrgency<T extends OfferOrderable>(
  offers: readonly T[]
) {
  return [...offers].sort((left, right) => {
    const priorityDifference =
      offerPriority(left.status) - offerPriority(right.status);
    if (priorityDifference !== 0) return priorityDifference;
    if (left.status === "pending") return left.expiresAt - right.expiresAt;
    return right.sentAt - left.sentAt;
  });
}

function assignmentPriority(
  assignment: AssignmentOrderable,
  now: number
) {
  if (assignment.status !== "confirmed") return 3;
  if (assignment.match.scheduledAt === null) return 1;
  return assignment.match.scheduledAt >= now ? 0 : 2;
}

export function sortRefereeAssignmentsForList<T extends AssignmentOrderable>(
  assignments: readonly T[],
  now = Date.now()
) {
  return [...assignments].sort((left, right) => {
    const leftPriority = assignmentPriority(left, now);
    const rightPriority = assignmentPriority(right, now);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftScheduledAt = left.match.scheduledAt;
    const rightScheduledAt = right.match.scheduledAt;
    if (leftPriority === 0) {
      return (leftScheduledAt ?? Number.MAX_SAFE_INTEGER) -
        (rightScheduledAt ?? Number.MAX_SAFE_INTEGER);
    }
    return (
      (rightScheduledAt ?? right.confirmedAt) -
      (leftScheduledAt ?? left.confirmedAt)
    );
  });
}

export function filterRefereeAssignmentsByRange<T extends AssignmentOrderable>(
  assignments: readonly T[],
  range: AssignmentDateRange
) {
  if (range.from === undefined && range.to === undefined) return [...assignments];
  return assignments.filter((assignment) => {
    const scheduledAt = assignment.match.scheduledAt;
    if (scheduledAt === null) return false;
    if (range.from !== undefined && scheduledAt < range.from) return false;
    if (range.to !== undefined && scheduledAt > range.to) return false;
    return true;
  });
}
