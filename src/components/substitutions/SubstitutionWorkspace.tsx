"use client";

import { useState } from "react";
import { SubstitutionDemo, type DemoSource } from "./SubstitutionDemo";
import { DEMO_PLAN } from "@/lib/substitutions/demoPlan";
import { GILZE_PLAN, GILZE_SOURCE_DETAILS } from "@/lib/substitutions/gilzePlan";
import { REESHOF_PLAN, REESHOF_SOURCE_DETAILS } from "@/lib/substitutions/reeshofPlan";

const sources: DemoSource[] = [
  { ...REESHOF_SOURCE_DETAILS, notes: [...REESHOF_SOURCE_DETAILS.notes], initialPlan: REESHOF_PLAN },
  { ...GILZE_SOURCE_DETAILS, notes: [...GILZE_SOURCE_DETAILS.notes], initialPlan: GILZE_PLAN },
  { id: "photo-example", kind: "photo", initialPlan: DEMO_PLAN, teamName: "DIA JO13-2", matchLabel: "Voorbeeld uit de foto" },
];

/** Each source gets an independent local session. No connection to app mutations. */
export function SubstitutionWorkspace() {
  const [sourceId, setSourceId] = useState(sources[0].id);
  const source = sources.find((candidate) => candidate.id === sourceId) ?? sources[0];
  return <>
    <div className="border-b border-slate-200 bg-white px-4 py-3 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <label htmlFor="substitution-source" className="text-sm font-semibold text-slate-700">Wedstrijd / voorbeeld</label>
        <select id="substitution-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-green-600">
          {sources.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.matchLabel}</option>)}
        </select>
        <p className="text-xs text-slate-500">Een andere bron kiezen begint een nieuwe oefensessie.</p>
      </div>
    </div>
    <SubstitutionDemo key={source.id} source={source} />
  </>;
}
