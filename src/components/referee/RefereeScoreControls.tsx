"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";

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
  embedded?: boolean;
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
  embedded = false,
}: RefereeScoreControlsProps) {
  const adjustScore = useMutation(api.matchActions.adjustScore);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTeam, setPendingTeam] = useState<PendingTeam>(null);
  const [shirtNumber, setShirtNumber] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<"players"> | null>(
    null
  );

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    setError(`Fout: ${msg}`);
    setTimeout(() => setError(null), 5000);
  };

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

  const handleIncrementStart = (team: "home" | "away") => {
    setPendingTeam(team);
    setShirtNumber("");
    setSelectedPlayerId(null);
  };

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
  const Wrapper = embedded ? "div" : "section";

  return (
    <>
      <Wrapper
        className={
          embedded
            ? "space-y-3"
            : "fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg rounded-t-3xl border border-b-0 border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur md:static md:rounded-xl md:border-b md:shadow-md"
        }
      >
        <h2
          className={`text-sm font-semibold text-gray-500 uppercase tracking-wide ${
            embedded ? "text-left" : "text-center"
          }`}
        >
          Score aanpassen
        </h2>

        {error && (
          <div className={`${embedded ? "" : "mt-3 "}p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium`}>
            {error}
          </div>
        )}

        <div className={`${embedded ? "" : "mt-3 "}grid grid-cols-2 gap-3`}>
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
      </Wrapper>

      {pendingTeam && (
        <>
          <button
            type="button"
            aria-label="Sluit score-invoer"
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={handleCancel}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2 pb-2 md:px-0 md:pb-0">
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
          </div>
        </>
      )}
    </>
  );
}

function DiaScorerPrompt({
  teamName,
  players,
  selectedPlayerId,
  onSelectPlayer,
  onConfirm,
  onSkip,
  onCancel,
  isLoading,
}: {
  teamName: string;
  players: {
    playerId: Id<"players">;
    name: string;
    number?: number;
    onField: boolean;
  }[];
  selectedPlayerId: Id<"players"> | null;
  onSelectPlayer: (id: Id<"players">) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const sortedPlayers = [...players].sort(
    (a, b) => Number(b.onField) - Number(a.onField)
  );

  return (
    <div className="rounded-t-3xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 md:rounded-xl">
      <p className="text-sm font-medium text-gray-700 text-center">
        Doelpunt voor <strong>{teamName}</strong>
      </p>
      <label className="block text-xs text-gray-500 text-center">
        Selecteer de scorer (DIA-team)
      </label>
      <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
        {sortedPlayers.map((player) => (
          <button
            key={String(player.playerId)}
            onClick={() => onSelectPlayer(player.playerId)}
            disabled={isLoading}
            className={`text-left px-3 py-2 rounded-lg border text-sm min-h-[44px] ${
              selectedPlayerId === player.playerId
                ? "border-dia-green bg-green-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <span className="font-medium">{player.name}</span>
            {player.number != null ? ` (#${player.number})` : ""}
            <span className="block text-xs text-gray-500">
              {player.onField ? "Op veld" : "Bank"}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 border border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          Annuleer
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Sla over"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !selectedPlayerId}
          className="flex-1 py-3 bg-dia-green text-white text-sm font-medium rounded-lg hover:bg-dia-green-light disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}

function ScoreColumn({
  teamName,
  score,
  team,
  isLoading,
  onIncrement,
  onDecrement,
}: {
  teamName: string;
  score: number;
  team: "home" | "away";
  isLoading: boolean;
  onIncrement: (team: "home" | "away") => void;
  onDecrement: (team: "home" | "away") => Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-gray-500 truncate max-w-full">
        {teamName}
      </span>
      <span className="text-3xl font-bold tabular-nums sm:text-4xl">{score}</span>
      <div className="flex gap-2 w-full">
        <button
          onClick={() => onDecrement(team)}
          disabled={isLoading || score === 0}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-xl font-bold rounded-lg min-h-[48px] active:scale-[0.96] transition-transform hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`${teamName} score -1`}
        >
          −
        </button>
        <button
          onClick={() => onIncrement(team)}
          disabled={isLoading}
          className="flex-1 py-3 bg-dia-green text-white text-xl font-bold rounded-lg min-h-[48px] active:scale-[0.96] transition-transform hover:bg-dia-green-light disabled:opacity-50"
          aria-label={`${teamName} score +1`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ShirtNumberPrompt({
  teamName,
  shirtNumber,
  onShirtNumberChange,
  onConfirm,
  onSkip,
  onCancel,
  isLoading,
}: {
  teamName: string;
  shirtNumber: string;
  onShirtNumberChange: (val: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-t-3xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 md:rounded-xl">
      <p className="text-sm font-medium text-gray-700 text-center">
        Doelpunt voor <strong>{teamName}</strong>
      </p>
      <label className="block text-xs text-gray-500 text-center">
        Rugnummer scorer? (optioneel)
      </label>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={1}
        max={99}
        value={shirtNumber}
        onChange={(e) => onShirtNumberChange(e.target.value)}
        placeholder="bijv. 7"
        className="w-full text-center text-2xl font-bold py-3 border-2 border-gray-300 rounded-xl focus:border-dia-green focus:outline-none placeholder:text-gray-300 placeholder:font-normal placeholder:text-lg"
        autoFocus
        disabled={isLoading}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 border border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          Annuleer
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Sla over"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !shirtNumber}
          className="flex-1 py-3 bg-dia-green text-white text-sm font-medium rounded-lg hover:bg-dia-green-light disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
