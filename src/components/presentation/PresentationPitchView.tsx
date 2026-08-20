"use client";

import { FieldLines } from "@/components/match/FieldLines";
import { FormationLines } from "@/components/match/FormationLines";
import { FieldPlayerCard } from "@/components/match/FieldPlayerCard";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import type { Formation } from "@/lib/formations/types";

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
}

/** Large flat pitch for TV / desktop presentation (read-only). */
export function PresentationPitchView({
  players,
  formationId,
  resolvedFormation,
}: PresentationPitchViewProps) {
  const formation = resolvedFormation;
  const fieldMode = fieldModeFromFormation(formationId, {});
  const cfg = FIELDS[fieldMode];

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
    <div className="w-full flex justify-center">
      <div
        className="relative w-full max-w-4xl overflow-hidden border-2 rounded-md shadow-2xl"
        style={{
          background: "#2d7a3a",
          borderColor: "#1e5c28",
          aspectRatio: `${cfg.w} / ${cfg.h}`,
        }}
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
              sizeMode="presentation"
              x={slot.x}
              y={slot.y}
              isSelected={false}
              isDimmed={false}
              isEmpty={!player}
              onClick={() => undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
