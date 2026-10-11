"use client";

import { useState } from "react";
import { PlayerCardGamified } from "@/components/cards/PlayerCardGamified";
import {
  PlayerCardDetailModal,
  type DeckPlayer,
} from "@/components/cards/PlayerCardDetailModal";

export type { DeckPlayer };

interface TeamDeckGridProps {
  players: DeckPlayer[];
  /** Season minutes on the card face; off for parents/kiosk. */
  showMinutes?: boolean;
}

/** Dense overview of all team spelerskaarten; tap opens season-stat detail. */
export function TeamDeckGrid({
  players,
  showMinutes = false,
}: TeamDeckGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = players.find((p) => p.playerId === selectedId) ?? null;

  if (players.length === 0) {
    return (
      <p className="text-slate-400 text-center py-12">
        Geen spelers in de collectie (of nog geen toestemming).
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        {players.map((p) => (
          <button
            key={p.playerId}
            type="button"
            onClick={() => setSelectedId(p.playerId)}
            aria-label={`Details ${p.displayName}`}
            className="mx-auto w-full max-w-72 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-dia-yellow"
          >
            <PlayerCardGamified
              displayName={p.displayName}
              number={p.number}
              positionPrimary={p.positionPrimary}
              photoUrl={p.photoUrl}
              cardProfile={p.cardProfile}
              showFullIdentity={p.showFullIdentity}
              showMinutes={showMinutes}
              fcRatings={p.fcRatings}
              playStyleIds={p.playStyleIds}
              recognitions={p.recognitions}
            />
          </button>
        ))}
      </div>

      {selected ? (
        <PlayerCardDetailModal
          player={selected}
          showMinutes={showMinutes}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}
