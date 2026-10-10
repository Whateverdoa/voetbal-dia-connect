/**
 * Shared season helpers for frontend (mirrors convex/lib/season.ts).
 */

const SEASON_START_MONTH = 6;

export function seasonKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function activeSeasonKey(nowMs: number = Date.now()): string {
  return seasonKeyFromMs(nowMs);
}

export function isActiveSeasonMatch(
  match: { seasonKey?: string; scheduledAt?: number; createdAt?: number },
  activeKey: string
): boolean {
  const inferredFrom = match.scheduledAt ?? match.createdAt;
  const key =
    match.seasonKey ??
    (inferredFrom != null ? seasonKeyFromMs(inferredFrom) : undefined);
  if (!key) return false;
  return key === activeKey;
}
