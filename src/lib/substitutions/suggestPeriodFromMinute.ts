/**
 * Map a match minute onto helft/kwart for wisselplan timing.
 * Boundary minutes belong to the later period (e.g. 30' → H2 on a 60' match).
 */
export function suggestPeriodFromMinute(
  minute: number,
  quarterCount: number,
  regulationDurationMinutes = 60
): number {
  if (!Number.isFinite(minute) || minute < 0) return 1;
  if (quarterCount <= 1) return 1;
  if (!Number.isFinite(regulationDurationMinutes) || regulationDurationMinutes <= 0) {
    return 1;
  }
  const perPeriod = regulationDurationMinutes / quarterCount;
  if (perPeriod <= 0) return 1;
  const period = Math.floor(minute / perPeriod) + 1;
  return Math.min(quarterCount, Math.max(1, period));
}

/** Short chip label: H1 / H2 or K1…K4. */
export function periodChipLabel(period: number, quarterCount: number): string {
  const prefix = quarterCount === 2 ? "H" : "K";
  return `${prefix}${period}`;
}
