"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface LineupToggleProps {
  matchId: Id<"matches">;
  pin: string;
  showLineup: boolean;
}

export function LineupToggle({ matchId, pin, showLineup }: LineupToggleProps) {
  const toggleLineup = useMutation(api.matchActions.toggleShowLineup);

  return (
    <section className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Opstelling zichtbaar</h2>
          <p className="text-sm text-gray-500">Voor publiek op live pagina</p>
        </div>
        <button
          onClick={() => toggleLineup({ matchId, pin })}
          className={`relative w-14 h-8 rounded-full transition-colors min-w-[56px] ${
            showLineup ? "bg-dia-green" : "bg-gray-300"
          }`}
          role="switch"
          aria-checked={showLineup}
          aria-label="Opstelling zichtbaar voor publiek"
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              showLineup ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
