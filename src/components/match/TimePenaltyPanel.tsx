"use client";

import { useEffect, useState } from "react";
import {
  deriveActiveTimePenalties,
  formatPenaltyCountdown,
  matchPenaltyClockNow,
  type ActiveTimePenalty,
} from "@/lib/cards/cardRules";
import type { MatchEvent } from "./types";

interface TimePenaltyPanelProps {
  events: MatchEvent[];
  status: string;
  pausedAt?: number;
  activeStoppageStartedAt?: number;
  halftimeStartedAt?: number;
}

function penaltyLabel(penalty: ActiveTimePenalty): string {
  if (penalty.ready) {
    return penalty.kind === "sit_out" ? "Mag terug" : "Mag vervangen";
  }
  return penalty.kind === "sit_out" ? "Tijdstraf" : "Wacht op vervanging";
}

/** Live countdowns for O13 yellow (5′) and red (5′/10′) tijdstraffen. */
export function TimePenaltyPanel({
  events,
  status,
  pausedAt,
  activeStoppageStartedAt,
  halftimeStartedAt,
}: TimePenaltyPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (status !== "live" && status !== "halftime") return null;

  const { clockNow, frozen } = matchPenaltyClockNow(now, {
    status,
    pausedAt,
    activeStoppageStartedAt,
    halftimeStartedAt,
  });

  const penalties = deriveActiveTimePenalties(
    events.map((e) => ({
      type: e.type,
      playerId: e.playerId ? String(e.playerId) : undefined,
      playerName: e.playerName,
      note: e.note,
      timestamp: e.timestamp,
    })),
    clockNow,
    frozen
  );

  if (penalties.length === 0) return null;

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold text-amber-950">Tijdstraf</h2>
        {frozen ? (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Gepauzeerd
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {penalties.map((penalty) => (
          <li
            key={`${penalty.playerId}-${penalty.startedAt}-${penalty.kind}`}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 min-h-[52px] ${
              penalty.ready
                ? "bg-emerald-100 border border-emerald-300"
                : "bg-white border border-amber-200"
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {penalty.cardType === "yellow_card" ? "🟨" : "🟥"}{" "}
                {penalty.playerName}
              </p>
              <p className="text-xs text-gray-600">{penaltyLabel(penalty)}</p>
            </div>
            <div
              className={`shrink-0 tabular-nums text-2xl font-bold ${
                penalty.ready ? "text-emerald-700" : "text-amber-950"
              }`}
              aria-live="polite"
            >
              {penalty.ready
                ? "✓"
                : formatPenaltyCountdown(penalty.remainingMs)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
