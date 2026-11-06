"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "@/components/match/types";
import { momentInstructions } from "@/lib/substitutions/momentInstructions";

import { validatePortableSubstitutionPlan } from "@/lib/substitutions/validatePortableSubstitutionPlan";

type Preview = FunctionReturnType<typeof api.coachAssistant.previewRemaining>;
const button = "min-h-11 rounded-lg bg-dia-green px-4 py-2 font-semibold text-white disabled:opacity-40";

export function LiveReplanPanel({ matchId, status, canEdit, publicCode }: {
  matchId: Id<"matches">; status: MatchStatus; canEdit: boolean; publicCode?: string;
}) {
  const convex = useConvex();
  const save = useMutation(api.coachAssistant.saveRemaining);
  const [interval, setInterval] = useState(10);
  const [preview, setPreview] = useState<{ data: Preview; interval: number; requestId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (status === "finished") return null;
  const live = status === "live" || status === "halftime";
  const calculate = async () => {
    setBusy(true); setError(null); setMessage(null); setPreview(null);
    try {
      const data = await convex.query(api.coachAssistant.previewRemaining, { matchId, intervalMinutes: interval });
      setPreview({ data, interval, requestId: crypto.randomUUID() });
    } catch (e) { setError(e instanceof Error ? e.message : "Berekenen is niet gelukt."); }
    finally { setBusy(false); }
  };
  const accept = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      await save({ matchId, expectedRevision: preview.data.revision, calculatedAt: preview.data.calculatedAt,
        intervalMinutes: preview.interval, requestId: preview.requestId, reviewed: true });
      setPreview(null); setMessage("Vervolgplan opgeslagen. Je kunt de wissels hieronder uitvoeren of aanpassen.");
    } catch (e) { setError(e instanceof Error ? e.message : "Opslaan is niet gelukt."); }
    finally { setBusy(false); }
  };
  return <section aria-label="Coachassistent wisselplan" className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-slate-900">
    <h2 className="font-bold">Coachassistent</h2>
    {!live ? <>
      <p>Kies je beginopstelling, bereken de wissels en oefen voor deze wedstrijd.</p>
      <Link className="inline-flex min-h-11 items-center font-semibold text-dia-green underline" href={`/coach/assistent${publicCode ? `?wedstrijd=${encodeURIComponent(publicCode)}` : ""}`}>Voorbereiden & oefenen</Link>
      <p>De knop ‘Bereken vanaf nu’ komt hier beschikbaar zodra de wedstrijd begint.</p>
    </> : <>
      <p>Bereken de resterende wissels vanuit de spelers die nu op het veld staan en hun gespeelde minuten. Minuten gaan voor; posities wegen licht mee. De huidige keeper blijft staan.</p>
      <p>Registreer een onverwachte wissel of positieruil eerst in de wedstrijd en bereken daarna het vervolg.</p>
      <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1">Wisselinterval<select className="min-h-11 rounded-lg border bg-white px-3" value={interval} disabled={busy} onChange={(e) => { setInterval(Number(e.target.value)); setPreview(null); }}>
        {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} minuten</option>)}</select></label>
        <button type="button" className={button} disabled={!canEdit || busy} onClick={calculate}>{busy ? "Even wachten…" : "Bereken vanaf nu"}</button></div>
      {!canEdit && <p>De wedstrijdleider kan het vervolgplan berekenen en overnemen.</p>}
    </>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error.replace(/^[\s\S]*Uncaught Error: /, "").split("\n")[0]}</p>}
    {message && <p role="status" className="font-semibold">{message}</p>}
    {preview && <div className="space-y-3 rounded-lg border bg-white p-3">
      <h3 className="font-bold">Vervolg vanaf minuut {(preview.data.fromSecond / 60).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}</h3>
      <p>Controleer dit voorstel. Overnemen vervangt de openstaande wissels. Uitgevoerde acties, gespeelde minuten en de wedstrijdklok blijven bewaard.</p>
      <p className="text-xs">Neem het voorstel binnen twee minuten over. Bij een gewijzigde veldsituatie moet je opnieuw berekenen.</p>
      {preview.data.plan.steps.length === 0 && <p>Geen nieuwe wissels nodig. Overnemen verwijdert de nog openstaande wissels.</p>}
      <ol className="space-y-3">{preview.data.plan.steps.map((step) => <li key={step.id}><strong>Minuut {(step.matchMinute + preview.data.fromSecond / 60).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}</strong><ul className="list-disc pl-5">{momentInstructions(preview.data.plan, validatePortableSubstitutionPlan(preview.data.plan).snapshots, step.id).map((line) => <li key={line}>{line}</li>)}</ul></li>)}</ol>
      <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Minuten per speler bekijken</summary><table className="w-full text-left"><thead><tr><th>Speler</th><th>Nu</th><th>Na afloop</th></tr></thead><tbody>{preview.data.totals.map((row) => <tr key={row.key}><td>{preview.data.plan.players.find((p) => p.key === row.key)?.name}</td><td>{Math.round(row.played)}</td><td>{Math.round(row.expected)}</td></tr>)}</tbody></table></details>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy || !canEdit} onClick={accept}>Gebruik dit vervolgplan</button><button type="button" className="min-h-11 rounded-lg border px-4" disabled={busy} onClick={() => setPreview(null)}>Annuleren</button></div>
    </div>}
  </section>;
}
