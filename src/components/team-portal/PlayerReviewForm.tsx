"use client";

import { useId, useState } from "react";
import {
  buildPlayerReviewReport,
  getPlayerReviewProgress,
  MAX_PLAYER_REVIEW_ANSWER_LENGTH,
  PLAYER_REVIEW_QUESTIONS,
  type PlayerReview,
  type PlayerReviewQuestionId,
} from "@/lib/team-portal/playerReview";

const buttonClass = "inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:cursor-not-allowed disabled:opacity-45";
const inputClass = "w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20 disabled:bg-stone-100 disabled:text-stone-500";

export interface PlayerReviewFormProps {
  player: { id: string; name: string; number?: number };
  answers: PlayerReview;
  onChange: (answers: PlayerReview) => void;
  onSave: () => void;
  onPublish?: () => void;
  saveDisabled?: boolean;
  publishDisabled?: boolean;
  publishLabel?: string;
  recordedMoments?: { id: string; label: string; text: string }[];
  minutesPlayed?: number | null;
  storageNote?: string;
}

export function PlayerReviewForm({
  player,
  answers,
  onChange,
  onSave,
  onPublish,
  saveDisabled = false,
  publishDisabled = false,
  publishLabel = "Verslag delen",
  recordedMoments = [],
  minutesPlayed,
  storageNote,
}: PlayerReviewFormProps) {
  const inputId = useId();
  const [showExtraQuestions, setShowExtraQuestions] = useState(() =>
    [answers.onBall, answers.offBall].some((answer) => answer.text.trim() || answer.notObserved),
  );
  const [showPreview, setShowPreview] = useState(false);
  const [reviewedSignature, setReviewedSignature] = useState<string | null>(null);
  const signature = JSON.stringify({ playerId: player.id, answers });
  const reviewed = reviewedSignature === signature;
  const progress = getPlayerReviewProgress(answers);
  const report = buildPlayerReviewReport(answers);
  const canPreview = progress.status === "ready" && report !== null;
  const hasErrors = Object.keys(progress.errors).length > 0;
  const hasMinutes = typeof minutesPlayed === "number" && Number.isFinite(minutesPlayed) && minutesPlayed >= 0;

  function updateAnswer(questionId: PlayerReviewQuestionId, patch: Partial<PlayerReview[PlayerReviewQuestionId]>) {
    setReviewedSignature(null);
    onChange({ ...answers, [questionId]: { ...answers[questionId], ...patch } });
  }

  function renderQuestion(question: (typeof PLAYER_REVIEW_QUESTIONS)[number], index: number) {
    const answer = answers[question.id];
    const questionInputId = `${inputId}-${question.id}`;
    const error = progress.errors[question.id];
    return (
      <fieldset key={question.id} className="min-w-0 rounded-2xl border border-stone-200 p-4 sm:p-5">
        <legend id={`${questionInputId}-label`} className="max-w-full px-1 text-base font-bold text-stone-900">
          <span aria-hidden="true" className="mr-2 text-dia-green">{index + 1}.</span>{question.label}
        </legend>
        <p id={`${questionInputId}-hint`} className="mb-3 text-sm leading-relaxed text-stone-600">{question.hint}</p>
        <textarea
          id={questionInputId}
          aria-labelledby={`${questionInputId}-label`}
          aria-describedby={`${questionInputId}-hint${error ? ` ${questionInputId}-error` : ""}`}
          aria-invalid={Boolean(error)}
          rows={3}
          maxLength={MAX_PLAYER_REVIEW_ANSWER_LENGTH}
          value={answer.text}
          disabled={answer.notObserved}
          onChange={(event) => updateAnswer(question.id, { text: event.target.value })}
          placeholder="Schrijf op wat je zag en in welk moment."
          className={`${inputClass} resize-y`}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={answer.notObserved}
              aria-label={`${question.label}: niet goed kunnen zien`}
              onChange={(event) => updateAnswer(question.id, { notObserved: event.target.checked })}
              className="h-5 w-5 rounded accent-dia-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green"
            />
            Niet goed kunnen zien
          </label>
          <span className="text-xs tabular-nums text-stone-500">{answer.text.length}/{MAX_PLAYER_REVIEW_ANSWER_LENGTH}</span>
        </div>
        {answer.notObserved && <p className="mt-1 text-sm text-stone-500">Dit onderdeel wordt niet als observatie in het verslag opgenomen.</p>}
        {error && <p id={`${questionInputId}-error`} role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      </fieldset>
    );
  }

  return (
    <form
      aria-labelledby={`${inputId}-title`}
      className="space-y-5"
      onSubmit={(event) => { event.preventDefault(); if (!hasErrors && !saveDisabled) onSave(); }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dia-green">Na de wedstrijd</p>
        <h3 id={`${inputId}-title`} className="mt-1 text-xl font-black text-stone-900">Even terugkijken met {player.name}{player.number !== undefined && <span className="ml-2 text-base font-medium text-stone-500">#{player.number}</span>}</h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">Denk terug aan concrete momenten. Bespreek ze samen en vul drie korte vragen in. Met twee extra vragen kun je verder kijken naar het spel met en zonder bal.</p>
      </div>

      {(recordedMoments.length > 0 || hasMinutes) && (
        <aside aria-labelledby={`${inputId}-memory`} className="rounded-2xl bg-stone-50 p-4">
          <h4 id={`${inputId}-memory`} className="font-bold text-stone-800">Terug naar de wedstrijd</h4>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Gebruik de registratie als geheugensteun. Beschrijf wat je zelf zag; de momenten en speeltijd zijn geen beoordeling.</p>
          {hasMinutes && <p className="mt-3 text-sm font-medium text-stone-700">Geregistreerde speeltijd: {new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(minutesPlayed)} min</p>}
          {recordedMoments.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label={`Geregistreerde momenten van ${player.name}`}>
              {recordedMoments.map((moment) => <li key={moment.id} className="break-words rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"><span className="font-bold text-dia-green">{moment.label}</span><p className="mt-1 whitespace-pre-wrap text-stone-700">{moment.text}</p></li>)}
            </ul>
          )}
        </aside>
      )}

      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status" aria-live="polite">
        <span className="font-bold">{progress.coreAnswered} van {progress.coreTotal} kernvragen ingevuld</span>
        <p className="mt-1">Iets niet goed gezien? Geef dat aan. Je hoeft niets in te vullen dat je niet weet.</p>
      </div>

      <div className="space-y-4">
        {PLAYER_REVIEW_QUESTIONS.filter((question) => question.required).map((question, index) => renderQuestion(question, index))}
      </div>

      <button type="button" aria-expanded={showExtraQuestions} aria-controls={`${inputId}-extras`} onClick={() => setShowExtraQuestions(!showExtraQuestions)} className={buttonClass}>
        {showExtraQuestions ? "Verberg de twee extra vragen" : "Twee extra vragen: met en zonder bal"}
      </button>
      <div id={`${inputId}-extras`} hidden={!showExtraQuestions} className="space-y-4">
        <p className="text-sm text-stone-500">Optioneel. Ingevulde antwoorden blijven bewaard wanneer je deze vragen verbergt.</p>
        {PLAYER_REVIEW_QUESTIONS.filter((question) => !question.required).map((question, index) => renderQuestion(question, index + 3))}
      </div>

      <div className="space-y-3 border-t border-stone-200 pt-5">
        {storageNote && <p className="text-sm leading-relaxed text-stone-600">{storageNote}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={hasErrors || saveDisabled} className={buttonClass}>Concept bewaren</button>
          <button type="button" disabled={!canPreview} aria-expanded={showPreview} aria-controls={`${inputId}-preview`} onClick={() => setShowPreview(true)} className={`${buttonClass} border-emerald-200 text-dia-green`}>Bekijk conceptverslag</button>
        </div>
        {!canPreview && <p className="text-sm text-stone-500">{progress.coreAnswered === progress.coreTotal && progress.observedCount === 0
          ? "Nog geen concrete observatie? Bewaar dit als concept. Voor een verslag is minstens één eigen observatie nodig."
          : hasErrors
            ? "Controleer de aangegeven antwoorden voordat je het conceptverslag bekijkt."
            : "Beantwoord eerst de drie kernvragen. Wat je niet zag, kun je aangeven met ‘Niet goed kunnen zien’. Voor een verslag is minstens één eigen observatie nodig."}</p>}
      </div>

      {showPreview && (
        <section id={`${inputId}-preview`} aria-labelledby={`${inputId}-preview-title`} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-dia-green">Voor {player.name}</p>
            <h4 id={`${inputId}-preview-title`} className="mt-1 text-lg font-bold text-stone-900">Conceptverslag om samen te bespreken</h4>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Lees je antwoorden hieronder na. Wil je iets veranderen? Pas het antwoord hierboven aan; het verslag verandert mee.</p>
          </div>
          {report && canPreview ? (
            <>
              <PlayerReviewReportView review={answers} />
              {onPublish && (
                <div className="space-y-3 border-t border-emerald-200 pt-4">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-stone-800">
                    <input type="checkbox" checked={reviewed} onChange={(event) => setReviewedSignature(event.target.checked ? signature : null)} className="h-5 w-5 shrink-0 accent-dia-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green" />
                    Ik heb het verslag nagelezen.
                  </label>
                  <button type="button" disabled={!reviewed || publishDisabled} onClick={() => { if (reviewed && canPreview && !publishDisabled) onPublish(); }} className={`${buttonClass} border-dia-green bg-dia-green text-white hover:bg-emerald-800`}>{publishLabel}</button>
                </div>
              )}
            </>
          ) : <p className="text-sm text-stone-600">Het concept is nog niet compleet. Vul de ontbrekende kernvragen aan om je verslag terug te zien.</p>}
        </section>
      )}
    </form>
  );
}

export function PlayerReviewReportView({ review }: { review: PlayerReview }) {
  const report = buildPlayerReviewReport(review);
  if (!report) return null;

  return (
    <div className="space-y-4">
      {report.sections.map((section) => <div key={section.questionId}><p className="text-sm font-bold text-stone-900">{section.heading}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">{section.text}</p></div>)}
      {report.observationNote && <p className="rounded-xl bg-white p-3 text-sm leading-relaxed text-stone-600">{report.observationNote}</p>}
    </div>
  );
}
