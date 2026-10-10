/**
 * Chronological plan order: quarter → minute → sequence → id.
 * Boundary rows (quarter set, no minute) sort before timed rows in that quarter.
 */
export function comparePlanTiming(
  a: {
    sequence: number;
    _id: string;
    targetQuarter?: number | null;
    targetMinute?: number | null;
  },
  b: {
    sequence: number;
    _id: string;
    targetQuarter?: number | null;
    targetMinute?: number | null;
  }
): number {
  const qa = a.targetQuarter ?? Number.POSITIVE_INFINITY;
  const qb = b.targetQuarter ?? Number.POSITIVE_INFINITY;
  if (qa !== qb) return qa - qb;

  const ma = a.targetMinute ?? -1;
  const mb = b.targetMinute ?? -1;
  if (ma !== mb) return ma - mb;

  return a.sequence - b.sequence || String(a._id).localeCompare(String(b._id));
}
