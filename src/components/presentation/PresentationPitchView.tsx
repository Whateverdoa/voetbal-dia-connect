"use client";

import { useState } from "react";
import { FieldLines } from "@/components/match/FieldLines";
import { FormationLines } from "@/components/match/FormationLines";
import { FieldPlayerCard } from "@/components/match/FieldPlayerCard";
import { PitchFitFrame } from "@/components/presentation/PitchFitFrame";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import type { Formation } from "@/lib/formations/types";
import type { CardSizeMode } from "@/hooks/useCardSize";

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
}

/** Large flat pitch for TV / desktop presentation (read-only). */
export function PresentationPitchView({
  players,
  formationId,
  resolvedFormation,
  customFormationKind,
  fill = false,
}: PresentationPitchViewProps) {
  const [pitchWidth, setPitchWidth] = useState(0);
  const formation = resolvedFormation;
  const fieldMode = fieldModeFromFormation(formationId, {
    customKind: customFormationKind,
  });
  const cfg = FIELDS[fieldMode];
  const sizeMode: CardSizeMode =
    fill && pitchWidth > 0 && pitchWidth < 720 ? "auto" : "presentation";

  if (!formation) {
    return (
      <div className="rounded-xl bg-slate-800 p-8 text-center text-slate-400">
        Geen formatie geselecteerd.
      </div>
    );
  }

  const onField = players.filter((p) => p.onField);
  const playerInSlot = (slotId: number) =>
    onField.find((p) => Number(p.fieldSlotIndex) === Number(slotId));

  return (
    <PitchFitFrame
      aspectW={cfg.w}
      aspectH={cfg.h}
      fill={fill}
      onWidth={setPitchWidth}
    >
      <FieldLines cfg={cfg} />
      <FormationLines slots={formation.slots} links={formation.links} />
      {formation.slots.map((slot) => {
        const player = playerInSlot(slot.id);
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
            isSelected={false}
            isDimmed={false}
            isEmpty={!player}
            onClick={() => undefined}
          />
        );
      })}
    </PitchFitFrame>
  );
}
