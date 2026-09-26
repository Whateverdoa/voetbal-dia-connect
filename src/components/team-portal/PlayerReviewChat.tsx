"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReviewDictation } from "@/hooks/useReviewDictation";
import { getPlayerReviewProgress, type PlayerReview } from "@/lib/team-portal/playerReview";
import {
  emptyReviewInterview,
  isInterviewReply,
  MAX_INTERVIEW_FOLLOW_UPS,
  MAX_INTERVIEW_INPUT_LENGTH,
  MAX_INTERVIEW_MESSAGES,
  MAX_INTERVIEW_TOTAL_LENGTH,
  type ReviewInterviewDraft,
} from "@/lib/team-portal/reviewInterview";
import { PlayerReviewReportView } from "./PlayerReviewForm";

const buttonClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-45";
const neutralButtonClass = `${buttonClass} border-stone-200 bg-white text-stone-700 hover:bg-stone-50`;
const primaryButtonClass = `${buttonClass} border-dia-green bg-dia-green text-white hover:bg-emerald-800`;
const recordingButtonClass = `${buttonClass} border-red-200 bg-red-50 text-red-800 hover:bg-red-100`;
const adoptionButtonClass = `${buttonClass} border-dia-green bg-white text-dia-green hover:bg-emerald-50`;

export interface PlayerReviewChatProps {
  player: { id: string; name: string; position?: string };
  value: ReviewInterviewDraft;
  onChange: (value: ReviewInterviewDraft) => void;
  answers: PlayerReview;
  onApply: (review: PlayerReview) => void;
  onBusyChange?: (busy: boolean) => void;
}

class InterviewRequestError extends Error {}

function responseError(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error : null;
}

export function PlayerReviewChat(props: PlayerReviewChatProps) {
  return <PlayerReviewChatSession key={props.player.id} {...props} />;
}

function PlayerReviewChatSession({ player, value, onChange, answers, onApply, onBusyChange }: PlayerReviewChatProps) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adopted, setAdopted] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const requestNumberRef = useRef(0);
  const transcriptValueRef = useRef(value);
  const stopDictationRef = useRef<(() => void) | null>(null);

  useEffect(() => { transcriptValueRef.current = value; }, [value]);

  const dictation = useReviewDictation({
    onTranscript: (text: string) => {
      const transcript = text.trim();
      if (!transcript || requestRef.current) return;
      const current = transcriptValueRef.current;
      const input = [current.input.trimEnd(), transcript].filter(Boolean).join(" ");
      if (input.length >= MAX_INTERVIEW_INPUT_LENGTH) {
        stopDictationRef.current?.();
        setError(`Het tekstvak bevat maximaal ${MAX_INTERVIEW_INPUT_LENGTH} tekens. Dicteren is gestopt. Controleer de laatste woorden en verstuur dit deel eerst.`);
      }
      const next = { ...current, input: input.slice(0, MAX_INTERVIEW_INPUT_LENGTH), proposal: null };
      // Recognition can emit several final results before React renders again.
      transcriptValueRef.current = next;
      onChange(next);
      setAdopted(false);
    },
  });

  useEffect(() => { stopDictationRef.current = dictation.stop; }, [dictation.stop]);

  useEffect(() => {
    onBusyChange?.(pending || dictation.listening);
    return () => onBusyChange?.(false);
  }, [pending, dictation.listening, onBusyChange]);

  useEffect(() => {
    return () => {
      requestNumberRef.current += 1;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  const busy = pending || dictation.listening;
  const hasConversation = value.messages.length > 0;
  const hasInput = value.input.trim().length > 0;
  const hasRoom = value.messages.length < MAX_INTERVIEW_MESSAGES - 1;
  const canFinish = hasRoom && (hasConversation || hasInput);
  const proposalReady = value.proposal !== null && getPlayerReviewProgress(value.proposal).status === "ready";
  const canReset = hasConversation || hasInput || value.proposal !== null;
  const firstName = player.name.trim().split(/\s+/)[0] || "de speler";

  async function send(finish = false, skip = false) {
    if (requestRef.current || busy || !hasRoom) return;
    const input = skip ? "Dit heb ik niet goed kunnen zien." : value.input.trim();
    if (!input && (!finish || !hasConversation)) return;
    const snapshot = value;
    const messages: ReviewInterviewDraft["messages"] = input
      ? [...snapshot.messages, { role: "user", content: input }]
      : [...snapshot.messages];
    // Reserve room for the response so the complete transcript remains persistable.
    if (messages.reduce((total, message) => total + message.content.length, 0) > MAX_INTERVIEW_TOTAL_LENGTH - 2102) {
      setError("Dit gesprek is te lang om verder te sturen. Verkort je laatste antwoord of begin een nieuw gesprek. Je tekst blijft staan.");
      return;
    }
    const controller = new AbortController();
    const requestNumber = ++requestNumberRef.current;
    requestRef.current = controller;
    setPending(true);
    setError(null);
    setAdopted(false);
    try {
      const response = await fetch("/demo/teamportaal/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          currentAnswers: answers,
          followUpCount: snapshot.followUpCount,
          finish: finish || snapshot.followUpCount >= MAX_INTERVIEW_FOLLOW_UPS,
          playerName: firstName,
          position: player.position ?? "",
        }),
      });
      const result: unknown = await response.json();
      if (controller.signal.aborted || requestNumberRef.current !== requestNumber) return;
      if (!response.ok) throw new InterviewRequestError(responseError(result) ?? "De assistent is nu niet bereikbaar. Probeer het opnieuw; je tekst blijft staan.");
      if (!isInterviewReply(result) || ((finish || snapshot.followUpCount >= MAX_INTERVIEW_FOLLOW_UPS) && result.question !== null)) {
        throw new InterviewRequestError("Het antwoord van de assistent kon niet worden verwerkt. Je tekst blijft staan; probeer het opnieuw.");
      }
      const assistantText = [result.message.trim(), result.question?.trim()].filter(Boolean).join("\n\n");
      if (!assistantText && !result.review) throw new InterviewRequestError("De assistent gaf geen antwoord. Probeer het opnieuw; je tekst blijft staan.");
      onChange({
        ...snapshot,
        messages: assistantText ? [...messages, { role: "assistant", content: assistantText }] : messages,
        input: "",
        followUpCount: snapshot.followUpCount + (result.question ? 1 : 0),
        proposal: result.review,
      });
    } catch (failure) {
      if (controller.signal.aborted || requestNumberRef.current !== requestNumber) return;
      setError(failure instanceof InterviewRequestError ? failure.message : "De assistent is nu niet bereikbaar. Je tekst blijft staan; probeer het opnieuw.");
    } finally {
      if (requestNumberRef.current === requestNumber) {
        requestRef.current = null;
        setPending(false);
      }
    }
  }

  function resetConversation() {
    if (busy) return;
    if (canReset && !window.confirm("Dit gesprek wissen en opnieuw beginnen? Het ingevulde beoordelingsformulier blijft bewaard.")) return;
    onChange(emptyReviewInterview());
    setError(null);
    setAdopted(false);
  }

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dia-green">Nabespreken met de assistent</p>
        <h3 id={`${id}-title`} className="mt-1 text-xl font-black text-stone-900">Vertel over {player.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">Vertel in je eigen woorden wat je deze wedstrijd zag. De assistent stelt maximaal drie vervolgvragen en helpt je er een kort verslag van te maken. Wat je niet zag, blijft onbekend.</p>
      </div>

      <div role="log" aria-label={`Gesprek over ${player.name}`} aria-live="polite" aria-relevant="additions" className="space-y-3">
        <div className="rounded-2xl rounded-tl-sm bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-dia-green">Assistent</p>
          <p>Wat herinner je je van {firstName} in deze wedstrijd? Noem gerust meerdere momenten, ook als je verhaal nog niet op volgorde staat.</p>
        </div>
        {value.messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={`min-w-0 rounded-2xl p-4 text-sm leading-relaxed ${message.role === "user" ? "ml-4 rounded-tr-sm border border-stone-200 bg-white text-stone-800" : "mr-4 rounded-tl-sm bg-emerald-50 text-emerald-950"}`}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide">{message.role === "user" ? "Jij" : "Assistent"}</p>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ))}
      </div>

      {pending && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700">De assistent leest je verhaal…</p>}
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <label htmlFor={`${id}-input`} className="block font-bold text-stone-900">{hasConversation ? "Jouw antwoord of aanvulling" : "Jouw verhaal"}</label>
        <textarea
          id={`${id}-input`}
          rows={6}
          maxLength={MAX_INTERVIEW_INPUT_LENGTH}
          aria-describedby={`${id}-keyboard ${id}-dictation ${id}-provider`}
          value={value.input}
          disabled={pending || dictation.listening || !hasRoom}
          onChange={(event) => {
            onChange({ ...value, input: event.target.value, proposal: null });
            setAdopted(false);
          }}
          placeholder="Vertel of typ wat je je herinnert van deze speler…"
          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20 disabled:bg-stone-100 disabled:text-stone-500"
        />
        <p id={`${id}-keyboard`} className="text-sm leading-relaxed text-stone-600">Op je telefoon: tik in het tekstvak en gebruik de microfoon van je toetsenbord. Verstuur daarna je tekst naar de assistent.</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {dictation.supported ? (
            <button type="button" disabled={pending || !hasRoom} onClick={dictation.listening ? dictation.stop : dictation.start} aria-pressed={dictation.listening} className={dictation.listening ? recordingButtonClass : neutralButtonClass}>
              <span aria-hidden="true">{dictation.listening ? "■" : "🎙"}</span>{dictation.listening ? "Stop dicteren" : "Dicteer je verhaal"}
            </button>
          ) : <p className="text-sm text-stone-600">Je browser ondersteunt hier geen dicteren. Gebruik de microfoon van je toetsenbord of typ je verhaal.</p>}
          <span className="text-xs tabular-nums text-stone-500">{value.input.length}/{MAX_INTERVIEW_INPUT_LENGTH}</span>
        </div>
        <p id={`${id}-dictation`} className="text-xs leading-relaxed text-stone-500">Bij dicteren kan je browser een spraakdienst gebruiken om audio in tekst om te zetten. Controleer de tekst; deze wordt niet automatisch naar de assistent verstuurd.</p>
        {dictation.listening && <p role="status" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">Microfoon aan. Vertel rustig en druk daarna op ‘Stop dicteren’.{dictation.interim && <span className="mt-2 block whitespace-pre-wrap break-words">{dictation.interim}</span>}</p>}
        {dictation.error && <p role="alert" className="text-sm text-red-700">{dictation.error}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p id={`${id}-provider`} className="text-sm leading-relaxed text-stone-600">Met ‘Vertel aan de assistent’, ‘Niet goed gezien’ of ‘Maak nu een concept’ stuur je dit gesprek en de huidige formulierantwoorden naar Claude (Anthropic). Controleer zelf het resultaat voordat je het overneemt.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !hasInput || !hasRoom} onClick={() => { void send(); }} className={primaryButtonClass}>Vertel aan de assistent</button>
          {hasConversation && value.followUpCount > 0 && !value.proposal && <button type="button" disabled={busy || hasInput || !hasRoom} onClick={() => { void send(false, true); }} className={neutralButtonClass}>Niet goed gezien</button>}
          <button type="button" disabled={busy || !canFinish} onClick={() => { void send(true); }} className={neutralButtonClass}>Maak nu een concept</button>
        </div>
        <p className="text-xs text-stone-500">{value.followUpCount} van maximaal {MAX_INTERVIEW_FOLLOW_UPS} vervolgvragen gesteld.{value.followUpCount >= MAX_INTERVIEW_FOLLOW_UPS ? " Je volgende antwoord wordt meteen verwerkt tot een concept." : " Je kunt ook meteen een concept laten maken."}</p>
        {!hasRoom && <p className="text-sm text-stone-600">Dit gesprek heeft zijn maximale lengte bereikt. Neem het concept over of begin een nieuw gesprek.</p>}
      </div>

      {value.proposal && (
        <section aria-labelledby={`${id}-proposal`} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
          <h4 id={`${id}-proposal`} className="text-lg font-bold text-stone-900">Voorstel voor het spelersverslag</h4>
          {proposalReady ? <PlayerReviewReportView review={value.proposal} /> : <p className="text-sm leading-relaxed text-stone-600">Er zijn nog onvoldoende concrete observaties voor een verslag. Je kunt het voorstel overnemen als onvolledig concept en later aanvullen. Niet geobserveerde onderdelen blijven onbekend.</p>}
          <p className="text-sm leading-relaxed text-stone-600">Lees na of dit klopt met wat jij zag. Overnemen vervangt de huidige formulierantwoorden; bewaren en delen doe je daarna zelf.</p>
          <button type="button" disabled={busy || adopted} onClick={() => { if (value.proposal) { onApply(value.proposal); setAdopted(true); } }} className={adoptionButtonClass}>Neem over als concept</button>
          {adopted && <p role="status" className="text-sm font-medium text-dia-green">Overgenomen in het formulier. Controleer het concept en bewaar het daar.</p>}
        </section>
      )}
      <button type="button" disabled={busy || !canReset} onClick={resetConversation} className={neutralButtonClass}>Nieuw gesprek</button>
    </section>
  );
}
