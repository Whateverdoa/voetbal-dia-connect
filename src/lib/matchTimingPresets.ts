export type MatchTimingPresetId = "q4_15" | "h2_30" | "h2_45";

export const MATCH_TIMING_PRESETS: Record<
  MatchTimingPresetId,
  {
    quarterCount: number;
    regulationDurationMinutes: number;
    label: string;
    hint: string;
  }
> = {
  q4_15: {
    quarterCount: 4,
    regulationDurationMinutes: 60,
    label: "4×15 min",
    hint: "Pauzes: 3 min na kwart 1 en 3, 15 min na kwart 2.",
  },
  h2_30: {
    quarterCount: 2,
    regulationDurationMinutes: 60,
    label: "2×30 min",
    hint: "Rust tussendoor: in principe ca. 15 min.",
  },
  h2_45: {
    quarterCount: 2,
    regulationDurationMinutes: 90,
    label: "2×45 min",
    hint: "Rust tussendoor: in principe ca. 15 min.",
  },
};

export const MATCH_TIMING_PRESET_ORDER: MatchTimingPresetId[] = [
  "q4_15",
  "h2_30",
  "h2_45",
];

export function inferTimingPresetId(
  quarterCount: number,
  regulationDurationMinutes: number | undefined
): MatchTimingPresetId | null {
  const reg = regulationDurationMinutes ?? 60;
  for (const id of MATCH_TIMING_PRESET_ORDER) {
    const p = MATCH_TIMING_PRESETS[id];
    if (p.quarterCount === quarterCount && p.regulationDurationMinutes === reg) {
      return id;
    }
  }
  return null;
}

export function getBreakMinutesAfterQuarter(
  presetId: MatchTimingPresetId,
  completedQuarter: number
): number | null {
  if (presetId === "q4_15") {
    if (completedQuarter === 1 || completedQuarter === 3) return 3;
    if (completedQuarter === 2) return 15;
    return null;
  }

  if (completedQuarter === 1) return 15;
  return null;
}

export function getBreakMinutesForTiming(
  quarterCount: number,
  regulationDurationMinutes: number | undefined,
  completedQuarter: number
): number | null {
  const presetId = inferTimingPresetId(quarterCount, regulationDurationMinutes);
  if (!presetId) return null;
  return getBreakMinutesAfterQuarter(presetId, completedQuarter);
}
