"use client";

import { useState } from "react";
import { POSITIONS } from "@/lib/positions";
import { validDate } from "@/lib/coachAssistant/history";
import type { AssistantHistoryMatch, HistoryPlayer } from "@/lib/coachAssistant/types";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";

const inputClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50";
const parseMinutes = (value: string) => value === "" ? null : Number(value);

export function HistoryEditor({ players, teamKey, targetDate, history, onChange, disabled, automaticCount }: {
  players: DemoPlan["players"]; teamKey: string; targetDate: string;
  history: AssistantHistoryMatch[]; onChange: (matches: AssistantHistoryMatch[]) => void; disabled: boolean;
  automaticCount?: number;
}) {
  const [date, setDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [duration, setDuration] = useState("60");
  const [confirmed, setConfirmed] = useState(false);
  const [startingConfirmed, setStartingConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HistoryPlayer[]>(() => players.map((player) => ({
    playerKey: player.key, attendance: "unknown", minutes: null, keeperMinutes: null, startingPosition: null,
  })));

  function editRow(key: string, patch: Partial<HistoryPlayer>) {
    setRows((current) => current.map((row) => row.playerKey === key ? { ...row, ...patch } : row));
    setConfirmed(false);
    setStartingConfirmed(false);
  }

  function add() {
    if (!validDate(date) || date >= targetDate || !opponent.trim() || !Number.isFinite(Number(duration)) || Number(duration) <= 0 || !confirmed) {
      setError("Kies een eerdere wedstrijddatum, tegenstander en geldige werkelijke speelduur. Bevestig daarna de invoer.");
      return;
    }
    if (history.some((match) => match.date === date && match.opponent.toLowerCase() === opponent.trim().toLowerCase())) {
      setError("Deze bronwedstrijd is al toegevoegd. Verwijder de oude invoer voordat je een correctie toevoegt.");
      return;
    }
    const invalid = rows.some((row) => [row.minutes, row.keeperMinutes].some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > Number(duration))) ||
      (row.minutes !== null && row.keeperMinutes !== null && row.keeperMinutes > row.minutes) ||
      (row.attendance === "absent" && ((row.minutes ?? 0) > 0 || (row.keeperMinutes ?? 0) > 0)));
    if (invalid) {
      setError("Controleer de minuten: niet negatief, keeperminuten niet hoger dan speeltijd en geen speeltijd bij afwezigheid.");
      return;
    }
    onChange([...history, { id: `coach-${date}-${opponent.trim().toLowerCase()}`, teamKey, date, opponent: opponent.trim(),
      playingDuration: Number(duration), confirmed: true, startingLineupConfirmed: startingConfirmed, players: rows.map((row) => ({ ...row })) }]);
    setError(null);
    setDate("");
    setOpponent("");
    setConfirmed(false);
    setStartingConfirmed(false);
    setRows(players.map((player) => ({ playerKey: player.key, attendance: "unknown", minutes: null, keeperMinutes: null, startingPosition: null })));
  }

  return <details className="rounded-2xl border border-slate-200 bg-white p-4">
    <summary className="min-h-11 cursor-pointer font-semibold text-slate-800">Handmatige aanvulling (optioneel) · {history.length}</summary>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{automaticCount === undefined ? "Dit losse voorbeeld haalt geen historie op. " : `${automaticCount} wedstrijden zijn automatisch opgehaald uit DIA Live. `}Dit is een leeg formulier voor een optionele aanvulling, geen overzicht van je opgeslagen wedstrijden. De geregistreerde speelminuten vind je hierboven bij Wedstrijdhistorie uit DIA Live. Vul hier alleen iets in als je bewust ontbrekende gegevens wilt toevoegen of corrigeren. Laat onbekende gegevens leeg. Vul keeperminuten alleen met 0 in als je weet dat de speler niet op doel stond.</p>
    {history.length > 0 && <ul className="my-4 space-y-2">{history.map((match) => <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 p-3 text-sm">
      <span>{match.date} · {match.opponent} · {match.startingLineupConfirmed ? "basisplaatsen bevestigd" : "basisplaatsen onbekend"}</span>
      <button type="button" disabled={disabled} className="min-h-11 px-3 font-semibold text-red-700 disabled:opacity-40" onClick={() => onChange(history.filter((item) => item.id !== match.id))} aria-label={`Verwijder historie ${match.opponent}`}>Verwijderen</button>
    </li>)}</ul>}
    <fieldset disabled={disabled} className="mt-4 space-y-4">
      <legend className="font-semibold">Eerdere wedstrijd</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">Datum bronwedstrijd<input className={inputClass} type="date" value={date} onChange={(event) => { setDate(event.target.value); setConfirmed(false); setStartingConfirmed(false); }} /></label>
        <label className="grid gap-1 text-sm">Tegenstander bronwedstrijd<input className={inputClass} value={opponent} onChange={(event) => { setOpponent(event.target.value); setConfirmed(false); }} /></label>
        <label className="grid gap-1 text-sm">Werkelijke speelduur (minuten)<input className={inputClass} type="number" min={1} step="0.1" value={duration} onChange={(event) => { setDuration(event.target.value); setConfirmed(false); }} /></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <caption className="pb-2 text-left text-xs text-slate-500">Basispositie is de plek bij aftrap. Gebruik hiervoor nooit de eindopstelling.</caption>
        <thead className="border-b text-xs text-slate-500"><tr><th className="py-2 pr-3">Speler</th><th>Aanwezigheid</th><th>Speelminuten</th><th>Keeperminuten</th><th>Basispositie</th></tr></thead>
        <tbody>{players.map((player) => {
          const row = rows.find((item) => item.playerKey === player.key)!;
          const label = `${player.name} ${player.number ?? "?"}`;
          return <tr key={player.key} className="border-b border-slate-100"><th scope="row" className="py-3 pr-3 font-medium">{label}</th>
            <td><select className={inputClass} aria-label={`Historische aanwezigheid ${label}`} value={row.attendance} onChange={(event) => editRow(player.key, { attendance: event.target.value as HistoryPlayer["attendance"] })}><option value="unknown">Onbekend</option><option value="present">Aanwezig</option><option value="absent">Afwezig</option></select></td>
            <td><input className={`${inputClass} w-24`} aria-label={`Historische speelminuten ${label}`} type="number" min={0} step="0.1" value={row.minutes ?? ""} onChange={(event) => editRow(player.key, { minutes: parseMinutes(event.target.value) })} /></td>
            <td><input className={`${inputClass} w-24`} aria-label={`Historische keeperminuten ${label}`} type="number" min={0} step="0.1" value={row.keeperMinutes ?? ""} onChange={(event) => editRow(player.key, { keeperMinutes: parseMinutes(event.target.value) })} /></td>
            <td><select className={inputClass} aria-label={`Historische basispositie ${label}`} value={row.startingPosition ?? ""} onChange={(event) => editRow(player.key, { startingPosition: event.target.value || null })}><option value="">Onbekend</option><option value="BENCH">Begon op de bank</option>{POSITIONS.map((position) => <option key={position.code} value={position.code}>{position.code} · {position.nameDutch}</option>)}</select></td>
          </tr>;
        })}</tbody>
      </table></div>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" checked={startingConfirmed} onChange={(event) => setStartingConfirmed(event.target.checked)} /><span>Ik bevestig dat de ingevulde basisposities echte beginopstellingen zijn. Lege posities blijven onbekend.</span></label>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Ik heb datum, aanwezigheid, werkelijke speelduur en ingevulde minuten gecontroleerd.</span></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" className="min-h-11 rounded-xl bg-dia-green px-4 py-2 font-semibold text-white disabled:opacity-40" disabled={!confirmed} onClick={add}>Historie toevoegen</button>
    </fieldset>
  </details>;
}
