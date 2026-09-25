"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuarterEndReminder } from "@/lib/matchClock/useQuarterEndReminder";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "@/components/match/types";
import { createCorrelationId } from "@/lib/correlationId";
import { RefereeCardControls } from "./RefereeCardControls";
import { RefereeClockPanel } from "./RefereeClockPanel";
import { RefereeMatchHeader } from "./RefereeMatchHeader";
import { RefereeScoreFlow } from "./RefereeScoreFlow";
import {
  refereeStatusLabel,
  refereeSurfaceClasses,
} from "./refereeMatchSurface";

interface RefereeMatchConsoleProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  frozenClockMs?: number;
  activeStoppageStartedAt?: number;
  stoppageAdvisoryMs?: number;
  useBreakClock?: boolean;
  breakClockAutoStart?: boolean;
  scheduledBreakEndAt?: number;
  scheduledAt?: number;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  diaTeamSide: "home" | "away";
  diaPlayers: {
    playerId: Id<"players">;
    name: string;
    number?: number;
    onField: boolean;
  }[];
}

export function RefereeMatchConsole({
  matchId,
  status,
  currentQuarter,
  quarterCount,
  regulationDurationMinutes = 60,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
  frozenClockMs,
  activeStoppageStartedAt,
  stoppageAdvisoryMs,
  useBreakClock = true,
  breakClockAutoStart = true,
  scheduledBreakEndAt,
  scheduledAt,
  homeScore,
  awayScore,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  diaTeamSide,
  diaPlayers,
}: RefereeMatchConsoleProps) {
  const startMatch = useMutation(api.matchActions.start);
  const nextQuarter = useMutation(api.matchActions.nextQuarter);
  const resumeHalftime = useMutation(api.matchActions.resumeFromHalftime);

  const [isLoading, setIsLoading] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [endMatchConfirm, setEndMatchConfirm] = useState(false);

  const isLive = status === "live";
  const clockSnapshot = useMemo(
    () => ({
      currentQuarter,
      quarterCount,
      regulationDurationMinutes,
      quarterStartedAt,
      frozenClockMs,
      status,
    }),
    [
      currentQuarter,
      quarterCount,
      regulationDurationMinutes,
      quarterStartedAt,
      frozenClockMs,
      status,
    ]
  );
  const { message: quarterReminderMessage, dismiss: dismissQuarterReminder } =
    useQuarterEndReminder(clockSnapshot);
  const hasInterruption = isLive && (activeStoppageStartedAt ?? pausedAt) != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";
  const statusLabel = refereeStatusLabel({
    status,
    isLive,
    hasInterruption,
    currentQuarter,
    quarterCount,
  });
  const surfaceClasses = refereeSurfaceClasses({
    isLive,
    isHalftime,
    isFinished,
    hasInterruption,
  });

  useEffect(() => {
    setEndMatchConfirm(false);
  }, [currentQuarter, status]);

  useEffect(() => {
    if (!endMatchConfirm) return;
    const timer = setTimeout(() => setEndMatchConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [endMatchConfirm]);

  const withLoading = async (
    action: () => Promise<unknown>,
    onError: (message: string) => void
  ) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Onbekende fout";
      onError(`Fout: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockError = (message: string) => {
    setClockError(message);
    setTimeout(() => setClockError(null), 5000);
  };

  const handleScoreError = (message: string) => {
    setScoreError(message);
    setTimeout(() => setScoreError(null), 5000);
  };

  return (
    <>
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-2 py-1.5 md:px-4 md:py-4">
        <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <RefereeMatchHeader
            status={status}
            statusLabel={statusLabel}
            surfaceClasses={surfaceClasses}
            isLive={isLive}
            isScheduled={isScheduled}
            scheduledAt={scheduledAt}
            currentQuarter={currentQuarter}
            quarterCount={quarterCount}
            regulationDurationMinutes={regulationDurationMinutes}
            quarterStartedAt={quarterStartedAt}
            pausedAt={pausedAt}
            accumulatedPauseTime={accumulatedPauseTime}
            frozenClockMs={frozenClockMs}
            homeScore={homeScore}
            awayScore={awayScore}
            homeName={homeName}
            awayName={awayName}
            homeLogoUrl={homeLogoUrl}
            awayLogoUrl={awayLogoUrl}
          />

          <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
            <div className="space-y-2.5">
              <RefereeClockPanel
                matchId={matchId}
                status={status}
                currentQuarter={currentQuarter}
                quarterCount={quarterCount}
                pausedAt={pausedAt}
                activeStoppageStartedAt={activeStoppageStartedAt}
                stoppageAdvisoryMs={stoppageAdvisoryMs}
                quarterReminderMessage={quarterReminderMessage}
                onDismissQuarterReminder={dismissQuarterReminder}
                useBreakClock={useBreakClock}
                breakClockAutoStart={breakClockAutoStart}
                scheduledBreakEndAt={scheduledBreakEndAt}
                isLoading={isLoading}
                clockError={clockError}
                endMatchConfirm={endMatchConfirm}
                onSetEndMatchConfirm={setEndMatchConfirm}
                onStartMatch={() => startMatch({ matchId })}
                onNextQuarter={() =>
                  nextQuarter({
                    matchId,
                    correlationId: createCorrelationId("next-quarter"),
                  })
                }
                onResumeHalftime={() => resumeHalftime({ matchId })}
                onClockAction={(action, onError) =>
                  void withLoading(action, onError)
                }
                onClockError={handleClockError}
              />

              <div className="h-px bg-gray-200" />

              <RefereeScoreFlow
                matchId={matchId}
                homeName={homeName}
                awayName={awayName}
                homeScore={homeScore}
                awayScore={awayScore}
                isLoading={isLoading}
                scoreError={scoreError}
                canRecord={isLive || isHalftime}
                withLoading={withLoading}
                onScoreError={handleScoreError}
                cardControls={
                  <RefereeCardControls
                    matchId={matchId}
                    teamName={diaTeamSide === "home" ? homeName : awayName}
                    opponentName={diaTeamSide === "home" ? awayName : homeName}
                    players={diaPlayers}
                    canRecordCards={isLive || isHalftime}
                  />
                }
              />
            </div>
          </div>
        </section>
      </div>

    </>
  );
}
