"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import type { FieldConfig } from "@/lib/fieldConfig";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import {
  orientAspect,
  orientSlots,
  type PitchOrientation,
} from "@/lib/pitchOrientation";
import { HalfPitchPerspective } from "@/components/presentation/HalfPitchPerspective";
import { PitchFitFrame } from "@/components/presentation/PitchFitFrame";
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
  /** Letterbox the pitch into the parent so the whole field stays on screen. */
  fill?: boolean;
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
  fill = false,
}: ProjectedPlannerPitchProps) {
  const players = onField.map((player) => ({
    playerId: String(player.playerId),
    displayName: player.name,
    number: player.number ?? null,
    onField: true,
    fieldSlotIndex: player.fieldSlotIndex ?? null,
    seasonMinutes: seasonMinutesByPlayerId?.get(String(player.playerId)),
  }));

  if (pitchLayout === "halfPerspective") {
    return (
      <div className={fill ? "h-full min-h-0" : `mx-auto w-full ${pitchMaxWidthClass}`}>
        <HalfPitchPerspective
          players={players}
          formation={formation}
          cfg={cfg}
          fill={fill}
          selectedPlayerId={selectedPlayerId}
          canEdit={canEdit}
          sizeMode={fill ? "presentation" : "auto"}
          onPlayerClick={(playerId) => {
            onFieldPlayerClick(playerId as Id<"players">);
          }}
        />
      </div>
    );
  }

  const orientation: PitchOrientation = fill ? "landscape" : "portrait";
  const slots = orientSlots(formation.slots, orientation);
  const aspect = orientAspect(cfg.w, cfg.h, orientation);
  const playerInSlot = (slotId: number): MatchPlayer | undefined =>
    onField.find((player) => Number(player.fieldSlotIndex) === Number(slotId));

  const cards = slots.map((slot) => {
    const player = playerInSlot(slot.id);
    return (
      <FieldPlayerCard
        key={slot.id}
        name={player?.name ?? ""}
        number={player?.number}
        position={slot.position}
        x={slot.x}
        y={slot.y}
        sizeMode={fill ? "presentation" : "auto"}
        isSelected={player ? selectedPlayerId === player.playerId : false}
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
  });

  if (fill) {
    return (
      <div className="h-full min-h-0">
        <PitchFitFrame
          aspectW={aspect.aspectW}
          aspectH={aspect.aspectH}
          fill
        >
          <FieldLines cfg={cfg} orientation={orientation} />
          <FormationLines slots={slots} links={formation.links} />
          {cards}
        </PitchFitFrame>
      </div>
    );
  }

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
        <FieldLines cfg={cfg} />
        <FormationLines slots={formation.slots} links={formation.links} />
        {cards}
      </div>
    </div>
  );
}
