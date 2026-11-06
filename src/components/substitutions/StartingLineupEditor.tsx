"use client";

import { useId, useState } from "react";
import { getPositionNameDutch } from "@/lib/positions";
import { assignDemoStartingPlayer } from "@/lib/substitutions/demoLineup";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";

export interface StartingLineupEditorProps {
  plan: DemoPlan;
  onChange: (plan: DemoPlan) => void;
}

function positionName(position: string): string {
  if (position === "LCB") return "Linker centrale verdediger";
  if (position === "RCB") return "Rechter centrale verdediger";
  return getPositionNameDutch(position);
}

export function StartingLineupEditor({ plan, onChange }: StartingLineupEditorProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const presentPlayers = plan.players.filter((player) => !player.absent);
  const label = (key: string) => {
    const player = plan.players.find((candidate) => candidate.key === key);
    return player ? `${player.name} ${player.number ?? "?"}` : key;
  };

  function choosePlayer(slotId: number, playerKey: string) {
    try {
      const next = assignDemoStartingPlayer(plan, slotId, playerKey);
      setError(null);
      if (next !== plan) onChange(next);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Deze beginpositie kon niet worden gewijzigd.");
    }
  }

  return <details className="rounded-xl border border-slate-200 bg-white">
    <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Beginposities handmatig instellen</summary>
    <div className="space-y-4 border-t border-slate-100 p-4">
      <p className="text-sm leading-relaxed text-slate-600">Kies per positie een speler. Een veldspeler ruilt van plek met de huidige speler; een bankspeler neemt de plek over en de huidige speler gaat naar diens plek op de bank.</p>
      <p className="text-xs leading-relaxed text-amber-800">Bestaande geplande wissels blijven staan en worden opnieuw gecontroleerd. Bevestig de aangepaste beginopstelling opnieuw voordat je start.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {plan.formation.slots.map((slot) => {
          const occupiedBy = plan.startingLineup.field.find((entry) => entry.slotId === slot.id)?.playerKey ?? "";
          const fieldId = `${id}-slot-${slot.id}`;
          const title = `${positionName(slot.position)} (${slot.position})`;
          return <div key={slot.id}>
            <label htmlFor={fieldId} className="mb-1 block text-xs font-medium text-slate-600">{title}<span className="ml-2 font-normal text-slate-400">plek {slot.id + 1}</span></label>
            <select id={fieldId} aria-label={`${title}, plek ${slot.id + 1}`} value={occupiedBy} onChange={(event) => choosePlayer(slot.id, event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-green-600">
              {!occupiedBy && <option value="" disabled>Kies speler</option>}
              {presentPlayers.map((player) => <option key={player.key} value={player.key}>{label(player.key)}{plan.startingLineup.bench.includes(player.key) ? " · bank" : ""}</option>)}
            </select>
            {slot.position === "GK" && <p className="mt-1 text-xs text-slate-500">De gekozen speler wordt keeper.</p>}
          </div>;
        })}
      </div>
      <p className="text-sm text-slate-600"><strong>Bank:</strong> {plan.startingLineup.bench.map(label).join(" · ")}</p>
    </div>
  </details>;
}
