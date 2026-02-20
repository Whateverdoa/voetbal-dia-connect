"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PlayerCard } from "./PlayerCard";
import type { MatchPlayer } from "./types";

interface PlayerListProps {
  matchId: Id<"matches">;
  pin: string;
  playersOnField: MatchPlayer[];
  playersOnBench: MatchPlayer[];
  playersAbsent?: MatchPlayer[];
  canEdit?: boolean;
  canToggleAbsent?: boolean;
}

export function PlayerList({
  matchId,
  pin,
  playersOnField,
  playersOnBench,
  playersAbsent = [],
  canEdit = true,
  canToggleAbsent = false,
}: PlayerListProps) {
  const toggleOnField = useMutation(api.matchActions.togglePlayerOnField);
  const toggleKeeper = useMutation(api.matchActions.toggleKeeper);
  const toggleAbsent = useMutation(api.matchActions.togglePlayerAbsent);

  return (
    <div className="space-y-4">
      {/* On field */}
      <section className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-semibold mb-3 text-green-700 flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
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
                onToggleField={
                  canEdit ? () => toggleOnField({ matchId, pin, playerId: player.playerId }) : undefined
                }
                onToggleKeeper={
                  canEdit ? () => toggleKeeper({ matchId, pin, playerId: player.playerId }) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Bench */}
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
                onToggleField={
                  canEdit ? () => toggleOnField({ matchId, pin, playerId: player.playerId }) : undefined
                }
                onToggleKeeper={
                  canEdit ? () => toggleKeeper({ matchId, pin, playerId: player.playerId }) : undefined
                }
                onToggleAbsent={
                  canToggleAbsent
                    ? () => toggleAbsent({ matchId, pin, playerId: player.playerId })
                    : undefined
                }
                absent={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Absent (not physically present, e.g. called in sick) - pregame only */}
      {playersAbsent.length > 0 && (
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
                absent={true}
                onToggleAbsent={
                  canToggleAbsent
                    ? () => toggleAbsent({ matchId, pin, playerId: player.playerId })
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
