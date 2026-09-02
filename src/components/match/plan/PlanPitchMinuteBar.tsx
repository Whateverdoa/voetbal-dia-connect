"use client";

interface PlanPitchMinuteBarProps {
  statusText: string;
  hasSelection: boolean;
  minuteDraft: string;
  onMinuteChange: (value: string) => void;
  canEdit: boolean;
}

/** Minute field above the plan pitch (set before tapping a swap). */
export function PlanPitchMinuteBar({
  statusText,
  hasSelection,
  minuteDraft,
  onMinuteChange,
  canEdit,
}: PlanPitchMinuteBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        className={`text-xs font-bold uppercase tracking-widest ${
          hasSelection ? "text-amber-500" : "text-slate-400"
        }`}
      >
        {statusText}
      </span>
      {canEdit ? (
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          Min
          <input
            type="number"
            min={0}
            value={minuteDraft}
            onChange={(event) => onMinuteChange(event.target.value)}
            placeholder="—"
            className="w-16 min-h-[44px] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
          />
        </label>
      ) : null}
    </div>
  );
}
