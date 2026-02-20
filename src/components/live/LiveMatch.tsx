"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  LiveConnectionIndicator,
  GoalCelebration,
  ScoreWithAnimation,
  QuarterProgress,
  ShareButton,
  SoundToggle,
  useGoalNotification,
} from "./index";
import { MatchClock } from "@/components/match/MatchClock";
import { LineupSection } from "./LineupSection";
import { GoalsSection } from "./GoalsSection";
import { TimelineSection } from "./TimelineSection";
import type { MatchData, MatchEvent, LineupPlayer } from "./types";

interface LiveMatchProps {
  match: MatchData;
  code: string;
  isConnected: boolean;
}

export function LiveMatch({ match, code, isConnected }: LiveMatchProps) {
  const isLive = match.status === "live";
  const isPaused = isLive && match.pausedAt != null;
  const isHalftime = match.status === "halftime";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled" || match.status === "lineup";

  // Track previous scores for goal animation
  const prevScoresRef = useRef({ home: match.homeScore, away: match.awayScore });
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [isOurGoal, setIsOurGoal] = useState(true);
  const { notify } = useGoalNotification();

  // Detect score changes
  useEffect(() => {
    const prev = prevScoresRef.current;
    const homeScored = match.homeScore > prev.home;
    const awayScored = match.awayScore > prev.away;

    if (homeScored || awayScored) {
      // Determine if it's "our" goal (DIA team)
      const ourGoal = match.isHome ? homeScored : awayScored;
      setIsOurGoal(ourGoal);
      setShowGoalCelebration(true);
      notify();
    }

    prevScoresRef.current = { home: match.homeScore, away: match.awayScore };
  }, [match.homeScore, match.awayScore, match.isHome, notify]);

  const handleGoalCelebrationComplete = useCallback(() => {
    setShowGoalCelebration(false);
  }, []);

  // Filter relevant events for public view
  const publicEvents: MatchEvent[] = match.events.filter(
    (e) =>
      e.type === "goal" || e.type === "quarter_start" || e.type === "quarter_end"
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Goal celebration overlay */}
      <GoalCelebration
        show={showGoalCelebration}
        isOurGoal={isOurGoal}
        onComplete={handleGoalCelebrationComplete}
      />

      {/* Scoreboard header */}
      <header
        className={`p-6 text-white ${
          isLive
            ? "bg-gradient-to-b from-red-600 to-red-700"
            : isHalftime
            ? "bg-gradient-to-b from-orange-500 to-orange-600"
            : isFinished
            ? "bg-gradient-to-b from-gray-600 to-gray-700"
            : "bg-gradient-to-b from-dia-green to-green-700"
        }`}
      >
        <div className="max-w-lg mx-auto">
          {/* Status and quarter progress */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {isLive && !isPaused && (
                <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                  <MatchClock
                    currentQuarter={match.currentQuarter}
                    quarterCount={match.quarterCount}
                    quarterStartedAt={match.quarterStartedAt}
                    pausedAt={match.pausedAt}
                    accumulatedPauseTime={match.accumulatedPauseTime}
                    status={match.status}
                  />
                </span>
              )}
              {isPaused && (
                <span className="flex items-center gap-2 bg-yellow-500/30 px-3 py-1 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
                  GEPAUZEERD
                  <MatchClock
                    currentQuarter={match.currentQuarter}
                    quarterCount={match.quarterCount}
                    quarterStartedAt={match.quarterStartedAt}
                    pausedAt={match.pausedAt}
                    accumulatedPauseTime={match.accumulatedPauseTime}
                    status={match.status}
                  />
                </span>
              )}
              {isHalftime && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  RUST
                </span>
              )}
              {isFinished && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  AFGELOPEN
                </span>
              )}
              {isScheduled && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  NOG NIET BEGONNEN
                </span>
              )}
            </div>

            {/* Quarter progress indicator */}
            {!isScheduled && (
              <QuarterProgress
                currentQuarter={match.currentQuarter}
                quarterCount={match.quarterCount}
                status={match.status}
              />
            )}
          </div>

          {/* Teams and score */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-lg font-bold">
                {match.isHome ? match.teamName : match.opponent}
              </p>
              <p className="text-sm opacity-75">Thuis</p>
            </div>

            <div className="px-6">
              <ScoreWithAnimation
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                previousHomeScore={prevScoresRef.current.home}
                previousAwayScore={prevScoresRef.current.away}
              />
            </div>

            <div className="text-center flex-1">
              <p className="text-lg font-bold">
                {match.isHome ? match.opponent : match.teamName}
              </p>
              <p className="text-sm opacity-75">Uit</p>
            </div>
          </div>

          {/* Club name and share button */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm opacity-75">{match.clubName}</p>
            <ShareButton
              code={code}
              teamName={match.teamName}
              opponent={match.opponent}
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Connection indicator and sound toggle */}
        <div className="flex items-center justify-between">
          <LiveConnectionIndicator isConnected={isConnected} />
          <SoundToggle />
        </div>

        {/* Lineup section */}
        {match.showLineup && match.lineup && (
          <LineupSection lineup={match.lineup.filter((p): p is LineupPlayer => p !== null)} teamName={match.teamName} />
        )}

        {/* Goals section */}
        <GoalsSection events={publicEvents} teamName={match.teamName} />

        {/* Timeline section */}
        <TimelineSection
          events={publicEvents}
          teamName={match.teamName}
          isScheduled={isScheduled}
        />

        {/* Match code footer */}
        <div className="text-center text-sm text-gray-400 py-4 space-y-2">
          <p>
            Wedstrijd code: <span className="font-mono font-bold">{code}</span>
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="text-dia-green hover:underline">
              Andere wedstrijd
            </Link>
            {match.teamSlug && (
              <>
                <span className="text-gray-300">•</span>
                <Link
                  href={`/team/${match.teamSlug}/history`}
                  className="text-dia-green hover:underline"
                >
                  {match.teamName} geschiedenis
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
