"use client";

import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { getFormation } from "@/lib/formations";
import type { LineupPlayer } from "./types";

interface LivePitchSectionProps {
  lineup: LineupPlayer[];
  formationId?: string;
  teamName: string;
}

/** Read-only pitch on public live page when lineup is shown. */
export function LivePitchSection({
  lineup,
  formationId,
  teamName,
}: LivePitchSectionProps) {
  const formation = getFormation(formationId);
  if (!formation) return null;

  const players = lineup.map((p) => ({
    playerId: p.id,
    displayName: p.name,
    number: p.number ?? null,
    onField: p.onField,
    fieldSlotIndex: p.fieldSlotIndex ?? null,
    photoUrl: p.photoUrl ?? null,
  }));

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <span>⚽</span> Veld · {teamName}
      </h2>
      <PresentationPitchView
        players={players}
        formationId={formationId}
        resolvedFormation={formation}
      />
    </section>
  );
}
