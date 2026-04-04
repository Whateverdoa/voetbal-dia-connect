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
    hint: "Rust tussendoor: in principe ca. 15 min.",
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
