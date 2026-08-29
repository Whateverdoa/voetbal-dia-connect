/**
 * Football season helpers (July–June, Europe/Amsterdam conceptually).
 * Pure functions — safe to call from mutations and from the client.
 */

/** Season start month (0-indexed): July = 6. */
const SEASON_START_MONTH = 6;

/**
 * Compute season key from a UTC/epoch timestamp.
 * Example: 2026-03-15 → "2025-2026"; 2026-08-01 → "2026-2027".
 */
export function seasonKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** Active season key for a given "now" timestamp (pass from client / mutation). */
export function activeSeasonKey(nowMs: number): string {
  return seasonKeyFromMs(nowMs);
}

/** Keep match if it has no seasonKey (legacy) or matches the active season. */
export function isActiveSeasonMatch(
  match: { seasonKey?: string },
  activeKey: string
): boolean {
  if (!match.seasonKey) return true;
  return match.seasonKey === activeKey;
}
