"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer } from "@/components/match/types";
import { periodWord } from "./planLabels";
import type { PlanAddFormPayload } from "@/hooks/useSubstitutionPlanActions";

interface PlanAddFormProps {
  quarterCount: number;
  projectedOnField: MatchPlayer[];
  projectedBench: MatchPlayer[];
  isBusy: boolean;
  onAdd: (payload: PlanAddFormPayload) => Promise<boolean>;
}

/** Dropdown form to append one planned substitution (list mode). */
export function PlanAddForm({
  quarterCount,
  projectedOnField,
  projectedBench,
  isBusy,
  onAdd,
}: PlanAddFormProps) {
  const [playerOut, setPlayerOut] = useState<Id<"players"> | "">("");
  const [playerIn, setPlayerIn] = useState<Id<"players"> | "">("");
  const [targetQuarter, setTargetQuarter] = useState("");
  const [targetMinute, setTargetMinute] = useState("");
  const [note, setNote] = useState("");

  const handleAdd = async () => {
    if (!playerOut || !playerIn) return;
    const normalizedQuarter = targetQuarter ? Number(targetQuarter) : undefined;
    const normalizedMinute = targetMinute ? Number(targetMinute) : undefined;
    const payload: PlanAddFormPayload = {
      playerOutId: playerOut,
      playerInId: playerIn,
    };
    if (normalizedQuarter !== undefined) {
      payload.targetQuarter = normalizedQuarter;
    }
    if (normalizedMinute !== undefined) {
      payload.targetMinute = normalizedMinute;
    }
    if (note.trim()) {
      payload.note = note.trim();
    }

    const ok = await onAdd(payload);
    if (!ok) return;
    setPlayerOut("");
    setPlayerIn("");
    setTargetQuarter("");
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
              {player.name}
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
              {player.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">
            {quarterCount === 2 ? "Helft (optioneel)" : "Kwart (optioneel)"}
          </label>
          <input
            type="number"
            min={1}
            max={quarterCount}
            value={targetQuarter}
            onChange={(e) => setTargetQuarter(e.target.value)}
            className="w-full px-2 py-2 border rounded-lg text-sm"
            placeholder={`1–${quarterCount}`}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">
            Wedstrijdminuut (optioneel)
          </label>
          <input
            type="number"
            min={0}
            value={targetMinute}
            onChange={(e) => setTargetMinute(e.target.value)}
            className="w-full px-2 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Laat de minuut leeg voor start van {periodWord(quarterCount)}.
      </p>
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
        className="w-full py-3 bg-dia-green text-black rounded-xl font-semibold min-h-[48px] disabled:opacity-50"
      >
        {isBusy ? "Bezig..." : "Toevoegen aan plan"}
      </button>
    </div>
  );
}
