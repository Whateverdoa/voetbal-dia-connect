"use client";

import clsx from "clsx";
import { Id } from "@/convex/_generated/dataModel";

export type FairnessStatus = "good" | "warning" | "critical";

export interface PlayerPlayingTime {
  playerId: Id<"players">;
  matchPlayerId: Id<"matchPlayers">;
  name: string;
  number?: number;
  minutesPlayed: number;
  onField: boolean;
  isKeeper: boolean;
}

interface PlayerTimeRowProps {
  player: PlayerPlayingTime;
  rank?: number;
  fairnessStatus: FairnessStatus;
  maxMinutes: number;
  compact?: boolean;
}

const formatMinutes = (minutes: number) => `${Math.round(minutes)} min`;

const statusColors = {
  good: { bg: "bg-green-100", border: "border-green-300", indicator: "bg-green-500", progress: "bg-green-500", text: "text-green-700" },
  warning: { bg: "bg-yellow-50", border: "border-yellow-300", indicator: "bg-yellow-500", progress: "bg-yellow-500", text: "text-yellow-700" },
  critical: { bg: "bg-red-50", border: "border-red-300", indicator: "bg-red-500", progress: "bg-red-500", text: "text-red-700" },
};

export function PlayerTimeRow({ player, rank, fairnessStatus, maxMinutes, compact = false }: PlayerTimeRowProps) {
  const progressPercent = maxMinutes > 0 ? (player.minutesPlayed / maxMinutes) * 100 : 0;
  const colors = statusColors[fairnessStatus];

  return (
    <div className={clsx("rounded-xl border-2 transition-all", colors.bg, colors.border, compact ? "p-2" : "p-3")}>
      <div className="flex items-center gap-3">
        {/* Rank number (only in full view) */}
        {rank !== undefined && (
          <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white", colors.indicator)}>
            {rank}
          </div>
        )}

        {/* Player number */}
        {player.number !== undefined && (
          <span className={clsx(
            "rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
            compact ? "w-7 h-7" : "w-8 h-8",
            player.onField ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
          )}>
            {player.number}
          </span>
        )}

        {/* Player name and status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx("font-medium truncate", compact ? "text-sm" : "text-base")}>
              {player.name}
            </span>
            {player.isKeeper && (
              <span className="text-xs bg-yellow-400 px-1.5 py-0.5 rounded flex-shrink-0">K</span>
            )}
            {player.onField && !compact && (
              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">Veld</span>
            )}
          </div>

          {/* Progress bar */}
          {!compact && (
            <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={clsx("h-full rounded-full transition-all duration-500", colors.progress)} style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        {/* Minutes played */}
        <div className={clsx("text-right flex-shrink-0", colors.text, compact ? "text-sm" : "text-base")}>
          <span className="font-bold tabular-nums">{formatMinutes(player.minutesPlayed)}</span>
        </div>

        {/* Status indicator dot (compact mode) */}
        {compact && <div className={clsx("w-3 h-3 rounded-full flex-shrink-0", colors.indicator)} />}
      </div>
    </div>
  );
}
