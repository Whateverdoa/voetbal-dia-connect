"use client";

import { PlayerCardGamified } from "@/components/cards/PlayerCardGamified";

type DeckPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  photoUrl: string | null;
  cardProfile: {
    xp: number;
    level: number;
    rarity: "common" | "rare" | "epic";
    seasonStats: {
      matches: number;
      minutes: number;
      goals: number;
      assists: number;
      cleanSheets: number;
    };
    badges?: string[];
  } | null;
  showFullIdentity: boolean;
};

interface TeamDeckGridProps {
  players: DeckPlayer[];
}

export function TeamDeckGrid({ players }: TeamDeckGridProps) {
  if (players.length === 0) {
    return (
      <p className="text-slate-400 text-center py-12">
        Geen spelers in de collectie (of nog geen toestemming).
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {players.map((p) => (
        <button
          key={p.playerId}
          type="button"
          title="Details volgen later"
          className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-dia-yellow"
        >
          <PlayerCardGamified
            displayName={p.displayName}
            number={p.number}
            positionPrimary={p.positionPrimary}
            photoUrl={p.photoUrl}
            cardProfile={p.cardProfile}
            showFullIdentity={p.showFullIdentity}
          />
        </button>
      ))}
    </div>
  );
}
