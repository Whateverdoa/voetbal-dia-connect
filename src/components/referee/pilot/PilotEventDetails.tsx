"use client";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { RefereeAction, RefereeDetail } from "@/lib/refereePilot";
export type DetailTarget = { id: Id<"matchEvents">; goal: boolean; ownRoster: boolean };
export function PilotEventDetails({ target, match, busy, onSave, onClose }: {
  target: DetailTarget; match: RefereeDetail; busy: boolean; onSave: (action: RefereeAction) => Promise<unknown>; onClose: () => void;
}) {
  const [player, setPlayer] = useState(""); const [name, setName] = useState("");
  const [number, setNumber] = useState(""); const [note, setNote] = useState("");
  return <section role="dialog" aria-label="Gegevens aanvullen" className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <h2 className="font-semibold">Gegevens aanvullen (optioneel)</h2>
    {target.goal ? target.ownRoster && match.players.length ? <label className="block">Doelpuntenmaker
      <select aria-label="Doelpuntenmaker" value={player} onChange={e => setPlayer(e.target.value)} className="block w-full rounded-lg border p-3 text-base">
        <option value="">Nog niet bekend</option>{match.players.map(p => <option key={p.playerId} value={p.playerId}>{p.number ? `${p.number} - ` : ""}{p.name}</option>)}
      </select></label> : <p>Geen spelerslijst voor deze teamzijde. Je kunt dit overslaan.</p> : <>
      <label className="block">Naam<input aria-label="Naam" value={name} maxLength={200} onChange={e => setName(e.target.value)} className="block w-full rounded-lg border p-3 text-base" /></label>
      <label className="block">Rugnummer<input aria-label="Rugnummer" type="number" min={0} max={999} value={number} onChange={e => setNumber(e.target.value)} className="block w-full rounded-lg border p-3 text-base" /></label>
      <label className="block">Opmerking<textarea aria-label="Opmerking" value={note} maxLength={2000} onChange={e => setNote(e.target.value)} className="block w-full rounded-lg border p-3 text-base" /></label>
    </>}
    <div className="grid grid-cols-2 gap-3">
      <button type="button" disabled={busy || (target.goal ? !player : !name && !number && !note)} className="rounded-xl bg-dia-green p-3 font-semibold text-white disabled:opacity-40" onClick={async () => {
        const action: RefereeAction = target.goal ? { kind: "enrich_goal", eventId: target.id, scorerId: player as Id<"players"> } :
          { kind: "annotate_event", eventId: target.id, ...(name ? { reportedName: name } : {}), ...(number ? { reportedNumber: Number(number) } : {}), ...(note ? { note } : {}) };
        if (await onSave(action)) onClose();
      }}>Opslaan</button>
      <button type="button" onClick={onClose} className="rounded-xl border p-3 font-semibold">Overslaan</button>
    </div>
  </section>;
}
