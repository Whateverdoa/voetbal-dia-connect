"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFormation } from "@/lib/formations";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import { FieldLines } from "./FieldLines";
import { FormationLines } from "./FormationLines";
import { FieldPlayerCard } from "./FieldPlayerCard";
import { PitchBench } from "./PitchBench";
import type { MatchPlayer } from "./types";

interface PitchViewProps {
  matchId: Id<"matches">;
  pin: string;
  players: MatchPlayer[];
  formationId: string | undefined;
  canEdit?: boolean;
}

export function PitchView({ matchId, pin, players, formationId, canEdit = true }: PitchViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(null);
  const assignToSlot = useMutation(api.matchActions.assignPlayerToSlot);
  const toggleOffField = useMutation(api.matchActions.togglePlayerOnField);
  const swapPositions = useMutation(api.matchActions.swapFieldPositions);

  const formation = formationId ? getFormation(formationId) : undefined;
  const fieldMode = fieldModeFromFormation(formationId);
  const cfg = FIELDS[fieldMode];

  const onField = players.filter((p) => p.onField);
  const onBench = players.filter(
    (p) => !p.onField && !(p.absent ?? false)
  );
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

  const nameLabel = (p: MatchPlayer): string => {
    const firstName = p.name.trim().split(/\s+/)[0] || p.name;
    return firstName.slice(0, 12);
  };

  // --- Click: field player tile ---
  const handleFieldPlayerClick = (player: MatchPlayer, slotId: number) => {
    if (!canEdit) return;
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
    if (!canEdit || !selectedPlayerId) return;
    assignToSlot({ matchId, pin, playerId: selectedPlayerId, fieldSlotIndex: slotId });
    setSelectedPlayerId(null);
  };

  // --- Click: bench / unassigned player ---
  const handleBenchPlayerClick = (playerId: Id<"players">) => {
    if (!canEdit) return;
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
    <div className="space-y-1">
      {/* Selection indicator */}
      <div className="h-5 flex items-center justify-center">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${selectedPlayerId ? "text-yellow-400 animate-pulse" : "text-slate-400"}`}
        >
          {statusText()}
        </span>
      </div>

      {/* Perspective wrapper — negative margin compensates for rotateX visual gap */}
      <div className="w-full flex justify-center" style={{ perspective: "800px", marginTop: -80 }}>
        {/* Field container — tilted */}
        <div
          className="relative w-full overflow-hidden border rounded-sm"
          style={{
            background: "#2d7a3a",
            borderColor: "#1e5c28",
            aspectRatio: `${cfg.w} / ${cfg.h}`,
            transform: "rotateX(12deg)",
            transformOrigin: "center bottom",
            boxShadow:
              "0 -20px 60px -15px rgba(34,197,94,0.12), 0 30px 60px -20px rgba(0,0,0,0.6)",
          }}
        >
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          {/* Subtle pitch stripes */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)",
            }}
          />

          <FieldLines cfg={cfg} />
          <FormationLines slots={formation.slots} links={formation.links} />

          {/* Player cards at formation slot positions */}
          {formation.slots.map((slot) => {
            const player = playerInSlot(slot.id);
            const isEmpty = !player;

            return (
              <FieldPlayerCard
                key={slot.id}
                name={player?.name ?? ""}
                number={player?.number}
                position={slot.position}
                x={slot.x}
                y={slot.y}
                isSelected={player ? selectedPlayerId === player.playerId : false}
                isDimmed={selectedPlayerId !== null && (!player || selectedPlayerId !== player.playerId)}
                isEmpty={isEmpty}
                onClick={() =>
                  player
                    ? handleFieldPlayerClick(player, slot.id)
                    : handleEmptySlotClick(slot.id)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Glow line under field */}
      <div className="w-full flex justify-center" style={{ marginTop: -4 }}>
        <div
          style={{
            width: "80%",
            height: 3,
            background:
              "linear-gradient(90deg, transparent 5%, rgba(34,197,94,0.25) 50%, transparent 95%)",
            borderRadius: 2,
          }}
        />
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
