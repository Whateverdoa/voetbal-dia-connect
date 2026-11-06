"use client";

import { useState } from "react";
import { useRememberedPlayers } from "@/hooks/useRememberedPlayers";
import { POSITIONS } from "@/lib/positions";
import { proposeCoachPlan } from "@/lib/coachAssistant/proposePlan";
import type { AssistantHistoryMatch, AssistantInput, AssistantPlayer, AssistantResult } from "@/lib/coachAssistant/types";
import type { DemoPlan } from "@/lib/substitutions/demoPlan";
import { HistoryEditor } from "./HistoryEditor";
import { ProposalView } from "./ProposalView";
import { CoachStartingField } from "./CoachStartingField";
import { canonicalPosition } from "@/lib/coachAssistant/history";

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:opacity-50";
const buttonClass = "min-h-11 rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40";
const noHistory: AssistantHistoryMatch[] = [];
const noWarnings: string[] = [];

export interface AssistantPreparationSettings {
  manualStart?: boolean;
  keeper: string;
  keepKeeper: boolean;
  secondKeeper: string;
  date: string;
  interval: number;
  includeSubstitutions: boolean;
  history: AssistantHistoryMatch[];
}

export function CoachAssistantPanel({ plan, teamKey, targetDate, disabled, onApply, initialPlayers, initialSettings, preferenceScope, connected = false, testOnly = false, preparationFlow = false, automaticHistory = noHistory, historyLoading = false, historyWarnings = noWarnings }: {
  plan: DemoPlan; teamKey: string; targetDate: string; disabled: boolean; onApply: (plan: DemoPlan, players?: AssistantPlayer[], settings?: AssistantPreparationSettings) => void;
  preferenceScope?: string; initialSettings?: AssistantPreparationSettings; initialPlayers?: AssistantPlayer[]; connected?: boolean; testOnly?: boolean; preparationFlow?: boolean;
  automaticHistory?: AssistantHistoryMatch[]; historyLoading?: boolean; historyWarnings?: string[];
}) {
  const [basePlayers, setPlayers] = useState<AssistantPlayer[]>(() => initialPlayers ?? plan.players.map((player) => ({
    key: player.key, availability: player.unavailableReason === "injured" ? "injured" : player.absent ? "absent" : "present",
    primaryPosition: null, secondaryPosition: null,
  })));
  const { players, remember, storageError } = useRememberedPlayers(preferenceScope, basePlayers);
  const [keeper, setKeeper] = useState(initialSettings?.keeper ?? plan.startingLineup.keeperKey);
  const [keepKeeper, setKeepKeeper] = useState(initialSettings?.keepKeeper ?? true);
  const [secondKeeper, setSecondKeeper] = useState(initialSettings?.secondKeeper ?? "");
  const [date, setDate] = useState(initialSettings?.date ?? targetDate);
  const [interval, setInterval] = useState(initialSettings?.interval ?? 10);
  const [includeSubstitutions, setIncludeSubstitutions] = useState(initialSettings?.includeSubstitutions ?? true);
  const [manualStart, setManualStart] = useState(initialSettings?.manualStart ?? false);
  const [startingField, setStartingField] = useState(() => plan.startingLineup.field.filter((entry) =>
    plan.formation.slots.some((slot) => slot.id === entry.slotId && canonicalPosition(slot.position) !== "GK")));
  const [history, setHistory] = useState<AssistantHistoryMatch[]>(initialSettings?.history ?? []);
  const [reviewedRevision, setReviewedRevision] = useState<string | null>(null);
  const [proposalConfirmed, setProposalConfirmed] = useState(false);
  const [result, setResult] = useState<{ revision: string; value: AssistantResult } | null>(null);
  const canChangeKeeper = !connected || testOnly;
  const fixedKeeper = !includeSubstitutions || !canChangeKeeper || keepKeeper;
  const combinedHistory = [...automaticHistory.filter((automatic) => !history.some((manual) => manual.date === automatic.date && manual.opponent.trim().toLowerCase() === automatic.opponent.trim().toLowerCase())), ...history];
  const keeperSlot = plan.formation.slots.find((slot) => canonicalPosition(slot.position) === "GK");
  const input: AssistantInput = { teamKey, targetDate: date, plan, players, keeperKey: keeper, keepKeeper: fixedKeeper, secondKeeperKey: fixedKeeper ? undefined : secondKeeper, intervalMinutes: interval, includeSubstitutions, history: combinedHistory,
    startingField: manualStart ? [...startingField, ...(keeperSlot && keeper ? [{ playerKey: keeper, slotId: keeperSlot.id }] : [])] : undefined };
  const revision = JSON.stringify(input);
  const selectionConfirmed = reviewedRevision === revision;
  const currentResult = result?.revision === revision ? result.value : null;

  function changed() {
    setReviewedRevision(null);
    setProposalConfirmed(false);
    setResult(null);
  }

  function editPlayer(key: string, patch: Partial<AssistantPlayer>) {
    remember(key, patch);
    setPlayers((current) => current.map((player) => player.key === key ? { ...player, ...patch } : player));
    changed();
  }

  function generate() {
    if (disabled || historyLoading || !selectionConfirmed) return;
    setProposalConfirmed(false);
    setResult({ revision, value: proposeCoachPlan(input) });
  }

  return <section aria-label="Coachassistent" className="space-y-5">
    <header className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-dia-green">{connected ? "Coachassistent · gekozen wedstrijd" : "Coachassistent · lokale proef"}</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Een voorstel dat je kunt uitleggen</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Kies de beschikbare spelers, hun voorkeursplekken en de keeper. Kies zelf de beginopstelling of laat de assistent die voorstellen. De assistent berekent daarna de wissels met minuten voorop en posities licht meegewogen. Je kunt het voorstel daarna op het veld afspelen.</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{connected ? "Beschikbaarheid en positievoorkeuren zijn geladen uit de wedstrijdselectie. Eerdere beginopstellingen worden alleen gebruikt wanneer ze zijn bevestigd. Wijzigingen in voorkeuren gelden voor dit voorstel." : "Deze bron bevat geen geverifieerde eerdere beginopstellingen of spelervoorkeuren. Plekken uit het voorbeeld zijn alleen een startpunt bij gelijke keuzes. Historie wordt uitsluitend gebruikt na jouw controle."}</p></header>
    {preferenceScope && <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">Posities, afwezigheid en blessures worden voor dit team onthouden in deze browser. Zet een speler zelf weer op Beschikbaar wanneer die terug is. Controleer deze bewaarde keuzes vóór iedere wedstrijd.</p>}
    {storageError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">Je browser kon deze keuze niet bewaren. Houd dit scherm open; na sluiten moet je de keuze opnieuw invoeren.</p>}
    {disabled && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">De oefenwedstrijd is al begonnen. Kies Opnieuw voordat je een nieuw plan voorbereidt.</p>}
    <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <legend className="px-2 font-semibold">Selectie en afspraken</legend>
      <div className="grid gap-4 sm:grid-cols-3"><label className="grid gap-1.5 text-sm font-medium">Datum doelwedstrijd<input className={inputClass} type="date" disabled={connected && Boolean(targetDate)} value={date} onChange={(event) => { setDate(event.target.value); changed(); }} /></label>
        <label className="grid gap-1.5 text-sm font-medium">Keeper voor voorstel<select className={inputClass} value={keeper} onChange={(event) => { setKeeper(event.target.value); changed(); }}><option value="">Kies keeper</option>{plan.players.map((player) => <option key={player.key} value={player.key} disabled={players.find((row) => row.key === player.key)?.availability !== "present"}>{player.name} {player.number ?? "?"}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium">Wisselen iedere<select className={inputClass} value={interval} disabled={!includeSubstitutions} onChange={(event) => { setInterval(Number(event.target.value)); changed(); }}>{[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} minuten</option>)}</select></label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input className="size-5" type="checkbox" checked={includeSubstitutions} onChange={(event) => { setIncludeSubstitutions(event.target.checked); changed(); }} />Ook een wisselplan voorstellen</label>
      <div className="rounded-xl border border-slate-200 p-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input className="size-5" type="checkbox" checked={fixedKeeper} disabled={!includeSubstitutions || !canChangeKeeper} onChange={(event) => { setKeepKeeper(event.target.checked); changed(); }} />Keeper niet wisselen</label>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{fixedKeeper ? "De gekozen keeper blijft de hele wedstrijd op doel en doet niet mee aan de geplande wissels." : "Elke keeper keept één helft en zit de andere helft op de bank. De keeperwissel gebeurt bij de rust."}</p>
        {!fixedKeeper && <label className="mt-3 grid gap-1.5 text-sm font-medium">Keeper tweede helft<select className={inputClass} value={secondKeeper} onChange={(event) => { setSecondKeeper(event.target.value); changed(); }}><option value="">Kies tweede keeper</option>{plan.players.map((player) => <option key={player.key} value={player.key} disabled={player.key === keeper || players.find((row) => row.key === player.key)?.availability !== "present"}>{player.name} {player.number ?? "?"}</option>)}</select></label>}
      </div>
      <p className="text-sm text-slate-500">Formatie: {plan.formation.name ?? "huidige formatie"} · {plan.match.regulationDurationMinutes} minuten. Wijzig de formatie vooraf bij het veld. Bij onbekende voorkeuren vraagt het voorstel extra controle.</p>
      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">De assistent verdeelt eerst de speelminuten zo gelijk mogelijk. Daarna tellen de eerste en tweede voorkeurspositie licht mee, met zo weinig mogelijk onnodige positiewissels. Een positievoorkeur geeft geen recht op meer speeltijd. Keeperafspraken blijven gelden. Laat ‘Minuten van coach’ leeg voor automatisch verdelen. Een ingevuld getal is een maximum; de reden en notitie zijn alleen voor de coach en komen niet op het wisselblad.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="py-2 pr-3">Speler</th><th className="pr-3">Beschikbaarheid</th><th className="pr-3">Eerste voorkeur</th><th>Tweede voorkeur</th><th className="pl-3">Minuten van coach (max.)</th></tr></thead><tbody>{plan.players.map((player) => {
        const row = players.find((candidate) => candidate.key === player.key)!;
        const label = `${player.name} ${player.number ?? "?"}`;
        const slotId = plan.startingLineup.field.find((entry) => entry.playerKey === player.key)?.slotId;
        const reference = plan.formation.slots.find((slot) => slot.id === slotId)?.position;
        return <tr key={player.key} className="border-b border-slate-100"><th scope="row" className="py-3 pr-3 font-semibold">{label}<span className="mt-1 block text-xs font-normal text-slate-400">In dit plan: {reference ?? (player.absent ? "niet beschikbaar" : "bank")}</span></th>
          <td className="py-2 pr-3"><select className={inputClass} aria-label={`Beschikbaarheid voorstel ${label}`} value={row.availability} onChange={(event) => editPlayer(player.key, { availability: event.target.value as AssistantPlayer["availability"] })}><option value="present">Beschikbaar</option><option value="injured">Geblesseerd</option><option value="absent">Afwezig</option><option value="unknown">Nog controleren</option></select></td>
          {(["primaryPosition", "secondaryPosition"] as const).map((field, index) => <td key={field} className="py-2 pr-3"><select className={inputClass} aria-label={`${index === 0 ? "Eerste" : "Tweede"} voorkeur ${label}`} value={row[field] ?? ""} onChange={(event) => editPlayer(player.key, { [field]: event.target.value || null })}><option value="">Onbekend / open</option>{POSITIONS.map((position) => <option key={position.code} value={position.code}>{position.code} · {position.nameDutch}</option>)}</select></td>)}
          <td className="min-w-48 py-2 pl-3"><input className={inputClass} aria-label={`Minuten van coach ${label}`} type="number" min={0} max={plan.match.regulationDurationMinutes} step={1} placeholder="Automatisch" value={row.maxMinutes ?? ""} onChange={(event) => editPlayer(player.key, { maxMinutes: event.target.value === "" ? undefined : Number(event.target.value) })} />
            {row.maxMinutes !== undefined && <><label className="mt-2 block text-xs">Reden<select className={`${inputClass} mt-1`} aria-label={`Reden minutenafspraak ${label}`} value={row.minutesReason ?? "coach_choice"} onChange={(event) => editPlayer(player.key, { minutesReason: event.target.value as AssistantPlayer["minutesReason"] })}><option value="coach_choice">Trainerkeuze</option><option value="team_agreement">Disciplinaire afspraak</option></select></label><input className={`${inputClass} mt-2`} aria-label={`Coachnotitie minutenafspraak ${label}`} placeholder="Korte coachnotitie" maxLength={300} value={row.minutesNote ?? ""} onChange={(event) => editPlayer(player.key, { minutesNote: event.target.value })} /></>}
          </td>
        </tr>;
      })}</tbody></table></div>
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <label className="grid gap-1.5 text-sm font-semibold">Beginopstelling bepalen<select className={inputClass} value={manualStart ? "coach" : "assistant"} onChange={(event) => { setManualStart(event.target.value === "coach"); changed(); }}><option value="assistant">Laat de assistent de beginopstelling kiezen</option><option value="coach">Ik kies zelf de beginopstelling</option></select></label>
        {manualStart && <CoachStartingField onKeeperChange={(key) => { setKeeper(key); changed(); }} plan={plan} players={players} field={startingField} keeperKey={keeper} secondKeeperKey={fixedKeeper ? undefined : secondKeeper} onChange={(next) => { setStartingField(next); changed(); }} />}
      </div>
    </fieldset>
    {connected && <section aria-label="Wedstrijdhistorie uit DIA Live" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <h3 className="font-semibold">Wedstrijdhistorie uit DIA Live</h3>
      {historyLoading ? <p role="status" className="mt-2">Alle eerdere gespeelde wedstrijden van dit team laden…</p> : <><p className="mt-2">{automaticHistory.length} eerdere gespeelde wedstrijden automatisch geladen. Geldige geregistreerde speelminuten worden standaard meegenomen. Keeperminuten en beginposities die niet betrouwbaar zijn opgeslagen blijven onbekend.</p>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer font-medium">Bekijk bronwedstrijden en controles</summary><ul className="mt-2 space-y-2">{automaticHistory.map((match) => <li key={match.id}><details className="rounded-lg bg-white p-3"><summary className="min-h-11 cursor-pointer">{match.date} · {match.opponent} · {match.players.filter((player) => player.minutes !== null).length} spelers met bruikbare minuten</summary><p className="my-2 text-xs text-slate-600">Laatst opgeslagen opstelling. Niet alle positieruilen zijn als gebeurtenis bewaard; deze posities bewijzen daarom niet de beginopstelling of alle tussentijdse posities.</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-2">Speler</th><th>Speelminuten</th><th>Laatst opgeslagen positie</th></tr></thead><tbody>{match.players.map((player) => <tr key={player.playerKey} className="border-t border-slate-100"><td className="py-2">{player.name ?? plan.players.find((current) => current.key === player.playerKey)?.name ?? "Speler"}</td><td>{player.minutes ?? "Onbekend"}</td><td>{player.recordedPosition === "BENCH" ? "Bank" : player.recordedPosition ?? "Onbekend"}</td></tr>)}</tbody></table></div></details></li>)}</ul>{historyWarnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-900">{historyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</details></>}
    </section>}
    <HistoryEditor players={plan.players} teamKey={teamKey} targetDate={date} history={history} automaticCount={connected ? automaticHistory.length : undefined} disabled={disabled || historyLoading} onChange={(matches) => { setHistory(matches); changed(); }} />
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" disabled={disabled} checked={selectionConfirmed} onChange={(event) => { setReviewedRevision(event.target.checked ? revision : null); setProposalConfirmed(false); if (!event.target.checked) setResult(null); }} /><span>Ik heb beschikbaarheid, keeper, datum en positievoorkeuren voor dit voorstel gecontroleerd. Open voorkeuren blijven herkenbaar als onbekend.</span></label><button type="button" className={`${buttonClass} mt-3`} disabled={disabled || historyLoading || !selectionConfirmed} onClick={generate}>Voorstel berekenen</button></div>
    {currentResult && !currentResult.ok && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800"><ul className="list-disc space-y-2 pl-5">{currentResult.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
    {currentResult?.ok && <><ProposalView proposal={currentResult.proposal} /><div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-6"><label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5" type="checkbox" disabled={disabled} checked={proposalConfirmed} onChange={(event) => setProposalConfirmed(event.target.checked)} /><span>Ik heb de voorgestelde posities, wissels en minutenverdeling beoordeeld.</span></label><button type="button" className={`${buttonClass} mt-3`} disabled={disabled || !proposalConfirmed} onClick={() => { if (currentResult.ok && proposalConfirmed && !disabled) onApply(currentResult.proposal.plan, players.map((player) => ({ ...player })), { keeper, keepKeeper, secondKeeper, date, interval, includeSubstitutions, history, manualStart }); }}>{preparationFlow ? "Verder naar wisselplan" : connected ? "Voorstel klaarzetten" : "Gebruik voorstel in oefenwedstrijd"}</button><p className="mt-3 text-xs text-slate-500">{preparationFlow ? "Je gaat met dit concept naar stap 2: Wisselplan. Controleer het plan en ga daarna op deze pagina oefenen met de klok." : connected && !testOnly ? "Het voorstel wordt eerst een concept. Controleer het bij Bron controleren en sla het daarna op in de gekozen wedstrijd." : "Het voorstel vervangt het lokale conceptplan. Daarna controleer en start je de oefenwedstrijd via Bron controleren. Er wordt niets naar DIA Live geschreven; herladen wist deze proef."}</p></div></>}
    {result && result.revision !== revision && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">Het bronplan is gewijzigd. Controleer de selectie en bereken het voorstel opnieuw.</p>}
  </section>;
}
