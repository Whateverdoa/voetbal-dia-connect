"use client";

import { useState } from "react";
import { FieldLines } from "@/components/match/FieldLines";
import { FormationLines } from "@/components/match/FormationLines";
import { FieldPlayerCard } from "@/components/match/FieldPlayerCard";
import { PitchFitFrame } from "@/components/presentation/PitchFitFrame";
import { HalfPitchPerspective } from "@/components/presentation/HalfPitchPerspective";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import type { Formation } from "@/lib/formations/types";
import type { CardSizeMode } from "@/hooks/useCardSize";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import {
  orientAspect,
  orientSlots,
  type PitchOrientation,
} from "@/lib/pitchOrientation";

export type PresentationPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  onField: boolean;
  fieldSlotIndex: number | null;
  photoUrl?: string | null;
  position?: string;
};

interface PresentationPitchViewProps {
  players: PresentationPlayer[];
  formationId: string | undefined;
  resolvedFormation: Formation | undefined;
  customFormationKind?: "8v8" | "11v11";
  /** Letterbox the pitch into the parent so the whole field stays visible. */
  fill?: boolean;
  /** Landscape turns the pitch a quarter turn to fill a TV screen. */
  orientation?: PitchOrientation;
  /** Full pitch or own-half perspective (FC26 style). */
  pitchLayout?: PitchLayout;
  selectedPlayerId?: string | null;
  canEdit?: boolean;
  onPlayerClick?: (playerId: string) => void;
}

/** Large flat pitch for TV / desktop presentation. */
export function PresentationPitchView({
  players,
  formationId,
  resolvedFormation,
  customFormationKind,
  fill = false,
  orientation = "portrait",
  pitchLayout = "full",
  selectedPlayerId = null,
  canEdit = false,
  onPlayerClick,
}: PresentationPitchViewProps) {
  const [pitchWidth, setPitchWidth] = useState(0);
  const formation = resolvedFormation;
  const fieldMode = fieldModeFromFormation(formationId, {
    customKind: customFormationKind,
  });
  const cfg = FIELDS[fieldMode];

  if (!formation) {
    return (
      <div className="rounded-xl bg-slate-800 p-8 text-center text-slate-400">
        Geen formatie geselecteerd.
      </div>
    );
  }

  if (pitchLayout === "halfPerspective") {
    return (
      <HalfPitchPerspective
        players={players}
        formation={formation}
        cfg={cfg}
        fill={fill}
        selectedPlayerId={selectedPlayerId}
        canEdit={canEdit}
        onPlayerClick={onPlayerClick}
      />
    );
  }

  // Card density follows the pitch's short side: rotating swaps which axis that
  // is, so a landscape pitch on a small panel keeps the smaller cards.
  const shortSide =
    orientation === "landscape" ? (pitchWidth * cfg.w) / cfg.h : pitchWidth;
  const sizeMode: CardSizeMode =
    fill && shortSide > 0 && shortSide < 720 ? "auto" : "presentation";

  const onField = players.filter((p) => p.onField);
  const playerInSlot = (slotId: number) =>
    onField.find((p) => Number(p.fieldSlotIndex) === Number(slotId));
  const slots = orientSlots(formation.slots, orientation);
  const aspect = orientAspect(cfg.w, cfg.h, orientation);

  return (
    <PitchFitFrame
      aspectW={aspect.aspectW}
      aspectH={aspect.aspectH}
      fill={fill}
      onWidth={setPitchWidth}
    >
      <FieldLines cfg={cfg} orientation={orientation} />
      <FormationLines slots={slots} links={formation.links} />
      {slots.map((slot) => {
        const player = playerInSlot(slot.id);
        const isSelected = !!player && selectedPlayerId === player.playerId;
        const isDimmed =
          canEdit &&
          selectedPlayerId !== null &&
          (!player || selectedPlayerId !== player.playerId);
        return (
          <FieldPlayerCard
            key={slot.id}
            name={player?.displayName ?? ""}
            number={player?.number}
            position={slot.position}
            photoUrl={player?.photoUrl}
            sizeMode={sizeMode}
            x={slot.x}
            y={slot.y}
            isSelected={isSelected}
            isDimmed={isDimmed}
            isEmpty={!player}
            onClick={() => {
              if (!player || !canEdit || !onPlayerClick) return;
              onPlayerClick(player.playerId);
            }}
          />
        );
      })}
    </PitchFitFrame>
  );
}
