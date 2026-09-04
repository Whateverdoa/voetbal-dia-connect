"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer } from "@/components/match/types";
import { formatFieldLabel } from "@/lib/cards/formatCardName";
import { periodWord } from "./planLabels";
import type { PlanAddFormPayload } from "@/hooks/useSubstitutionPlanActions";
import {
  periodChipLabel,
  suggestPeriodFromMinute,
} from "@/lib/substitutions/suggestPeriodFromMinute";

function optionLabel(name: string, number?: number): string {
  return formatFieldLabel(name, number) || name;
}

interface PlanAddFormProps {
  quarterCount: number;
  regulationDurationMinutes?: number;
  projectedOnField: MatchPlayer[];
  projectedBench: MatchPlayer[];
  isBusy: boolean;
  onAdd: (payload: PlanAddFormPayload) => Promise<boolean>;
}

/** Dropdown form to append one planned substitution (list mode). */
export function PlanAddForm({
  quarterCount,
  regulationDurationMinutes = 60,
  projectedOnField,
  projectedBench,
  isBusy,
  onAdd,
}: PlanAddFormProps) {
  const [playerOut, setPlayerOut] = useState<Id<"players"> | "">("");
  const [playerIn, setPlayerIn] = useState<Id<"players"> | "">("");
  const [targetQuarter, setTargetQuarter] = useState<number | null>(null);
  const [targetMinute, setTargetMinute] = useState("");
  const [note, setNote] = useState("");

  const parsedMinute = (() => {
    const trimmed = targetMinute.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  })();

  const suggestedQuarter =
    parsedMinute != null
      ? suggestPeriodFromMinute(
          parsedMinute,
          quarterCount,
          regulationDurationMinutes
        )
      : null;

  const handleMinuteChange = (raw: string) => {
    setTargetMinute(raw);
    const trimmed = raw.trim();
    if (trimmed === "") return;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return;
    setTargetQuarter(
      suggestPeriodFromMinute(value, quarterCount, regulationDurationMinutes)
    );
  };

  const handleAdd = async () => {
    if (!playerOut || !playerIn) return;
    const payload: PlanAddFormPayload = {
      playerOutId: playerOut,
      playerInId: playerIn,
    };
    if (targetQuarter != null) payload.targetQuarter = targetQuarter;
    if (parsedMinute != null) payload.targetMinute = parsedMinute;
    if (note.trim()) payload.note = note.trim();

    const ok = await onAdd(payload);
    if (!ok) return;
    setPlayerOut("");
    setPlayerIn("");
    setTargetQuarter(null);
    setTargetMinute("");
    setNote("");
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-2">
      <p className="text-sm font-semibold">Regel toevoegen</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={playerOut === "" ? "" : String(playerOut)}
          onChange={(e) =>
            setPlayerOut(
              e.target.value === "" ? "" : (e.target.value as Id<"players">)
            )
          }
          className="px-3 py-2 border rounded-lg text-sm min-h-[44px]"
        >
          <option value="">Eruit (veld)</option>
          {projectedOnField.map((player) => (
            <option
              key={String(player.playerId)}
              value={String(player.playerId)}
            >
              {optionLabel(player.name, player.number)}
            </option>
          ))}
        </select>
        <select
          value={playerIn === "" ? "" : String(playerIn)}
          onChange={(e) =>
            setPlayerIn(
              e.target.value === "" ? "" : (e.target.value as Id<"players">)
            )
          }
          className="px-3 py-2 border rounded-lg text-sm min-h-[44px]"
        >
          <option value="">Erin (bank)</option>
          {projectedBench.map((player) => (
            <option
              key={String(player.playerId)}
              value={String(player.playerId)}
            >
              {optionLabel(player.name, player.number)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-600">
          {quarterCount === 2 ? "Helft" : "Kwart"} (optioneel, ook achteraf)
        </label>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={quarterCount === 2 ? "Helft" : "Kwart"}
        >
          {Array.from({ length: quarterCount }, (_, i) => i + 1).map(
            (period) => {
              const active = targetQuarter === period;
              return (
                <button
                  key={period}
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    setTargetQuarter(active ? null : period)
                  }
                  className={`min-h-[44px] min-w-[44px] rounded-lg px-2 text-sm font-semibold disabled:opacity-50 ${
                    active
                      ? "bg-dia-green text-white"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {periodChipLabel(period, quarterCount)}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600">
          Wedstrijdminuut (optioneel)
        </label>
        <input
          type="number"
          min={0}
          value={targetMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="w-full px-2 py-2 border rounded-lg text-sm min-h-[44px]"
          placeholder="bijv. 35"
        />
        {suggestedQuarter != null ? (
          <p className="mt-1 text-xs text-gray-500">
            Minuut {parsedMinute} →{" "}
            {periodChipLabel(suggestedQuarter, quarterCount)} (wordt
            voorgesteld; tik H/K om te wijzigen)
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Laat de minuut leeg voor start van {periodWord(quarterCount)}.
          </p>
        )}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notitie (optioneel)"
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
      <button
        type="button"
        disabled={!playerOut || !playerIn || isBusy}
        onClick={() => void handleAdd()}
        className="w-full py-3 bg-dia-green text-white rounded-xl font-semibold min-h-[48px] disabled:opacity-50"
      >
        {isBusy ? "Bezig..." : "Toevoegen aan plan"}
      </button>
    </div>
  );
}
