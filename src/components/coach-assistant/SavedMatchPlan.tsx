"use client";

import Link from "next/link";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";
import type { PortableSubstitutionValidationReport } from "@/lib/substitutions/validatePortableSubstitutionPlan";

/** Display the original plan even when it cannot safely initialize the simulator. */
export function SavedMatchPlan({ plan, report, matchUrl }: {
  plan: DemoPlan;
  report: PortableSubstitutionValidationReport;
  matchUrl: string;
}) {
  const label = (key: string) => {
    const player = plan.players.find((candidate) => candidate.key === key);
    return player ? `${player.name}${player.number == null ? "" : ` ${player.number}`}` : "Onbekende speler";
  };
  const issues = report.issues.filter((issue) => issue.severity === "error" || issue.severity === "review" && issue.code !== "SOURCE_REVIEW_REQUIRED");
  return <section aria-label="Opgeslagen wisselplan" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h3 className="text-xl font-bold">Opgeslagen wisselplan</h3>
    <p className="text-sm text-slate-600">Dit is het bestaande plan uit de wedstrijd. Er is geen nieuw voorstel berekend. Je kunt de beginopstelling en alle ingeladen wisselmomenten hieronder bekijken.</p>
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Bekijken kan al; oefenen is nog niet beschikbaar.</p>
      <p className="mt-1">De opgeslagen opstelling en wisselregels sluiten nog niet op elkaar aan. Controleer de onderstaande punten in het planscherm. Daarna kun je het actuele plan opnieuw laden en ermee oefenen; opnieuw berekenen is niet nodig.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>
      <Link href={matchUrl} className="mt-3 inline-flex min-h-11 items-center font-semibold underline">Bekijk het planscherm in de app</Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><h4 className="font-semibold">Opgeslagen beginopstelling</h4><ul className="mt-2 space-y-1 text-sm">{plan.startingLineup.field.map((entry) => <li key={`${entry.slotId}-${entry.playerKey}`}>{plan.formation.slots.find((slot) => slot.id === entry.slotId)?.position ?? "Plek onbekend"} · {label(entry.playerKey)}</li>)}</ul></div>
      <div><h4 className="font-semibold">Bank bij aftrap</h4><ul className="mt-2 space-y-1 text-sm">{plan.startingLineup.bench.map((key) => <li key={key}>{label(key)}</li>)}</ul></div>
    </div>
    <ol className="space-y-3">{plan.steps.map((step) => <li key={step.id} className="rounded-xl border border-slate-200 p-3">
      <h4 className="font-semibold">Minuut {step.matchMinute}</h4>
      <ul className="mt-2 space-y-2 text-sm">{step.actions.map((action) => <li key={action.id}>{action.kind === "positionSwap" ? "Positieruil" : "Wissel"}: {label(action.playerOutKey)} {action.kind === "positionSwap" ? "↔" : "→"} {label(action.playerInKey)}</li>)}</ul>
    </li>)}</ol>
  </section>;
}
