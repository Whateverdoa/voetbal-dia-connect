"use client";

import { useState } from "react";
import { CardModal, type CardModalPlayer } from "@/components/match/CardModal";
import type { Id } from "@/convex/_generated/dataModel";

type RefereeCardControlsProps = {
  matchId: Id<"matches">;
  teamName: string;
  opponentName: string;
  players: CardModalPlayer[];
  canRecordCards: boolean;
};

export function RefereeCardControls({
  matchId,
  teamName,
  opponentName,
  players,
  canRecordCards,
}: RefereeCardControlsProps) {
  const [showModal, setShowModal] = useState(false);

  if (!canRecordCards && !showModal) {
    return null;
  }

  return (
    <>
      {canRecordCards ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-yellow-400 bg-yellow-50 text-base font-bold text-yellow-950 active:scale-[0.98]"
        >
          🟨🟥 Kaart geven
        </button>
      ) : null}
      {showModal ? (
        <CardModal
          matchId={matchId}
          players={players}
          teamName={teamName}
          opponentName={opponentName}
          skipNames
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
