"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import Image from "next/image";
import { ArrowDownUp, Check, CheckCircle2, ChevronRight, Clock3, Flag, ImagePlus, Pause, Play, RotateCcw, ShieldCheck, SkipForward } from "lucide-react";
import { PlayerShield } from "./PlayerShield";
import { StartingLineupEditor } from "./StartingLineupEditor";
import { RecentPlayingMinutes } from "./RecentPlayingMinutes";
import { SubstitutionPrint, SubstitutionPrintButton, type SubstitutionPrintMode } from "./SubstitutionPrint";
import { DEMO_PLAN, type DemoPlan } from "@/lib/substitutions/demoPlan";
import { DEFAULT_DEMO_FORMATION_ID, DEMO_FORMATIONS, getDemoFormation, type DemoFormation } from "@/lib/substitutions/demoFormations";
import { assignDemoStartingPlayer, createManualDemoPlan, swapDemoStartingPositions } from "@/lib/substitutions/demoLineup";
import { getPositionNameDutch } from "@/lib/positions";
import {
  advanceDemoClock, advanceDemoClockFollowingPlan, createDemoMatch, executeDemoStep, executeDemoAction, getDemoComparison,
  pauseDemoClock, skipDemoStep, startDemoClock, substituteDemoPlayer, swapDemoPlayerPositions, changeDemoFormation,
  type DemoFormationState, type DemoMatchState,
} from "@/lib/substitutions/demoMatch";
import { validatePortableSubstitutionPlan } from "@/lib/substitutions/validatePortableSubstitutionPlan";

export interface DemoSource {
  id: string;
  kind: "photo" | "app";
  initialPlan: DemoPlan;
  teamName: string;
  matchLabel: string;
  capturedAt?: string;
  sourceUrl?: string;
  notes?: string[];
}

const PHOTO_SOURCE: DemoSource = {
  id: "photo-example", kind: "photo", initialPlan: DEMO_PLAN,
  teamName: "JO13-2", matchLabel: "Fotovoorbeeld",
};

type Tab = "field" | "review" | "comparison";
type Session = { match: DemoMatchState; approved: boolean; automatic: boolean; error: string | null };
type Command =
  | { type: "approve"; plan: DemoPlan }
  | { type: "reset"; plan: DemoPlan }
  | { type: "automatic"; enabled: boolean }
  | { type: "editSetup" }
  | { type: "positions"; a: string; b: string }
  | { type: "formation"; formation: DemoFormationState }
  | { type: "clock" }
  | { type: "tick"; seconds: number }
  | { type: "minuteStep" }
  | { type: "jump" }
  | { type: "execute"; id: string }
  | { type: "executeOne"; stepId: string; actionId: string }
  | { type: "skip"; id: string }
  | { type: "manual"; out: string; incoming: string }
  | { type: "late" }
  | { type: "finish" };

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const primary = `${button} bg-dia-green text-white hover:bg-green-800`;
const phaseLabel = { ready: "Klaar voor aftrap", running: "Klok loopt", paused: "Gepauzeerd", halftime: "Rust", finished: "Afgelopen" };
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
const minutes = (value: number) => value.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const difference = (value: number) => `${value > 0 ? "+" : ""}${minutes(value)}`;

function advanceTo(match: DemoMatchState, target: number): DemoMatchState {
  const started = startDemoClock(match);
  const next = advanceDemoClock(started, Math.max(0, target - started.elapsedSeconds));
  return next;
}

function finishFollowingPlan(match: DemoMatchState) {
  const end = match.plan.match.regulationDurationMinutes * 60;
  const next = advanceDemoClockFollowingPlan(startDemoClock(match), end - match.elapsedSeconds);
  return next.error || next.match.phase !== "halftime" ? next
    : advanceDemoClockFollowingPlan(startDemoClock(next.match), end - next.match.elapsedSeconds);
}

function advanceSession(session: Session, seconds: number, start = false, pauseAfter = false): Session {
  const match = start ? startDemoClock(session.match) : session.match;
  const result = session.automatic !== false
    ? advanceDemoClockFollowingPlan(match, seconds)
    : { match: advanceDemoClock(match, seconds), error: null };
  return { ...session, match: pauseAfter ? pauseDemoClock(result.match) : result.match, error: result.error };
}

function reducer(session: Session, command: Command): Session {
  try {
    if (command.type === "reset") return { match: createDemoMatch(command.plan), approved: false, automatic: true, error: null };
    if (command.type === "automatic") return { ...session, automatic: command.enabled };
    if (command.type === "editSetup") {
      return session.match.phase === "ready" ? { ...session, approved: false, error: null } : session;
    }
    if (command.type === "approve") {
      if (!validatePortableSubstitutionPlan(command.plan).readyToPublish) throw new Error("Los eerst de meldingen op en bevestig de overname.");
      return { ...session, match: createDemoMatch(command.plan), approved: true, error: null };
    }
    if (!session.approved) return { ...session, error: "Controleer en bevestig eerst het voorbeeldblad." };
    const match = session.match;
    let next = match;
    switch (command.type) {
      case "clock": next = match.phase === "running" ? pauseDemoClock(match) : startDemoClock(match); break;
      case "tick": return match.phase === "running" ? advanceSession(session, command.seconds) : session;
      case "minuteStep": {
        if (match.phase === "halftime" || match.phase === "finished") break;
        return advanceSession(session, 60, true, true);
      }
      case "execute": next = executeDemoStep(match, command.id); break;
      case "executeOne": next = executeDemoAction(match, command.stepId, command.actionId); break;
      case "skip": next = skipDemoStep(match, command.id); break;
      case "manual": {
        const pendingStep = match.plan.steps.find((step) => match.stepStatus[step.id] === "pending");
        const plannedAction = pendingStep?.actions.find((action) => action.kind === "substitution" &&
          action.playerOutKey === command.out && action.playerInKey === command.incoming &&
          !(match.completedActionIds ?? []).includes(action.id));
        next = pendingStep && plannedAction
          ? executeDemoAction(match, pendingStep.id, plannedAction.id)
          : substituteDemoPlayer(match, command.out, command.incoming);
        break;
      }
      case "positions": next = swapDemoPlayerPositions(match, command.a, command.b); break;
      case "formation": next = changeDemoFormation(match, command.formation); break;
      case "jump": {
        const pending = match.plan.steps.find((step) => match.stepStatus[step.id] === "pending" && step.matchMinute * 60 > match.elapsedSeconds);
        const target = pending ? pending.matchMinute * 60 : match.plan.match.regulationDurationMinutes * 60;
        return advanceSession(session, Math.max(0, target - match.elapsedSeconds), true, true);
      }
      case "late": {
        const original = structuredClone(match.plan) as DemoPlan;
        const firstStep = original.steps[0];
        if (!firstStep) throw new Error("Dit plan heeft geen wisselmoment om later uit te voeren.");
        const target = (firstStep.matchMinute + 2) * 60;
        if (target >= original.match.regulationDurationMinutes * 60) throw new Error("Deze late wissel zou na het einde van de oefenwedstrijd vallen.");
        next = advanceTo(createDemoMatch(original), target);
        if (next.elapsedSeconds < target) next = advanceTo(next, target);
        next = pauseDemoClock(executeDemoStep(next, firstStep.id));
        break;
      }
      case "finish": return { ...session, ...finishFollowingPlan(match) };
    }
    return { ...session, match: next, error: null };
  } catch (error: unknown) {
    return { ...session, error: error instanceof Error ? error.message : "Deze wijziging kon niet worden uitgevoerd." };
  }
}

function PitchLines() {
  return <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 680 525" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <rect x="15" y="15" width="650" height="495" rx="1" stroke="white" strokeOpacity=".42" strokeWidth="1.5" />
    <path d="M248 15a92 92 0 0 0 184 0M138.5 510V345h403v165M248.5 510v-55h183v55M266 345a92 92 0 0 1 148 0" stroke="white" strokeOpacity=".42" strokeWidth="1.5" />
    <path d="M304 510h72" stroke="white" strokeOpacity=".9" strokeWidth="4" />
    <circle cx="340" cy="400" r="2.5" fill="white" fillOpacity=".5" />
    <circle cx="340" cy="15" r="3" fill="white" fillOpacity=".5" />
  </svg>;
}

/** Mount with key={source.id} when switching sources so draft and execution state cannot mix. */
export function SubstitutionDemo({ source = PHOTO_SOURCE }: { source?: DemoSource }) {
  const [session, dispatch] = useReducer(reducer, source.initialPlan, (plan) => ({ match: createDemoMatch(plan), approved: false, automatic: true, error: null }));
  const [tab, setTab] = useState<Tab>("field");
  const [printMode, setPrintMode] = useState<SubstitutionPrintMode>("plan");
  const [speed, setSpeed] = useState(60);
  const [draft, setDraft] = useState<DemoPlan>(() => structuredClone(source.initialPlan));
  const [planSource, setPlanSource] = useState<"photo" | "app" | "manual">(source.kind);
  const [sourceConfirmed, setSourceConfirmed] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [playerOut, setPlayerOut] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [fieldAction, setFieldAction] = useState<"substitution" | "positions">("substitution");
  const [positionA, setPositionA] = useState("");
  const [positionB, setPositionB] = useState("");
  const [pendingFormationId, setPendingFormationId] = useState<string | null>(null);
  const initialFormation = useMemo<DemoFormation>(() => ({
    id: source.initialPlan.formation.id ?? (source.kind === "app" ? `app-${source.id}` : DEFAULT_DEMO_FORMATION_ID),
    name: source.initialPlan.formation.name ?? (source.kind === "app" ? "Opstelling uit de app" : getDemoFormation(DEFAULT_DEMO_FORMATION_ID).name),
    slots: source.initialPlan.formation.slots,
  }), [source]);
  const formationChoices = useMemo(() => [
    initialFormation,
    ...DEMO_FORMATIONS.filter((formation) => formation.id !== initialFormation.id && formation.slots.length === source.initialPlan.match.fieldPlayerCountIncludingKeeper),
  ], [initialFormation, source.initialPlan.match.fieldPlayerCountIncludingKeeper]);
  const resolveFormation = (id: string) => formationChoices.find((formation) => formation.id === id) ?? initialFormation;
  const match = session.match;
  const automatic = session.automatic !== false;
  const beforeKickoff = match.phase === "ready";
  const previewFormation = !beforeKickoff && match.phase !== "finished" && pendingFormationId ? resolveFormation(pendingFormationId) : null;
  const activeFormation = beforeKickoff ? draft.formation : match.formation ?? draft.formation;
  const displayedFormation = previewFormation ?? activeFormation;
  const displayedPlan = session.approved ? match.plan : draft;
  const field = session.approved ? match.field : draft.startingLineup.field;
  const bench = session.approved ? match.bench : draft.startingLineup.bench;
  const unavailablePlayers = displayedPlan.players.filter((player) => player.absent);
  const formationId = displayedFormation.id ?? initialFormation.id;
  const isPhotoFormation = formationId === DEFAULT_DEMO_FORMATION_ID;
  const isDiamondFormation = formationId === "3-4-3";
  const players = useMemo(() => new Map(displayedPlan.players.map((player) => [player.key, player])), [displayedPlan]);
  const label = (key: string) => { const p = players.get(key); return p ? `${p.name} ${p.number ?? "?"}` : key; };
  const pending = displayedPlan.steps.find((step) => !session.approved || match.stepStatus[step.id] === "pending");
  const comparison = useMemo(() => getDemoComparison(match), [match]);
  const report = useMemo(() => validatePortableSubstitutionPlan({ ...draft, review: { ...draft.review, sourceConfirmed } }), [draft, sourceConfirmed]);
  const operational = session.approved && match.phase !== "ready" && match.phase !== "finished";
  const selectingPositions = beforeKickoff || fieldAction === "positions";
  const canSelectField = (beforeKickoff || operational) && !previewFormation;
  const pairValid = positionA !== positionB && field.some((entry) => entry.playerKey === positionA) && field.some((entry) => entry.playerKey === positionB);
  const keeperKey = beforeKickoff ? draft.startingLineup.keeperKey : match.keeperKey;
  const newKeeperKey = pairValid ? (positionA === keeperKey ? positionB : positionB === keeperKey ? positionA : null) : null;
  const relevantIssues = report.issues.filter((issue) => issue.code !== "SOURCE_REVIEW_REQUIRED");
  const pendingActions = pending?.actions.filter((action) => !(match.completedActionIds ?? []).includes(action.id)) ?? [];
  const plannedBench = pendingActions.filter((action) => action.kind === "substitution");
  const draftLabel = (key: string) => { const p = draft.players.find((player) => player.key === key); return p ? `${p.name} ${p.number ?? "?"}` : key; };
  const firstPlannedMinute = displayedPlan.steps[0]?.matchMinute ?? source.initialPlan.steps[0]?.matchMinute;
  const lateTestMinute = firstPlannedMinute === undefined ? null : firstPlannedMinute + 2;
  const capturedLabel = source.capturedAt ? new Date(source.capturedAt).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Amsterdam" }) : null;
  const printSourceLabel = source.kind === "app" ? `Lokale kopie uit de app${capturedLabel ? ` · opgehaald ${capturedLabel}` : ""}` : undefined;
  const unavailableNotice = unavailablePlayers.length > 0 && <section aria-label="Niet beschikbaar" className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">
    <h3 className="font-semibold">Niet beschikbaar</h3>
    <ul className="mt-2 flex flex-wrap gap-2">{unavailablePlayers.map((player) => <li key={player.key} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><strong>{label(player.key)}</strong><span className="ml-2 text-xs">{player.unavailableReason === "injured" ? "Geblesseerd" : "Niet beschikbaar"}</span></li>)}</ul>
    <p className="mt-2 text-xs text-slate-500">Niet op de bank en niet meegerekend in de speelminutenverdeling.</p>
  </section>;

  useEffect(() => {
    if (match.phase !== "running") return;
    let previous = performance.now();
    let remainder = 0;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const advanced = ((now - previous) / 1000) * speed + remainder;
      const seconds = Math.floor(advanced);
      remainder = advanced - seconds;
      previous = now;
      if (seconds > 0) dispatch({ type: "tick", seconds });
    }, 250);
    return () => window.clearInterval(interval);
  }, [match.phase, speed]);

  useEffect(() => {
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);

  function editPlayer(key: string, field: "name" | "number", value: string) {
    setSourceConfirmed(false);
    setDraft((current) => ({ ...current, players: current.players.map((player) => player.key === key ? { ...player, [field]: field === "number" ? (value === "" ? null : Number(value)) : value } : player) }));
  }

  function approve() {
    dispatch({ type: "approve", plan: { ...draft, review: { ...draft.review, sourceConfirmed } } });
    if (report.readyToPublish) setTab("field");
  }

  function updateStartingPlan(plan: DemoPlan) {
    if (!beforeKickoff) return;
    setDraft(plan);
    setSourceConfirmed(false);
    clearSelection();
    dispatch({ type: "editSetup" });
  }

  function startWithoutPhoto() {
    const manual = createManualDemoPlan(draft);
    updateStartingPlan({ ...manual, formation: { ...manual.formation, name: (manual.formation.name ?? "4-3-3").replace(" (uit foto)", "") } });
    setPlanSource("manual");
  }

  function changeFormation(id: string) {
    if (match.phase === "finished") return;
    clearSelection();
    if (!beforeKickoff) {
      setPendingFormationId(id === (activeFormation.id ?? initialFormation.id) ? null : id);
      return;
    }
    setDraft((current) => {
      const formation = resolveFormation(id);
      return {
        ...current,
        formation: { id: formation.id, name: planSource === "photo" ? formation.name : formation.name.replace(" (uit foto)", ""), slots: formation.slots.map((slot) => ({ ...slot })) },
        review: { ...current.review, sourceConfirmed: false },
      };
    });
    setSourceConfirmed(false);
    dispatch({ type: "editSetup" });
  }

  function clearSelection() {
    setPlayerOut("");
    setPlayerIn("");
    setPositionA("");
    setPositionB("");
  }

  function selectFieldPlayer(key: string) {
    if (!canSelectField) return;
    if ((!selectingPositions || beforeKickoff) && bench.includes(playerIn) && field.some((entry) => entry.playerKey === key)) {
      exchangeFieldAndBench(key, playerIn);
      return;
    }
    if (!selectingPositions) { setPlayerOut(key === playerOut ? "" : key); return; }
    if (!positionA || positionB) { setPositionA(key); setPositionB(""); }
    else if (positionA === key) setPositionA("");
    else setPositionB(key);
  }

  function selectBenchPlayer(key: string) {
    if (!canSelectField) return;
    const outgoing = beforeKickoff ? (positionB ? "" : positionA) : playerOut;
    if (bench.includes(key) && field.some((entry) => entry.playerKey === outgoing)) {
      exchangeFieldAndBench(outgoing, key);
      return;
    }
    setFieldAction("substitution");
    setPlayerIn(key === playerIn ? "" : key);
    setPlayerOut("");
    setPositionA("");
    setPositionB("");
  }

  function exchangeFieldAndBench(outgoing: string, incoming: string) {
    if (!canSelectField) return;
    if (beforeKickoff) {
      const slot = draft.startingLineup.field.find((entry) => entry.playerKey === outgoing)?.slotId;
      if (slot === undefined) return;
      updateStartingPlan(assignDemoStartingPlayer(draft, slot, incoming));
    } else {
      dispatch({ type: "manual", out: outgoing, incoming });
      clearSelection();
    }
  }

  function swapPositions() {
    if (!canSelectField || !pairValid) return;
    if (beforeKickoff) {
      setDraft((current) => swapDemoStartingPositions(current, positionA, positionB));
      setSourceConfirmed(false);
      dispatch({ type: "editSetup" });
    } else dispatch({ type: "positions", a: positionA, b: positionB });
    clearSelection();
  }

  function positionSwapNote(stepId: string) {
    const step = draft.steps.find((item) => item.id === stepId);
    const snapshot = report.snapshots.find((item) => item.stepId === stepId);
    return step?.actions.filter((action) => action.kind === "positionSwap").map((action) =>
      [action.playerOutKey, action.playerInKey].map((key) => {
        const slotId = snapshot?.field.find((entry) => entry.playerKey === key)?.slotId;
        const position = draft.formation.slots.find((slot) => slot.id === slotId)?.position;
        return `${draftLabel(key)} → ${position ? getPositionNameDutch(position).toLowerCase() : "positie controleren"}`;
      }).join("; ")
    ).join(". ");
  }

  const formationSelector = <div className="mb-4">
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="demo-formation" className="text-sm font-semibold">{beforeKickoff ? "Beginopstelling" : "Formatie"}</label>
      <select id="demo-formation" value={formationId} disabled={match.phase === "finished"} onChange={(event) => changeFormation(event.target.value)} className="min-h-11 min-w-44 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-green-600 disabled:bg-slate-100 disabled:text-slate-500">
        {formationChoices.map((formation) => <option key={formation.id} value={formation.id}>{planSource === "photo" ? formation.name : formation.name.replace(" (uit foto)", "")}</option>)}
      </select>
      <span className="text-xs text-slate-500">{displayedPlan.match.fieldPlayerCountIncludingKeeper}-tal · inclusief keeper</span>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">{match.phase === "finished" ? "Eindopstelling van de demo." : !beforeKickoff ? "Een formatiewissel verandert de actuele opstelling. Het oorspronkelijke plan blijft bewaard." : planSource === "app" ? "De beginopstelling uit de app. Controleer de spelers en posities; aanpassingen gelden alleen voor deze lokale kopie." : planSource === "manual" ? "Kies de formatie en stel de beginposities in. De coach bevestigt deze opstelling vóór de aftrap." : isPhotoFormation ? "De indeling uit je foto. Je kunt de formatie kiezen en spelers van positie laten ruilen." : "Nieuwe indeling: controleer de plek van iedere speler en de positieruil voordat je bevestigt."}</p>
    {previewFormation && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">Voorbeeld {previewFormation.name} · nog niet toegepast</p>
      <p className="mt-1 text-xs">Controleer de nieuwe plekken op het veld. De wedstrijdklok loopt gewoon door.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button className={primary} onClick={() => { dispatch({ type: "formation", formation: previewFormation }); setPendingFormationId(null); clearSelection(); }}>Formatie toepassen om {clock(match.elapsedSeconds)}</button><button className={secondary} onClick={() => setPendingFormationId(null)}>Annuleren</button></div>
    </div>}
  </div>;

  const positionControls = <section aria-label="Posities ruilen" className="border-t border-slate-200 pt-4">
    <h2 className="text-sm font-bold">Posities ruilen</h2>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">Tik op twee schilden of kies twee veldspelers. {beforeKickoff ? "Je past de beginopstelling aan." : "Beiden blijven in het veld; hun speelminuten lopen door."}</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="text-xs text-slate-500">Eerste speler<select aria-label="Eerste speler voor positieruil" disabled={!canSelectField} value={positionA} onChange={(event) => { setPositionA(event.target.value); if (event.target.value === positionB) setPositionB(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"><option value="">Kies speler</option>{field.map((entry) => <option key={entry.playerKey} value={entry.playerKey}>{label(entry.playerKey)}</option>)}</select></label>
      <label className="text-xs text-slate-500">Tweede speler<select aria-label="Tweede speler voor positieruil" disabled={!canSelectField} value={positionB} onChange={(event) => setPositionB(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"><option value="">Kies speler</option>{field.filter((entry) => entry.playerKey !== positionA).map((entry) => <option key={entry.playerKey} value={entry.playerKey}>{label(entry.playerKey)}</option>)}</select></label>
    </div>
    {newKeeperKey && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{label(newKeeperKey)} wordt hierdoor keeper. Controleer ook de resterende wissels.</p>}
    <div className="mt-3 flex gap-2"><button className={`${primary} flex-1`} disabled={!canSelectField || !pairValid} onClick={swapPositions}><ArrowDownUp size={16} />Ruil posities</button><button className={secondary} disabled={!positionA && !positionB} onClick={clearSelection}>Wissen</button></div>
  </section>;

  return <><main className="min-h-screen bg-[#f5f6f4] text-slate-900 print:hidden">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="border-r border-slate-200 pr-4 text-3xl font-black tracking-tighter text-dia-green">DIA<span className="text-lime-500">.</span></span>
          <div><h1 className="text-lg font-bold tracking-tight sm:text-xl">Wisselmodule</h1><p className="mt-0.5 text-xs text-slate-500">{source.kind === "app" ? source.matchLabel : source.teamName} · {displayedPlan.match.regulationDurationMinutes} minuten · half veld</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Competitie</span>
          <button className={`${secondary} px-3`} onClick={() => { dispatch({ type: "reset", plan: source.initialPlan }); setDraft(structuredClone(source.initialPlan)); setPlanSource(source.kind); setPhotoUrl(null); setPrintMode("plan"); setSourceConfirmed(false); clearSelection(); setPendingFormationId(null); setFieldAction("substitution"); setTab("field"); }} aria-label="Demo opnieuw beginnen"><RotateCcw size={16} /><span className="hidden sm:inline">Opnieuw</span></button></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <nav className="mb-5 flex gap-4 overflow-x-auto border-b border-slate-200" aria-label="Demo-onderdelen">
        {([{ key: "field", text: "Veld & wissels" }, { key: "review", text: "Bron controleren" }, { key: "comparison", text: "Plan & werkelijk" }] as const).map((item) => <button key={item.key} onClick={() => setTab(item.key)} aria-current={tab === item.key ? "page" : undefined} className={`min-h-14 shrink-0 border-b-2 text-xs font-semibold transition-colors sm:text-sm ${tab === item.key ? "border-dia-green text-dia-green" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{item.text}{item.key === "review" && session.approved && <Check size={13} className="ml-2 inline" />}</button>)}
      </nav>

      {source.kind === "app" && <aside aria-label="Bron van de wedstrijd" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-semibold">{source.matchLabel} · lokale kopie</p>
        <p className="mt-1 text-xs leading-relaxed">Alleen gelezen uit de app{capturedLabel && <> op <time dateTime={source.capturedAt}>{capturedLabel}</time></>}. Wijzigingen en de oefenwedstrijd blijven op dit scherm; er wordt niets teruggeschreven.</p>
        {source.notes && source.notes.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">{source.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul>}
        {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4">Bekijk de bronwedstrijd in de app</a>}
      </aside>}

      {session.error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{session.error}</div>}

      {tab === "field" && <>
        {!session.approved && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"><div><p className="text-sm font-semibold text-green-950">{planSource === "app" ? "Het wedstrijdplan uit de app staat klaar." : planSource === "manual" ? "Je beginopstelling staat klaar." : "Je voorbeeld staat klaar."}</p><p className="mt-0.5 text-xs text-green-800">Controleer de overname voordat je de oefenwedstrijd start.</p></div><button className={primary} onClick={() => setTab("review")}>{source.kind === "app" ? "Plan controleren" : "Voorbeeld controleren"}<ChevronRight size={16} /></button></div>}

        {beforeKickoff && <section aria-label="Beginopstelling voorbereiden" className="mb-5 space-y-3">
          {source.kind === "photo" && <RecentPlayingMinutes />}
          <StartingLineupEditor plan={draft} onChange={updateStartingPlan} />
          {planSource === "photo" ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><p className="max-w-2xl text-xs leading-relaxed text-slate-600"><strong>Geen foto gebruiken?</strong> Behoud de spelers en stel zelf de beginposities in. ‘Zonder foto starten’ verwijdert de geplande wissels uit het fotovoorbeeld.</p><button className={secondary} onClick={startWithoutPhoto}>Zonder foto starten</button></div> : <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs leading-relaxed text-green-900">{planSource === "app" ? "Beginopstelling en geplande wissels zijn overgenomen uit de app. Controleer en bevestig deze lokale kopie voordat je de oefenwedstrijd start." : "Handmatige beginopstelling · er zijn nog geen wissels vooraf gepland. Je kunt tijdens de demo zelf wisselen. Controleer en bevestig eerst je beginopstelling."}</p>}
        </section>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <section aria-label="Actuele opstelling">
            {formationSelector}
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Op het veld <span className="ml-1 font-normal text-slate-500">{field.length} spelers</span></h2><span className="text-xs text-slate-500">Aanval ↑</span></div>
            <div className="relative isolate aspect-[680/525] w-full overflow-hidden rounded-2xl border-[5px] border-[#1e5c28] bg-[#2d7a3a] shadow-sm" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent 0%,transparent 8.33%,rgba(255,255,255,.035) 8.33%,rgba(255,255,255,.035) 16.66%)" }}>
              <PitchLines />
              {field.map((entry) => {
                const p = players.get(entry.playerKey)!;
                const slot = displayedFormation.slots.find((s) => s.id === entry.slotId)!;
                const selected = selectingPositions ? positionA === p.key || positionB === p.key : playerOut === p.key;
                return <button key={p.key} title={`${label(p.key)} selecteren voor ${selectingPositions ? "een positieruil" : "een wissel"}`} aria-label={`${label(p.key)} op ${slot.position}`} aria-pressed={selected} disabled={!canSelectField} onClick={() => selectFieldPlayer(p.key)} className={`absolute ${isPhotoFormation ? "w-[16%] sm:w-[13.2%]" : isDiamondFormation ? "w-[9.5%]" : "w-[12%]"} max-w-[90px] -translate-x-1/2 -translate-y-1/2 transition-[left,top,filter] duration-500 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none`} style={{ left: `${slot.x ?? 50}%`, top: `${slot.y ?? 50}%` }}><PlayerShield name={p.name} number={p.number} position={slot.position === "LCB" || slot.position === "RCB" ? "CB" : slot.position} selected={selected} className="w-full" /></button>;
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-2 text-sm font-bold">Bank</span>{bench.map((key) => <button key={key} disabled={!canSelectField} onClick={() => selectBenchPlayer(key)} aria-pressed={playerIn === key} className={`${button} min-w-24 border px-3 py-2 ${playerIn === key ? "border-dia-green bg-green-50 text-dia-green" : "border-slate-200 bg-white text-slate-700"}`}>{label(key)}</button>)}</div>
            {unavailableNotice}
            <p role="status" className="mt-3 text-xs leading-relaxed text-slate-500">{playerIn && bench.includes(playerIn) ? `${label(playerIn)} geselecteerd: tik op de veldspeler die plaatsmaakt. De wissel gebeurt direct.` : (beforeKickoff ? positionA && !positionB : playerOut) ? `${label(beforeKickoff ? positionA : playerOut)} geselecteerd: tik op een bankspeler om direct te wisselen. Tik nogmaals op de geselecteerde speler om te wissen.` : selectingPositions && !beforeKickoff ? "Tik op twee schilden en kies ‘Ruil posities’." : beforeKickoff ? "Tik op een veldspeler en een bankspeler om de beginopstelling direct aan te passen. Twee veldspelers ruil je via ‘Ruil posities’." : "Tik op een veldspeler en een bankspeler: de tweede tik voert de wissel direct uit. Andersom kan ook."}</p>
          </section>

          <aside className="space-y-5">
            <section className="border-b border-slate-200 pb-5" aria-label="Wedstrijdklok">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${match.phase === "running" ? "animate-pulse bg-green-600 motion-reduce:animate-none" : "bg-slate-300"}`} />{phaseLabel[match.phase]}</span><label className="flex items-center gap-2 text-xs text-slate-500">Snelheid<select aria-label="Demosnelheid" className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-800" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={10}>10×</option><option value={20}>20×</option><option value={30}>30×</option><option value={60}>60×</option></select></label></div>
              <div data-testid="demo-clock" className="my-2 font-mono text-6xl font-semibold tracking-tighter tabular-nums">{clock(match.elapsedSeconds)}<span className="ml-3 font-sans text-sm font-normal tracking-normal text-slate-400" style={{ whiteSpace: "nowrap" }}>/ {match.plan.match.regulationDurationMinutes} min</span></div>
              <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-green-950">
                  <input type="checkbox" checked={automatic} disabled={match.phase === "finished"} onChange={(event) => dispatch({ type: "automatic", enabled: event.target.checked })} className="h-5 w-5 shrink-0 accent-green-700" />
                  Wissels automatisch volgens plan
                </label>
                <p className="pb-1 text-xs leading-relaxed text-green-900">{automatic ? "Wissels en positieruilen gebeuren op het geplande moment. Bij een conflict pauzeert de demo." : "Handmatige stand: kies zelf wanneer je de geplande wissels uitvoert."}</p>
              </div>
              <div className="flex gap-2"><button className={`${primary} flex-1`} disabled={!session.approved || match.phase === "finished"} onClick={() => dispatch({ type: "clock" })}>{match.phase === "running" ? <Pause size={16} /> : <Play size={16} />}{match.phase === "running" ? "Pauzeren" : match.phase === "ready" ? "Start demo" : match.phase === "halftime" ? "Start tweede helft" : "Hervatten"}</button><button className={secondary} disabled={!session.approved || match.phase === "finished" || Boolean(previewFormation)} onClick={() => dispatch({ type: "jump" })} title="Klok naar het volgende geplande wisselmoment"><SkipForward size={16} /><span>Volgend moment</span></button></div>
              <div className="mt-2 flex items-center gap-3">
                <button className={`${secondary} shrink-0`} disabled={!session.approved || match.phase === "halftime" || match.phase === "finished" || Boolean(previewFormation)} onClick={() => dispatch({ type: "minuteStep" })} title="Eén minuut vooruit en daarna pauzeren">+1 minuut</button>
                <p className="text-xs leading-relaxed text-slate-500">Stap voor stap: elke klik telt één minuut en pauzeert. {automatic ? "Geplande wissels gaan automatisch mee." : "Wissels voer je zelf uit."}</p>
              </div>
              {match.phase === "halftime" ? <p className="mt-2 text-xs text-amber-800">Rust: de klok en speelminuten staan stil. Wisselen kan wel.</p> : <p className="mt-2 text-xs text-slate-500">{speed === 1 ? "De klok loopt op echte snelheid." : `Versneld: 1 seconde is ${speed} wedstrijdseconden.`} Rust telt niet mee.</p>}
            </section>

            <section aria-label="Eerstvolgende wissel">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Eerstvolgende wissel</h2>{pending && <span className={`text-xs font-semibold ${match.elapsedSeconds > pending.matchMinute * 60 ? "text-amber-700" : "text-slate-500"}`}>Gepland {pending.matchMinute}′</span>}</div>
              {pending ? <><div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{plannedBench.map((action) => <div key={action.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-2 text-sm"><span className="text-slate-500">{label(action.playerOutKey)}<small className="ml-2 text-[10px] uppercase">uit</small></span><ArrowDownUp size={14} className="rotate-90 text-slate-400" /><span className="text-right font-semibold">{label(action.playerInKey)}<small className="ml-2 text-[10px] font-normal uppercase text-slate-500">in</small></span><button className={`${secondary} px-2 text-xs`} aria-label={`Voer wissel uit: ${label(action.playerOutKey)} eruit, ${label(action.playerInKey)} erin`} disabled={!operational || Boolean(previewFormation)} onClick={() => { dispatch({ type: "executeOne", stepId: pending.id, actionId: action.id }); clearSelection(); }}>Wissel</button></div>)}</div>
                {pendingActions.filter((action) => action.kind === "positionSwap").map((action) => <div key={action.id} className="mt-2 flex items-center justify-between gap-2 text-xs text-dia-green"><span>Positieruil: {label(action.playerOutKey)} ↔ {label(action.playerInKey)}</span><button className={`${secondary} px-2 text-xs`} disabled={!operational || Boolean(previewFormation)} onClick={() => { dispatch({ type: "executeOne", stepId: pending.id, actionId: action.id }); clearSelection(); }}>Voer positieruil uit</button></div>)}
                <div className="mt-3 flex gap-2"><button className={`${primary} flex-1`} disabled={!operational || Boolean(previewFormation)} onClick={() => { dispatch({ type: "execute", id: pending.id }); clearSelection(); }}><CheckCircle2 size={16} />{pendingActions.length > 1 ? "Alle resterende" : "Uitvoeren"} om {clock(match.elapsedSeconds)}</button><button className={secondary} disabled={!operational || Boolean(previewFormation)} onClick={() => dispatch({ type: "skip", id: pending.id })}>Overslaan</button></div>
                <p className="mt-2 text-xs text-slate-500">{automatic ? "Dit moment wordt automatisch uitgevoerd zodra de klok zover is. Je kunt ook eerder zelf wisselen." : "Alleen uitvoeren legt een echte wissel vast in deze demo."}</p>
              </> : <p className="rounded-xl bg-green-50 p-4 text-sm text-green-900">{displayedPlan.steps.length ? "Alle geplande wisselmomenten zijn afgehandeld." : "Geen wissels vooraf gepland. Kies zelf een wissel tijdens de demo."}</p>}
            </section>

            {operational && <div className="flex gap-2" aria-label="Actie op het veld">
              <button className={fieldAction === "substitution" ? primary : secondary} aria-pressed={fieldAction === "substitution"} onClick={() => { setFieldAction("substitution"); clearSelection(); }}>Speler wisselen</button>
              <button className={fieldAction === "positions" ? primary : secondary} aria-pressed={fieldAction === "positions"} onClick={() => { setFieldAction("positions"); clearSelection(); }}>Posities ruilen</button>
            </div>}
            {(beforeKickoff || (operational && selectingPositions)) && positionControls}

            {operational && !selectingPositions && <details className="border-t border-slate-200 pt-4" open={Boolean(playerOut || playerIn)}><summary className="cursor-pointer text-sm font-semibold">Zelf een wissel kiezen</summary><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Eruit<select aria-label="Speler eruit" className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900" value={playerOut} onChange={(e) => selectFieldPlayer(e.target.value)}><option value="">Kies speler</option>{match.field.map((p) => <option key={p.playerKey} value={p.playerKey}>{label(p.playerKey)}</option>)}</select></label><label className="text-xs text-slate-500">Erin<select aria-label="Speler erin" className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900" value={playerIn} onChange={(e) => selectBenchPlayer(e.target.value)}><option value="">Kies invaller</option>{match.bench.map((key) => <option key={key} value={key}>{label(key)}</option>)}</select></label></div><p className="mt-2 text-xs text-slate-500">Zodra je beide spelers kiest, wordt de wissel direct uitgevoerd.</p></details>}
          </aside>
        </div>

        <section className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-5" aria-label="Demonstratiescenario">
          <div><h2 className="text-sm font-bold">Probeer een afwijking</h2><p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{lateTestMinute === null || displayedPlan.steps.length === 0 ? "Voer tijdens de oefenwedstrijd zelf wissels uit en bekijk daarna het verschil met de beginopstelling." : `De ${minutes(lateTestMinute)}′-test begint opnieuw: de eerste wissel 2 minuten te laat. Bekijk daarna het verschil per speler.`}</p></div>
          <div className="flex flex-wrap gap-2"><button className={secondary} disabled={!session.approved || match.plan.steps.length === 0 || lateTestMinute === null || lateTestMinute >= match.plan.match.regulationDurationMinutes} onClick={() => { dispatch({ type: "late" }); clearSelection(); setPendingFormationId(null); }}><Clock3 size={16} />Test: {lateTestMinute === null ? "geen geplande wissel" : `wissel op ${minutes(lateTestMinute)}′`}</button><button className={secondary} disabled={!session.approved || match.phase === "finished" || Boolean(previewFormation)} onClick={() => { dispatch({ type: "finish" }); setTab("comparison"); }}><Flag size={16} />Speel resterend plan uit</button><button className={secondary} onClick={() => setTab("comparison")}>Bekijk vergelijking<ChevronRight size={16} /></button></div>
        </section>
        {match.events.length > 0 && <section className="mt-6"><h2 className="mb-3 text-sm font-bold">Geregistreerd in de demo</h2><ol className="divide-y divide-slate-200">{[...match.events].reverse().map((event) => <li key={event.id} className="flex gap-4 py-3 text-sm"><span className="w-12 shrink-0 font-mono text-slate-500">{clock(event.elapsedSeconds)}</span><span>{event.type === "formation" ? `Formatie → ${event.formation?.name ?? "aangepast"}` : event.type === "skipped" ? `Resterende wissels van ${event.plannedMinute}′ overgeslagen` : event.actions.map((action) => `${label(action.playerOutKey)} ${action.kind === "positionSwap" ? "↔" : "→"} ${label(action.playerInKey)}`).join(" · ")}{event.plannedMinute !== undefined && event.type !== "skipped" && <small className="ml-2 text-slate-500">(plan {event.plannedMinute}′)</small>}</span></li>)}</ol></section>}
      </>}

      {tab === "review" && <section>
        <div className="mb-5 flex items-start gap-3"><ShieldCheck size={24} className="mt-1 text-dia-green" /><div><h2 className="text-xl font-bold">Controleer de overname</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{planSource === "photo" ? "Dit voorbeeld is handmatig uit jouw foto overgenomen. De rugnummers komen uit de JO13-2-teamlijst van 27 september. Automatische fotoherkenning is nog niet aangesloten." : planSource === "app" ? "Dit is een alleen-lezen momentopname uit de wedstrijdapp. Controleer namen, rugnummers, aanwezigheid, beginopstelling en alle geplande wissels. Je bevestiging en aanpassingen worden alleen in deze module gebruikt." : "Dit plan begint met jouw handmatige opstelling. Controleer de namen, nummers, posities en bank. De historische minuten zijn alleen een hulpmiddel bij je keuze."}</p></div></div>
        {session.approved && <p className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-900">Het voorbeeld is bevestigd. Kies ‘Opnieuw’ om een nieuwe overname te controleren.</p>}
        {beforeKickoff ? formationSelector : <p className="mb-4 text-sm text-slate-600">Beginformatie van het plan: <strong>{draft.formation.name ?? initialFormation.name}</strong></p>}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            {planSource === "photo" && <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-center hover:border-green-600"><ImagePlus size={24} className="text-dia-green" /><span className="text-sm font-semibold">Kies de bronfoto om naast het blad te leggen</span><span className="text-xs text-slate-500">Blijft op dit apparaat; wordt niet automatisch uitgelezen.</span><input aria-label="Bronfoto kiezen" type="file" accept="image/*" capture="environment" className="sr-only" disabled={session.approved} onChange={(event) => { const file = event.target.files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null); setSourceConfirmed(false); }} /></label>}
            {photoUrl && <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><Image src={photoUrl} alt="Gekozen bronfoto van de wissellijst" width={900} height={1600} unoptimized className="max-h-[600px] w-full object-contain" /></div>}
            <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
              <p className="text-sm">{draft.players.filter((player) => !player.absent).length} spelers · {draft.startingLineup.field.length} op het veld · {draft.startingLineup.bench.length} op de bank</p>
              <p className="text-sm">{draft.steps.length} geplande wisselmomenten · {draft.steps.flatMap((step) => step.actions).filter((action) => action.kind === "positionSwap").length} positieruilen</p>
              {report.simulationComplete && report.totals ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 size={17} className="text-green-600" />{minutes(report.totals.playingMinutes)} berekende speelminuten, keeper inbegrepen</p> : <p className="text-sm text-amber-800">De controle stopt bij een ongeldige wissel. Controleer de beginopstelling en de geplande wisselregels.</p>}
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{report.distribution?.message ?? "Controleer de minutenverdeling zodra het volledige plan klopt."}</p>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-bold">Beginopstelling</h3>
              <p className="mt-2 text-xs leading-6 text-slate-600">{draft.startingLineup.field.map((entry) => `${draftLabel(entry.playerKey)} (${draft.formation.slots.find((slot) => slot.id === entry.slotId)?.position})`).join(" · ")}</p>
              <p className="mt-2 text-xs text-slate-600"><strong>Bank:</strong> {draft.startingLineup.bench.map(draftLabel).join(" · ")}</p>
              <h3 className="mt-5 text-sm font-bold">Geplande wissels</h3>{draft.steps.length === 0 && <p className="mt-2 text-xs text-slate-500">Geen wissels vooraf gepland. Het plan houdt de beginopstelling aan totdat je werkelijk wisselt.</p>}
              <ol className="mt-2 divide-y divide-slate-200">{draft.steps.map((step) => <li key={step.id} className="flex gap-3 py-3 text-xs leading-6"><strong className="w-7 shrink-0 text-dia-green">{step.matchMinute}′</strong><div>{step.actions.map((action) => <p key={action.id}>{draftLabel(action.playerOutKey)} {action.kind === "positionSwap" ? "↔" : "uit →"} {draftLabel(action.playerInKey)}{action.kind === "substitution" ? " in" : " (positieruil)"}</p>)}</div></li>)}</ol>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Een invaller neemt de positie over. {draft.steps.filter((step) => step.actions.some((action) => action.kind === "positionSwap")).map((step) => `Bij ${step.matchMinute}′: ${positionSwapNote(step.id)}.`).join(" ")}</p>
            </div>
          </div>
          <div>
            {unavailableNotice}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Naam</th><th className="w-28 px-3 py-3 font-medium">Rugnummer</th><th className="px-3 py-3 text-right font-medium">Plan</th></tr></thead><tbody className="divide-y divide-slate-100">{draft.players.map((player) => <tr key={player.key}><td className="px-3 py-1"><input aria-label={`Naam ${player.key}`} disabled={session.approved} value={player.name} onChange={(event) => editPlayer(player.key, "name", event.target.value)} className="min-h-10 w-full rounded-md bg-transparent px-1 font-medium focus:outline-green-600 disabled:text-slate-700" />{player.absent && <span className="block px-1 pb-2 text-xs text-slate-500">{player.unavailableReason === "injured" ? "Geblesseerd" : "Niet beschikbaar"}</span>}</td><td className="px-3 py-1"><input aria-label={`Rugnummer ${player.name}`} type="number" min={0} step={1} disabled={session.approved} value={player.number ?? ""} onChange={(event) => editPlayer(player.key, "number", event.target.value)} className="min-h-10 w-20 rounded-md bg-slate-50 px-3 tabular-nums focus:outline-green-600 disabled:bg-transparent" /></td><td className="px-3 py-1 text-right text-slate-500">{player.absent ? "—" : `${report.minutes.byPlayer.find((row) => row.playerKey === player.key)?.playingMinutes ?? "—"} min`}</td></tr>)}</tbody></table></div>
            {relevantIssues.length > 0 && <ul role="alert" className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{relevantIssues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}
            {!session.approved && <><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-green-700" checked={sourceConfirmed} onChange={(event) => setSourceConfirmed(event.target.checked)} /><span>{source.kind === "app" ? "Ik heb namen, nummers, aanwezigheid, opstelling en wissels van deze appkopie gecontroleerd." : "Ik heb namen, nummers, opstelling en wissels van dit voorbeeld gecontroleerd."}</span></label><button className={`${primary} mt-4 w-full`} disabled={!report.readyToPublish} onClick={approve}><CheckCircle2 size={16} />{source.kind === "app" ? "Plan goedkeuren en proberen" : "Voorbeeld goedkeuren en proberen"}</button></>}
          </div>
        </div>
      </section>}

      {tab === "comparison" && !session.approved && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Controleer en bevestig eerst de beginopstelling en het plan. Daarna kun je de uitvoering met dit plan vergelijken.</p>}
      {tab === "comparison" && session.approved && <section>
        {unavailableNotice}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-dia-green">{match.phase === "finished" ? "Eindvergelijking" : `Tussenstand · ${clock(match.elapsedSeconds)}`}</p><h2 className="text-2xl font-bold tracking-tight">Het plan naast de uitvoering</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">{match.phase === "finished" ? "Werkelijke demominuten tegenover het oorspronkelijke, goedgekeurde plan." : "Tijdens de wedstrijd vergelijken we dezelfde verstreken speeltijd. De volledige planning blijft ernaast staan."}</p></div><button className={secondary} onClick={() => setTab("field")}>Terug naar veld</button></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-4 font-medium">Speler</th><th className="px-3 py-4 text-right font-medium">Plan totaal</th><th className="px-3 py-4 text-right font-medium">Plan tot nu</th><th className="px-3 py-4 text-right font-medium">Werkelijk</th><th className="px-4 py-4 text-right font-medium">Verschil{match.phase !== "finished" ? " tot nu" : ""}</th></tr></thead><tbody className="divide-y divide-slate-100">{comparison.map((row) => <tr key={row.playerKey}><td className="px-4 py-3.5"><span className="mr-3 inline-block w-6 font-mono font-semibold text-slate-400">{row.number}</span><span className="font-semibold">{row.name}</span>{row.playerKey === match.keeperKey && <small className="ml-2 text-slate-400">keeper</small>}</td><td className="px-3 py-3 text-right tabular-nums text-slate-500">{minutes(row.plannedMinutes)}</td><td className="px-3 py-3 text-right tabular-nums text-slate-500">{minutes(row.plannedMinutesSoFar)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{minutes(row.actualMinutes)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.deltaMinutes === 0 ? "text-slate-400" : row.deltaMinutes > 0 ? "text-blue-700" : "text-amber-700"}`}>{difference(row.deltaMinutes)} min</td></tr>)}</tbody><tfoot className="border-t border-slate-200 bg-slate-50 font-semibold"><tr><td className="px-4 py-4">Totaal</td><td className="px-3 py-4 text-right tabular-nums">{minutes(comparison.reduce((sum, row) => sum + row.plannedMinutes, 0))}</td><td className="px-3 py-4 text-right tabular-nums">{minutes(comparison.reduce((sum, row) => sum + row.plannedMinutesSoFar, 0))}</td><td className="px-3 py-4 text-right tabular-nums">{minutes(comparison.reduce((sum, row) => sum + row.actualMinutes, 0))}</td><td className="px-4 py-4 text-right text-xs text-slate-500">inclusief keeper</td></tr></tfoot></table></div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">‘Werkelijk’ betekent hier: uitgevoerd in deze lokale oefenwedstrijd. Dit zijn geen registraties uit een echte wedstrijd.</p>
      </section>}

      <section className="mt-8 border-t border-slate-200 pt-5" aria-label="Wisselblad afdrukken">
        <SubstitutionPrintButton match={match} plan={draft} approved={session.approved} printMode={printMode} onModeChange={setPrintMode} matchLabel={source.kind === "app" ? source.matchLabel : undefined} sourceLabel={printSourceLabel} />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Afdrukvoorbeeld</summary>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
            <SubstitutionPrint match={match} plan={draft} approved={session.approved} printMode={printMode} screenPreview matchLabel={source.kind === "app" ? source.matchLabel : undefined} sourceLabel={printSourceLabel} />
          </div>
        </details>
      </section>
      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400">Deze demo werkt op dit scherm. Er wordt niets opgeslagen in de wedstrijdapp. Herladen wist de oefenwedstrijd.</footer>
    </div>
  </main><SubstitutionPrint match={match} plan={draft} approved={session.approved} printMode={printMode} matchLabel={source.kind === "app" ? source.matchLabel : undefined} sourceLabel={printSourceLabel} /></>;
}
