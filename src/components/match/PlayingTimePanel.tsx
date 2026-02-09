"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PlayingTimeSummary } from "./PlayingTimeSummary";
import {
  PlayerTimeRow,
  type PlayerPlayingTime,
  type FairnessStatus,
} from "./PlayerTimeRow";

interface PlayingTimePanelProps {
  matchId: Id<"matches">;
  pin: string;
}

/**
 * Get fairness status based on playing time relative to average
 * Green: within 3 min of average (fair)
 * Yellow: 3-6 min below average (needs more time)
 * Red: >6 min below average (barely played)
 */
function getFairnessStatus(
  minutes: number,
  averageMinutes: number,
  maxMinutes: number
): FairnessStatus {
  const difference = averageMinutes - minutes;

  // If match just started, everyone is "good"
  if (maxMinutes < 2) return "good";

  if (difference <= 3) return "good";
  if (difference <= 6) return "warning";
  return "critical";
}

export function PlayingTimePanel({ matchId, pin }: PlayingTimePanelProps) {
  const playingTimeData = useQuery(api.matches.getPlayingTime, { matchId, pin });

  if (playingTimeData === undefined) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-dia-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (playingTimeData === null) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <p className="text-red-600 text-center py-4">Kon speeltijd niet laden</p>
      </div>
    );
  }

  const { players } = playingTimeData;

  // Calculate stats for fairness indicators
  const totalMinutes = players.reduce((sum, p) => sum + p.minutesPlayed, 0);
  const averageMinutes = players.length > 0 ? totalMinutes / players.length : 0;
  const maxMinutes = players.length > 0
    ? Math.max(...players.map((p) => p.minutesPlayed))
    : 0;
  const minMinutes = players.length > 0
    ? Math.min(...players.map((p) => p.minutesPlayed))
    : 0;
  const spread = maxMinutes - minMinutes;

  // Separate on-field and bench players for display
  const onFieldPlayers = players.filter((p) => p.onField);
  const benchPlayers = players.filter((p) => !p.onField);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <PlayingTimeSummary
        averageMinutes={averageMinutes}
        spread={spread}
        playerCount={players.length}
      />

      {/* All players sorted by least played */}
      <PlayerListSection
        title="Alle spelers (minst gespeeld eerst)"
        icon="📊"
        players={players}
        averageMinutes={averageMinutes}
        maxMinutes={maxMinutes}
        showRank
      />

      {/* On-field players */}
      <PlayerListSection
        title={`Op het veld (${onFieldPlayers.length})`}
        icon={<span className="w-3 h-3 bg-green-500 rounded-full" />}
        titleClassName="text-green-700"
        players={onFieldPlayers}
        averageMinutes={averageMinutes}
        maxMinutes={maxMinutes}
        compact
        emptyMessage="Geen spelers op het veld"
      />

      {/* Bench players */}
      <PlayerListSection
        title={`Bank (${benchPlayers.length})`}
        icon={<span className="w-3 h-3 bg-gray-400 rounded-full" />}
        titleClassName="text-gray-600"
        players={benchPlayers}
        averageMinutes={averageMinutes}
        maxMinutes={maxMinutes}
        compact
        emptyMessage="Geen spelers op de bank"
      />
    </div>
  );
}

interface PlayerListSectionProps {
  title: string;
  icon: React.ReactNode;
  titleClassName?: string;
  players: PlayerPlayingTime[];
  averageMinutes: number;
  maxMinutes: number;
  showRank?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

function PlayerListSection({
  title,
  icon,
  titleClassName = "text-gray-700",
  players,
  averageMinutes,
  maxMinutes,
  showRank = false,
  compact = false,
  emptyMessage,
}: PlayerListSectionProps) {
  return (
    <section className="bg-white rounded-xl shadow-md p-4">
      <h3 className={`font-semibold mb-3 flex items-center gap-2 ${titleClassName}`}>
        {typeof icon === "string" ? <span className="text-lg">{icon}</span> : icon}
        {title}
      </h3>

      {players.length === 0 && emptyMessage ? (
        <p className="text-gray-500 text-sm text-center py-3">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {players.map((player, index) => {
            const fairnessStatus = getFairnessStatus(
              player.minutesPlayed,
              averageMinutes,
              maxMinutes
            );

            return (
              <PlayerTimeRow
                key={player.playerId}
                player={player}
                rank={showRank ? index + 1 : undefined}
                fairnessStatus={fairnessStatus}
                maxMinutes={maxMinutes}
                compact={compact}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
