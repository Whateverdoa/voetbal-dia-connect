"use client";

import { useId, useState } from "react";
import { ClipboardList, FileCheck2, FilePenLine, LockKeyhole, Plus, Power, Save, ShieldCheck } from "lucide-react";
import { getStaffObservations } from "@/lib/team-portal/observationRules";
import { emptyObservation, OBSERVATION_CONFIDENCE, OBSERVATION_CRITERIA, type ObservationContent, type StaffObservation } from "@/lib/team-portal/observationTypes";
import type { CommandHandler, DemoActor, DemoState } from "@/lib/team-portal/types";
import { ObservationCriteria } from "./ObservationCriteria";

interface ObservationWorkspaceProps {
  state: DemoState;
  actor: DemoActor;
  onCommand: CommandHandler;
  now: number;
}

const panelClass = "rounded-3xl border border-stone-200 bg-white p-5 sm:p-6";
const inputClass = "min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20";
const primaryClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-dia-green px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-40";
const secondaryClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-40";


function dateLabel(date: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(`${date}T12:00:00Z`));
}

function today(now: number) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function ObservationWorkspace(props: ObservationWorkspaceProps) {
  if (props.actor.role !== "coach" && props.actor.role !== "scout") {
    return <p className={panelClass}>Deze werkplek is alleen beschikbaar voor coaches en scouts.</p>;
  }
  return <ObservationStaffWorkspace key={props.actor.role} {...props} />;
}

function ObservationStaffWorkspace({ state, actor, onCommand, now }: ObservationWorkspaceProps) {
  const [notice, setNotice] = useState("");
  const enabled = Boolean(state.observationsEnabled);
  return (
    <div className="space-y-6">
      <section className={panelClass} aria-labelledby="observation-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-dia-green"><LockKeyhole aria-hidden="true" className="h-4 w-4" />Intern · coach en scout</p>
            <h2 id="observation-heading" className="mt-3 text-2xl font-black tracking-tight text-stone-900">Kijken, begrijpen, begeleiden</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">Verdiep je in wat een speler laat zien. Leg concrete voorbeelden vast, samen met de rol, situatie en een passende vervolgstap.</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-stone-700">Observaties verschijnen nooit op de pagina’s van spelers of ouders.</p>
          </div>
          {actor.role === "coach" ? <button type="button" aria-pressed={enabled} onClick={() => setNotice(onCommand({ type: "setObservationsEnabled", enabled: !enabled }) ? enabled ? "Observaties uitgeschakeld. Bewaarde verslagen blijven behouden." : "Observaties ingeschakeld voor coach en scout." : "De instelling kon niet worden gewijzigd.")} className={enabled ? secondaryClass : primaryClass}><Power aria-hidden="true" className="h-4 w-4" />{enabled ? "Observaties uitschakelen" : "Observaties inschakelen"}</button> : null}
        </div>
        <p className="mt-4 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-500">Fictieve demo, lokaal in deze browser. De rolwisselaar biedt geen echte toegangsbeveiliging; accounts en toegangscontrole volgen bij integratie.</p>
        <p role="status" className="mt-2 text-sm font-medium text-dia-green">{notice}</p>
      </section>
      {enabled ? <ObservationEnabledWorkspace state={state} actor={actor} onCommand={onCommand} now={now} /> : <section className={`${panelClass} py-10 text-center`}><span className="mx-auto inline-flex rounded-2xl bg-stone-100 p-4 text-stone-500"><ClipboardList aria-hidden="true" className="h-8 w-8" /></span><h3 className="mt-4 text-lg font-bold text-stone-900">Een extra blik, als het team daar klaar voor is</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">{actor.role === "coach" ? "Deze optionele werkplek staat uit. Schakel observaties in om zelf of samen met een scout uitgebreider te kijken." : "De coach kan deze optionele werkplek inschakelen. Daarna kun je eigen observaties maken en vastgelegde verslagen lezen."}</p></section>}
    </div>
  );
}

function ObservationEnabledWorkspace({ state, actor, onCommand, now }: ObservationWorkspaceProps) {
  const [playerId, setPlayerId] = useState(state.players[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string>(() => crypto.randomUUID());
  const playerSelectId = useId();
  const player = state.players.find((candidate) => candidate.id === playerId);
  const observations = getStaffObservations(state, actor, playerId);
  const selected = observations.find((observation) => observation.id === selectedId);
  if (!player) return <p className={panelClass}>Er zijn nog geen spelers om te observeren.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="max-w-md flex-1"><label htmlFor={playerSelectId} className="mb-2 block text-sm font-bold text-stone-800">Speler observeren</label><select id={playerSelectId} value={playerId} onChange={(event) => { setPlayerId(event.target.value); setSelectedId(crypto.randomUUID()); }} className={inputClass}>{state.players.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.position}</option>)}</select></div>
        <button type="button" onClick={() => setSelectedId(crypto.randomUUID())} className={secondaryClass}><Plus aria-hidden="true" className="h-4 w-4" />Nieuwe observatie</button>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(230px,0.7fr)_minmax(0,2fr)]">
        <aside className={panelClass} aria-label="Observatiegeschiedenis">
          <h3 className="font-bold text-stone-900">Dossier van {player.name}</h3><p className="mt-2 text-xs leading-relaxed text-stone-500">Eigen concepten en alle intern vastgelegde verslagen. Concepten van de andere rol blijven verborgen.</p>
          {observations.length === 0 ? <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Nog geen observaties. Begin met één situatie die je echt hebt gezien.</p> : <div className="mt-4 space-y-2">{observations.map((observation) => <button key={observation.id} type="button" aria-pressed={observation.id === selectedId} onClick={() => setSelectedId(observation.id)} className={`w-full rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green ${observation.id === selectedId ? "border-emerald-200 bg-emerald-50" : "border-stone-100 hover:bg-stone-50"}`}><span className="flex items-center gap-2 text-xs font-bold text-dia-green">{observation.status === "draft" ? <FilePenLine aria-hidden="true" className="h-4 w-4" /> : <FileCheck2 aria-hidden="true" className="h-4 w-4" />}{observation.status === "draft" ? "Eigen concept" : "Intern vastgelegd"}</span><span className="mt-2 block text-sm font-bold text-stone-900">{dateLabel(observation.content.observedOn)}</span><span className="mt-1 block text-xs text-stone-500">{observation.authorRole === "coach" ? "Coach" : "Scout"} · {observation.content.context === "match" ? "Wedstrijd" : "Training"}</span></button>)}</div>}
        </aside>
        {selected?.status === "final" ? <ObservationReport observation={selected} state={state} /> : <ObservationEditor key={`${playerId}:${selectedId}`} state={state} observation={selected} observationId={selectedId} playerId={playerId} defaultPosition={player.position} now={now} onCommand={onCommand} />}
      </div>
    </div>
  );
}

interface ObservationEditorProps {
  state: DemoState;
  observation?: StaffObservation;
  observationId: string;
  playerId: string;
  defaultPosition: string;
  now: number;
  onCommand: CommandHandler;
}

function ObservationEditor({ state, observation, observationId, playerId, defaultPosition, now, onCommand }: ObservationEditorProps) {
  const availableMatches = state.matches.filter((match) => match.participantIds.includes(playerId));
  const [content, setContent] = useState<ObservationContent>(() => observation?.content ?? { ...emptyObservation(today(now), availableMatches[0]?.id), position: defaultPosition });
  const [notice, setNotice] = useState("");

  const dirty = !observation || JSON.stringify(content) !== JSON.stringify(observation.content);
  const assessed = OBSERVATION_CRITERIA.filter(({ id }) => content.criteria[id].level !== "Niet geobserveerd");
  const finalReady = Boolean(content.position.trim() && content.strengths.trim() && content.development.trim() && content.followUp.trim() && assessed.length > 0 && assessed.every(({ id }) => content.criteria[id].evidence.trim()));

  function update(patch: Partial<ObservationContent>) {
    setContent({ ...content, ...patch });
    setNotice("");
  }
  function save() {
    const normalized = structuredClone(content);
    normalized.position = normalized.position.trim();
    normalized.strengths = normalized.strengths.trim();
    normalized.development = normalized.development.trim();
    normalized.followUp = normalized.followUp.trim();
    for (const { id } of OBSERVATION_CRITERIA) normalized.criteria[id].evidence = normalized.criteria[id].evidence.trim();
    if (onCommand({ type: "saveObservation", observationId, playerId, content: normalized })) {
      setContent(normalized);
      setNotice("Concept bewaard. Alleen jouw rol kan dit concept lezen en bewerken.");
    } else {
      setNotice("Bewaren is niet gelukt. Controleer de datum, context en observatieduur (5 tot 120 hele minuten).");
    }
  }

  return (
    <form className={`${panelClass} min-w-0 space-y-6`} onSubmit={(event) => { event.preventDefault(); save(); }}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black text-stone-900">{observation ? "Observatie aanvullen" : "Een nieuwe observatie"}</h3><p className="mt-2 text-sm text-stone-500">Beschrijf gedrag in deze situatie. Niet alles hoeft al geobserveerd te zijn.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{dirty ? "Niet opgeslagen" : "Eigen concept"}</span></div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-bold text-stone-800">De situatie</legend>
        <label className="space-y-2 text-sm font-medium text-stone-700"><span>Context</span><select className={inputClass} value={content.context} onChange={(event) => { if (event.target.value === "training") { const next = { ...content, context: "training" as const }; delete next.matchId; setContent(next); setNotice(""); } else { update({ context: "match", matchId: availableMatches[0]?.id }); } }}><option value="match" disabled={availableMatches.length === 0}>Wedstrijd</option><option value="training">Training</option></select></label>
        {content.context === "match" ? <label className="space-y-2 text-sm font-medium text-stone-700"><span>Wedstrijd</span><select className={inputClass} required value={content.matchId ?? ""} onChange={(event) => update({ matchId: event.target.value })}><option value="" disabled>Kies een wedstrijd</option>{availableMatches.map((match) => <option key={match.id} value={match.id}>{match.opponent} · {match.dateLabel}</option>)}</select></label> : null}
        <label className="space-y-2 text-sm font-medium text-stone-700"><span>Observatiedatum</span><input type="date" required className={inputClass} value={content.observedOn} onChange={(event) => update({ observedOn: event.target.value })} /></label>
        <label className="space-y-2 text-sm font-medium text-stone-700"><span>Positie of rol</span><input maxLength={80} className={inputClass} value={content.position} onChange={(event) => update({ position: event.target.value })} placeholder="Bijvoorbeeld: centrale middenvelder" /></label>
        <label className="space-y-2 text-sm font-medium text-stone-700"><span>Geobserveerde minuten</span><input type="number" required min={5} max={120} step={1} className={inputClass} value={content.minutes || ""} onChange={(event) => update({ minutes: Number(event.target.value) })} /></label>
        <label className="space-y-2 text-sm font-medium text-stone-700"><span>Basis voor deze indruk</span><select className={inputClass} value={content.confidence} onChange={(event) => { const confidence = OBSERVATION_CONFIDENCE.find((value) => value === event.target.value); if (confidence) update({ confidence }); }}>{OBSERVATION_CONFIDENCE.map((confidence) => <option key={confidence}>{confidence}</option>)}</select></label>
      </fieldset>
      <ObservationCriteria criteria={content.criteria} onChange={(criteria) => update({ criteria })} />
      <fieldset className="space-y-4"><legend className="mb-3 font-bold text-stone-800">Van observatie naar begeleiding</legend>{([{ key: "strengths", label: "Sterke punten", placeholder: "Wat helpt deze speler en het team?" }, { key: "development", label: "Ontwikkelpunten", placeholder: "Welk gedrag kan verder groeien in deze rol?" }, { key: "followUp", label: "Vervolgafspraak", placeholder: "Wat oefenen of bekijken we een volgende keer?" }] as const).map((field) => <label key={field.key} className="block text-sm font-medium text-stone-700"><span>{field.label}</span><textarea rows={3} maxLength={1200} className={`${inputClass} mt-2 resize-y`} placeholder={field.placeholder} value={content[field.key]} onChange={(event) => update({ [field.key]: event.target.value })} /></label>)}</fieldset>
      <div className="rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-600"><p className="flex items-start gap-2"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Na intern vastleggen kunnen coach en scout het verslag lezen. Het blijft buiten speler- en ouderfeedback en is daarna niet meer te wijzigen.</span></p>{dirty ? <p className="mt-2 font-medium text-amber-800">Bewaar je concept voordat je wisselt of intern vastlegt.</p> : null}{!finalReady ? <p className="mt-2">Voor vastleggen: vul positie, sterke punten, ontwikkelpunten en vervolgafspraak in. Beoordeel minimaal één onderdeel en geef bij elk beoordeeld onderdeel een concreet voorbeeld.</p> : null}</div>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={!dirty} className={secondaryClass}><Save aria-hidden="true" className="h-4 w-4" />Concept bewaren</button><button type="button" disabled={dirty || !observation || !finalReady} className={primaryClass} onClick={() => setNotice(onCommand({ type: "finalizeObservation", observationId }) ? "Observatie intern vastgelegd." : "Vastleggen is niet gelukt. Controleer of ieder beoordeeld onderdeel een voorbeeld heeft.")}><FileCheck2 aria-hidden="true" className="h-4 w-4" />Intern vastleggen</button></div><p role="status" className="text-sm font-medium text-dia-green">{notice}</p>
    </form>
  );
}

function ObservationReport({ observation, state }: { observation: StaffObservation; state: DemoState }) {
  const { content } = observation;
  const assessed = OBSERVATION_CRITERIA.filter(({ id }) => content.criteria[id].level !== "Niet geobserveerd");
  return (
    <article className={`${panelClass} min-w-0 space-y-6`} aria-label="Intern vastgelegd observatieverslag">
      <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-dia-green"><LockKeyhole aria-hidden="true" className="h-4 w-4" />Intern vastgelegd · alleen lezen</p><h3 className="mt-3 text-xl font-black text-stone-900">Observatie van {dateLabel(content.observedOn)}</h3><p className="mt-2 text-sm text-stone-500">Door {observation.authorRole === "coach" ? "de coach" : "de scout"} · {content.context === "match" ? `Wedstrijd tegen ${state.matches.find((match) => match.id === content.matchId)?.opponent ?? "de tegenstander"}` : "Training"}</p></header>
      <dl className="grid gap-3 rounded-2xl bg-stone-50 p-4 sm:grid-cols-3">{[{ label: "Positie / rol", value: content.position }, { label: "Observatieduur", value: `${content.minutes} minuten` }, { label: "Basis", value: content.confidence }].map(({ label, value }) => <div key={label}><dt className="text-xs text-stone-500">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-stone-800">{value}</dd></div>)}</dl>
      <section><h4 className="font-bold text-stone-800">Geobserveerde kwaliteiten</h4><div className="mt-4 space-y-4">{assessed.map((criterion) => <div key={criterion.id} className="border-l-2 border-emerald-100 pl-4"><p className="text-xs font-medium text-stone-500">{criterion.group}</p><h5 className="mt-1 text-sm font-bold text-stone-900">{criterion.label}</h5><p className="mt-2 text-xs font-bold text-dia-green">{content.criteria[criterion.id].level}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{content.criteria[criterion.id].evidence}</p></div>)}</div></section>
      {([{ key: "strengths", label: "Sterke punten" }, { key: "development", label: "Ontwikkelpunten" }, { key: "followUp", label: "Vervolgafspraak" }] as const).map(({ key, label }) => <section key={key}><h4 className="font-bold text-stone-800">{label}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{content[key]}</p></section>)}
      <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">Een volgende indruk leg je vast als nieuwe observatie. Zo blijft de ontwikkeling in de tijd zichtbaar.</p>
    </article>
  );
}
