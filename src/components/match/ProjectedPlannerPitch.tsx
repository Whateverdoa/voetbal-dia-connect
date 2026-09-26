"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import type { FieldConfig } from "@/lib/fieldConfig";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import { HalfPitchPerspective } from "@/components/presentation/HalfPitchPerspective";
import { FieldLines } from "./FieldLines";
import { FormationLines } from "./FormationLines";
import { FieldPlayerCard } from "./FieldPlayerCard";
import type { MatchPlayer } from "./types";

interface ProjectedPlannerPitchProps {
  pitchLayout: PitchLayout;
  formation: Formation;
  cfg: FieldConfig;
  onField: MatchPlayer[];
  selectedPlayerId: Id<"players"> | null;
  canEdit: boolean;
  pitchMaxWidthClass: string;
  seasonMinutesByPlayerId?: Map<string, number>;
  onFieldPlayerClick: (playerId: Id<"players">) => void;
}

/** Full or half-perspective pitch for the substitution planner. */
export function ProjectedPlannerPitch({
  pitchLayout,
  formation,
  cfg,
  onField,
  selectedPlayerId,
  canEdit,
  pitchMaxWidthClass,
  seasonMinutesByPlayerId,
  onFieldPlayerClick,
}: ProjectedPlannerPitchProps) {
  if (pitchLayout === "halfPerspective") {
    return (
      <div className={`mx-auto w-full ${pitchMaxWidthClass}`}>
        <HalfPitchPerspective
          players={onField.map((player) => ({
            playerId: String(player.playerId),
            displayName: player.name,
            number: player.number ?? null,
            onField: true,
            fieldSlotIndex: player.fieldSlotIndex ?? null,
            seasonMinutes: seasonMinutesByPlayerId?.get(String(player.playerId)),
          }))}
          formation={formation}
          cfg={cfg}
          selectedPlayerId={selectedPlayerId}
          canEdit={canEdit}
          sizeMode="auto"
          onPlayerClick={(playerId) => {
            onFieldPlayerClick(playerId as Id<"players">);
          }}
        />
      </div>
    );
  }

  const playerInSlot = (slotId: number): MatchPlayer | undefined =>
    onField.find((player) => Number(player.fieldSlotIndex) === Number(slotId));

  return (
    <div className="flex w-full justify-center">
      <div
        className={`relative w-full ${pitchMaxWidthClass} overflow-hidden rounded-sm border shadow-md`}
        style={{
          background: "#2d7a3a",
          borderColor: "#1e5c28",
          aspectRatio: `${cfg.w} / ${cfg.h}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)",
          }}
        />

        <FieldLines cfg={cfg} />
        <FormationLines slots={formation.slots} links={formation.links} />

        {formation.slots.map((slot) => {
          const player = playerInSlot(slot.id);
          return (
            <FieldPlayerCard
              key={slot.id}
              name={player?.name ?? ""}
              number={player?.number}
              position={slot.position}
              x={slot.x}
              y={slot.y}
              isSelected={
                player ? selectedPlayerId === player.playerId : false
              }
              isDimmed={
                selectedPlayerId !== null &&
                (!player || selectedPlayerId !== player.playerId)
              }
              isEmpty={!player}
              seasonMinutes={
                player
                  ? seasonMinutesByPlayerId?.get(String(player.playerId))
                  : undefined
              }
              onClick={() => {
                if (!player) return;
                onFieldPlayerClick(player.playerId);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
