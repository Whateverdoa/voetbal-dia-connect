"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  availabilityStatus,
  type PlayerAvailabilityStatus,
} from "@/lib/matchPlayerAvailability";
import { disciplineBadgeByPlayerId } from "@/lib/cards/cardRules";
import { PlayerCard } from "./PlayerCard";
import type { MatchEvent, MatchPlayer } from "./types";

interface PlayerListProps {
  matchId: Id<"matches">;
  playersOnField: MatchPlayer[];
  playersOnBench: MatchPlayer[];
  playersAbsent?: MatchPlayer[];
  playersInjured?: MatchPlayer[];
  canEdit?: boolean;
  canToggleAvailability?: boolean;
  /** Limit which availability buttons show (default both). */
  availabilityActions?: Array<"absent" | "injured">;
  /** @deprecated use canToggleAvailability */
  canToggleAbsent?: boolean;
  /** Season minutes by playerId for lineup planning context. */
  seasonMinutesByPlayerId?: Map<string, number>;
  events?: MatchEvent[];
}

export function PlayerList({
  matchId,
  playersOnField,
  playersOnBench,
  playersAbsent = [],
  playersInjured = [],
  canEdit = true,
  canToggleAvailability,
  availabilityActions = ["absent", "injured"],
  canToggleAbsent = false,
  seasonMinutesByPlayerId,
  events = [],
}: PlayerListProps) {
  const toggleOnField = useMutation(api.matchActions.togglePlayerOnField);
  const toggleKeeper = useMutation(api.matchActions.toggleKeeper);
  const setAvailability = useMutation(api.matchActions.setPlayerAvailability);
  const canSetAvailability = canToggleAvailability ?? canToggleAbsent;
  const disciplineByPlayer = disciplineBadgeByPlayerId(
    events.map((e) => ({
      type: e.type,
      playerId: e.playerId ? String(e.playerId) : undefined,
      isOpponentCard: e.isOpponentCard,
    }))
  );

  const seasonOf = (playerId: Id<"players">) =>
    seasonMinutesByPlayerId?.get(String(playerId));
  const badgeOf = (playerId: Id<"players">) =>
    disciplineByPlayer.get(String(playerId));

  const setStatus = (
    playerId: Id<"players">,
    status: PlayerAvailabilityStatus
  ) => setAvailability({ matchId, playerId, status });

  const helpText = availabilityActions.includes("absent")
    ? "Afw = afwezig · Bles = geblesseerd (ook tijdens de wedstrijd)."
    : "Bles = geblesseerd tijdens de wedstrijd (speler gaat van het veld).";

  return (
    <div className="space-y-4">
      {canSetAvailability ? (
        <p className="text-xs text-gray-500">{helpText}</p>
      ) : null}
      <section className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-semibold mb-3 text-dia-black flex items-center gap-2">
          <span className="w-3 h-3 bg-dia-yellow rounded-full"></span>
          Op het veld ({playersOnField.length})
        </h2>
        {playersOnField.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Geen spelers op het veld
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playersOnField.map((player) => (
              <PlayerCard
                key={player.playerId}
                name={player.name}
                number={player.number}
                isKeeper={player.isKeeper}
                onField={player.onField}
                availability={availabilityStatus(player)}
                seasonMinutes={seasonOf(player.playerId)}
                disciplineBadge={badgeOf(player.playerId)}
                onToggleField={
                  canEdit
                    ? () =>
                        toggleOnField({
                          matchId,
                          playerId: player.playerId,
                        })
                    : undefined
                }
                onToggleKeeper={
                  canEdit
                    ? () =>
                        toggleKeeper({
                          matchId,
                          playerId: player.playerId,
                        })
                    : undefined
                }
                onSetAvailability={
                  canSetAvailability
                    ? (status) => setStatus(player.playerId, status)
                    : undefined
                }
                availabilityActions={availabilityActions}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-semibold mb-3 text-gray-600 flex items-center gap-2">
          <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
          Bank ({playersOnBench.length})
        </h2>
        {playersOnBench.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Geen spelers op de bank
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playersOnBench.map((player) => (
              <PlayerCard
                key={player.playerId}
                name={player.name}
                number={player.number}
                isKeeper={player.isKeeper}
                onField={player.onField}
                availability="available"
                seasonMinutes={seasonOf(player.playerId)}
                disciplineBadge={badgeOf(player.playerId)}
                onToggleField={
                  canEdit
                    ? () =>
                        toggleOnField({
                          matchId,
                          playerId: player.playerId,
                        })
                    : undefined
                }
                onToggleKeeper={
                  canEdit
                    ? () =>
                        toggleKeeper({
                          matchId,
                          playerId: player.playerId,
                        })
                    : undefined
                }
                onSetAvailability={
                  canSetAvailability
                    ? (status) => setStatus(player.playerId, status)
                    : undefined
                }
                availabilityActions={availabilityActions}
              />
            ))}
          </div>
        )}
      </section>

      {playersAbsent.length > 0 ? (
        <section className="bg-white rounded-xl shadow-md p-4">
          <h2 className="font-semibold mb-3 text-amber-700 flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            Niet aanwezig ({playersAbsent.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playersAbsent.map((player) => (
              <PlayerCard
                key={player.playerId}
                name={player.name}
                number={player.number}
                isKeeper={player.isKeeper}
                onField={false}
                availability="absent"
                seasonMinutes={seasonOf(player.playerId)}
                disciplineBadge={badgeOf(player.playerId)}
                onSetAvailability={
                  canSetAvailability
                    ? (status) => setStatus(player.playerId, status)
                    : undefined
                }
                availabilityActions={availabilityActions}
              />
            ))}
          </div>
        </section>
      ) : null}

      {playersInjured.length > 0 ? (
        <section className="bg-white rounded-xl shadow-md p-4">
          <h2 className="font-semibold mb-3 text-rose-700 flex items-center gap-2">
            <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
            Geblesseerd ({playersInjured.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playersInjured.map((player) => (
              <PlayerCard
                key={player.playerId}
                name={player.name}
                number={player.number}
                isKeeper={player.isKeeper}
                onField={false}
                availability="injured"
                seasonMinutes={seasonOf(player.playerId)}
                disciplineBadge={badgeOf(player.playerId)}
                onSetAvailability={
                  canSetAvailability
                    ? (status) => setStatus(player.playerId, status)
                    : undefined
                }
                availabilityActions={availabilityActions}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
