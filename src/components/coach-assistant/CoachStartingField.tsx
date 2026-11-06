"use client";

import type { DemoPlan } from "@/lib/substitutions/demoPlan";
import type { AssistantPlayer } from "@/lib/coachAssistant/types";
import { canonicalPosition } from "@/lib/coachAssistant/history";
import { getPositionNameDutch } from "@/lib/positions";
import { useState } from "react";
import { FieldLines } from "@/components/match/FieldLines";
import { FieldPlayerCard } from "@/components/match/FieldPlayerCard";
import { FIELDS } from "@/lib/fieldConfig";

export function CoachStartingField({ plan, players, field, keeperKey, secondKeeperKey, onChange, onKeeperChange }: {
  plan: DemoPlan;
  players: AssistantPlayer[];
  field: DemoPlan["startingLineup"]["field"];
  keeperKey: string;
  secondKeeperKey?: string;
  onChange: (field: DemoPlan["startingLineup"]["field"]) => void;
  onKeeperChange: (key: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const cfg = FIELDS[plan.formation.slots.length <= 8 ? "8tal" : "11tal"];
  const eligible = players.filter((player) => player.availability === "present" && player.key !== keeperKey && player.key !== secondKeeperKey);
  const label = (key: string) => {
    const player = plan.players.find((candidate) => candidate.key === key);
    return player ? `${player.name} ${player.number ?? "?"}` : "Onbekende speler";
  };
  function choose(slotId: number, playerKey: string) {
    const previous = field.find((entry) => entry.slotId === slotId);
    const other = playerKey ? field.find((entry) => entry.playerKey === playerKey) : undefined;
    const next = field.filter((entry) => entry.slotId !== slotId && entry.playerKey !== playerKey);
    if (playerKey) next.push({ slotId, playerKey });
    if (other && other.slotId !== slotId && previous) next.push({ slotId: other.slotId, playerKey: previous.playerKey });
    onChange(next);
  }
  function place(slotId: number, playerKey: string) {
    const isKeeper = canonicalPosition(plan.formation.slots.find((slot) => slot.id === slotId)?.position ?? null) === "GK";
    if (isKeeper) {
      const old = field.find((entry) => entry.playerKey === playerKey);
      onChange([...field.filter((entry) => entry.playerKey !== playerKey), ...(old && keeperKey ? [{ playerKey: keeperKey, slotId: old.slotId }] : [])]);
      onKeeperChange(playerKey);
    } else if (playerKey === keeperKey) {
      onKeeperChange(field.find((entry) => entry.slotId === slotId)?.playerKey ?? "");
      choose(slotId, playerKey);
    } else choose(slotId, playerKey);
    setSelected(null);
  }
  function selectBank(key: string) {
    const old = field.find((entry) => entry.playerKey === selected);
    if (selected === key) setSelected(null);
    else if (selected === keeperKey || old) {
      const slot = old?.slotId ?? plan.formation.slots.find((entry) => canonicalPosition(entry.position) === "GK")?.id;
      if (slot !== undefined) place(slot, key);
    } else setSelected(key);
  }
  const bank = eligible.filter((player) => !field.some((entry) => entry.playerKey === player.key)).map((player) => label(player.key));
  if (secondKeeperKey) bank.push(label(secondKeeperKey));
  return <section aria-label="Eigen beginopstelling" className="space-y-3 rounded-xl bg-green-50 p-4">
    <h3 className="font-semibold">Zet je beginopstelling neer</h3>
    <p className="text-sm">Tik op een bankspeler en daarna op een veldplek. Tik op twee veldspelers om hun posities te ruilen. De assistent houdt deze beginopstelling aan en berekent daarna de wissels.</p>
    <p role="status" className="text-sm font-semibold">{selected ? `${label(selected)} geselecteerd — kies een plek of een bankspeler.` : "Kies een speler op het veld of de bank."}</p>
    <div className="mx-auto w-full max-w-lg">
      <div aria-label="Coachveld voor beginopstelling" className="relative overflow-hidden rounded-xl border border-green-900 bg-[#2d7a3a]" style={{ aspectRatio: `${cfg.w} / ${cfg.h}` }}>
        <FieldLines cfg={cfg} />
        {plan.formation.slots.map((slot) => {
          const key = canonicalPosition(slot.position) === "GK" ? keeperKey : field.find((entry) => entry.slotId === slot.id)?.playerKey;
          const person = plan.players.find((player) => player.key === key);
          return <button key={slot.id} type="button" aria-label={`Veldplek ${slot.position} ${slot.id + 1}: ${key ? label(key) : "leeg"}`} aria-pressed={Boolean(key && selected === key)} className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-yellow-300 sm:h-28 sm:w-24" style={{ left: `${slot.x}%`, top: `${slot.y}%`, zIndex: key === selected ? 100 : Math.round(slot.y) }} onClick={() => { if (selected === key) setSelected(null); else if (selected) place(slot.id, selected); else if (key) setSelected(key); }}>
            <FieldPlayerCard name={person?.name ?? ""} number={person?.number} position={slot.position} x={50} y={50} isSelected={Boolean(key && selected === key)} isDimmed={Boolean(selected && selected !== key)} isEmpty={!person} onClick={() => {}} />
            {!person && <span className="pointer-events-none relative text-xs font-bold text-white">{slot.position}</span>}
          </button>;
        })}
      </div>
      <div aria-label="Bank voor beginopstelling" className="mt-3 flex flex-wrap gap-2">{eligible.filter((player) => !field.some((entry) => entry.playerKey === player.key)).map((player) => <button key={player.key} type="button" aria-pressed={selected === player.key} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${selected === player.key ? "border-yellow-400 bg-yellow-100" : "border-slate-300 bg-white"}`} onClick={() => selectBank(player.key)}>{label(player.key)}</button>)}</div>
      {selected && <div className="mt-2 flex gap-2"><button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setSelected(null)}>Selectie wissen</button>{(selected === keeperKey || field.some((entry) => entry.playerKey === selected)) && <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => { if (selected === keeperKey) onKeeperChange(""); else onChange(field.filter((entry) => entry.playerKey !== selected)); setSelected(null); }}>Zet op de bank</button>}</div>}
    </div>
    <details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Beginposities via keuzelijst aanpassen</summary><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plan.formation.slots.filter((slot) => canonicalPosition(slot.position) !== "GK").map((slot) => {
      const selected = field.find((entry) => entry.slotId === slot.id)?.playerKey ?? "";
      return <label key={slot.id} className="grid gap-1 text-sm font-medium">{getPositionNameDutch(canonicalPosition(slot.position) ?? slot.position)} ({slot.position}) · plek {slot.id + 1}
        <select aria-label={`Beginpositie ${slot.position}, plek ${slot.id + 1}`} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={selected} onChange={(event) => choose(slot.id, event.target.value)}>
          <option value="">Kies basisspeler</option>
          {selected && !eligible.some((player) => player.key === selected) && <option value={selected} disabled>{label(selected)} — niet beschikbaar voor deze plek</option>}
          {eligible.map((player) => <option key={player.key} value={player.key}>{label(player.key)}</option>)}
        </select>
      </label>;
    })}</div></details>
    <p className="text-sm"><strong>Begint op de bank:</strong> {bank.join(" · ") || "Niemand"}</p>
    <p className="text-xs text-slate-600">Deze keuze geldt alleen voor de aftrap. Basisspelers kunnen daarna gewoon worden gewisseld. Bij een andere formatie controleer je de beginplekken opnieuw.</p>
  </section>;
}
