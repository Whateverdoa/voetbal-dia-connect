"use client";

import { useQuery } from "convex/react";
import { makeFunctionReference, type FunctionArgs, type FunctionReturnType, type ApiFromModules } from "convex/server";
import type { get } from "../../../convex/matchPlanAudit";
import type { Id } from "@/convex/_generated/dataModel";

type AuditQuery = ApiFromModules<{ matchPlanAudit: { get: typeof get } }>["matchPlanAudit"]["get"];
const auditQuery = makeFunctionReference<"query", FunctionArgs<AuditQuery>, FunctionReturnType<AuditQuery>>("matchPlanAudit:get");
const time = (at: number) => new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
}).format(at);

export function MatchPlanAttribution({ matchId }: { matchId: Id<"matches"> }) {
  const data = useQuery(auditQuery, { matchId });
  if (data === null) return null;
  return <section aria-label="Wie heeft het plan gewijzigd?" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <h2 className="font-semibold">Wie heeft het plan gewijzigd?</h2>
    {data === undefined ? <p role="status" className="mt-2 text-slate-500">Wijzigingen laden…</p> : <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{(["lineup", "plan"] as const).map((domain) => {
        const item = data[domain];
        return <div key={domain}><h3 className="font-semibold">{domain === "lineup" ? "Opstelling" : "Wisselplan"}</h3>
          <p className="mt-1">{item.creator ? <>Aangemaakt door <strong>{item.creator.name}</strong> · {time(item.creator.at)}</> : "Maker niet geregistreerd"}</p>
          <p className="mt-1 text-slate-600">{item.latest ? <>Laatst gewijzigd door <strong>{item.latest.name}</strong> · {time(item.latest.at)}</> : "Nog geen wijziging geregistreerd sinds deze functie beschikbaar is."}</p>
        </div>;
      })}</div>
      <p className="mt-3 text-xs text-slate-500">Wijzigingen worden vanaf nu bijgehouden. De maker van een eerder bestaand plan is niet achteraf vast te stellen.</p>
      {data.history.length > 0 && <details className="mt-2"><summary className="min-h-11 cursor-pointer font-semibold">Bekijk laatste wijzigingen</summary>
        <ol className="space-y-2">{data.history.map((entry) => <li key={entry.id} className="border-t border-slate-100 pt-2">
          <strong>{entry.name}</strong> · {time(entry.at)}<br />{entry.domain === "lineup" ? "Opstelling" : "Wisselplan"}: {entry.action}
        </li>)}</ol>
      </details>}
    </>}
  </section>;
}
