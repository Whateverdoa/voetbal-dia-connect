"use client";

interface KleedkamerPlanTimingBarProps {
  statusText: string;
  hasSelection: boolean;
  minuteDraft: string;
  onMinuteChange: (value: string) => void;
  onSaveMinute: () => void;
  canSaveExisting: boolean;
  isBusy: boolean;
}

export function kleedkamerPlanHint(
  busy: boolean,
  selectedName: string | null
): string {
  if (busy) return "Wissel wordt toegevoegd…";
  if (!selectedName) return "Tik veldspeler voor wissel of positiewissel";
  return `${selectedName} geselecteerd — tik bank voor wissel of veld voor positiewissel`;
}

export function KleedkamerEmptyPlan() {
  return (
    <div className="rounded-xl bg-slate-800/80 p-8 text-center text-slate-300">
      <p className="text-lg font-semibold text-white">Geen openstaande wissels</p>
      <p className="mt-2 text-sm">
        Zodra de coach een wissel plant, verschijnt die hier realtime.
      </p>
    </div>
  );
}

/** Minute field for kleedkamer pitch planning (new taps + existing rows). */
export function KleedkamerPlanTimingBar({
  statusText,
  hasSelection,
  minuteDraft,
  onMinuteChange,
  onSaveMinute,
  canSaveExisting,
  isBusy,
}: KleedkamerPlanTimingBarProps) {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
      <span
        className={`text-xs font-bold uppercase tracking-widest ${
          hasSelection ? "text-yellow-400 animate-pulse" : "text-slate-400"
        }`}
      >
        {statusText}
      </span>
      <label className="flex items-center gap-1.5 text-xs text-slate-300">
        Min
        <input
          type="number"
          min={0}
          value={minuteDraft}
          disabled={isBusy}
          onChange={(event) => onMinuteChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSaveMinute();
            }
          }}
          placeholder="—"
          className="w-16 min-h-[44px] rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm text-white"
        />
      </label>
      {canSaveExisting ? (
        <button
          type="button"
          disabled={isBusy || minuteDraft.trim() === ""}
          onClick={onSaveMinute}
          className="min-h-[44px] rounded-lg border border-dia-yellow bg-dia-yellow/20 px-3 text-sm font-semibold text-dia-yellow disabled:opacity-40"
        >
          Zetten
        </button>
      ) : null}
    </div>
  );
}
