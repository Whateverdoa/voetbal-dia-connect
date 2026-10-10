/**
 * XP / level / rarity thresholds for selection-team gamification.
 */

export const XP_PER_15_MIN = 10;
export const XP_GOAL = 25;
export const XP_ASSIST = 15;
export const MAX_LEVEL = 20;

/** Cumulative XP required to reach each level (index = level). Level 1 = 0. */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // unused
  0, // level 1
  50,
  120,
  220,
  350,
  520,
  720,
  960,
  1240,
  1560,
  1920,
  2320,
  2760,
  3240,
  3760,
  4320,
  4920,
  5560,
  6240,
  6960, // level 20
];

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? Number.POSITIVE_INFINITY)) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

export function rarityFromLevel(
  level: number
): "common" | "rare" | "epic" {
  if (level >= 15) return "epic";
  if (level >= 8) return "rare";
  return "common";
}

export function xpProgressInLevel(xp: number): {
  level: number;
  intoLevel: number;
  needed: number;
} {
  const level = levelFromXp(xp);
  const floor = LEVEL_THRESHOLDS[level] ?? 0;
  const next = LEVEL_THRESHOLDS[Math.min(level + 1, MAX_LEVEL)] ?? floor;
  const needed = Math.max(1, next - floor);
  return { level, intoLevel: Math.max(0, xp - floor), needed };
}

export function minutesToXp(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.floor(minutes / 15) * XP_PER_15_MIN;
}
