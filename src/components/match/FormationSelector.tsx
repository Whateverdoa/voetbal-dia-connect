"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFormation, getFormationIds } from "@/lib/formations";

type LineupView = "veld" | "lijst";

interface FormationSelectorProps {
  matchId: Id<"matches">;
  pin: string;
  formationId: string | undefined;
  lineupView: LineupView;
  onLineupViewChange: (view: LineupView) => void;
}

/**
 * Formation dropdown + Veld/Lijst toggle bar.
 * Rendered in the coach match page above the PitchView/PlayerList.
 * Uses `relative z-10` to stay above PitchView's negative-margin overlap.
 */
export function FormationSelector({
  matchId,
  pin,
  formationId,
  lineupView,
  onLineupViewChange,
}: FormationSelectorProps) {
  const setMatchFormation = useMutation(api.matchActions.setMatchFormation);

  return (
    <div className="bg-white rounded-xl shadow-md p-3 flex flex-wrap gap-2 items-center relative z-10">
      <label className="text-sm font-medium text-gray-700">Formatie</label>
      <select
        value={formationId ?? ""}
        onChange={(e) => {
          const v = e.target.value || undefined;
          setMatchFormation({ matchId, pin, formationId: v });
        }}
        className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[140px]"
      >
        <option value="">Geen (lijst)</option>
        {getFormationIds().map((id) => (
          <option key={id} value={id}>
            {getFormation(id)?.name ?? id}
          </option>
        ))}
      </select>
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          type="button"
          onClick={() => onLineupViewChange("veld")}
          className={`px-3 py-2 text-sm font-medium ${lineupView === "veld" ? "bg-dia-green text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Veld
        </button>
        <button
          type="button"
          onClick={() => onLineupViewChange("lijst")}
          className={`px-3 py-2 text-sm font-medium ${lineupView === "lijst" ? "bg-dia-green text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Lijst
        </button>
      </div>
    </div>
  );
}
