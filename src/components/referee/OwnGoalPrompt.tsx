"use client";

import clsx from "clsx";

type OwnGoalPromptProps = {
  homeName: string;
  awayName: string;
  kicker: "home" | "away" | null;
  shirtNumber: string;
  isLoading: boolean;
  onKicker: (team: "home" | "away") => void;
  onShirtNumberChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function OwnGoalPrompt({
  homeName,
  awayName,
  kicker,
  shirtNumber,
  isLoading,
  onKicker,
  onShirtNumberChange,
  onConfirm,
  onCancel,
}: OwnGoalPromptProps) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-center text-sm font-medium text-gray-700">
        Eigen doelpunt — extra registratie
      </p>
      <p className="text-center text-xs text-gray-500">
        Welk team trapte in eigen doel? Rugnummer mag, maar hoeft niet.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onKicker("home")}
          className={clsx(
            "min-h-[52px] rounded-xl border-2 px-2 text-sm font-bold",
            kicker === "home"
              ? "border-dia-green bg-dia-green-light"
              : "border-gray-200 bg-white",
          )}
        >
          {homeName}
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onKicker("away")}
          className={clsx(
            "min-h-[52px] rounded-xl border-2 px-2 text-sm font-bold",
            kicker === "away"
              ? "border-dia-green bg-dia-green-light"
              : "border-gray-200 bg-white",
          )}
        >
          {awayName}
        </button>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={shirtNumber}
        disabled={isLoading}
        onChange={(event) => onShirtNumberChange(event.target.value)}
        placeholder="Rugnummer (optioneel)"
        className="w-full rounded-xl border-2 border-gray-300 py-3 text-center text-xl font-bold"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-500"
        >
          Annuleer
        </button>
        <button
          type="button"
          disabled={isLoading || !kicker}
          onClick={onConfirm}
          className="min-h-[48px] flex-1 rounded-lg bg-dia-green text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
