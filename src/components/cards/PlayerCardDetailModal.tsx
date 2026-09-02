"use client";

import { useEffect } from "react";

type CardProfile = {
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
};

export type DeckPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  photoUrl: string | null;
  cardProfile: CardProfile | null;
  showFullIdentity: boolean;
};

interface PlayerCardDetailModalProps {
  player: DeckPlayer;
  onClose: () => void;
  showMinutes?: boolean;
}

/** Full-screen-ish detail for a spelerskaart (kleedkamer deck). */
export function PlayerCardDetailModal({
  player,
  onClose,
  showMinutes = false,
}: PlayerCardDetailModalProps) {
  const stats = player.cardProfile?.seasonStats;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-card-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-dia-yellow/40 bg-dia-black p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-dia-yellow/70">
              {player.positionPrimary ?? "Speler"}
              {player.number != null ? ` · #${player.number}` : ""}
            </p>
            <h2
              id="player-card-detail-title"
              className="text-xl font-bold text-white"
            >
              {player.displayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white hover:bg-white/20"
            aria-label="Sluiten detail"
          >
            ×
          </button>
        </div>

        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photoUrl}
            alt=""
            className="mb-4 aspect-[3/4] max-h-64 w-full rounded-xl object-cover"
          />
        ) : null}

        {player.cardProfile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-dia-yellow">
              <span>Level {player.cardProfile.level}</span>
              <span>{player.cardProfile.xp} XP</span>
            </div>
            {stats ? (
              <dl className="grid grid-cols-2 gap-3">
                <Stat label="Wedstrijden" value={stats.matches} />
                {showMinutes ? (
                  <Stat label="Minuten" value={stats.minutes} />
                ) : null}
                <Stat label="Doelpunten" value={stats.goals} />
                <Stat label="Assists" value={stats.assists} />
                <Stat label="Clean sheets" value={stats.cleanSheets} />
              </dl>
            ) : null}
            {player.cardProfile.badges &&
            player.cardProfile.badges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {player.cardProfile.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded border border-dia-yellow/30 bg-dia-yellow/15 px-2 py-1 text-xs text-dia-yellow"
                  >
                    {badge.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            Geen seizoensstatistieken beschikbaar (geen gamificatie-toestemming).
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full min-h-[48px] rounded-xl bg-dia-yellow font-semibold text-black"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <dt className="text-xs text-white/50">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-dia-yellow">{value}</dd>
    </div>
  );
}
