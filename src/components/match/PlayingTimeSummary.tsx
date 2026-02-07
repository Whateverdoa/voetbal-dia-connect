"use client";

import clsx from "clsx";
import { FairnessLegend } from "./FairnessLegend";

interface PlayingTimeSummaryProps {
  averageMinutes: number;
  spread: number;
  playerCount: number;
}

function formatMinutes(minutes: number): string {
  return `${Math.round(minutes)} min`;
}

export function PlayingTimeSummary({
  averageMinutes,
  spread,
  playerCount,
}: PlayingTimeSummaryProps) {
  return (
    <section className="bg-white rounded-xl shadow-md p-4">
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-xl">⏱️</span>
        Speeltijd overzicht
      </h2>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-dia-green">
            {formatMinutes(averageMinutes)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Gemiddeld</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div
            className={clsx(
              "text-2xl font-bold",
              spread > 8
                ? "text-red-600"
                : spread > 4
                  ? "text-yellow-600"
                  : "text-green-600"
            )}
          >
            {formatMinutes(spread)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Verschil</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-700">{playerCount}</div>
          <div className="text-xs text-gray-500 mt-1">Spelers</div>
        </div>
      </div>

      <FairnessLegend />
    </section>
  );
}
