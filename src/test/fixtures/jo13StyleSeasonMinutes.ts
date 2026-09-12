/**
 * Uneven season-minutes pattern inspired by JO13-2 (not real roster data).
 * Used only in tests / TEST Sandbox planning scenarios.
 */
export const JO13_STYLE_SEASON_MINUTES: Record<string, number> = {
  "test-1": 420,
  "test-2": 390,
  "test-3": 360,
  "test-4": 340,
  "test-5": 310,
  "test-6": 280,
  "test-7": 250,
  "test-8": 220,
  "test-9": 180,
  "test-10": 150,
  "test-11": 120,
  "test-12": 90,
  "test-13": 60,
  "test-14": 30,
};

/** Players with lowest season minutes first (fairness helper for plan tests). */
export function playersByFewestMinutes(
  playerIds: string[],
  minutesByPlayerId: Record<string, number> = JO13_STYLE_SEASON_MINUTES
): string[] {
  return [...playerIds].sort(
    (a, b) => (minutesByPlayerId[a] ?? 0) - (minutesByPlayerId[b] ?? 0)
  );
}
