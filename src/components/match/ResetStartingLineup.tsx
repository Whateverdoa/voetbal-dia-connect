"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { startingLineupRevision } from "@/lib/startingLineupRevision";
import type { MatchPlayer } from "./types";

export function ResetStartingLineup({ matchId, players, disabled = false }: { matchId: Id<"matches">; players: MatchPlayer[]; disabled?: boolean }) {
  const reset = useMutation(api.coachAssistant.resetStartingLineup);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return <div className="my-3 space-y-2 text-sm text-slate-900">
    <button type="button" disabled={disabled || busy || !players.some((player) => player.onField || player.isKeeper || player.fieldSlotIndex !== undefined)} className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800 disabled:opacity-40" onClick={() => { setConfirmation(startingLineupRevision(players)); setMessage(null); }}>Beginopstelling leegmaken</button>
    {confirmation !== null && <div role="alertdialog" aria-label="Echte beginopstelling leegmaken bevestigen" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-semibold">Wil je de beginopstelling van deze wedstrijd echt leegmaken?</p>
      <p>Alle spelers, inclusief de keeper, gaan van het veld. De formatie, afwezigheid, blessures, positievoorkeuren en speelminuten blijven bewaard. Het wisselplan blijft staan; controleer dit opnieuw na het kiezen van je nieuwe beginopstelling.</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-11 rounded-lg border bg-white px-4" onClick={() => setConfirmation(null)}>Annuleren</button><button type="button" disabled={busy || disabled} className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:opacity-40" onClick={async () => {
        setBusy(true); setMessage(null);
        try { await reset({ matchId, expectedRevision: confirmation, confirmed: true }); setMessage("De beginopstelling is leeg. Zet de spelers opnieuw op het veld en controleer daarna het wisselplan."); }
        catch (error) { setMessage(error instanceof Error ? error.message : "De beginopstelling kon niet worden leeggemaakt."); }
        finally { setBusy(false); setConfirmation(null); }
      }}>{busy ? "Bezig…" : "Ja, beginopstelling leegmaken"}</button></div>
    </div>}
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3">{message}</p>}
  </div>;
}
