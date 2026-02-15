"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFormation } from "@/lib/formations";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import { FieldLines } from "./FieldLines";
import { PitchBench } from "./PitchBench";
import type { MatchPlayer } from "./types";

interface PitchViewProps {
  matchId: Id<"matches">;
  pin: string;
  players: MatchPlayer[];
  formationId: string | undefined;
}

export function PitchView({ matchId, pin, players, formationId }: PitchViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(null);
  const assignToSlot = useMutation(api.matchActions.assignPlayerToSlot);
  const toggleOffField = useMutation(api.matchActions.togglePlayerOnField);
  const swapPositions = useMutation(api.matchActions.swapFieldPositions);

  const formation = formationId ? getFormation(formationId) : undefined;
  const fieldMode = fieldModeFromFormation(formationId);
  const cfg = FIELDS[fieldMode];
  const is11 = fieldMode === "11tal";
  const playerSize = is11 ? 57 : 63;

  const onField = players.filter((p) => p.onField);
  const onBench = players.filter((p) => !p.onField);
  const onFieldUnassigned = onField.filter(
    (p) => p.fieldSlotIndex === undefined || p.fieldSlotIndex === null
  );

  const playerInSlot = (slotId: number): MatchPlayer | undefined =>
    onField.find((p) => Number(p.fieldSlotIndex) === Number(slotId));

  const findPlayer = (id: Id<"players">): MatchPlayer | undefined =>
    players.find((p) => p.playerId === id);

  const isPlayerOnField = (id: Id<"players">): boolean =>
    onField.some((p) => p.playerId === id);

  const slotOfPlayer = (id: Id<"players">): number | undefined =>
    onField.find((mp) => mp.playerId === id)?.fieldSlotIndex ?? undefined;

  const tileLabel = (p: MatchPlayer): string => {
    if (p.number != null) return String(p.number);
    return (p.name.trim()[0] || "?").toUpperCase();
  };

  const nameLabel = (p: MatchPlayer): string => {
    const firstName = p.name.trim().split(/\s+/)[0] || p.name;
    return firstName.slice(0, 12);
  };

  // --- Click: field player tile ---
  const handleFieldPlayerClick = (player: MatchPlayer, slotId: number) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(player.playerId);
      return;
    }
    if (selectedPlayerId === player.playerId) {
      setSelectedPlayerId(null);
      return;
    }
    if (isPlayerOnField(selectedPlayerId)) {
      swapPositions({ matchId, pin, playerAId: selectedPlayerId, playerBId: player.playerId });
    } else {
      assignToSlot({ matchId, pin, playerId: selectedPlayerId, fieldSlotIndex: slotId });
      toggleOffField({ matchId, pin, playerId: player.playerId });
    }
    setSelectedPlayerId(null);
  };

  // --- Click: empty slot ---
  const handleEmptySlotClick = (slotId: number) => {
    if (!selectedPlayerId) return;
    assignToSlot({ matchId, pin, playerId: selectedPlayerId, fieldSlotIndex: slotId });
    setSelectedPlayerId(null);
  };

  // --- Click: bench / unassigned player ---
  const handleBenchPlayerClick = (playerId: Id<"players">) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(playerId);
      return;
    }
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
      return;
    }
    if (!isPlayerOnField(selectedPlayerId) && !isPlayerOnField(playerId)) {
      setSelectedPlayerId(playerId);
      return;
    }
    if (isPlayerOnField(selectedPlayerId)) {
      const slot = slotOfPlayer(selectedPlayerId);
      if (slot !== undefined) {
        assignToSlot({ matchId, pin, playerId, fieldSlotIndex: slot });
        toggleOffField({ matchId, pin, playerId: selectedPlayerId });
      }
    }
    setSelectedPlayerId(null);
  };

  // --- Selection tile style ---
  const tileStyle = (playerId: Id<"players"> | null, isEmpty: boolean): React.CSSProperties => {
    const isSelected = playerId !== null && selectedPlayerId === playerId;
    const isDimmed = selectedPlayerId !== null && !isSelected;
    if (isSelected) {
      return {
        background: "rgba(30,41,59,0.7)",
        borderColor: "#facc15",
        boxShadow: "0 0 20px rgba(250,204,21,0.5), 0 0 0 2px #facc15",
        transform: "translate(-50%, -50%) scale(1.15)",
        zIndex: 50,
      };
    }
    return {
      background: isEmpty ? "rgba(255,255,255,0.08)" : "rgba(30,41,59,0.7)",
      borderColor: isEmpty ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)",
      boxShadow: isEmpty ? "none" : "0 6px 24px rgba(0,0,0,0.35)",
      transform: "translate(-50%, -50%)",
      opacity: isDimmed ? 0.5 : 1,
      filter: isDimmed ? "grayscale(0.4)" : "none",
      zIndex: 10,
    };
  };

  // --- Status text ---
  const statusText = (): string => {
    if (!selectedPlayerId) return "Tik op een speler om te wisselen";
    const sel = findPlayer(selectedPlayerId);
    if (!sel) return "Tik op een speler om te wisselen";
    const n = nameLabel(sel);
    return isPlayerOnField(selectedPlayerId)
      ? `${n} geselecteerd — tik wisselspeler of andere positie`
      : `${n} geselecteerd — tik op een positie op het veld`;
  };

  if (!formation) {
    return (
      <div className="rounded-xl bg-gray-100 p-6 text-center text-gray-500">
        Selecteer een formatie om het veld te tonen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection indicator */}
      <div className="h-6 flex items-center justify-center">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${selectedPlayerId ? "text-yellow-400 animate-pulse" : "text-slate-400"}`}
        >
          {statusText()}
        </span>
      </div>

      {/* Field container */}
      <div
        className="relative w-full border rounded-sm"
        style={{
          background: "#2d7a3a",
          borderColor: "#1e5c28",
          aspectRatio: `${cfg.w} / ${cfg.h}`,
          boxShadow: "0 0 50px -12px rgba(34,197,94,0.25)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)",
          }}
        />
        <FieldLines cfg={cfg} />

        {/* Player tiles at formation slot positions */}
        {formation.slots.map((slot) => {
          const player = playerInSlot(slot.id);
          const isEmpty = !player;
          const style = tileStyle(player?.playerId ?? null, isEmpty);

          return (
            <div
              key={slot.id}
              onClick={() =>
                player
                  ? handleFieldPlayerClick(player, slot.id)
                  : handleEmptySlotClick(slot.id)
              }
              className="absolute flex flex-col items-center justify-center cursor-pointer rounded-xl border text-white"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: playerSize,
                height: playerSize,
                backdropFilter: isEmpty ? "none" : "blur(12px)",
                transition: "all 0.3s ease",
                ...style,
              }}
            >
              {player ? (
                <>
                  <span className="font-bold text-sm">{tileLabel(player)}</span>
                  <span
                    className="absolute text-[10px] font-semibold whitespace-nowrap opacity-75"
                    style={{ bottom: -16 }}
                  >
                    {nameLabel(player)}
                  </span>
                </>
              ) : (
                <span className="text-white/40 text-lg font-light">+</span>
              )}
            </div>
          );
        })}
      </div>

      <PitchBench
        onBench={onBench}
        onFieldUnassigned={onFieldUnassigned}
        selectedPlayerId={selectedPlayerId}
        onPlayerClick={handleBenchPlayerClick}
        onDeselect={() => setSelectedPlayerId(null)}
        nameLabel={nameLabel}
      />
    </div>
  );
}
