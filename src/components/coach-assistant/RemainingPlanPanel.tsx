"use client";

import { useState } from "react";
import { useRememberedPlayers } from "@/hooks/useRememberedPlayers";
import { replanFromCurrent, replanStateRevision, type RemainingProposal } from "@/lib/coachAssistant/replanFromCurrent";
import type { AssistantHistoryMatch, AssistantPlayer } from "@/lib/coachAssistant/types";
import type { DemoMatchState } from "@/lib/substitutions/demoMatch";
import { momentInstructions } from "@/lib/substitutions/momentInstructions";
import { validatePortableSubstitutionPlan } from "@/lib/substitutions/validatePortableSubstitutionPlan";

export function RemainingPlanPanel({ match, initialPlayers, preferenceScope, history, teamKey, targetDate, intervalMinutes, disabled, onPause, onApply }: {
  match: DemoMatchState; initialPlayers?: AssistantPlayer[]; preferenceScope?: string;
  history: AssistantHistoryMatch[]; teamKey: string; targetDate: string; intervalMinutes: number;
  disabled?: boolean; onPause: () => void; onApply: (proposal: RemainingProposal) => void;
}) {
  const defaults: AssistantPlayer[] = match.plan.players.map((player) => ({ key: player.key,
    availability: player.absent ? "absent" : "present", primaryPosition: null, secondaryPosition: null }));
  const { players } = useRememberedPlayers(preferenceScope, initialPlayers ?? defaults);
  const [interval, setInterval] = useState(intervalMinutes);
  const [proposal, setProposal] = useState<RemainingProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stale = proposal !== null && proposal.revision !== replanStateRevision(match);
  const label = (key: string) => { const player = match.plan.players.find((row) => row.key === key); return `${player?.name ?? "Speler"} ${player?.number ?? "?"}`; };
  const minute = (value: number) => value.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
  const report = proposal ? validatePortableSubstitutionPlan(proposal.plan) : null;
  function calculate() {
    onPause();
    setError(null);
    try { setProposal(replanFromCurrent(match, { players, history, teamKey, targetDate, intervalMinutes: interval })); }
    catch (caught: unknown) { setProposal(null); setError(caught instanceof Error ? caught.message : "Het vervolg kon niet worden berekend."); }
  }
  return <section aria-label="Wisselplan opnieuw berekenen" className="mt-5 space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
    <h2 className="font-bold">Verder vanaf de huidige veldsituatie</h2>
    <p className="text-sm">Na een eigen wissel berekent de assistent een nieuw vervolg met de huidige opstelling, bank en werkelijk gespeelde minuten. Minuten gaan voor; posities tellen licht mee. De klok pauzeert voor je controle.</p>
    <label className="grid gap-1 text-sm font-semibold">Nieuw wisselinterval<select className="min-h-11 rounded-lg border bg-white px-3" value={interval} disabled={disabled} onChange={(event) => { setInterval(Number(event.target.value)); setProposal(null); }}>{[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} minuten vanaf nu</option>)}</select></label>
    <button type="button" disabled={disabled} className="min-h-11 rounded-xl bg-dia-green px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={calculate}>Bereken vanaf nu opnieuw</button>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {proposal && report && <div className="space-y-3 border-t border-green-200 pt-3">
      <h3 className="font-semibold">Voorstel vanaf minuut {minute(proposal.fromSecond / 60)}</h3>
      <p className="text-sm">De huidige spelers blijven staan tot het eerste nieuwe wisselmoment. Een eerder afgesproken keeperwissel blijft behouden.</p>
      {proposal.steps.length === 0 && <p className="text-sm">Geen verdere wissels nodig binnen de resterende tijd en het gekozen interval.</p>}
      <ol className="space-y-3 text-sm">{proposal.plan.steps.map((step) => <li key={step.id}><strong>Minuut {minute(step.matchMinute + proposal.fromSecond / 60)}</strong>{momentInstructions(proposal.plan, report.snapshots, step.id).map((instruction) => <p key={instruction}>{instruction}</p>)}</li>)}</ol>
      <details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Verwachte eindminuten bekijken</summary><table className="w-full text-left text-sm"><thead><tr><th>Speler</th><th>Al gespeeld</th><th>Totaal verwacht</th></tr></thead><tbody>{proposal.totals.map((row) => <tr key={row.key}><th className="py-2 font-medium">{label(row.key)}</th><td>{minute(row.played)}</td><td>{minute(row.expected)}</td></tr>)}</tbody></table></details>
      {stale && <p role="status" className="text-sm text-amber-900">De veldsituatie of klok is veranderd. Bereken het vervolg opnieuw.</p>}
      <button type="button" disabled={disabled || stale} className="min-h-11 rounded-xl bg-dia-green px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={() => { onApply(proposal); setProposal(null); }}>Gebruik dit vervolgplan</button>
      <button type="button" className="ml-2 min-h-11 rounded-xl border px-4 py-2 text-sm" onClick={() => setProposal(null)}>Voorstel sluiten</button>
    </div>}
    {match.replannedAtSeconds !== undefined && <p role="status" className="text-sm font-semibold">Vervolgplan actief vanaf minuut {minute(match.replannedAtSeconds / 60)}. Hervat de klok wanneer je klaar bent. Vergelijken en de oorspronkelijke planprint blijven het beginplan tonen.</p>}
  </section>;
}
