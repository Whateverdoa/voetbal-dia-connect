"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";

interface SubstitutionSuggestionsProps {
  matchId: Id<"matches">;
  pin: string;
}

interface PlayerSuggestion {
  playerId: Id<"players">;
  name: string;
  number?: number;
  minutesPlayed: number;
  onField: boolean;
  isKeeper: boolean;
}

interface Suggestion {
  playerOut: PlayerSuggestion;
  playerIn: PlayerSuggestion;
  timeDifference: number;
  reason: string;
}

export function SubstitutionSuggestions({ matchId, pin }: SubstitutionSuggestionsProps) {
  const suggestionsData = useQuery(api.matches.getSuggestedSubstitutions, { matchId, pin });
  const substitute = useMutation(api.matchActions.substitute);
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteSuggestion = async (suggestion: Suggestion, index: number) => {
    setExecutingIndex(index);
    setError(null);
    try {
      await substitute({
        matchId,
        pin,
        playerOutId: suggestion.playerOut.playerId,
        playerInId: suggestion.playerIn.playerId,
      });
    } catch (err) {
      console.error("Failed to execute substitution:", err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      if (message.includes("Invalid match or PIN")) {
        setError("Sessie verlopen. Herlaad de pagina.");
      } else {
        setError(`Wissel mislukt: ${message}`);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setExecutingIndex(null);
    }
  };

  if (suggestionsData === undefined) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (suggestionsData === null) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <p className="text-red-600 text-center py-4">Kon suggesties niet laden</p>
      </div>
    );
  }

  const { suggestions, onFieldCount, benchCount } = suggestionsData;

  // No suggestions available
  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          Wissel suggesties
        </h2>
        
        <div className="text-center py-6 text-gray-500">
          <div className="text-4xl mb-2">✓</div>
          <p className="font-medium">Geen suggesties nodig</p>
          <p className="text-sm mt-1">
            {benchCount === 0 
              ? "Geen spelers op de bank" 
              : "Speeltijd is redelijk verdeeld"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-xl">💡</span>
        Wissel suggesties
        <span className="ml-auto text-sm font-normal text-gray-500">
          {onFieldCount} op veld, {benchCount} op bank
        </span>
      </h2>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={`${suggestion.playerOut.playerId}-${suggestion.playerIn.playerId}`}
            suggestion={suggestion}
            onExecute={() => handleExecuteSuggestion(suggestion, index)}
            isExecuting={executingIndex === index}
            priority={index + 1}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Suggesties gebaseerd op gelijke speeltijd
      </p>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onExecute: () => void;
  isExecuting: boolean;
  priority: number;
}

function SuggestionCard({ suggestion, onExecute, isExecuting, priority }: SuggestionCardProps) {
  const { playerOut, playerIn, timeDifference, reason } = suggestion;

  // Determine urgency based on time difference
  const urgency = timeDifference > 8 ? "high" : timeDifference > 5 ? "medium" : "low";
  
  const urgencyStyles = {
    high: {
      border: "border-red-300",
      bg: "bg-red-50",
      badge: "bg-red-500",
    },
    medium: {
      border: "border-yellow-300",
      bg: "bg-yellow-50",
      badge: "bg-yellow-500",
    },
    low: {
      border: "border-blue-300",
      bg: "bg-blue-50",
      badge: "bg-blue-500",
    },
  };

  const styles = urgencyStyles[urgency];

  return (
    <div className={clsx(
      "rounded-xl border-2 p-3 transition-all",
      styles.border,
      styles.bg
    )}>
      {/* Priority badge */}
      <div className="flex items-start gap-2 mb-2">
        <span className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
          styles.badge
        )}>
          {priority}
        </span>
        <p className="text-sm text-gray-600 flex-1">{reason}</p>
      </div>

      {/* Swap visualization */}
      <div className="flex items-center gap-2 mb-3">
        {/* Player out */}
        <div className="flex-1 bg-red-100 rounded-lg p-2 border border-red-200">
          <div className="flex items-center gap-2">
            {playerOut.number !== undefined && (
              <span className="w-7 h-7 bg-red-200 rounded-lg flex items-center justify-center font-bold text-sm text-red-800">
                {playerOut.number}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate text-red-800">
                {playerOut.name}
              </div>
              <div className="text-xs text-red-600">
                {Math.round(playerOut.minutesPlayed)} min
              </div>
            </div>
            <span className="text-red-400 text-lg">↓</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-2xl text-gray-400 flex-shrink-0">→</div>

        {/* Player in */}
        <div className="flex-1 bg-green-100 rounded-lg p-2 border border-green-200">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">↑</span>
            {playerIn.number !== undefined && (
              <span className="w-7 h-7 bg-green-200 rounded-lg flex items-center justify-center font-bold text-sm text-green-800">
                {playerIn.number}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate text-green-800">
                {playerIn.name}
              </div>
              <div className="text-xs text-green-600">
                {Math.round(playerIn.minutesPlayed)} min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execute button */}
      <button
        onClick={onExecute}
        disabled={isExecuting}
        className={clsx(
          "w-full py-3 rounded-xl font-semibold text-white transition-all",
          "min-h-[48px] active:scale-[0.98]",
          "bg-blue-600 hover:bg-blue-700",
          "disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100"
        )}
      >
        {isExecuting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Bezig...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>🔄</span>
            Wissel uitvoeren
          </span>
        )}
      </button>
    </div>
  );
}
