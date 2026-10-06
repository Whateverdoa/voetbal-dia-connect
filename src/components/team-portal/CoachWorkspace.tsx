"use client";

import { useId, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  HeartHandshake,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  emptyFeedback,
  SKILLS,
  SKILL_LEVELS,
  type CoachFeedback,
  type CommandHandler,
  type DemoPlayer,
  type DemoState,
  type FeedbackContent,
  type Skill,
} from "@/lib/team-portal/types";
import { useDemoProfile } from "./DemoProfileContext";

const skillLabels: Record<Skill, string> = {
  balvaardigheid: "Balvaardigheid",
  spelinzicht: "Spelinzicht",
  samenspel: "Samenspel",
  inzet: "Inzet",
  sportiviteit: "Sportiviteit",
};

const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20";
const secondaryButtonClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-45";

function sameContent(left: FeedbackContent, right: FeedbackContent) {
  return left.compliment === right.compliment
    && left.nextStep === right.nextStep
    && SKILLS.every((skill) => left.skills[skill] === right.skills[skill]);
}

interface CoachWorkspaceProps {
  state: DemoState;
  matchId: string;
  onCommand: CommandHandler;
}

export function CoachWorkspace({ state, matchId, onCommand }: CoachWorkspaceProps) {
  const profile = useDemoProfile();
  const [selectedPlayerId, setSelectedPlayerId] = useState(state.players[0]?.id ?? "");
  const [kind, setKind] = useState<CoachFeedback["kind"]>("match");
  const player = state.players.find((candidate) => candidate.id === selectedPlayerId) ?? state.players[0];
  const match = state.matches.find((candidate) => candidate.id === matchId);
  const playerSelectId = useId();
  const publishedCount = state.feedback.filter((feedback) => feedback.kind === "match" && feedback.matchId === matchId && feedback.published).length;

  if (!player || !match) {
    return <p className="rounded-2xl bg-white p-6 text-stone-600">Er zijn nog geen spelers of wedstrijden om te beoordelen.</p>;
  }

  const feedback = state.feedback.find((record) => record.playerId === player.id && record.kind === kind && (kind === "periodic" || record.matchId === matchId));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7" aria-labelledby="coach-workspace-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-emerald-50 p-3 text-dia-green"><ClipboardCheck aria-hidden="true" className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-dia-green">Van de coach</p>
              <h2 id="coach-workspace-title" className="mt-1 text-2xl font-black tracking-tight text-stone-900">Iedere speler een stap verder</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">Benoem wat goed gaat en geef één haalbaar oefenpunt mee. Kleine stappen maken het verschil.</p>
            </div>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3">
            <p className="text-2xl font-black text-stone-900">{publishedCount}<span className="text-sm font-medium text-stone-500"> / {match.participantIds.length}</span></p>
            <p className="text-xs text-stone-500">wedstrijdbesprekingen gedeeld</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7" aria-label="Coachfeedback schrijven">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor={playerSelectId} className="mb-2 block text-sm font-bold text-stone-800">Speler</label>
              <select id={playerSelectId} value={player.id} onChange={(event) => setSelectedPlayerId(event.target.value)} className={inputClass}>
                {state.players.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}{candidate.number != null ? ` · #${candidate.number}` : ""}</option>)}
              </select>
            </div>
            <p className="pb-3 text-sm text-stone-500">{player.position}</p>
          </div>

          <div role="group" aria-label="Soort coachfeedback" className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1">
            {([{ value: "match", label: "Deze wedstrijd" }, { value: "periodic", label: "Ontwikkeling" }] as const).map((option) => (
              <button key={option.value} type="button" aria-pressed={kind === option.value} onClick={() => setKind(option.value)} className={`min-h-12 rounded-xl px-3 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green ${kind === option.value ? "bg-white text-dia-green shadow-sm" : "text-stone-500 hover:text-stone-900"}`}>
                {option.label}
              </button>
            ))}
          </div>

          <CoachFeedbackEditor
            key={`${player.id}:${kind}:${kind === "match" ? matchId : "periodic"}`}
            feedback={feedback}
            kind={kind}
            matchId={matchId}
            matchLabel={`${profile.teamName} · ${match.opponent}`}
            player={player}
            onCommand={onCommand}
          />
        </section>

        <CoachModeration state={state} matchId={matchId} onCommand={onCommand} />
      </div>
    </div>
  );
}

interface CoachFeedbackEditorProps {
  feedback: CoachFeedback | undefined;
  kind: CoachFeedback["kind"];
  matchId: string;
  matchLabel: string;
  player: DemoPlayer;
  onCommand: CommandHandler;
}

function CoachFeedbackEditor({ feedback, kind, matchId, matchLabel, player, onCommand }: CoachFeedbackEditorProps) {
  const [content, setContent] = useState<FeedbackContent>(() => feedback?.draft ?? emptyFeedback());
  const [message, setMessage] = useState("");
  const inputId = useId();
  const dirty = !sameContent(content, feedback?.draft ?? emptyFeedback());
  const publishedIsCurrent = Boolean(feedback?.published && sameContent(feedback.draft, feedback.published));
  const canPublish = Boolean(feedback && !dirty && !publishedIsCurrent && content.compliment.trim() && content.nextStep.trim());

  function saveDraft() {
    const normalized = { ...content, compliment: content.compliment.trim(), nextStep: content.nextStep.trim() };
    if (onCommand({ type: "saveFeedback", playerId: player.id, kind, ...(kind === "match" ? { matchId } : {}), content: normalized })) {
      setContent(normalized);
      setMessage("Concept bewaard. Je kunt het nu publiceren zodra je klaar bent.");
    } else {
      setMessage("Het concept kon niet worden bewaard. Controleer je invoer en probeer opnieuw.");
    }
  }

  function publish() {
    if (!canPublish || !feedback) return;
    setMessage(onCommand({ type: "publishFeedback", feedbackId: feedback.id })
      ? `Gepubliceerd voor ${player.name} en de gekoppelde ouders.`
      : "Publiceren is niet gelukt. Vul een compliment en een oefenpunt in en bewaar je concept.");
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); saveDraft(); }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-stone-900">{kind === "match" ? "Even terugkijken" : "Groei over de afgelopen weken"}</h3>
          <p className="mt-1 text-sm text-stone-500">{kind === "match" ? matchLabel : "Geef per onderdeel aan wat je nu ziet."}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${publishedIsCurrent && !dirty ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {dirty ? "Niet opgeslagen" : publishedIsCurrent ? "Gepubliceerd" : feedback ? "Concept bewaard" : "Nieuw concept"}
        </span>
      </div>

      <div>
        <label htmlFor={`${inputId}-compliment`} className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800"><Sparkles aria-hidden="true" className="h-4 w-4 text-dia-green" />Dit ging goed</label>
        <textarea id={`${inputId}-compliment`} rows={3} maxLength={600} value={content.compliment} onChange={(event) => { setContent({ ...content, compliment: event.target.value }); setMessage(""); }} placeholder="Bijvoorbeeld: je keek goed waar je teamgenoot vrij stond." className={`${inputClass} resize-y`} />
      </div>

      <div>
        <label htmlFor={`${inputId}-next-step`} className="mb-2 block text-sm font-bold text-stone-800">Jouw volgende stap</label>
        <textarea id={`${inputId}-next-step`} rows={3} maxLength={600} value={content.nextStep} onChange={(event) => { setContent({ ...content, nextStep: event.target.value }); setMessage(""); }} placeholder="Bijvoorbeeld: kijk vóór je de bal krijgt even over je schouder." className={`${inputClass} resize-y`} />
      </div>

      {kind === "periodic" && (
        <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4">
          <legend className="px-2 text-sm font-bold text-stone-800">Vijf kwaliteiten</legend>
          {SKILLS.map((skill) => (
            <div key={skill} className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
              <label htmlFor={`${inputId}-${skill}`} className="text-sm font-medium text-stone-700">{skillLabels[skill]}</label>
              <select id={`${inputId}-${skill}`} className={inputClass} value={content.skills[skill]} onChange={(event) => {
                const level = SKILL_LEVELS.find((candidate) => candidate === event.target.value);
                if (level) {
                  setContent({ ...content, skills: { ...content.skills, [skill]: level } });
                  setMessage("");
                }
              }}>
                {SKILL_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
          ))}
        </fieldset>
      )}

      <div className="rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">
        <div className="flex items-start gap-2"><Eye aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>Na publicatie zichtbaar voor {player.name} en de gekoppelde ouders.</p></div>
        {dirty ? <p className="mt-2 font-medium text-amber-800">Bewaar je wijzigingen voordat je wisselt of publiceert.</p> : null}
        {feedback?.published && (!publishedIsCurrent || dirty) ? <p className="mt-2">De eerder gepubliceerde versie blijft zichtbaar totdat je opnieuw publiceert.</p> : null}
        {!content.compliment.trim() || !content.nextStep.trim() ? <p className="mt-2">Vul een compliment én een oefenpunt in om te publiceren. Een concept mag nog onvolledig zijn.</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={Boolean(feedback) && !dirty} className={secondaryButtonClass}><Save aria-hidden="true" className="h-4 w-4" />Concept bewaren</button>
        <button type="button" disabled={!canPublish} onClick={publish} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-dia-green px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-45"><Send aria-hidden="true" className="h-4 w-4" />{feedback?.published ? "Opnieuw publiceren" : "Publiceren"}</button>
      </div>
      <p role="status" className="text-sm font-medium text-dia-green">{message}</p>

      {feedback?.published && (!publishedIsCurrent || dirty) ? (
        <div className="space-y-2 border-t border-stone-100 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Nu zichtbaar voor speler en ouders</p>
          <p className="whitespace-pre-wrap break-words text-sm text-stone-700">{feedback.published.compliment}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-stone-500">Volgende stap: {feedback.published.nextStep}</p>
        </div>
      ) : null}
    </form>
  );
}

function CoachModeration({ state, matchId, onCommand }: CoachWorkspaceProps) {
  const [message, setMessage] = useState("");
  const match = state.matches.find((candidate) => candidate.id === matchId);
  const pending = state.highlights.filter((highlight) => highlight.matchId === matchId && highlight.status === "pending");
  const canReview = match?.phase === "preparing";

  return (
    <aside className="min-w-0 space-y-4 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="coach-proposals-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="mb-3 inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-700"><HeartHandshake aria-hidden="true" className="h-5 w-5" /></span>
          <h3 id="coach-proposals-title" className="text-lg font-black text-stone-900">Voorgedragen momenten</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">Spelers zien mooie dingen bij elkaar. Geef hun voorstellen een plek bij de wedstrijd.</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold text-stone-600">{pending.length}</span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl bg-stone-50 px-4 py-6 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-dia-green" />
          <p className="font-bold text-stone-800">Alles bijgewerkt</p>
          <p className="mt-1 text-sm text-stone-500">Er wachten geen voorstellen voor deze wedstrijd.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {!canReview ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">De kandidaten staan al vast. Deze voorstellen kunnen niet meer meedoen.</p> : null}
          {pending.map((highlight) => {
            const player = state.players.find((candidate) => candidate.id === highlight.playerId);
            const author = state.players.find((candidate) => candidate.id === highlight.submittedBy);
            return (
              <article key={highlight.id} className="rounded-2xl border border-stone-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-dia-green">{highlight.category}{highlight.minute !== undefined ? ` · ${highlight.minute}e minuut` : ""}</p>
                <h4 className="mt-2 font-bold text-stone-900">{player?.name ?? "Teamgenoot"}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{highlight.description}</p>
                <p className="mt-3 text-xs text-stone-500">Voorgedragen door {author?.name ?? "een teamgenoot"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" disabled={!canReview} aria-label={`Goedkeuren: ${highlight.description}`} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-2 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-45" onClick={() => setMessage(onCommand({ type: "reviewHighlight", highlightId: highlight.id, approved: true }) ? "Moment goedgekeurd en toegevoegd aan de wedstrijd." : "Goedkeuren is niet gelukt. Controleer of de stemming nog niet is geopend.")}><Check aria-hidden="true" className="h-4 w-4" />Goedkeuren</button>
                  <button type="button" disabled={!canReview} aria-label={`Afwijzen: ${highlight.description}`} className={`${secondaryButtonClass} px-2`} onClick={() => setMessage(onCommand({ type: "reviewHighlight", highlightId: highlight.id, approved: false }) ? "Voorstel afgewezen. Het verschijnt niet bij de wedstrijd." : "Afwijzen is niet gelukt. Controleer of de stemming nog niet is geopend.")}><X aria-hidden="true" className="h-4 w-4" />Afwijzen</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p role="status" className="text-sm text-dia-green">{message}</p>
    </aside>
  );
}
