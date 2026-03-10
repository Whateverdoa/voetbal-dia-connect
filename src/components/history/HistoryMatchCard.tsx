"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";
import { ResultBadge, type MatchResult } from "./ResultBadge";

export interface HistoryMatch {
  id: string;
  opponent: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
  scheduledAt?: number;
  scorers: string[];
  playingTime: {
    matchPlayerId: string;
    playerId: string;
    playerName: string;
    minutesPlayed: number;
  }[];
  goalEvents: {
    eventId: string;
    playerId: string | null;
    relatedPlayerId: string | null;
    playerName: string | null;
    relatedPlayerName: string | null;
    quarter: number;
    displayMinute: number | null;
    isOpponentGoal: boolean;
    isOwnGoal: boolean;
  }[];
}

interface HistoryMatchCardProps {
  match: HistoryMatch;
  canEdit?: boolean;
  coachPin?: string;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HistoryMatchCard({
  match,
  canEdit = false,
  coachPin,
}: HistoryMatchCardProps) {
  const correctMinutes = useMutation(api.historyActions.correctMatchPlayerMinutes);
  const enrichGoal = useMutation(api.matchActions.enrichGoal);
  const [showDetails, setShowDetails] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState<Record<string, string>>({});
  const [savingMinutesId, setSavingMinutesId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalScorerId, setGoalScorerId] = useState<string>("");
  const [goalAssistId, setGoalAssistId] = useState<string>("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ourScore = match.isHome ? match.homeScore : match.awayScore;
  const theirScore = match.isHome ? match.awayScore : match.homeScore;

  const result: MatchResult =
    ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "D";

  const playerOptions = useMemo(
    () =>
      match.playingTime.map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
      })),
    [match.playingTime]
  );

  const selectedGoal = useMemo(
    () => match.goalEvents.find((goal) => goal.eventId === selectedGoalId) ?? null,
    [match.goalEvents, selectedGoalId]
  );

  const openGoalEditor = (goalEventId: string) => {
    const goal = match.goalEvents.find((event) => event.eventId === goalEventId);
    setSelectedGoalId(goalEventId);
    setGoalScorerId(goal?.playerId ?? "");
    setGoalAssistId(goal?.relatedPlayerId ?? "");
  };

  const onSaveMinutes = async (matchPlayerId: string, currentMinutes: number) => {
    const raw = minutesDraft[matchPlayerId] ?? String(currentMinutes);
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setError("Ongeldige minutenwaarde");
      return;
    }

    setSavingMinutesId(matchPlayerId);
    setError(null);
    try {
      await correctMinutes({
        matchPlayerId: matchPlayerId as Id<"matchPlayers">,
        minutesPlayed: parsed,
        pin: coachPin,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setSavingMinutesId(null);
    }
  };

  const onSaveGoal = async () => {
    if (!selectedGoal) return;
    setSavingGoal(true);
    setError(null);
    try {
      await enrichGoal({
        matchId: match.id as Id<"matches">,
        eventId: selectedGoal.eventId as Id<"matchEvents">,
        scorerId: goalScorerId ? (goalScorerId as Id<"players">) : undefined,
        assistId: goalAssistId ? (goalAssistId as Id<"players">) : undefined,
        pin: coachPin,
        correlationId: createCorrelationId("history-enrich-goal"),
      });
      setSelectedGoalId(null);
      setGoalScorerId("");
      setGoalAssistId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {match.scheduledAt && (
              <p className="text-sm text-gray-500 mb-1">{formatDate(match.scheduledAt)}</p>
            )}
            <p className="font-semibold text-gray-900 truncate">
              {match.isHome ? "vs " : "@ "}
              {match.opponent}
            </p>
            {match.scorers.length > 0 && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                ⚽ {match.scorers.join(", ")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {match.homeScore} - {match.awayScore}
            </div>
            <ResultBadge result={result} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowDetails((current) => !current)}
            className="text-sm font-medium text-dia-green min-h-[36px]"
          >
            {showDetails ? "Details sluiten" : "Details bekijken"}
          </button>
          {canEdit && (
            <span className="text-xs px-2 py-1 rounded-full bg-dia-green/10 text-dia-green">
              Coach bewerken
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {showDetails && (
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">
                Speeltijd per speler
              </h3>
              <div className="space-y-2">
                {match.playingTime.map((entry) => (
                  <div
                    key={entry.matchPlayerId}
                    className="flex items-center gap-2 justify-between"
                  >
                    <span className="text-sm text-gray-700 truncate">
                      {entry.playerName}
                    </span>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={
                            minutesDraft[entry.matchPlayerId] ??
                            String(entry.minutesPlayed)
                          }
                          onChange={(event) =>
                            setMinutesDraft((current) => ({
                              ...current,
                              [entry.matchPlayerId]: event.target.value,
                            }))
                          }
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right"
                          inputMode="decimal"
                        />
                        <button
                          onClick={() =>
                            onSaveMinutes(entry.matchPlayerId, entry.minutesPlayed)
                          }
                          disabled={savingMinutesId === entry.matchPlayerId}
                          className="text-xs px-2 py-1 rounded-lg bg-dia-green text-white disabled:opacity-50"
                        >
                          Opslaan
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium tabular-nums text-gray-900">
                        {entry.minutesPlayed} min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Goals</h3>
              <div className="space-y-2">
                {match.goalEvents.map((goalEvent) => (
                  <div
                    key={goalEvent.eventId}
                    className="rounded-lg border border-gray-200 p-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-700">
                        K{goalEvent.quarter} •{" "}
                        {goalEvent.displayMinute != null
                          ? `${goalEvent.displayMinute}'`
                          : "?"}
                        {" • "}
                        {goalEvent.playerName ?? "Geen scorer"}
                      </span>
                      {canEdit && !goalEvent.isOpponentGoal && !goalEvent.isOwnGoal && (
                        <button
                          onClick={() => openGoalEditor(goalEvent.eventId)}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700"
                        >
                          Bewerk goal
                        </button>
                      )}
                    </div>
                    {goalEvent.relatedPlayerName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Assist: {goalEvent.relatedPlayerName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {canEdit && selectedGoal && (
              <section className="space-y-2 rounded-lg border border-dia-green/20 bg-dia-green/5 p-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Goal achteraf toewijzen
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={goalScorerId}
                    onChange={(event) => setGoalScorerId(event.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="">Scorer (optioneel)</option>
                    {playerOptions.map((option) => (
                      <option key={option.playerId} value={option.playerId}>
                        {option.playerName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={goalAssistId}
                    onChange={(event) => setGoalAssistId(event.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="">Assist (optioneel)</option>
                    {playerOptions.map((option) => (
                      <option key={option.playerId} value={option.playerId}>
                        {option.playerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setSelectedGoalId(null)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-300"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={onSaveGoal}
                    disabled={savingGoal}
                    className="text-xs px-2 py-1 rounded-lg bg-dia-green text-white disabled:opacity-50"
                  >
                    {savingGoal ? "Bezig..." : "Goal opslaan"}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
