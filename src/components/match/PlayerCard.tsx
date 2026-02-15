"use client";

import clsx from "clsx";

interface PlayerCardProps {
  name: string;
  number?: number;
  isKeeper: boolean;
  onField: boolean;
  onToggleField: () => void;
  onToggleKeeper: () => void;
  disabled?: boolean;
}

export function PlayerCard({
  name,
  number,
  isKeeper,
  onField,
  onToggleField,
  onToggleKeeper,
  disabled = false,
}: PlayerCardProps) {
  return (
    <div
      className={clsx(
        "p-3 rounded-xl border-2 transition-all",
        onField
          ? "bg-green-50 border-green-500"
          : "bg-gray-50 border-gray-200",
        isKeeper && "ring-2 ring-yellow-400 ring-offset-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Player info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {number !== undefined && (
            <span
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                onField ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
              )}
            >
              {number}
            </span>
          )}
          <span className="font-medium text-sm truncate">{name}</span>
        </div>

        {/* Action buttons */}
        <div className={clsx("flex gap-1 flex-shrink-0", disabled && "opacity-50")}>
          {/* Keeper toggle */}
          <button
            onClick={onToggleKeeper}
            disabled={disabled}
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
              "min-w-[40px] min-h-[40px] active:scale-95",
              disabled && "cursor-not-allowed",
              isKeeper
                ? "bg-yellow-400 text-white shadow-md"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
            aria-label={isKeeper ? "Verwijder keeper" : "Maak keeper"}
          >
            🧤
          </button>

          {/* Field/bench toggle */}
          <button
            onClick={onToggleField}
            disabled={disabled}
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all",
              "min-w-[40px] min-h-[40px] active:scale-95",
              disabled && "cursor-not-allowed",
              onField
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            )}
            aria-label={onField ? "Naar bank" : "Naar veld"}
          >
            {onField ? "↓" : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}
