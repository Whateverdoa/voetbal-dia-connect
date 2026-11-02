"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { refereePolicyApi, clockReviewReason } from "@/lib/refereePolicyApi";
import type { Id } from "@/convex/_generated/dataModel";
import type { RefereeAction } from "@/convex/lib/refereeRegistrationContract";
import { publicInterruptionTiming } from "@/convex/lib/interruptionTiming";
import { guardOfficialClock, playingElapsedMs } from "@/convex/lib/officialMatchClock";
import { RefereeMatchHeader } from "./RefereeMatchHeader";
import { useOfficialRefereeCommand } from "./useOfficialRefereeCommand";

class AccessBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className="rounded-xl border border-red-300 p-4">Testtoegang niet beschikbaar. Controleer de login en wedstrijdtoestemming. De bediening is geblokkeerd.</p> : this.props.children; }
}
export function PolicyRefereeConsole({ matchId }: { matchId: Id<"matches"> }) {
  return <AccessBoundary key={matchId}><ProtectedConsole matchId={matchId} /></AccessBoundary>;
}
const button = "min-h-[48px] rounded-xl border-2 border-gray-300 px-3 py-3 font-semibold disabled:opacity-50";
function ProtectedConsole({ matchId }: { matchId: Id<"matches"> }) {
  const match = useQuery(refereePolicyApi.getMatch, { matchId });
  const timeline = usePaginatedQuery(refereePolicyApi.timeline, { matchId }, { initialNumItems: 100 });
  const [tick, setTick] = useState(() => Date.now());
  const [received, setReceived] = useState({ match, at: tick });
  if (received.match !== match) setReceived({ match, at: tick });
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 250); return () => clearInterval(timer); }, []);
  const now = (match?.serverNow ?? tick) + Math.max(0, tick - received.at);
  const command = useOfficialRefereeCommand(match, now);
  const [endConfirm, setEndConfirm] = useState(false);
  const [side, setSide] = useState<"home" | "away">("home");
  const [player, setPlayer] = useState("");
  const [number, setNumber] = useState("");
  const [ownGoal, setOwnGoal] = useState(false);
  const [goalTarget, setGoalTarget] = useState<Id<"matchEvents"> | null>(null);
  const [category, setCategory] = useState("Blessure");
  const [extraChoice, setExtraChoice] = useState<{ period: number; seconds: string } | null>(null);
  const [margin, setMargin] = useState("10");
  const [localError, setLocalError] = useState<string | null>(null);
  if (!match || !match.clock) return <p role="status">Wedstrijd laden…</p>;
  const clock = guardOfficialClock({ ...match.clock, clockReviewReason: clockReviewReason(match.clock.clockReviewReason), status: match.status === "halftime" ? "break" : match.status,
    period: match.period, periodCount: match.periodCount, periodMinutes: match.periodMinutes }, now).state;
  const elapsed = playingElapsedMs(clock, now);
  const timing = match.interruptionTiming ?? { measurements: [], chosenSeconds: {} };
  const extraSeconds = extraChoice?.period === match.period ? extraChoice.seconds : String(timing.chosenSeconds[match.period] ?? 0);
  const active = timing.measurements.find(m => m.endedElapsedMs === undefined);
  const reviews = timing.measurements.filter(m => m.endedElapsedMs !== undefined && m.included === undefined);
  const blocked = command.busy || !!command.pending || command.waitingForRead || !match.canControl || now >= match.expiresAt;
  const live = match.status === "live";
  const home = match.isHome ? match.teamName : match.opponent;
  const away = match.isHome ? match.opponent : match.teamName;
  const ownSide = side === (match.isHome ? "home" : "away");
  const available = match.players.filter(p => !number || p.number === Number(number));
  const lastGoal = timeline.results.find(e => e.type === "goal" && !e.corrected);
  const longStop = clock.stoppageStartedAt !== undefined && now - clock.stoppageStartedAt >= 900000;
  const displayClock = { ...clock, limitElapsedMs: clock.clockLimitElapsedMs, interruptionTiming: publicInterruptionTiming(timing, elapsed) };
  async function act(action: RefereeAction) {
    setLocalError(null);
    const result = await command.act(action);
    if (result) { setEndConfirm(false); return result; }
    return null;
  }
  async function measure() {
    const next = { ...timing, measurements: timing.measurements.map(m => ({ ...m })) };
    if (active) {
      next.measurements = next.measurements.map(m => m.id !== active.id ? m : { ...m, endedElapsedMs: elapsed,
        included: elapsed - m.startedElapsedMs < 900000 ? true : undefined });
    } else next.measurements.push({ id: crypto.randomUUID(), period: match!.period, kind: "interruption", startedElapsedMs: elapsed });
    await act({ kind: "sync_interruption_timing", timing: next });
  }
  async function goal(team: "home" | "away") {
    const result = await act({ kind: "goal", team, isOwnGoal: ownGoal });
    if (result) { setSide(team); setPlayer(""); setNumber(""); setGoalTarget(result.commandEventId); }
  }
  async function saveScorer() {
    if (!goalTarget) return;
    const selectedOwnPlayer = ownGoal ? !ownSide : ownSide;
    if (selectedOwnPlayer && player) {
      if (await act({ kind: "enrich_goal", eventId: goalTarget, scorerId: player as Id<"players"> })) setGoalTarget(null);
    } else if (!selectedOwnPlayer && !ownGoal && /^\d{1,3}$/.test(number)) {
      if (await act({ kind: "enrich_goal", eventId: goalTarget, scorerNumber: Number(number) })) setGoalTarget(null);
    } else setLocalError("Kies een beschikbare speler of sla over. Een rugnummer kan bij een normaal doelpunt van de tegenstander.");
  }
  const end = (disposition?: "include" | "discard") => act({ kind: "end_period", stoppageDisposition: disposition });
  return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-label="Officiële wedstrijdregistratie">
    <RefereeMatchHeader status={match.status as "scheduled" | "lineup" | "live" | "halftime" | "finished"} statusLabel={match.status === "halftime" ? "Rust" : match.status === "finished" ? "Afgelopen" : `${match.periodCount === 2 ? "Helft" : "Kwart"} ${match.period}`}
      surfaceClasses="from-dia-black to-neutral-900" isLive={live} isScheduled={match.status === "scheduled" || match.status === "lineup"}
      refereeClock={displayClock} currentQuarter={match.period} quarterCount={match.periodCount} regulationDurationMinutes={match.periodMinutes * match.periodCount}
      homeScore={match.homeScore} awayScore={match.awayScore} homeName={home} awayName={away} homeLogoUrl={null} awayLogoUrl={null} />
    <div className="space-y-3 p-4">
      {(command.error || localError) && <p role="alert">{command.error ?? localError}</p>}
      {command.pending && <button className={button} disabled={command.busy} onClick={() => void command.retry()}>Dezelfde actie opnieuw versturen</button>}
      {!match.canControl && <p role="status">{match.canAnnotate ? "Wedstrijd afgelopen. Alleen aanvullen is nog mogelijk." : "Alleen lezen: geen registratierecht of testtoestemming."}</p>}
      {clock.clockReviewReason && <p role="alert">{clock.clockReviewReason === "period_limit" ? "Veiligheidspauze" : clock.clockReviewReason === "unknown_anchor" ? "Klok controleren" : "Lange onderbreking controleren"}</p>}
      {live && elapsed - (clock.periodStartedElapsedMs ?? elapsed) >= match.periodMinutes * 60000 && <p role="status">{match.periodCount === 2 ? "Helfttijd bereikt" : "Kwarttijd bereikt"}</p>}
      {(!live && match.status !== "halftime" && match.status !== "finished") && <button className={`${button} w-full bg-dia-green text-white`} disabled={blocked} onClick={() => void act({ kind: "start" })}>Start wedstrijd</button>}
      {match.status === "halftime" && <button className={`${button} w-full`} disabled={blocked || clock.clockReviewReason === "unknown_anchor"} onClick={() => void act({ kind: "start_period" })}>Start volgende periode</button>}
      {live && <>
        <button className={`${button} w-full bg-orange-50`} disabled={blocked || (!active && clock.runningSince === null)} onClick={() => void measure()}>{active ? "Meting stoppen" : "Onderbreking meten"}</button>
        <p className="text-sm text-gray-600">De wedstrijdklok loopt door tijdens de meting.</p>
        {reviews.map(m => <div key={m.id} role="group" aria-label="Lange meting beoordelen">Volledige onderbreking meetellen?
          {[true, false].map(include => <button key={String(include)} className={button} disabled={blocked} onClick={() => void act({ kind: "sync_interruption_timing", timing: { ...timing, measurements: timing.measurements.map(item => item.id === m.id ? { ...item, included: include } : item) } })}>{include ? "Meetellen" : "Niet meetellen"}</button>)}
        </div>)}
        <div className="flex gap-2"><label>Extra tijd (seconden)<input aria-label="Extra tijd in seconden" className="w-24 border p-2" type="number" inputMode="numeric" min={0} max={clock.safetyMarginMinutes * 60} value={extraSeconds} onChange={e => setExtraChoice({ period: match.period, seconds: e.target.value })} /></label>
          <button className={button} disabled={blocked || !!active || reviews.length > 0 || !/^\d+$/.test(extraSeconds) || Number(extraSeconds) > clock.safetyMarginMinutes * 60} onClick={() => void act({ kind: "sync_interruption_timing", timing: { ...timing, chosenSeconds: { ...timing.chosenSeconds, [match.period]: Number(extraSeconds) } } })}>Extra tijd opslaan</button></div>
        <details><summary>Echte klokpauze / marge</summary>
          {clock.runningSince !== null ? <button className={button} disabled={blocked} onClick={() => void act({ kind: "pause" })}>Klok echt pauzeren</button> : longStop ? <div role="group" aria-label="Lange klokpauze beoordelen">{(["include", "discard"] as const).map(choice => <button key={choice} className={button} disabled={blocked || clock.clockReviewReason === "unknown_anchor"} onClick={() => void act({ kind: "resume", stoppageDisposition: choice })}>Hervatten: {choice === "include" ? "pauze meetellen" : "pauze niet meetellen"}</button>)}</div> : <button className={button} disabled={blocked || clock.clockReviewReason === "unknown_anchor"} onClick={() => void act({ kind: "resume" })}>Klok hervatten</button>}
          <label>Marge (minuten)<input aria-label="Marge in minuten" value={margin} type="number" inputMode="numeric" min={clock.safetyMarginMinutes} max={30} onChange={e => setMargin(e.target.value)} /></label>
          <button className={button} disabled={blocked || !/^\d+$/.test(margin) || Number(margin) < clock.safetyMarginMinutes || Number(margin) > 30} onClick={() => void act({ kind: "set_safety_margin", safetyMarginMinutes: Number(margin) })}>Marge aanpassen</button>
        </details>
        <button className={`${button} w-full`} aria-expanded={endConfirm} aria-controls="policy-end-confirmation" disabled={blocked} onClick={() => setEndConfirm(true)}>{match.period === match.periodCount ? "Einde wedstrijd" : "Einde periode"}</button>
        {endConfirm && <div id="policy-end-confirmation" role="group" aria-label="Einde periode bevestigen" className="rounded-xl border-2 border-red-500 bg-red-50 p-3">
          <p>{home} {match.homeScore} - {match.awayScore} {away}. Periode afsluiten? De klok stopt.</p>
          {longStop ? (["include", "discard"] as const).map(choice => <button key={choice} className={button} disabled={blocked} onClick={() => void end(choice)}>Afsluiten: {choice === "include" ? "pauze meetellen" : "pauze niet meetellen"}</button>) : <button className={button} disabled={blocked} onClick={() => void end()}>Ja, periode afsluiten</button>}
          <button className={button} onClick={() => setEndConfirm(false)}>Terug naar wedstrijd</button>
        </div>}
      </>}
      {(live || match.status === "halftime") && <>
        <div className="grid grid-cols-2 gap-2">{(["home", "away"] as const).map(team => <button key={team} className={`${button} bg-dia-green text-white`} aria-label={`Doelpunt ${team === "home" ? "thuis" : "uit"}: ${team === "home" ? home : away}`} disabled={blocked || !!goalTarget} onClick={() => void goal(team)}>Doelpunt {team === "home" ? home : away}</button>)}</div>
        <label><input type="checkbox" checked={ownGoal} disabled={!!goalTarget} onChange={e => setOwnGoal(e.target.checked)} /> Eigen doelpunt voor het gekozen team</label>
        <label className="block">Team<select aria-label="Team" disabled={!!goalTarget} className="ml-2 border p-2" value={side} onChange={e => { setSide(e.target.value as "home" | "away"); setNumber(""); setPlayer(""); }}><option value="home">{home}</option><option value="away">{away}</option></select></label>
        <label>Rugnummer<input aria-label="Rugnummer" className="ml-2 w-24 border p-2" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={number} onChange={e => { setNumber(e.target.value.replace(/\D/g, "")); setPlayer(""); }} /></label>
        {(goalTarget ? (ownGoal ? !ownSide : ownSide) : ownSide) && <label className="block">Speler<select aria-label="Speler" className="border p-2" value={player} onChange={e => setPlayer(e.target.value)}><option value="">Overslaan / onbekend</option>{available.map(p => <option key={p.playerId} value={p.playerId}>{p.number ?? ""} {p.name}</option>)}</select></label>}
        {goalTarget ? <div role="group" aria-label="Doelpunt aanvullen"><button className={button} disabled={blocked} onClick={() => void saveScorer()}>Speler opslaan</button><button className={button} disabled={command.busy} onClick={() => setGoalTarget(null)}>Overslaan</button></div> : <div className="grid grid-cols-2 gap-2">{(["yellow_card", "red_card"] as const).map(kind => <button key={kind} className={`${button} ${kind === "yellow_card" ? "bg-yellow-400 text-black" : "bg-red-600 text-white"}`} disabled={blocked} onClick={() => void act({ kind, team: side, playerId: ownSide && player ? player as Id<"players"> : undefined, reportedNumber: number ? Number(number) : undefined })}>{kind === "yellow_card" ? "Gele kaart" : "Rode kaart"}</button>)}</div>}
        <div className="flex gap-2"><select aria-label="Incidentsoort" value={category} onChange={e => setCategory(e.target.value)}>{["Blessure", "Strafschop", "Publiek", "Overig"].map(c => <option key={c}>{c}</option>)}</select><button className={`${button} bg-blue-700 text-white`} disabled={blocked} onClick={() => void act({ kind: "incident", note: category + ":" })}>Incident vastleggen</button></div>
        <button className={`${button} w-full`} disabled={blocked || !lastGoal} onClick={() => lastGoal && void act({ kind: "correct_goal", eventId: lastGoal.id })}>Laatste doelpunt ongedaan maken</button>
      </>}
      <h2 className="font-bold">Gebeurtenissen</h2>
      <ul>{timeline.results.map(event => <li key={event.id} className="border-b py-2">{event.type === "goal" ? "Doelpunt" : event.type === "yellow_card" ? "Gele kaart" : event.type === "red_card" ? "Rode kaart" : event.type === "incident" ? "Incident" : "Doelpunt teruggedraaid"} · Periode {event.quarter} · {event.playerName}{event.corrected && " · Gecorrigeerd"}{event.note && ` · ${event.note}`}</li>)}</ul>
      {timeline.status === "CanLoadMore" && <button className={button} onClick={() => timeline.loadMore(100)}>Meer gebeurtenissen</button>}
    </div>
  </section>;
}
