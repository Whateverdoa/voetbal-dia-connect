"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TeamLogo } from "@/components/TeamLogo";
import { MatchClock } from "@/components/match/MatchClock";
import type { MatchStatus } from "@/components/match/types";
import { createCorrelationId } from "@/lib/correlationId";
import { formatMatchDateNl, formatMatchTimeNl } from "@/lib/dateUtils";
import {
  DiaScorerPrompt,
  ScoreColumn,
  ShirtNumberPrompt,
} from "./RefereeScorePrompts";

interface RefereeMatchConsoleProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
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

type PendingTeam = "home" | "away" | null;

export function RefereeMatchConsole({
  matchId,
  status,
  currentQuarter,
  quarterCount,
  regulationDurationMinutes = 60,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
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
  const pauseClockMut = useMutation(api.matchActions.pauseClock);
  const resumeClockMut = useMutation(api.matchActions.resumeClock);
  const adjustScore = useMutation(api.matchActions.adjustScore);

  const [isLoading, setIsLoading] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [endMatchConfirm, setEndMatchConfirm] = useState(false);
  const [pendingTeam, setPendingTeam] = useState<PendingTeam>(null);
  const [shirtNumber, setShirtNumber] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(
    null
  );

  const isFinalSegment = currentQuarter >= quarterCount;
  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";
  const quarterLabel = quarterCount === 2 ? "helft" : "kwart";
  const statusLabel = (() => {
    if (isHalftime) return "Rust";
    if (isFinished) return "Afgelopen";
    if (isPaused) return `${quarterCount === 2 ? "Helft" : "Kwart"} ${currentQuarter} - gepauzeerd`;
    if (isLive) {
      return quarterCount === 2
        ? `Helft ${currentQuarter}`
        : `Kwart ${currentQuarter}`;
    }
    return "Nog niet begonnen";
  })();
  const surfaceClasses = isPaused
    ? "from-orange-500 to-orange-600"
    : isLive
      ? "from-green-600 to-green-700"
      : isHalftime
        ? "from-orange-500 to-orange-600"
        : isFinished
          ? "from-red-600 to-red-700"
          : "from-blue-600 to-blue-700";

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

  const handleDecrement = async (team: "home" | "away") => {
    await withLoading(
      () =>
        adjustScore({
          matchId,
          team,
          delta: -1,
          correlationId: createCorrelationId("adjust-score"),
        }),
      handleScoreError
    );
  };

  const handleIncrementStart = (team: "home" | "away") => {
    setPendingTeam(team);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

  const handleIncrementConfirm = async (skip: boolean) => {
    if (!pendingTeam) return;

    await withLoading(async () => {
      const isDiaGoal = pendingTeam === diaTeamSide;
      let scorerNumber: number | undefined;
      let scorerPlayerId: Id<"players"> | undefined;

      if (isDiaGoal) {
        scorerPlayerId = skip ? undefined : selectedPlayerId || undefined;
      } else {
        const parsedNumber = skip ? undefined : parseInt(shirtNumber, 10);
        scorerNumber =
          parsedNumber != null && !isNaN(parsedNumber) && parsedNumber > 0
            ? parsedNumber
            : undefined;
      }

      await adjustScore({
        matchId,
        team: pendingTeam,
        delta: 1,
        scorerNumber,
        scorerPlayerId,
        correlationId: createCorrelationId("adjust-score"),
      });
    }, handleScoreError);

    setPendingTeam(null);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

  const handleCancelPrompt = () => {
    setPendingTeam(null);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

  return (
    <>
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-2 py-1.5 md:px-4 md:py-4">
        <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <header
            className={`shrink-0 bg-gradient-to-b ${surfaceClasses} px-3 pb-3 pt-3 text-center text-white sm:px-5 sm:pb-5 sm:pt-5`}
          >
            <div className="mx-auto max-w-md">
              <div className="mb-2 sm:mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                  {isLive && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  )}
                  {statusLabel}
                </span>
              </div>

              {isScheduled && scheduledAt != null && (
                <p className="mb-2 text-xs tabular-nums text-white/90 sm:mb-3 sm:text-sm">
                  <time dateTime={new Date(scheduledAt).toISOString()}>
                    {formatMatchDateNl(scheduledAt)} ·{" "}
                    {formatMatchTimeNl(scheduledAt)}
                  </time>
                </p>
              )}

              <div className="rounded-[1.35rem] border border-white/20 bg-black/20 px-3 py-2.5 shadow-2xl backdrop-blur-sm sm:rounded-[1.75rem] sm:px-4 sm:py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                  Wedstrijdklok
                </p>
                <div className="mt-1.5 flex flex-col items-center sm:mt-2">
                  <MatchClock
                    currentQuarter={currentQuarter}
                    quarterCount={quarterCount}
                    regulationDurationMinutes={regulationDurationMinutes}
                    quarterStartedAt={quarterStartedAt}
                    pausedAt={pausedAt}
                    accumulatedPauseTime={accumulatedPauseTime}
                    status={status}
                    className="font-sans text-[2.7rem] font-medium leading-none tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-6xl"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-center gap-3 font-sans tabular-nums sm:mt-4 sm:gap-4">
                <span className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">
                  {homeScore}
                </span>
                <span className="text-2xl font-medium text-white/85 sm:text-4xl">
                  -
                </span>
                <span className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">
                  {awayScore}
                </span>
              </div>

              <div className="mx-auto mt-1.5 flex max-w-lg items-start justify-between gap-2 text-[11px] opacity-90 sm:mt-3 sm:gap-3 sm:text-sm">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <TeamLogo
                    logoUrl={homeLogoUrl}
                    teamName={homeName}
                    size="sm"
                    className="ring-2 ring-white/30"
                  />
                  <span className="text-center font-medium leading-tight">
                    {homeName}
                  </span>
                </div>
                <span className="shrink-0 pt-6 text-xs opacity-75">vs</span>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <TeamLogo
                    logoUrl={awayLogoUrl}
                    teamName={awayName}
                    size="sm"
                    className="ring-2 ring-white/30"
                  />
                  <span className="text-center font-medium leading-tight">
                    {awayName}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
            <div className="space-y-2.5">
              <div className="space-y-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Klokbediening
                </h2>

                {clockError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {clockError}
                  </div>
                )}

                {isScheduled && (
                  <button
                    onClick={() =>
                      void withLoading(
                        () => startMatch({ matchId }),
                        handleClockError
                      )
                    }
                    disabled={isLoading}
                    className="w-full min-h-[52px] rounded-xl bg-dia-green py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:bg-dia-green-light disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-5 sm:text-xl"
                  >
                    {isLoading ? "Bezig..." : "Start wedstrijd"}
                  </button>
                )}

                {isLive &&
                  (endMatchConfirm ? (
                    <div className="space-y-2">
                      <p className="px-1 text-center text-sm font-medium text-gray-800">
                        Is de wedstrijd echt afgelopen?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEndMatchConfirm(false)}
                          disabled={isLoading}
                          className="min-h-[48px] rounded-xl border-2 border-gray-300 py-2.5 font-semibold text-gray-700 transition-transform hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[56px] sm:py-4"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEndMatchConfirm(false);
                            void withLoading(
                              () =>
                                nextQuarter({
                                  matchId,
                                  correlationId: createCorrelationId(
                                    "next-quarter"
                                  ),
                                }),
                              handleClockError
                            );
                          }}
                          disabled={isLoading}
                          className="min-h-[48px] rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-transform hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[56px] sm:py-4"
                        >
                          {isLoading ? "Bezig..." : "Ja, beëindigen"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {isPaused ? (
                        <button
                          onClick={() =>
                            void withLoading(
                              () => resumeClockMut({ matchId }),
                              handleClockError
                            )
                          }
                          disabled={isLoading}
                          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-dia-green py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:bg-dia-green-light disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-4 sm:text-base"
                        >
                          <span className="text-xl">▶</span>
                          {isLoading ? "Bezig..." : "Hervat"}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            void withLoading(
                              () => pauseClockMut({ matchId }),
                              handleClockError
                            )
                          }
                          disabled={isLoading}
                          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-4 sm:text-base"
                        >
                          <span className="text-xl">⏸</span>
                          {isLoading ? "Bezig..." : "Pauze"}
                        </button>
                      )}

                      {isFinalSegment ? (
                        <button
                          type="button"
                          onClick={() => setEndMatchConfirm(true)}
                          disabled={isLoading}
                          className="min-h-[52px] rounded-xl border-2 border-gray-300 px-2 py-2.5 text-sm font-semibold text-gray-700 transition-transform hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-4 sm:text-base"
                        >
                          Einde match
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void withLoading(
                              () =>
                                nextQuarter({
                                  matchId,
                                  correlationId: createCorrelationId(
                                    "next-quarter"
                                  ),
                                }),
                              handleClockError
                            )
                          }
                          disabled={isLoading}
                          className="min-h-[52px] rounded-xl border-2 border-gray-300 px-2 py-2.5 text-sm font-semibold text-gray-700 transition-transform hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-4 sm:text-base"
                        >
                          {isLoading
                            ? "Bezig..."
                            : `Einde ${quarterLabel} ${currentQuarter}`}
                        </button>
                      )}
                    </div>
                  ))}

                {isHalftime && (
                  <button
                    onClick={() =>
                      void withLoading(
                        () => resumeHalftime({ matchId }),
                        handleClockError
                      )
                    }
                    disabled={isLoading}
                    className="w-full min-h-[52px] rounded-xl bg-dia-green py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:bg-dia-green-light disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-5 sm:text-xl"
                  >
                    {isLoading
                      ? "Bezig..."
                      : `Start ${quarterLabel} ${currentQuarter}`}
                  </button>
                )}

                {isFinished && (
                  <div className="py-4 text-center">
                    <p className="font-medium text-gray-500">
                      Wedstrijd is afgelopen
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-200" />

              <div className="space-y-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Score aanpassen
                </h2>

                {scoreError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {scoreError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ScoreColumn
                    teamName={homeName}
                    score={homeScore}
                    team="home"
                    isLoading={isLoading}
                    onIncrement={handleIncrementStart}
                    onDecrement={handleDecrement}
                    showScore={false}
                  />
                  <ScoreColumn
                    teamName={awayName}
                    score={awayScore}
                    team="away"
                    isLoading={isLoading}
                    onIncrement={handleIncrementStart}
                    onDecrement={handleDecrement}
                    showScore={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {pendingTeam && (
        <>
          <button
            type="button"
            aria-label="Sluit score-invoer"
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={handleCancelPrompt}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2 pb-2 md:px-4 md:pb-4">
            {pendingTeam === diaTeamSide ? (
              <DiaScorerPrompt
                teamName={pendingTeam === "home" ? homeName : awayName}
                players={diaPlayers}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                onConfirm={() => void handleIncrementConfirm(false)}
                onSkip={() => void handleIncrementConfirm(true)}
                onCancel={handleCancelPrompt}
                isLoading={isLoading}
              />
            ) : (
              <ShirtNumberPrompt
                teamName={pendingTeam === "home" ? homeName : awayName}
                shirtNumber={shirtNumber}
                onShirtNumberChange={setShirtNumber}
                onConfirm={() => void handleIncrementConfirm(false)}
                onSkip={() => void handleIncrementConfirm(true)}
                onCancel={handleCancelPrompt}
                isLoading={isLoading}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
