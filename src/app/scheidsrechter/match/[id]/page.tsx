"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { MatchClock } from "@/components/match/MatchClock";
import { RefereeClockControls } from "@/components/referee/RefereeClockControls";
import { RefereeScoreControls } from "@/components/referee/RefereeScoreControls";
import type { MatchStatus } from "@/components/match/types";

export default function RefereeMatchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RefereeMatchContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-dia-green border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500">Laden...</p>
      </div>
    </main>
  );
}

function RefereeMatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as string;
  const pin = searchParams.get("pin") || "";
  const code = searchParams.get("code") || "";

  const match = useQuery(
    api.matches.getForReferee,
    code && pin ? { code, pin } : "skip"
  );

  if (match === undefined) {
    return <LoadingScreen />;
  }

  if (match === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-red-600 font-medium">Wedstrijd niet gevonden of PIN ongeldig</p>
          <Link
            href="/scheidsrechter"
            className="inline-block py-2 px-4 bg-dia-green text-white rounded-lg font-medium hover:bg-green-700"
          >
            Opnieuw proberen
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      {/* Top bar */}
      <nav className="bg-gray-800 text-white px-4 py-2 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link
            href="/scheidsrechter"
            className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1 min-h-[44px] px-2 -ml-2"
          >
            ← Terug
          </Link>
          <span className="bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Scheidsrechter
          </span>
        </div>
      </nav>

      {/* Score header */}
      <RefereeScoreHeader
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        teamName={match.teamName}
        opponent={match.opponent}
        isHome={match.isHome}
        status={match.status as MatchStatus}
        currentQuarter={match.currentQuarter}
        quarterCount={match.quarterCount}
        quarterStartedAt={match.quarterStartedAt}
        pausedAt={match.pausedAt}
        accumulatedPauseTime={match.accumulatedPauseTime}
      />

      {/* Score controls + Clock controls */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <RefereeScoreControls
          matchId={match.id as Id<"matches">}
          pin={pin}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          homeName={match.isHome ? match.teamName : match.opponent}
          awayName={match.isHome ? match.opponent : match.teamName}
        />
        <RefereeClockControls
          matchId={match.id as Id<"matches">}
          pin={pin}
          status={match.status as MatchStatus}
          currentQuarter={match.currentQuarter}
          quarterCount={match.quarterCount}
          pausedAt={match.pausedAt}
        />
      </div>
    </main>
  );
}

/** Compact score header for the referee view */
function RefereeScoreHeader({
  homeScore,
  awayScore,
  teamName,
  opponent,
  isHome,
  status,
  currentQuarter,
  quarterCount,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
}: {
  homeScore: number;
  awayScore: number;
  teamName: string;
  opponent: string;
  isHome: boolean;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
}) {
  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";

  const getLabel = () => {
    if (isHalftime) return "Rust";
    if (isFinished) return "Afgelopen";
    if (isPaused) return `${quarterCount === 2 ? "Helft" : "Kwart"} ${currentQuarter} — Gepauzeerd`;
    if (isLive) return quarterCount === 2 ? `Helft ${currentQuarter}` : `Kwart ${currentQuarter}`;
    return "Nog niet begonnen";
  };

  return (
    <header
      className={`p-6 text-white text-center ${
        isPaused
          ? "bg-gradient-to-b from-orange-500 to-orange-600"
          : isLive
            ? "bg-gradient-to-b from-red-600 to-red-700"
            : isHalftime
              ? "bg-gradient-to-b from-orange-500 to-orange-600"
              : isFinished
                ? "bg-gradient-to-b from-gray-600 to-gray-700"
                : "bg-gradient-to-b from-dia-green to-green-700"
      }`}
    >
      <div className="max-w-lg mx-auto">
        {/* Status + Clock */}
        <div className="mb-3">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2">
            {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
            {getLabel()}
            {isLive && (
              <MatchClock
                currentQuarter={currentQuarter}
                quarterCount={quarterCount}
                quarterStartedAt={quarterStartedAt}
                pausedAt={pausedAt}
                accumulatedPauseTime={accumulatedPauseTime}
                status={status}
              />
            )}
          </span>
        </div>

        {/* Score */}
        <div className="text-6xl font-bold tabular-nums tracking-tight">
          {homeScore} - {awayScore}
        </div>

        {/* Teams */}
        <div className="flex justify-between items-center text-sm opacity-90 mt-3 max-w-xs mx-auto">
          <span className="font-medium">{isHome ? teamName : opponent}</span>
          <span className="text-xs opacity-75">vs</span>
          <span className="font-medium">{isHome ? opponent : teamName}</span>
        </div>
      </div>
    </header>
  );
}
