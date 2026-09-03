"use client";

import clsx from "clsx";
import type { PlayerAvailabilityStatus } from "@/lib/matchPlayerAvailability";

interface PlayerCardProps {
  name: string;
  number?: number;
  isKeeper: boolean;
  onField: boolean;
  /** Match availability; default available. */
  availability?: PlayerAvailabilityStatus;
  /** Season total minutes, shown as e.g. 42′ next to the name. */
  seasonMinutes?: number;
  onToggleField?: () => void;
  onToggleKeeper?: () => void;
  onSetAvailability?: (status: PlayerAvailabilityStatus) => void;
}

export function PlayerCard({
  name,
  number,
  isKeeper,
  onField,
  availability = "available",
  seasonMinutes,
  onToggleField,
  onToggleKeeper,
  onSetAvailability,
}: PlayerCardProps) {
  const unavailable = availability !== "available";
  const absent = availability === "absent";
  const injured = availability === "injured";

  return (
    <div
      className={clsx(
        "p-3 rounded-xl border-2 transition-all",
        absent && "bg-amber-50 border-amber-400",
        injured && "bg-rose-50 border-rose-400",
        !unavailable && onField && "bg-dia-green-light border-dia-green",
        !unavailable && !onField && "bg-gray-50 border-gray-200",
        isKeeper && !unavailable && "ring-2 ring-yellow-400 ring-offset-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {number !== undefined && (
            <span
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                absent && "bg-amber-200 text-amber-800",
                injured && "bg-rose-200 text-rose-800",
                !unavailable && onField && "bg-dia-green-light text-dia-black",
                !unavailable && !onField && "bg-gray-200 text-gray-600"
              )}
            >
              {number}
            </span>
          )}
          <div className="min-w-0">
            <span className="font-medium text-sm truncate block">{name}</span>
            {seasonMinutes !== undefined ? (
              <span className="text-xs text-gray-500 tabular-nums">
                Seizoen {seasonMinutes} min
              </span>
            ) : null}
          </div>
        </div>

        {absent ? (
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
            Niet aanwezig
          </span>
        ) : null}
        {injured ? (
          <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
            Geblesseerd
          </span>
        ) : null}

        {(onToggleField || onToggleKeeper || onSetAvailability) && (
          <div className="flex gap-1 flex-shrink-0 items-center">
            {onSetAvailability ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onSetAvailability(absent ? "available" : "absent")
                  }
                  className={clsx(
                    "min-w-[40px] min-h-[40px] rounded-lg px-1.5 text-xs font-bold transition-all active:scale-95",
                    absent
                      ? "bg-amber-200 text-amber-800 hover:bg-amber-300"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                  aria-label={absent ? "Markeer beschikbaar" : "Markeer afwezig"}
                  title={absent ? "Beschikbaar" : "Afwezig"}
                >
                  {absent ? "✓" : "Afw"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetAvailability(injured ? "available" : "injured")
                  }
                  className={clsx(
                    "min-w-[40px] min-h-[40px] rounded-lg px-1.5 text-xs font-bold transition-all active:scale-95",
                    injured
                      ? "bg-rose-200 text-rose-800 hover:bg-rose-300"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                  aria-label={
                    injured ? "Markeer beschikbaar" : "Markeer geblesseerd"
                  }
                  title={injured ? "Beschikbaar" : "Geblesseerd"}
                >
                  {injured ? "✓" : "Bles"}
                </button>
              </>
            ) : null}

            {onToggleKeeper && !unavailable ? (
              <button
                type="button"
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
            ) : null}

            {onToggleField && !unavailable ? (
              <button
                type="button"
                onClick={onToggleField}
                className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all",
                  "min-w-[40px] min-h-[40px] active:scale-95",
                  onField
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-dia-green-light text-dia-black hover:bg-dia-green-light"
                )}
                aria-label={onField ? "Naar bank" : "Naar veld"}
              >
                {onField ? "↓" : "↑"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
