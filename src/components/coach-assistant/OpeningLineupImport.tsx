"use client";

import { useState } from "react";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";
import { openingActionIds, planFromOpeningLineup, preparationMinute, type PlanTiming } from "@/lib/coachAssistant/openingLineup";

export function OpeningLineupImport({ plan, timing, quarterCount, disabled, onApply }: {
  plan: DemoPlan; timing: PlanTiming[]; quarterCount: number; disabled: boolean; onApply: (plan: DemoPlan) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const opening = openingActionIds(timing);
  if (!opening.length) return null;
  const laterSwaps = plan.steps.flatMap((step) => step.actions).filter((action) => action.kind === "positionSwap" && timing.some((row) => row.id === action.id && (row.quarter ?? 1) > 1));
  const name = (key: string) => plan.players.find((player) => player.key === key)?.name ?? "Onbekende speler";
  return <section aria-label="Beginopstelling uit minuut 1" className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
    <h3 className="font-semibold">Beginopstelling uit minuut 1</h3>
    <p>Neem de opstelling na de {opening.length} acties op minuut 0–1 van de eerste helft over als beginopstelling. De andere wissels blijven behouden. Minuut 1 van H2 wordt wedstrijdminuut {plan.match.regulationDurationMinutes / quarterCount + 1}.</p>
    {laterSwaps.length > 0 && <details><summary className="min-h-11 cursor-pointer font-semibold">Tijdstippen positieruilen tweede helft controleren</summary>
      <p className="mb-2">Beide spelers moeten op het veld staan. Verplaats je een positieruil, dan komt die na de bestaande wissels op dat tijdstip.</p>
      <div className="grid gap-2 sm:grid-cols-2">{laterSwaps.map((action) => {
        const row = timing.find((item) => item.id === action.id)!;
        return <label className="grid gap-1" key={action.id}>{name(action.playerOutKey)} ↔ {name(action.playerInKey)}<input aria-label={`Wedstrijdminuut ${name(action.playerOutKey)} ↔ ${name(action.playerInKey)}`} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3" type="number" min={plan.match.regulationDurationMinutes / quarterCount} max={plan.match.regulationDurationMinutes} value={overrides[action.id] ?? preparationMinute(row, plan.match.regulationDurationMinutes, quarterCount) ?? ""} onChange={(event) => { setOverrides({ ...overrides, [action.id]: event.target.value === "" ? NaN : Number(event.target.value) }); setApplied(false); }} /></label>;
      })}</div>
    </details>}
    <button className="min-h-11 rounded-xl bg-dia-green px-4 py-2 font-semibold text-white disabled:opacity-40" disabled={disabled} onClick={() => {
      const result = planFromOpeningLineup(plan, timing, quarterCount, overrides);
      if (result.error) { setError(result.error); return; }
      if (result.plan) { onApply(result.plan); setError(null); setApplied(true); }
    }}>Gebruik minuut 1 als beginopstelling</button>
    {error && <p role="alert">{error}</p>}
    {applied && <p role="status" className="font-semibold">Concept aangepast: de opstelling van minuut 1 geldt vanaf de aftrap. Controleer het wisselplan hieronder.</p>}
    <p className="text-xs">Dit verandert alleen je concept. Het opgeslagen wedstrijdplan en de geregistreerde speelminuten worden niet aangepast. Opslaan in de wedstrijd is een aparte stap na controle.</p>
  </section>;
}
