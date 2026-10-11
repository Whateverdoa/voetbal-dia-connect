"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CardKind } from "@/lib/cards/fc27";
import { amsterdamLocalToUtc, cardPeriodKey } from "@/lib/cards/cardPeriods";
import type { StaffCardTeam } from "@/components/cards/CoachCardsPanel";
import { amsterdamInputTime, cardButtonClass, cardDate, cardError, cardInputClass } from "@/components/cards/cardUi";

type StaffRound = StaffCardTeam["rounds"][number];

export function CardRoundManager({ data }: { data: StaffCardTeam }) {
  const create = useMutation(api.playerCards.createRound);
  const [kind, setKind] = useState<CardKind>("week");
  const [mode, setMode] = useState<"manual" | "vote">("vote");
  const [period, setPeriod] = useState(() => cardPeriodKey(Date.now(), "week"));
  const [count, setCount] = useState("1");
  const [deadline, setDeadline] = useState(() => amsterdamInputTime(Date.now() + 86400000));
  const [selected, setSelected] = useState<Id<"players">[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const eligible = data.players.filter((player) => player.active && player.eligible);
  const existing = data.rounds.some((round) => round.kind === kind && round.periodKey === period);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const closesAt = amsterdamLocalToUtc(deadline);
    const winnerCount = Number(count);
    if (mode === "vote" && (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > eligible.length)) {
      setError("Kies een geldig aantal kaarten, maximaal het aantal verkiesbare spelers.");
      return;
    }
    if (mode === "vote" && (!Number.isFinite(closesAt) || closesAt <= Date.now())) {
      setError("Kies een sluitingsdatum in de toekomst (Nederlandse tijd).");
      return;
    }
    if (mode === "manual" && selected.length === 0) {
      setError("Kies ten minste één speler.");
      return;
    }
    setPending(true);
    try {
      await create({ teamId: data.team.id, kind, mode, periodKey: period,
        ...(mode === "vote" ? { winnerCount, closesAt } : { playerIds: selected }),
      });
      setSelected([]);
      setMessage(mode === "vote" ? "Stemronde geopend. De uitslag wordt automatisch gepubliceerd." : "Spelerskaarten gepubliceerd.");
    } catch (cause) {
      setError(cardError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border border-slate-200 p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-bold text-slate-900">Team van de week &amp; maand</summary>
      <p className="mb-4 text-sm text-slate-600">Weekkaarten geven +2, maandkaarten +5. Bij overlap geldt de hoogste bonus. Stemmers kiezen evenveel spelers als er kaarten zijn; een gelijke eindstand kan extra winnaars opleveren.</p>
      <form onSubmit={(event) => { void submit(event); }} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Kaart<select value={kind} onChange={(event) => {
            const next = event.target.value as CardKind;
            setKind(next);
            setPeriod(cardPeriodKey(Date.now(), next));
          }} className={`${cardInputClass} mt-1`}><option value="week">Team van de week</option><option value="month">Team van de maand</option></select></label>
          <label className="text-sm font-semibold">{kind === "week" ? "Week vanaf maandag" : "Maand"}<input type={kind === "week" ? "date" : "month"} value={period} required onChange={(event) => {
            const value = event.target.value;
            setPeriod(kind === "week" && value ? cardPeriodKey(amsterdamLocalToUtc(`${value}T12:00`), "week") : value);
          }} className={`${cardInputClass} mt-1`} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Keuzemethode<select value={mode} onChange={(event) => setMode(event.target.value as "manual" | "vote")} className={`${cardInputClass} mt-1`}><option value="vote">Spelers en ouders laten stemmen</option><option value="manual">Als coach direct aanwijzen</option></select></label>
        </div>
        {mode === "vote" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Aantal kaarten<input type="number" min={1} max={Math.max(1, eligible.length)} step={1} required value={count} onChange={(event) => setCount(event.target.value)} className={`${cardInputClass} mt-1`} /></label>
            <label className="text-sm font-semibold">Sluiten (Nederlandse tijd)<input type="datetime-local" required value={deadline} onChange={(event) => setDeadline(event.target.value)} className={`${cardInputClass} mt-1`} /></label>
          </div>
        ) : <fieldset><legend className="mb-2 text-sm font-semibold">Winnaars kiezen</legend><div className="grid gap-2 sm:grid-cols-2">{eligible.map((player) => <label key={player.playerId} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(player.playerId)} onChange={() => setSelected((previous) => previous.includes(player.playerId) ? previous.filter((id) => id !== player.playerId) : [...previous, player.playerId])} className="h-5 w-5 accent-dia-green" />{player.name}</label>)}</div></fieldset>}
        {eligible.length === 0 ? <p className="text-sm text-amber-800">Er zijn geen actieve spelers met toestemming voor gamificatie en publieke weergave.</p> : null}
        {existing ? <p className="text-sm text-amber-800">Voor deze periode bestaat al een ronde. Bekijk deze hieronder.</p> : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-green-800">{message}</p> : null}
        <button type="submit" disabled={pending || existing || eligible.length === 0} className={cardButtonClass}>{pending ? "Opslaan…" : mode === "vote" ? "Stemronde openen" : "Kaarten publiceren"}</button>
      </form>
      <div className="mt-6 space-y-3">{data.rounds.map((round) => <RoundReview key={round._id} round={round} players={data.players} />)}</div>
    </details>
  );
}

function RoundReview({ round, players }: { round: StaffRound; players: StaffCardTeam["players"] }) {
  const veto = useMutation(api.playerCards.setVeto);
  const [target, setTarget] = useState<Id<"players"> | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const names = new Map(players.map((player) => [player.playerId, player.name]));
  const excluded = target !== null && round.vetoedIds.includes(target);

  async function saveVeto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    if (!reason.trim()) {
      setError("Geef een korte reden voor deze coachbeslissing.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      await veto({ roundId: round._id, playerId: target, veto: !excluded, reason: reason.trim() });
      setTarget(null);
      setReason("");
      setMessage("Coachbeslissing opgeslagen. De winnaars zijn opnieuw bepaald.");
    } catch (cause) {
      setError(cardError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-xl bg-slate-50 p-3">
      <h3 className="font-bold text-slate-900">{round.kind === "week" ? "Team van de week" : "Team van de maand"} · {round.periodKey}</h3>
      <p className="text-sm text-slate-600">{round.status === "open" ? `Stemmen tot ${cardDate(round.closesAt)}` : round.status === "published" ? `Gepubliceerd ${cardDate(round.publishedAt)} · geldig tot ${cardDate(round.expiresAt)}` : "Geannuleerd"}</p>
      {round.status === "published" && round.winnerIds.length === 0 ? <p className="mt-2 text-sm text-slate-600">Geen winnaars beschikbaar.</p> : null}
      <ul className="mt-2 divide-y divide-slate-200">
        {round.ranking.map((entry) => {
          const winner = round.winnerIds.includes(entry.playerId);
          const vetoed = round.vetoedIds.includes(entry.playerId);
          return <li key={entry.playerId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{names.get(entry.playerId) ?? "Speler"}{round.mode === "vote" ? ` · ${entry.count} ${entry.count === 1 ? "stem" : "stemmen"}` : ""}{winner ? " · Winnaar" : vetoed ? " · Veto" : ""}</span>{round.status === "published" && (winner || vetoed) ? <button type="button" disabled={pending} onClick={() => { setTarget(entry.playerId); setReason(""); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold">{vetoed ? "Veto terugdraaien" : "Coachveto"}</button> : null}</li>;
        })}
      </ul>
      {target ? <form onSubmit={(event) => { void saveVeto(event); }} className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold">{excluded ? "Veto terugdraaien" : "Veto toepassen"}: {names.get(target)}</p><label className="block text-sm">Interne reden<textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={`${cardInputClass} mt-1`} /></label><p className="text-xs text-slate-600">Deze reden blijft intern. De oorspronkelijke vervaldatum blijft gelden.</p><div className="flex gap-2"><button type="submit" disabled={pending} className={cardButtonClass}>{pending ? "Opslaan…" : "Beslissing opslaan"}</button><button type="button" onClick={() => setTarget(null)} className="min-h-11 rounded-lg px-3 text-sm font-semibold">Annuleren</button></div></form> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="mt-2 text-sm text-green-800">{message}</p> : null}
    </article>
  );
}
