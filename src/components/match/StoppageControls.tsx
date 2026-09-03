"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatElapsed } from "./MatchClock";

type StoppageControlsProps = {
  matchId: Id<"matches">;
  activeStoppageStartedAt?: number;
  stoppageAdvisoryMs?: number;
  isLoading?: boolean;
  onAction: (action: () => Promise<unknown>, label: string) => void;
};

export function StoppageControls({
  matchId,
  activeStoppageStartedAt,
  stoppageAdvisoryMs = 0,
  isLoading = false,
  onAction,
}: StoppageControlsProps) {
  const startStoppage = useMutation(api.matchActions.startStoppage);
  const endStoppage = useMutation(api.matchActions.endStoppage);
  const isActive = activeStoppageStartedAt != null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">Onderbreking</p>
          <p className="text-xs text-amber-800 tabular-nums">
            Advies extra tijd: {formatElapsed(stoppageAdvisoryMs)}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-950">
            Loopt
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          onAction(
            () => (isActive ? endStoppage({ matchId }) : startStoppage({ matchId })),
            isActive ? "Spel hervat" : "Onderbreking starten"
          )
        }
        disabled={isLoading}
        className={`w-full min-h-[48px] rounded-xl py-3 font-semibold shadow-md transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive
            ? "bg-dia-black text-dia-yellow hover:bg-neutral-800"
            : "bg-orange-500 text-white hover:bg-orange-600"
        }`}
      >
        {isLoading ? "Bezig..." : isActive ? "Spel hervat" : "Onderbreking starten"}
      </button>
    </div>
  );
}
