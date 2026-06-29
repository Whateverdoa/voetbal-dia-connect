"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { RefereeMatchConsole } from "@/components/referee/RefereeMatchConsole";
import type { MatchStatus } from "@/components/match/types";
import { resolveLogoUrl } from "@/lib/logos";

export default function RefereeMatchPage() {
  const params = useParams();
  const matchIdParam = params.id;
  const matchId =
    typeof matchIdParam === "string"
      ? (matchIdParam as Id<"matches">)
      : null;
  const match = useQuery(
    api.matches.getForReferee,
    matchId ? { matchId } : "skip",
  );

  if (!matchId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-red-600 font-medium">Ongeldige wedstrijdlink</p>
          <Link
            href="/scheidsrechter"
            className="inline-block py-2 px-4 bg-dia-green text-white rounded-lg font-medium hover:bg-green-700"
          >
            Terug naar overzicht
          </Link>
        </div>
      </main>
    );
  }

  if (match === undefined) {
    return <LoadingScreen />;
  }

  if (match === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-red-600 font-medium">Wedstrijd niet gevonden of je hebt geen toegang</p>
          <Link
            href="/scheidsrechter"
            className="inline-block py-2 px-4 bg-dia-green text-white rounded-lg font-medium hover:bg-green-700"
          >
            Terug naar overzicht
          </Link>
        </div>
      </main>
    );
  }

  const diaLogo = resolveLogoUrl(match.teamLogoUrl, match.clubLogoUrl);
  const oppLogo = match.opponentLogoUrl ?? null;
  const homeLogoUrl = match.isHome ? diaLogo : oppLogo;
  const awayLogoUrl = match.isHome ? oppLogo : diaLogo;

  return (
    <main className="flex h-[100svh] max-h-[100svh] flex-col overflow-hidden bg-gray-100 overscroll-none md:h-[100dvh] md:max-h-[100dvh]">
      <nav className="shrink-0 bg-gray-800 px-4 py-2 text-white">
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

      <RefereeMatchConsole
        matchId={match.id as Id<"matches">}
        status={match.status as MatchStatus}
        currentQuarter={match.currentQuarter}
        quarterCount={match.quarterCount}
        regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
        quarterStartedAt={match.quarterStartedAt}
        pausedAt={match.pausedAt}
        accumulatedPauseTime={match.accumulatedPauseTime}
        frozenClockMs={match.frozenClockMs}
        activeStoppageStartedAt={match.activeStoppageStartedAt}
        stoppageAdvisoryMs={match.stoppageAdvisoryMs}
        useBreakClock={match.useBreakClock}
        breakClockAutoStart={match.breakClockAutoStart}
        scheduledBreakEndAt={match.scheduledBreakEndAt}
        scheduledAt={match.scheduledAt}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        homeName={match.isHome ? match.teamName : match.opponent}
        awayName={match.isHome ? match.opponent : match.teamName}
        homeLogoUrl={homeLogoUrl}
        awayLogoUrl={awayLogoUrl}
        diaTeamSide={match.isHome ? "home" : "away"}
        diaPlayers={match.diaPlayers ?? []}
      />
    </main>
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
