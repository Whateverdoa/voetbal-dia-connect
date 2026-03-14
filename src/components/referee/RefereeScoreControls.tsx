"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";
import {
  DiaScorerPrompt,
  ScoreColumn,
  ShirtNumberPrompt,
} from "./RefereeScorePrompts";

interface RefereeScoreControlsProps {
  matchId: Id<"matches">;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  diaTeamSide: "home" | "away";
  diaPlayers: {
    playerId: Id<"players">;
    name: string;
    number?: number;
    onField: boolean;
  }[];
}

type PendingTeam = "home" | "away" | null;

export function RefereeScoreControls({
  matchId,
  homeScore,
  awayScore,
  homeName,
  awayName,
  diaTeamSide,
  diaPlayers,
}: RefereeScoreControlsProps) {
  const adjustScore = useMutation(api.matchActions.adjustScore);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the optional shirt number prompt
  const [pendingTeam, setPendingTeam] = useState<PendingTeam>(null);
  const [shirtNumber, setShirtNumber] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(
    null
  );

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    setError(msg.includes("Geen rechten") ? "Geen toegang" : `Fout: ${msg}`);
    setTimeout(() => setError(null), 5000);
  };

  /** Decrement: immediate, no prompt */
  const handleDecrement = async (team: "home" | "away") => {
    setIsLoading(true);
    setError(null);
    try {
      await adjustScore({
        matchId,
        team,
        delta: -1,
        correlationId: createCorrelationId("adjust-score"),
      });
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Increment: open the optional shirt number prompt */
  const handleIncrementStart = (team: "home" | "away") => {
    setPendingTeam(team);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

  /** Confirm increment with optional shirt number */
  const handleIncrementConfirm = async (skip: boolean) => {
    if (!pendingTeam) return;
    setIsLoading(true);
    setError(null);
    try {
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
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
      setPendingTeam(null);
      setShirtNumber("");
      setSelectedPlayerId(null);
    }
  };

  const handleCancel = () => {
    setPendingTeam(null);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center">
        Score aanpassen
      </h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Score columns */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreColumn
          teamName={homeName}
          score={homeScore}
          team="home"
          isLoading={isLoading}
          onIncrement={handleIncrementStart}
          onDecrement={handleDecrement}
        />
        <ScoreColumn
          teamName={awayName}
          score={awayScore}
          team="away"
          isLoading={isLoading}
          onIncrement={handleIncrementStart}
          onDecrement={handleDecrement}
        />
      </div>

      {/* Shirt number prompt overlay */}
      {pendingTeam && (
        <>
          {pendingTeam === diaTeamSide ? (
            <DiaScorerPrompt
              teamName={pendingTeam === "home" ? homeName : awayName}
              players={diaPlayers}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              onConfirm={() => handleIncrementConfirm(false)}
              onSkip={() => handleIncrementConfirm(true)}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          ) : (
            <ShirtNumberPrompt
              teamName={pendingTeam === "home" ? homeName : awayName}
              shirtNumber={shirtNumber}
              onShirtNumberChange={setShirtNumber}
              onConfirm={() => handleIncrementConfirm(false)}
              onSkip={() => handleIncrementConfirm(true)}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          )}
        </>
      )}
    </section>
  );
}
