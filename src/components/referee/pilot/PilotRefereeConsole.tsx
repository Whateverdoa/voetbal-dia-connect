"use client";
import { useEffect, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { formatElapsed } from "@/lib/matchClock";
import { signalQuarterNominalEnd } from "@/lib/matchClock/clockSignals";
import { pilotMatchQuery, pilotTimelineQuery, projectPilotClock, type RefereeAction } from "@/lib/refereePilot";
import { usePilotCommand } from "./usePilotCommand";
import { PilotEventDetails, type DetailTarget } from "./PilotEventDetails";

export function PilotRefereeConsole({ matchId }: { matchId: Id<"matches"> }) {
  const match = useQuery(pilotMatchQuery, { matchId });
  const log = usePaginatedQuery(pilotTimelineQuery, { matchId }, { initialNumItems: 30 });
  const commands = usePilotCommand(match);
  const [now, setNow] = useState(() => Date.now());
  const [details, setDetails] = useState<DetailTarget | null>(null);
  const [margin, setMargin] = useState("");
  const [review, setReview] = useState<"resume" | "end_period" | "finish" | null>(null);
  const [finishConfirm, setFinishConfirm] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const clock = match ? projectPilotClock(match, now) : null;
  const nominalKey = match && match.status === "live" && clock?.remainingMs === 0 ? `${matchId}:${match.period}` : null;
  useEffect(() => { if (nominalKey) signalQuarterNominalEnd(); }, [nominalKey]);
  if (match === undefined) return <p className="p-6">Wedstrijd laden...</p>;
  if (!match || match.apiVersion !== 1 || match.clockPolicyVersion !== 1 || !clock) return <p role="alert" className="p-6">Wedstrijdkoppeling niet beschikbaar. Oude bediening wordt niet gebruikt.</p>;
  const disabled = commands.busy || !commands.online || !match.canControl;
  const live = match.status === "live"; const before = ["scheduled", "lineup"].includes(match.status);
  const homeName = match.isHome ? match.teamName : match.opponent; const awayName = match.isHome ? match.opponent : match.teamName;
  const period = match.periodCount === 2 ? "Helft" : "Kwart";
  const marginValue = margin !== "" ? margin : match.clock?.safetyMarginMinutes ?? 10;
  const perform = async (action: RefereeAction) => {
    if (["resume", "end_period", "finish"].includes(action.kind) && clock.reason === "long_stoppage") {
      setReview(action.kind as "resume" | "end_period" | "finish"); return null;
    }
    return await commands.perform(action);
  };
  const register = async (action: RefereeAction, goal: boolean, ownRoster: boolean) => {
    const receipt = await commands.perform(action);
    if (receipt) setDetails({ id: receipt.commandEventId, goal, ownRoster });
  };
  const button = "min-h-12 rounded-xl border border-gray-300 bg-white p-3 font-semibold disabled:opacity-40";
  return <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-2 py-2 md:px-4">
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
      <header className="shrink-0 bg-gradient-to-b from-dia-black to-neutral-900 p-4 text-center text-white">
        <p>{period} {match.period}/{match.periodCount} · {match.status === "halftime" ? "Rust" : before ? "Nog niet gestart" : match.status === "finished" ? "Afgelopen" : "Wedstrijd"}</p>
        <p className="mt-2 text-sm">{homeName} – {awayName}</p>
        <p aria-label="Stand" className="mt-2 text-4xl font-medium tabular-nums">{match.homeScore} – {match.awayScore}</p>
        <p aria-label="Speeltijd" className="mt-2 text-5xl font-medium tabular-nums">{formatElapsed(clock.elapsedMs)}</p>
        <p className="mt-1 text-sm">Regulier nog {formatElapsed(clock.remainingMs)}</p>
      </header>
      <div className="min-h-0 space-y-3 overflow-y-auto p-4">
        {!match.canControl && <p role="status" className="rounded-xl bg-gray-100 p-3">Alleen-lezen: registratie is niet vrijgegeven of aan iemand anders toegewezen.</p>}
        {!commands.online && <p role="alert">Geen verbinding. Acties worden niet in een wachtrij gezet.</p>}
        {commands.error && <p role="alert">{commands.error}</p>}
        {commands.pending?.uncertain && <button className={button} disabled={!commands.online} onClick={() => void commands.retry()}>Dezelfde actie opnieuw versturen</button>}
        {commands.pending?.receipt && <p role="status">Opgeslagen; wedstrijd bijwerken...</p>}
        {clock.reason === "period_limit" ? <p role="alert" className="rounded-xl bg-amber-100 p-3">Veiligheidspauze — periode afsluiten of marge aanpassen.</p> : clock.reason === "unknown_anchor" ? <p role="alert">Klok controleren. Hervatten is geblokkeerd.</p> : live && clock.remainingMs === 0 ? <p role="status" className="rounded-xl bg-yellow-100 p-3">{period}tijd bereikt</p> : null}
        {clock.reason === "long_stoppage" && <p role="alert">Lange onderbreking controleren</p>}
        {before && <button className={`${button.replace("bg-white", "")} w-full bg-dia-green text-white`} disabled={disabled} onClick={() => void perform({ kind: "start" })}>Start wedstrijd</button>}
        {match.status === "halftime" && <button className={`${button} w-full`} disabled={disabled || clock.reason === "unknown_anchor"} onClick={() => void perform({ kind: "start_period" })}>Start volgende {period.toLowerCase()}</button>}
        {live && <div className="grid grid-cols-2 gap-3">
          <button className={button} disabled={disabled || clock.reason === "unknown_anchor" || (!clock.running && clock.reason === "period_limit")} onClick={() => void perform({ kind: clock.running ? "pause" : "resume" })}>{clock.running ? "Pauzeer klok" : "Hervat klok"}</button>
          <button className={button} disabled={disabled} onClick={() => match.period === match.periodCount ? setFinishConfirm(true) : void perform({ kind: "end_period" })}>Periode afsluiten</button>
        </div>}
        {finishConfirm && <div role="dialog" aria-label="Wedstrijd afsluiten" className="space-y-2 rounded-xl border p-3"><p>Wedstrijd definitief afsluiten?</p><div className="grid grid-cols-2 gap-2">
          <button className={button} disabled={disabled} onClick={async () => { if (await perform({ kind: "finish" })) setFinishConfirm(false); }}>Wedstrijd afsluiten</button>
          <button className={button} onClick={() => setFinishConfirm(false)}>Annuleren</button></div></div>}
        {review && <div role="dialog" aria-label="Onderbreking beoordelen" className="space-y-2 rounded-xl border p-3"><p>Moet de volledige open onderbreking meetellen?</p>
          {(["include", "discard"] as const).map(choice => <button key={choice} className={`${button} w-full`} disabled={disabled} onClick={async () => { if (await commands.perform({ kind: review, stoppageDisposition: choice })) { setReview(null); setFinishConfirm(false); } }}>{choice === "include" ? "Volledige onderbreking meetellen" : "Onderbreking niet meetellen"}</button>)}
          <button className={button} onClick={() => setReview(null)}>Annuleren</button></div>}
        {live && <div className="grid grid-cols-2 gap-3">{(["home", "away"] as const).map(team => <button key={team} className={button} disabled={disabled} onClick={() => void register({ kind: "goal", team }, true, (team === "home") === match.isHome)}>Doelpunt {team === "home" ? "thuis" : "uit"}</button>)}</div>}
        {live && <details><summary className="cursor-pointer p-2 font-semibold">Kaart, incident of eigen doelpunt</summary><div className="mt-2 grid grid-cols-2 gap-2">
          {(["yellow_card", "red_card"] as const).flatMap(kind => (["home", "away"] as const).map(team => <button key={`${kind}-${team}`} disabled={disabled} className={`${button.replace("bg-white", "")} ${kind === "yellow_card" ? "bg-yellow-400 text-black" : "bg-red-600 text-white"}`} onClick={() => void register({ kind, team }, false, (team === "home") === match.isHome)}>{kind === "yellow_card" ? "Geel" : "Rood"} {team === "home" ? "thuis" : "uit"}</button>))}
          <button className={button} disabled={disabled} onClick={() => void register({ kind: "incident" }, false, false)}>Incident</button>
          <button className={button} disabled={disabled} onClick={() => void register({ kind: "goal", team: match.isHome ? "away" : "home", isOwnGoal: true }, true, true)}>Eigen doelpunt DIA</button>
          <button className={button} disabled={disabled} onClick={() => void register({ kind: "goal", team: match.isHome ? "home" : "away", isOwnGoal: true }, true, false)}>Eigen doelpunt tegenstander</button>
        </div></details>}
        {match.status !== "finished" && <details><summary className="cursor-pointer p-2 font-semibold">Veiligheidsmarge aanpassen</summary><label>Marge (minuten)<input aria-label="Veiligheidsmarge" type="number" min={before ? 0 : match.clock?.safetyMarginMinutes ?? 10} max={30} value={marginValue} onChange={e => setMargin(e.target.value)} className="ml-2 w-20 rounded border p-2 text-base" /></label><button className={button} disabled={disabled} onClick={() => void perform({ kind: "set_safety_margin", safetyMarginMinutes: Number(marginValue) })}>Marge opslaan</button></details>}
        {details && <PilotEventDetails key={details.id} target={details} match={match} busy={commands.busy || !commands.online || !match.canAnnotate} onSave={commands.perform} onClose={() => setDetails(null)} />}
        <section aria-label="Registraties" className="space-y-2"><h2 className="font-semibold">Registraties</h2>
          {log.results.map(event => <div key={event.id} className="rounded-xl border p-3"><p>{period} {event.quarter} · {formatElapsed(event.matchMs ?? 0)} · {event.type === "goal" ? event.corrected ? "Doelpunt teruggedraaid" : "Doelpunt" : event.type === "goal_correction" ? "Doelpuntcorrectie" : event.type === "yellow_card" ? "Gele kaart" : event.type === "red_card" ? "Rode kaart" : "Incident"}{event.playerName ? ` · ${event.playerName}` : ""}</p>
            {event.note && <p>{event.note}</p>}
            {event.type === "goal" && !event.corrected && <button className={button} disabled={disabled} onClick={() => void perform({ kind: "correct_goal", eventId: event.id })}>Dit doelpunt terugdraaien</button>}
            {event.type !== "goal_correction" && <button className={button} disabled={!match.canAnnotate || commands.busy || !commands.online} onClick={() => setDetails({ id: event.id, goal: event.type === "goal", ownRoster: event.type === "goal" ? !!event.isOpponentGoal === !!event.isOwnGoal : !event.isOpponentCard })}>Gegevens aanvullen</button>}
          </div>)}
          {log.status === "CanLoadMore" && <button className={button} onClick={() => log.loadMore(30)}>Eerdere registraties</button>}
        </section>
      </div>
    </section>
  </div>;
}
