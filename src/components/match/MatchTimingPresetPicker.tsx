"use client";

import clsx from "clsx";
import {
  MATCH_TIMING_PRESETS,
  MATCH_TIMING_PRESET_ORDER,
  type MatchTimingPresetId,
} from "@/lib/matchTimingPresets";

export function MatchTimingPresetPicker({
  value,
  onChange,
  compact,
}: {
  value: MatchTimingPresetId;
  onChange: (id: MatchTimingPresetId) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1">Speelduur</span>
      <div
        className={clsx(
          "grid gap-2",
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
        )}
      >
        {MATCH_TIMING_PRESET_ORDER.map((id) => {
          const p = MATCH_TIMING_PRESETS[id];
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={clsx(
                "rounded-xl border-2 px-3 py-2.5 text-left transition-colors min-h-[48px]",
                active
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              )}
            >
              <span className="font-medium text-sm block">{p.label}</span>
              <span className="text-xs text-gray-500 mt-0.5 block leading-snug">
                {p.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
