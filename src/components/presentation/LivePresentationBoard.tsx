"use client";

import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { getFormation } from "@/lib/formations";
import { MatchClock } from "@/components/match/MatchClock";

type PresentPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  onField: boolean;
  fieldSlotIndex: number | null;
  photoUrl?: string | null;
  isKeeper: boolean;
  absent: boolean;
};

interface LivePresentationBoardProps {
  teamName: string;
  opponent: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
  status: string;
  currentQuarter: number;
  quarterCount: number;
  formationId: string | null;
  quarterStartedAt: number | null;
  pausedAt: number | null;
  accumulatedPauseTime: number | null;
  frozenClockMs: number | null;
  players: PresentPlayer[];
}

export function LivePresentationBoard({
  teamName,
  opponent,
  isHome,
  homeScore,
  awayScore,
  status,
  currentQuarter,
  quarterCount,
  formationId,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
  frozenClockMs,
  players,
}: LivePresentationBoardProps) {
  const formation = getFormation(formationId ?? undefined);
  const homeLabel = isHome ? teamName : opponent;
  const awayLabel = isHome ? opponent : teamName;
  const statusLabel =
    status === "live"
      ? "LIVE"
      : status === "halftime"
        ? "RUST"
        : status === "finished"
          ? "EINDE"
          : status === "lineup"
            ? "OPSTELLING"
            : "GEPLAND";

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="shrink-0 text-center space-y-2">
        <p className="inline-block bg-dia-yellow text-black font-bold tracking-[0.3em] text-sm px-3 py-1 rounded">
          {statusLabel}
        </p>
        <div className="flex items-center justify-center gap-6 md:gap-12">
          <div className="text-right min-w-[120px]">
            <p className="text-lg md:text-2xl font-semibold truncate max-w-[200px] md:max-w-xs">
              {homeLabel}
            </p>
          </div>
          <div className="text-5xl md:text-7xl font-black tabular-nums">
            {homeScore}–{awayScore}
          </div>
          <div className="text-left min-w-[120px]">
            <p className="text-lg md:text-2xl font-semibold truncate max-w-[200px] md:max-w-xs">
              {awayLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-slate-300">
          <span className="text-sm uppercase tracking-wide">
            Kwart {currentQuarter}/{quarterCount}
          </span>
          <MatchClock
            status={status as "scheduled" | "lineup" | "live" | "halftime" | "finished"}
            quarterStartedAt={quarterStartedAt ?? undefined}
            frozenClockMs={frozenClockMs ?? undefined}
            currentQuarter={currentQuarter}
            quarterCount={quarterCount}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PresentationPitchView
          players={players.filter((p) => !p.absent)}
          formationId={formationId ?? undefined}
          resolvedFormation={formation}
          fill
        />
      </div>
    </div>
  );
}
