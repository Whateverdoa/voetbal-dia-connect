"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MatchEvent, MatchPlayer } from "./types";
import { createCorrelationId } from "@/lib/correlationId";

interface GoalEnrichmentPanelProps {
  matchId: Id<"matches">;
  pin: string;
  events: MatchEvent[];
  players: MatchPlayer[];
  teamName: string;
  opponentName: string;
}

export function GoalEnrichmentPanel({
  matchId,
  pin,
  events,
  players,
  teamName,
  opponentName,
}: GoalEnrichmentPanelProps) {
  const enrichGoal = useMutation(api.matchActions.enrichGoal);
  const [targetId, setTargetId] = useState<Id<"matchEvents"> | null>(null);
  const [scorerId, setScorerId] = useState<Id<"players"> | "">("");
  const [assistId, setAssistId] = useState<Id<"players"> | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = useMemo(
    () => events.filter((event) => event.type === "goal") as MatchEvent[],
    [events]
  );
  const selectedGoal = useMemo(
    () => goals.find((goal) => goal._id === targetId),
    [goals, targetId]
  );

  useEffect(() => {
    if (!selectedGoal) {
      setScorerId("");
      setAssistId("");
      return;
    }
    setScorerId(selectedGoal.playerId ?? "");
    setAssistId(selectedGoal.relatedPlayerId ?? "");
  }, [selectedGoal]);

  if (goals.length === 0) {
    return null;
  }

  const onSave = async () => {
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      await enrichGoal({
        matchId,
        eventId: targetId,
        scorerId: scorerId || undefined,
        assistId: assistId || undefined,
        correlationId: createCorrelationId("enrich-goal"),
      });
      setTargetId(null);
      setScorerId("");
      setAssistId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="font-bold text-lg">Doelpunt aanvullen</h2>
      <p className="text-sm text-gray-600">
        Kies een doelpunt en vul scorer/assist in of pas deze achteraf aan.
      </p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <select
        value={targetId ?? ""}
        onChange={(e) => setTargetId((e.target.value as Id<"matchEvents">) || null)}
        className="w-full border border-gray-300 rounded-lg p-3 min-h-[48px] text-base"
      >
        <option value="">Selecteer doelpunt</option>
        {goals.map((goal) => (
          <option key={String(goal._id)} value={String(goal._id)}>
            Kwart {goal.quarter} • {goal.displayMinute ?? "?"}'
            {` • ${
              goal.isOpponentGoal || goal.isOwnGoal ? opponentName : teamName
            }`}
            {goal.playerName ? ` • scorer: ${goal.playerName}` : ""}
            {goal.relatedPlayerName ? ` • assist: ${goal.relatedPlayerName}` : ""}
            {goal.note ? ` • ${goal.note}` : ""}
          </option>
        ))}
      </select>

      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
        <select
          value={scorerId}
          onChange={(e) => setScorerId((e.target.value as Id<"players">) || "")}
          className="w-full border border-gray-300 rounded-lg p-3 min-h-[48px] text-base"
        >
          <option value="">Scorer (optioneel)</option>
          {players.map((p) => (
            <option key={String(p.playerId)} value={String(p.playerId)}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={assistId}
          onChange={(e) => setAssistId((e.target.value as Id<"players">) || "")}
          className="w-full border border-gray-300 rounded-lg p-3 min-h-[48px] text-base"
        >
          <option value="">Assist (optioneel)</option>
          {players.map((p) => (
            <option key={String(p.playerId)} value={String(p.playerId)}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onSave}
        disabled={busy || !targetId}
        className="w-full py-3 min-h-[48px] bg-dia-green text-white rounded-lg text-base font-medium disabled:opacity-50"
      >
        {busy ? "Bezig..." : "Opslaan"}
      </button>
    </section>
  );
}
