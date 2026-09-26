"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Clock3, Heart, Plus, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { getMatchPhase, getWinners } from "@/lib/team-portal/selectors";
import {
  CATEGORIES, VOTE_REASONS,
  type CommandHandler, type DemoActor, type DemoMatch, type DemoPlayer,
  type DemoState, type HighlightCategory, type MatchHighlight, type VoteReason,
} from "@/lib/team-portal/types";

interface VotingPanelProps {
  state: DemoState;
  actor: DemoActor;
  matchId: string;
  onCommand: CommandHandler;
  now: number;
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-dia-green px-5 py-3 text-sm font-bold text-white transition hover:bg-dia-green-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export function VotingPanel(props: VotingPanelProps) {
  const actorKey = props.actor.role === "player" ? props.actor.playerId : props.actor.role === "parent" ? props.actor.guardianId : "coach";
  return <VotingPanelContent key={`${props.matchId}:${props.actor.role}:${actorKey}`} {...props} />;
}

function VotingPanelContent({ state, actor, matchId, onCommand, now }: VotingPanelProps) {
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return <p className="rounded-2xl bg-white p-6 text-slate-600">Kies een wedstrijd om de teammomenten te bekijken.</p>;

  const phase = getMatchPhase(match, now);
  const highlights = state.highlights.filter((item) => item.matchId === match.id);
  const approved = highlights.filter((item) => item.status === "approved" && (phase === "preparing" || match.highlightCandidateIds?.includes(item.id)));
  const pendingCount = highlights.filter((item) => item.status === "pending").length;
  const actorPlayerId = actor.role === "player" ? actor.playerId : null;
  const isParticipant = actorPlayerId !== null && match.participantIds.includes(actorPlayerId);
  const canSuggest = phase === "preparing" && (actor.role === "coach" || isParticipant);
  const ownPending = actorPlayerId ? highlights.filter((item) => item.status === "pending" && item.submittedBy === actorPlayerId) : [];
  const phaseLabel = phase === "preparing" ? "Momenten verzamelen" : phase === "voting" ? "Stemronde open" : "Samen gevierd";

  return (
    <section className="space-y-5" aria-label="Teamstemmen en mooie momenten">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-dia-green">SAMEN TERUGKIJKEN</p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Iedere bijdrage telt.</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Die fijne pass. Toch blijven gaan. Een teamgenoot helpen. Zet elkaar in het zonnetje.</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${phase === "voting" ? "bg-emerald-50 text-dia-green" : "bg-slate-100 text-slate-600"}`}>
            {phase === "closed" ? <Check size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{phaseLabel}
          </span>
        </div>

        {phase === "preparing" && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            De coach verzamelt eerst de mooie momenten. Daarna kan het team 24 uur stemmen op een teamgenoot en een actie.
          </div>
        )}
        {phase === "voting" && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-dia-green-dark">
            <Clock3 size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p><strong>{remainingTime(match, now)}</strong><span className="mt-1 block leading-relaxed">De uitslag verschijnt als de stemronde sluit. Kies wat jij mooi vond.</span></p>
          </div>
        )}
        {actor.role === "parent" && phase !== "closed" && <p className="mt-4 text-sm text-slate-500">Als ouder kijk je mee met de teammomenten. De spelers brengen zelf hun stem uit.</p>}
        {actor.role === "player" && !isParticipant && phase !== "closed" && <p className="mt-4 text-sm text-slate-500">Je kijkt mee bij deze wedstrijd. Alleen spelers die meededen kunnen een moment voorstellen en stemmen.</p>}

        {actor.role === "coach" && phase === "preparing" && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            {pendingCount > 0 && <p className="mb-3 text-sm text-amber-800">Beoordeel eerst {pendingCount === 1 ? "het wachtende voorstel" : `de ${pendingCount} wachtende voorstellen`} bij de coachwerkplek. Daarna kun je de stemronde openen.</p>}
            <button type="button" className={buttonClass} disabled={pendingCount > 0} onClick={() => onCommand({ type: "openVoting", matchId })}>
              <Heart size={17} aria-hidden="true" />Open stemronde · 24 uur
            </button>
          </div>
        )}
        {actor.role === "coach" && phase === "voting" && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <button type="button" className={buttonClass} onClick={() => onCommand({ type: "closeVoting", matchId })}><Trophy size={17} aria-hidden="true" />Bekijk demo-uitslag</button>
            <p className="mt-2 text-xs text-slate-500">Hiermee sluit je deze stemronde meteen.</p>
          </div>
        )}
      </div>

      {phase === "closed" && <VoteResults state={state} matchId={matchId} now={now} />}
      {phase === "voting" && actor.role === "player" && isParticipant && (
        <PlayerBallots state={state} actor={actor} match={match} approved={approved} onCommand={onCommand} />
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Sparkles size={22} aria-hidden="true" /></span>
          <div><h3 className="text-lg font-bold text-slate-900">Mooie teammomenten</h3><p className="mt-0.5 text-sm text-slate-500">Kleine acties. Groot voor het team.</p></div>
        </div>
        {approved.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {approved.map((highlight) => <HighlightCard key={highlight.id} highlight={highlight} player={state.players.find((player) => player.id === highlight.playerId)} />)}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 px-5 py-7 text-center text-sm leading-relaxed text-slate-500">
            {phase === "preparing" ? "Nog geen momenten gedeeld. Welke actie van een teamgenoot is jou bijgebleven?" : "Voor deze wedstrijd zijn geen teammomenten aangemeld."}
          </p>
        )}
        {ownPending.length > 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Jouw voorstel wacht op de coach</p>
            {ownPending.map((item) => <p key={item.id} className="mt-2 break-words text-sm leading-relaxed text-amber-800">{item.category} · {state.players.find((player) => player.id === item.playerId)?.name}: {item.description}</p>)}
          </div>
        )}
        {canSuggest && <HighlightForm state={state} actor={actor} match={match} onCommand={onCommand} />}
      </div>
    </section>
  );
}

function HighlightForm({ state, actor, match, onCommand }: { state: DemoState; actor: DemoActor; match: DemoMatch; onCommand: CommandHandler }) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [category, setCategory] = useState<HighlightCategory>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [minute, setMinute] = useState("");
  const [message, setMessage] = useState("");
  const eligiblePlayers = state.players.filter((player) => match.participantIds.includes(player.id) && (actor.role !== "player" || player.id !== actor.playerId));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = onCommand({ type: "addHighlight", matchId: match.id, playerId, category, description: description.trim(), ...(minute !== "" ? { minute: Number(minute) } : {}) });
    if (!success) {
      setMessage("Het moment kon niet worden toegevoegd. Controleer je invoer en probeer opnieuw.");
      return;
    }
    setMessage(actor.role === "coach" ? "Het teammoment is gedeeld." : "Mooi gezien! Je voorstel is naar de coach gegaan.");
    setDescription("");
    setMinute("");
    setPlayerId("");
    setIsOpen(false);
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <button type="button" aria-expanded={isOpen} aria-controls={`${id}-form`} onClick={() => setIsOpen(!isOpen)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dia-green/25 px-4 py-3 text-sm font-bold text-dia-green transition hover:bg-dia-green-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dia-green">
        <Plus size={18} aria-hidden="true" />{actor.role === "coach" ? "Teammoment toevoegen" : "Stel een mooi moment voor"}
      </button>
      <p role="status" className="mt-2 text-sm text-dia-green">{message}</p>
      {isOpen && (
        <form id={`${id}-form`} onSubmit={submit} className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-slate-600">{actor.role === "coach" ? "Een moment dat je toevoegt, is direct zichtbaar voor het team." : "Vertel over een actie van een teamgenoot. De coach bekijkt je voorstel voordat het team het ziet."}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`${id}-player`} className={labelClass}>Wie wil je een compliment geven?</label><select id={`${id}-player`} className={inputClass} value={playerId} onChange={(event) => setPlayerId(event.target.value)} required><option value="">Kies een speler</option>{eligiblePlayers.map((player) => <option key={player.id} value={player.id}>{player.name} · #{player.number}</option>)}</select></div>
            <div><label htmlFor={`${id}-category`} className={labelClass}>Wat viel je op?</label><select id={`${id}-category`} className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as HighlightCategory)}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></div>
          </div>
          <div><label htmlFor={`${id}-description`} className={labelClass}>Beschrijf het moment</label><textarea id={`${id}-description`} className={`${inputClass} min-h-24 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Bijvoorbeeld: je hielp een teamgenoot overeind en moedigde hem aan." maxLength={240} required aria-describedby={`${id}-length`} /><p id={`${id}-length`} className="mt-1 text-right text-xs text-slate-500">{description.length}/240 tekens</p></div>
          <div className="max-w-48"><label htmlFor={`${id}-minute`} className={labelClass}>Minuut <span className="font-normal text-slate-500">(optioneel)</span></label><input id={`${id}-minute`} className={inputClass} type="number" inputMode="numeric" min={1} max={120} step={1} value={minute} onChange={(event) => setMinute(event.target.value)} placeholder="Bijv. 24" /></div>
          <button type="submit" className={buttonClass} disabled={!playerId || !description.trim()}>{actor.role === "coach" ? "Deel teammoment" : "Stuur naar de coach"}</button>
        </form>
      )}
    </div>
  );
}

function PlayerBallots({ state, actor, match, approved, onCommand }: { state: DemoState; actor: Extract<DemoActor, { role: "player" }>; match: DemoMatch; approved: MatchHighlight[]; onCommand: CommandHandler }) {
  const id = useId();
  const ownPlayerVote = state.votes.find((vote) => vote.matchId === match.id && vote.voterId === actor.playerId && vote.kind === "player");
  const ownHighlightVote = state.votes.find((vote) => vote.matchId === match.id && vote.voterId === actor.playerId && vote.kind === "highlight");
  const [playerId, setPlayerId] = useState(ownPlayerVote?.targetId ?? "");
  const [reason, setReason] = useState<VoteReason | "">(ownPlayerVote?.reason ?? "");
  const [highlightId, setHighlightId] = useState(ownHighlightVote?.targetId ?? "");
  const [playerStatus, setPlayerStatus] = useState("");
  const [highlightStatus, setHighlightStatus] = useState("");
  const players = state.players.filter((player) => match.playerCandidateIds?.includes(player.id) && player.id !== actor.playerId);
  const moments = approved.filter((highlight) => highlight.playerId !== actor.playerId);

  function savePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) return;
    const success = onCommand({ type: "castVote", matchId: match.id, kind: "player", targetId: playerId, reason });
    setPlayerStatus(success ? "Je spelersstem is opgeslagen." : "Je stem kon niet worden opgeslagen. Controleer of de stemronde nog open is.");
  }

  function saveHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = onCommand({ type: "castVote", matchId: match.id, kind: "highlight", targetId: highlightId });
    setHighlightStatus(success ? "Je stem op de actie is opgeslagen." : "Je stem kon niet worden opgeslagen. Controleer of de stemronde nog open is.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={savePlayer} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <span className="inline-flex rounded-xl bg-rose-50 p-2.5 text-rose-600"><Heart size={22} aria-hidden="true" /></span>
        <h3 className="mt-3 text-lg font-bold text-slate-900">Jouw speler van de wedstrijd</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">Wie maakte voor jou het verschil? Geef er een positief compliment bij.</p>
        {ownPlayerVote && <SavedChoice text={`${state.players.find((player) => player.id === ownPlayerVote.targetId)?.name ?? "Teamgenoot"} · ${ownPlayerVote.reason}`} />}
        {players.length === 0 ? <p className="mt-5 text-sm text-slate-500">Er zijn geen andere spelers om op te stemmen.</p> : (
          <>
            <label htmlFor={`${id}-ballot-player`} className={`${labelClass} mt-5`}>Kies een teamgenoot</label>
            <select id={`${id}-ballot-player`} className={inputClass} value={playerId} onChange={(event) => setPlayerId(event.target.value)} required><option value="">Wie viel jou positief op?</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name} · #{player.number}</option>)}</select>
            <fieldset className="mt-4"><legend className={labelClass}>Jouw compliment</legend><div className="flex flex-wrap gap-2">{VOTE_REASONS.map((value) => (
              <label key={value} className={`relative flex min-h-11 cursor-pointer items-center rounded-xl border px-3 py-2 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-dia-green ${reason === value ? "border-dia-green bg-dia-green-light text-dia-green" : "border-slate-200 text-slate-600 hover:border-dia-green/40"}`}>
                <input className="sr-only" type="radio" name={`${id}-reason`} value={value} checked={reason === value} onChange={() => setReason(value)} required />{value}
              </label>
            ))}</div></fieldset>
            <button type="submit" className={`${buttonClass} mt-5 w-full`} disabled={!playerId || !reason}>{ownPlayerVote ? "Pas mijn spelersstem aan" : "Bewaar mijn spelersstem"}</button>
          </>
        )}
        <p role="status" className="mt-3 text-sm text-dia-green">{playerStatus}</p>
      </form>

      <form onSubmit={saveHighlight} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <span className="inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-600"><Sparkles size={22} aria-hidden="true" /></span>
        <h3 className="mt-3 text-lg font-bold text-slate-900">Jouw actie van de wedstrijd</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">Kies één moment van een teamgenoot dat een extra applaus verdient.</p>
        {ownHighlightVote && <SavedChoice text={highlightLabel(state, ownHighlightVote.targetId)} />}
        {moments.length === 0 ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">Er is geen actie van een teamgenoot om op te stemmen. Je kunt wel je spelersstem uitbrengen.</p> : (
          <>
            <fieldset className="mt-5 space-y-2"><legend className={labelClass}>Kies een teammoment</legend>{moments.map((highlight) => (
              <label key={highlight.id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-dia-green ${highlightId === highlight.id ? "border-dia-green bg-dia-green-light" : "border-slate-200 hover:border-dia-green/40"}`}>
                <input type="radio" name={`${id}-highlight`} value={highlight.id} checked={highlightId === highlight.id} onChange={() => setHighlightId(highlight.id)} className="mt-1 h-4 w-4 shrink-0 accent-dia-green" required />
                <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{highlightLabel(state, highlight.id)}</span><span className="mt-1 block break-words text-sm leading-relaxed text-slate-600">{highlight.description}</span></span>
              </label>
            ))}</fieldset>
            <button type="submit" className={`${buttonClass} mt-5 w-full`} disabled={!highlightId}>{ownHighlightVote ? "Pas mijn actiestem aan" : "Bewaar mijn actiestem"}</button>
          </>
        )}
        <p role="status" className="mt-3 text-sm text-dia-green">{highlightStatus}</p>
      </form>
      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500 lg:col-span-2"><ShieldCheck size={16} className="shrink-0" aria-hidden="true" />Je ziet hier alleen je eigen keuzes. Je kunt ze aanpassen zolang de stemronde open is.</p>
    </div>
  );
}

function SavedChoice({ text }: { text: string }) {
  return <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-dia-green"><Check size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><p><span className="block text-xs font-semibold">Jouw opgeslagen keuze</span><span className="mt-0.5 block">{text}</span></p></div>;
}

function HighlightCard({ highlight, player }: { highlight: MatchHighlight; player?: DemoPlayer }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-dia-green">{player ? `#${player.number}` : <Sparkles size={18} aria-hidden="true" />}</span><div className="min-w-0"><h4 className="font-bold text-slate-800">{player?.name ?? "Teamgenoot"}</h4><p className="text-xs font-medium text-dia-green">{highlight.category}{highlight.minute !== undefined ? ` · ${highlight.minute}e minuut` : ""}</p></div></div>
      <p className="mt-3 break-words text-sm leading-relaxed text-slate-600">{highlight.description}</p>
    </article>
  );
}

function VoteResults({ state, matchId, now }: { state: DemoState; matchId: string; now: number }) {
  const winners = getWinners(state, matchId, now);
  const players = state.players.filter((player) => winners.playerIds.includes(player.id));
  const highlights = state.highlights.filter((highlight) => winners.highlightIds.includes(highlight.id));
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 sm:p-7">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2.5 text-amber-600"><Trophy size={23} aria-hidden="true" /></span><div><h3 className="text-xl font-bold text-slate-900">Applaus voor elkaar</h3><p className="mt-1 text-sm text-slate-600">De stemronde is gesloten. Dit viel het team op.</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5"><p className="text-xs font-bold tracking-wide text-dia-green">SPELER VAN DE WEDSTRIJD</p>{players.length > 0 ? <><p className="mt-3 text-xl font-bold text-slate-900">{players.map((player) => player.name).join(" & ")}</p><p className="mt-2 text-sm text-slate-500">{players.length > 1 ? "Evenveel waardering. Samen in het zonnetje!" : "Door het team in het zonnetje gezet."}</p></> : <p className="mt-3 text-sm leading-relaxed text-slate-500">Er zijn geen spelersstemmen uitgebracht. Volgende wedstrijd een nieuwe kans om elkaar een compliment te geven.</p>}</div>
        <div className="rounded-2xl bg-white p-5"><p className="text-xs font-bold tracking-wide text-amber-700">ACTIE VAN DE WEDSTRIJD</p>{highlights.length > 0 ? <><div className="mt-3 space-y-3">{highlights.map((highlight) => <div key={highlight.id}><p className="font-bold text-slate-900">{highlightLabel(state, highlight.id)}</p><p className="mt-1 break-words text-sm leading-relaxed text-slate-600">{highlight.description}</p></div>)}</div>{highlights.length > 1 && <p className="mt-3 text-sm text-slate-500">Een gedeelde uitslag. Deze momenten verdienen samen applaus!</p>}</> : <p className="mt-3 text-sm leading-relaxed text-slate-500">Er zijn geen actiestemmen uitgebracht. Alle gedeelde momenten blijven hieronder te zien.</p>}</div>
      </div>
    </div>
  );
}

function highlightLabel(state: DemoState, highlightId: string) {
  const highlight = state.highlights.find((item) => item.id === highlightId);
  if (!highlight) return "Teammoment";
  const name = state.players.find((player) => player.id === highlight.playerId)?.name ?? "Teamgenoot";
  return `${highlight.category} · ${name}${highlight.minute !== undefined ? ` · ${highlight.minute}'` : ""}`;
}

function remainingTime(match: DemoMatch, now: number) {
  const minutes = Math.max(1, Math.ceil(((match.closesAt ?? now) - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `Nog ${hours} uur${remainder ? ` en ${remainder} min` : ""} om te stemmen` : `Nog ${minutes} ${minutes === 1 ? "minuut" : "minuten"} om te stemmen`;
}
