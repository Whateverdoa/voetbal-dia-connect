"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { AfterMatchReport } from "@/lib/team-portal/matchReport";
import { buildPlayerReviewReport, emptyPlayerReview, getPlayerReviewProgress, type PlayerReview } from "@/lib/team-portal/playerReview";
import { emptyReviewInterview, type ReviewInterviewDraft } from "@/lib/team-portal/reviewInterview";
import { PlayerReviewForm, PlayerReviewReportView } from "./PlayerReviewForm";
import { PlayerReviewChat } from "./PlayerReviewChat";

type SavedReview = FunctionReturnType<typeof api.playerMatchReviews.listForMatch>[number];
type Player = AfterMatchReport["players"][number];
const buttonClass = "min-h-12 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:opacity-50";
const same = (left: PlayerReview, right: PlayerReview) => JSON.stringify(left) === JSON.stringify(right);
const sameReport = (left: PlayerReview, right: PlayerReview) => JSON.stringify(buildPlayerReviewReport(left)) === JSON.stringify(buildPlayerReviewReport(right));

export function ConnectedPlayerReviews(props: { report: AfterMatchReport; matchId: Id<"matches">; participantIds?: string[]; onDirtyChange: (dirty: boolean) => void }) {
  return <ReviewBoundary key={props.matchId}><ReviewList {...props} /></ReviewBoundary>;
}

function ReviewList({ report, matchId, participantIds, onDirtyChange }: { report: AfterMatchReport; matchId: Id<"matches">; participantIds?: string[]; onDirtyChange: (dirty: boolean) => void }) {
  const reviews = useQuery(api.playerMatchReviews.listForMatch, { matchId });
  const players = report.players.filter((player) => participantIds === undefined || participantIds.includes(player.playerId));
  const [selectedId, setSelectedId] = useState(players[0]?.playerId ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [interviews, setInterviews] = useState<Record<string, ReviewInterviewDraft>>({});
  const player = players.find((candidate) => candidate.playerId === selectedId) ?? players[0];
  const hasConversation = Object.values(interviews).some((draft) => draft.input.trim() || draft.messages.length || draft.proposal);
  const hasUnsavedWork = dirty || hasConversation || busy;
  useEffect(() => { onDirtyChange(hasUnsavedWork); return () => onDirtyChange(false); }, [hasUnsavedWork, onDirtyChange]);
  useEffect(() => {
    if (!hasUnsavedWork) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedWork]);

  function choose(id: string) {
    if (id === player?.playerId || busy) return;
    if (dirty && !window.confirm("Je antwoorden zijn nog niet bewaard. Wil je deze wijzigingen verlaten?")) return;
    setDirty(false);
    setSelectedId(id);
  }

  if (reviews === undefined) return <p role="status" className="rounded-3xl bg-white p-6">Je spelerformulieren laden…</p>;
  if (!player) return <p className="rounded-3xl bg-white p-6">Er zijn geen geregistreerde spelers waarvoor een formulier kan worden klaargezet.</p>;
  const record = reviews.find((review) => review.playerId === player.playerId);
  return <section className="space-y-5 rounded-3xl border border-emerald-200 bg-white p-5 sm:p-7" aria-labelledby="real-player-review-title">
    <div><p className="text-xs font-bold uppercase tracking-widest text-dia-green">Jouw nabespreking</p><h2 id="real-player-review-title" className="mt-2 text-2xl font-black">Drie vragen per speler</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">Wat herinner je je van hun acties? Pak de geregistreerde momenten erbij, bespreek wat je zag en maak een persoonlijk verslag. Twee extra vragen gaan dieper in op spelen met en zonder bal.</p></div>
    <p className="text-sm font-bold text-dia-green">{reviews.filter((review) => review.finalized && players.some((candidate) => candidate.playerId === review.playerId)).length} van {players.length} verslagen vastgelegd</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Spelerformulieren">
      {players.map((candidate) => {
        const saved = reviews.find((review) => review.playerId === candidate.playerId);
        const status = saved?.finalized && sameReport(saved.draft, saved.finalized) ? "Vastgelegd" : saved ? getPlayerReviewProgress(saved.draft).status === "ready" ? "Klaar voor verslag" : "Concept" : "Nog te bespreken";
        return <button type="button" key={candidate.playerId} disabled={busy} aria-pressed={candidate.playerId === player.playerId} onClick={() => choose(candidate.playerId)} className={`${buttonClass} text-left ${candidate.playerId === player.playerId ? "border-dia-green bg-emerald-50" : ""}`}><span className="block">{candidate.name}</span><span className="mt-1 block text-xs font-normal text-stone-500">{candidate.playerId === player.playerId && dirty ? "Niet bewaard" : status}</span></button>;
      })}
    </div>
    <ReviewEditor key={player.playerId} player={player} report={report} matchId={matchId} record={record} interview={interviews[player.playerId] ?? emptyReviewInterview()} onInterviewChange={(draft) => setInterviews((previous) => ({ ...previous, [player.playerId]: draft }))} onDirtyChange={setDirty} onBusyChange={setBusy} onNext={players.indexOf(player) < players.length - 1 ? () => { setDirty(false); setSelectedId(players[players.indexOf(player) + 1].playerId); } : undefined} />
  </section>;
}

function ReviewEditor({ player, report, matchId, record, interview, onInterviewChange, onDirtyChange, onBusyChange, onNext }: { player: Player; report: AfterMatchReport; matchId: Id<"matches">; record?: SavedReview; interview: ReviewInterviewDraft; onInterviewChange: (draft: ReviewInterviewDraft) => void; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onNext?: () => void }) {
  const saveDraft = useMutation(api.playerMatchReviews.saveDraft);
  const finalize = useMutation(api.playerMatchReviews.finalize);
  const [buffer, setBuffer] = useState<{ answers: PlayerReview; revision: number | null } | null>(null);
  const [acknowledged, setAcknowledged] = useState<SavedReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [mode, setMode] = useState<"chat" | "form">(() => process.env.NODE_ENV === "development" ? "chat" : "form");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const saved = acknowledged && (!record || acknowledged.revision > record.revision) ? acknowledged : record;
  const answers = buffer?.answers ?? saved?.draft ?? emptyPlayerReview();
  const dirty = Boolean(buffer && !same(buffer.answers, saved?.draft ?? emptyPlayerReview()));
  const finalizedIsCurrent = Boolean(saved?.finalized && sameReport(answers, saved.finalized));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy || chatBusy); return () => onBusyChange(false); }, [busy, chatBusy, onBusyChange]);

  function updateAnswers(value: PlayerReview) {
    setBuffer((previous) => ({ answers: value, revision: previous ? previous.revision : saved?.revision ?? null }));
    setMessage("");
  }

  function failure(error: unknown) {
    const data: unknown = error instanceof ConvexError ? error.data : null;
    const isConflict = typeof data === "object" && data !== null && "code" in data && data.code === "CONFLICT";
    setConflict(isConflict);
    setMessage(isConflict ? "Dit concept is op een ander scherm gewijzigd. Je antwoorden blijven hier staan. Neem ze over voordat je de opgeslagen versie laadt." : "Bewaren is niet gelukt. Je antwoorden blijven in het formulier. Controleer je verbinding en teamtoegang en probeer opnieuw.");
  }

  async function save(): Promise<boolean> {
    if (busy || chatBusy) return false;
    if (saved && !dirty) return true;
    setBusy(true);
    setMessage("");
    try {
      const result = await saveDraft({ matchId, playerId: player.playerId as Id<"players">, answers, expectedRevision: buffer ? buffer.revision : saved?.revision ?? null });
      setAcknowledged(result);
      setBuffer(null);
      setConflict(false);
      setMessage("Concept opgeslagen bij deze wedstrijd. Je kunt later verdergaan.");
      return true;
    } catch (error) { failure(error); return false; }
    finally { setBusy(false); }
  }

  async function finish() {
    if (!saved || busy || chatBusy || dirty || finalizedIsCurrent) return;
    setBusy(true);
    try {
      const result = await finalize({ matchId, playerId: player.playerId as Id<"players">, expectedRevision: saved.revision });
      setAcknowledged(result);
      setMessage("Spelerverslag vastgelegd. Het is opgeslagen bij deze wedstrijd in jouw coachaccount.");
      setConflict(false);
    } catch (error) { failure(error); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5 border-t border-stone-200 pt-6">
    <p className="rounded-xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">Deze antwoorden en verslagen zijn alleen toegankelijk met jouw coachaccount. Ouders, spelers en andere stafleden krijgen nog geen toegang. Bewaar je antwoorden voordat je de wedstrijd of pagina verlaat.</p>
    {process.env.NODE_ENV === "development" ? <div className="flex gap-2" role="group" aria-label="Manier van nabespreken">
      {([{ id: "chat", label: "Gesprek" }, { id: "form", label: "Formulier" }] as const).map((option) => <button key={option.id} type="button" disabled={busy || chatBusy} aria-pressed={mode === option.id} onClick={() => setMode(option.id)} className={`${buttonClass} ${mode === option.id ? "border-dia-green bg-emerald-50 text-dia-green" : ""}`}>{option.label}</button>)}
    </div> : null}
    <fieldset disabled={busy} className="min-w-0">
      <legend className="sr-only">Spelerverslag voor {player.name}</legend>
      {process.env.NODE_ENV === "development" && mode === "chat" ? <>
        <PlayerReviewChat player={{ id: player.playerId, name: player.name }} value={interview} onChange={onInterviewChange} answers={answers} onBusyChange={setChatBusy} onApply={(value) => { updateAnswers(value); setMode("form"); setMessage("Voorstel overgenomen in je concept. Controleer de antwoorden en bewaar ze bij deze wedstrijd."); }} />
        <p className="mt-4 text-sm leading-relaxed text-stone-500">Het gesprek blijft alleen op dit scherm beschikbaar, ook als je een andere speler kiest. Bij herladen of een andere wedstrijd verdwijnt het gesprek. Neem het voorstel over en bewaar je antwoorden om ze bij de wedstrijd op te slaan.</p>
      </> : <PlayerReviewForm player={{ id: player.playerId, name: player.name, number: player.number }} answers={answers} onChange={updateAnswers} onSave={() => { void save(); }} saveDisabled={Boolean(saved) && !dirty} onPublish={() => { void finish(); }} publishDisabled={!saved || dirty || finalizedIsCurrent} publishLabel="Verslag vastleggen" minutesPlayed={player.minutesPlayed} recordedMoments={report.timeline.filter((moment) => moment.playerIds.includes(player.playerId)).map((moment) => ({ id: moment.id, label: moment.timeLabel, text: [moment.text, moment.detail, moment.note].filter(Boolean).join(" · ") }))} storageNote="Concepten worden in DIA Live bij deze wedstrijd en speler opgeslagen. Lees het conceptverslag na en leg het daarna vast." />}
    </fieldset>
    <p role="status" className="text-sm font-semibold text-dia-green">{busy ? "Opslaan…" : message}</p>
    {conflict ? <button type="button" className={buttonClass} onClick={() => { if (window.confirm("De niet bewaarde antwoorden in dit formulier vervangen door de opgeslagen versie?")) { setBuffer(null); setAcknowledged(null); setConflict(false); setMessage(""); } }}>Opgeslagen versie laden</button> : null}
    {onNext ? <button type="button" disabled={busy || chatBusy} className={buttonClass} onClick={() => { void save().then((ok) => { if (ok) onNext(); }); }}>Bewaar en volgende speler</button> : null}
    {saved?.finalized ? <section className="space-y-4 rounded-2xl bg-stone-50 p-5"><h3 className="font-bold">Vastgelegd spelersverslag</h3>{!finalizedIsCurrent ? <p className="text-sm text-stone-500">Je conceptwijzigingen zijn nog niet in dit vastgelegde verslag opgenomen.</p> : null}<PlayerReviewReportView review={saved.finalized} /></section> : null}
  </div>;
}

class ReviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-bold">Spelerformulieren niet beschikbaar</h2><p className="mt-2 text-sm leading-relaxed">De verbinding met de opslag kon niet worden gemaakt. De wedstrijdregistratie hieronder blijft beschikbaar. De nieuwe verslagfuncties moeten in deze omgeving zijn geactiveerd.</p><button className={`${buttonClass} mt-4`} type="button" onClick={() => this.setState({ failed: false })}>Opnieuw proberen</button></section>;
    return this.props.children;
  }
}
