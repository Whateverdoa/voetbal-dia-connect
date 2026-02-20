"use client";

import clsx from "clsx";

interface PlayerCardProps {
  name: string;
  number?: number;
  isKeeper: boolean;
  onField: boolean;
  absent?: boolean;
  onToggleField?: () => void;
  onToggleKeeper?: () => void;
  onToggleAbsent?: () => void;
}

export function PlayerCard({
  name,
  number,
  isKeeper,
  onField,
  absent = false,
  onToggleField,
  onToggleKeeper,
  onToggleAbsent,
}: PlayerCardProps) {
  return (
    <div
      className={clsx(
        "p-3 rounded-xl border-2 transition-all",
        absent && "bg-amber-50 border-amber-400",
        !absent && onField && "bg-green-50 border-green-500",
        !absent && !onField && "bg-gray-50 border-gray-200",
        isKeeper && !absent && "ring-2 ring-yellow-400 ring-offset-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Player info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {number !== undefined && (
            <span
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                absent && "bg-amber-200 text-amber-800",
                !absent && onField && "bg-green-200 text-green-800",
                !absent && !onField && "bg-gray-200 text-gray-600"
              )}
            >
              {number}
            </span>
          )}
          <span className="font-medium text-sm truncate">{name}</span>
        </div>

        {/* Absent badge when applicable */}
        {absent && (
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            Niet aanwezig
          </span>
        )}

        {/* Action buttons */}
        {(onToggleField || onToggleKeeper || onToggleAbsent) && (
        <div className="flex gap-1 flex-shrink-0 items-center">
          {/* Absent toggle: mark present when absent, or mark absent when on bench */}
          {onToggleAbsent && (
          <button
            onClick={onToggleAbsent}
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
              "min-w-[40px] min-h-[40px] active:scale-95",
              absent
                ? "bg-amber-200 text-amber-800 hover:bg-amber-300"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
            aria-label={absent ? "Markeer aanwezig" : "Markeer afwezig"}
            title={absent ? "Aanwezig" : "Afwezig"}
          >
            {absent ? "✓" : "✗"}
          </button>
          )}
          {/* Keeper toggle */}
          {onToggleKeeper && !absent && (
          <button
            onClick={onToggleKeeper}
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
              "min-w-[40px] min-h-[40px] active:scale-95",
              isKeeper
                ? "bg-yellow-400 text-white shadow-md"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
            aria-label={isKeeper ? "Verwijder keeper" : "Maak keeper"}
          >
            🧤
          </button>
          )}

          {/* Field/bench toggle — hidden when absent */}
          {onToggleField && !absent && (
          <button
            onClick={onToggleField}
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all",
              "min-w-[40px] min-h-[40px] active:scale-95",
              onField
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            )}
            aria-label={onField ? "Naar bank" : "Naar veld"}
          >
            {onField ? "↓" : "↑"}
          </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
