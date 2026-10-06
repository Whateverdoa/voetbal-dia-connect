"use client";

import { useId, useState } from "react";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { emptyPlayerReview, getPlayerReviewProgress, type PlayerReview } from "@/lib/team-portal/playerReview";
import type { CommandHandler, DemoState } from "@/lib/team-portal/types";
import { getPlayerReviewPublication } from "@/lib/team-portal/playerReviewRules";
import { emptyReviewInterview } from "@/lib/team-portal/reviewInterview";
import { PlayerReviewForm } from "./PlayerReviewForm";
import { PlayerReviewChat } from "./PlayerReviewChat";
import { useDemoProfile } from "./DemoProfileContext";

const same = (left: PlayerReview, right: PlayerReview) => JSON.stringify(left) === JSON.stringify(right);

/** Records stay in the local demo. Remount this workspace for each match. */
export function PlayerReviewWorkspace({ state, matchId, onCommand }: { state: DemoState; matchId: string; onCommand: CommandHandler }) {
  const profile = useDemoProfile();
  const chatEnabled = process.env.NODE_ENV !== "production";
  const match = state.matches.find((candidate) => candidate.id === matchId);
  const players = state.players.filter((candidate) => match?.participantIds.includes(candidate.id));
  const [selectedId, setSelectedId] = useState(players[0]?.id ?? "");
  const [edits, setEdits] = useState<Record<string, PlayerReview>>({});
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"chat" | "form">(chatEnabled ? "chat" : "form");
  const [chatBusy, setChatBusy] = useState(false);
  const selectId = useId();
  const player = players.find((candidate) => candidate.id === selectedId) ?? players[0];
  const reviews = (state.playerReviews ?? []).filter((review) => review.matchId === matchId);
  if (!match || !player) return <p className="rounded-3xl bg-white p-6 text-stone-600">Voor deze wedstrijd zijn nog geen deelnemende spelers bekend.</p>;
  const record = reviews.find((review) => review.playerId === player.id);
  const answers = edits[player.id] ?? record?.draft ?? emptyPlayerReview();
  const dirty = !same(answers, record?.draft ?? emptyPlayerReview());
  const publishedIsCurrent = Boolean(record?.published && same(getPlayerReviewPublication(record.draft), record.published));
  const publishedCount = reviews.filter((review) => review.published).length;
  const interview = state.interviews?.find((item) => item.matchId === matchId && item.playerId === player.id)?.draft ?? emptyReviewInterview();

  function save(): boolean {
    if (chatBusy) return false;
    if (!dirty && record) return true;
    if (!onCommand({ type: "savePlayerReview", matchId, playerId: player.id, answers })) {
      setMessage("Bewaren lukte niet. Je antwoorden staan nog in het formulier.");
      return false;
    }
    setEdits((previous) => {
      const remaining = { ...previous };
      delete remaining[player.id];
      return remaining;
    });
    setMessage("Concept bewaard. Bekijk het verslag voordat je het deelt.");
    return true;
  }

  function selectPlayer(id: string) {
    if (chatBusy || id === player.id || (dirty && !save())) return;
    setSelectedId(id);
    setMessage("");
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7" aria-labelledby="player-review-workspace-title">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-dia-green"><ClipboardCheck size={18} aria-hidden="true" />Na de wedstrijd</p>
      <h2 id="player-review-workspace-title" className="mt-3 text-2xl font-black">Even stilstaan bij iedere speler</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">{chatEnabled ? "Vertel wat je je herinnert van deze speler. De gesprekshulp stelt zo nodig maximaal drie korte vervolgvragen en maakt een voorstel. Jij leest het na en kiest wat je bewaart of deelt." : "Vul per speler in wat je zelf hebt gezien. Drie korte vragen helpen je een persoonlijk verslag te maken. Jij leest het na en kiest wat je bewaart of deelt."}</p>
      <p className="mt-4 text-sm font-semibold text-dia-green">{publishedCount} van {players.length} spelersverslagen gedeeld · tegen {match.opponent}</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Nabespreking per speler">
        {players.map((candidate) => {
          const review = reviews.find((item) => item.playerId === candidate.id);
          const current = edits[candidate.id] ?? review?.draft ?? emptyPlayerReview();
          const progress = getPlayerReviewProgress(current);
          const shared = review?.published && same(getPlayerReviewPublication(current), review.published);
          const label = shared ? "Gedeeld" : progress.status === "ready" ? "Klaar om te delen" : progress.status === "draft" ? "Concept" : "Nog te bespreken";
          return <button key={candidate.id} type="button" disabled={chatBusy} aria-pressed={candidate.id === player.id} onClick={() => selectPlayer(candidate.id)} className={`min-h-16 rounded-xl border px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green disabled:opacity-50 ${candidate.id === player.id ? "border-dia-green bg-emerald-50" : "border-stone-200 hover:bg-stone-50"}`}><span className="block text-sm font-bold">{candidate.name} {candidate.number != null ? <span className="font-normal text-stone-500">#{candidate.number}</span> : null}</span><span className="mt-1 block text-xs text-stone-500">{label}</span></button>;
        })}
      </div>
    </section>
    <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
      <label htmlFor={selectId} className="mb-2 block text-sm font-bold">Speler voor nabespreking</label>
      <select id={selectId} value={player.id} disabled={chatBusy} onChange={(event) => selectPlayer(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-300 bg-white p-3 text-base focus-visible:outline-2 focus-visible:outline-dia-green disabled:opacity-50">{players.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}{candidate.number != null ? ` · #${candidate.number}` : ""}</option>)}</select>
      <p className="mt-3 text-sm text-stone-500">{dirty ? "Nog niet bewaard. Bij een andere speler kiezen bewaren we je concept." : publishedIsCurrent ? "Deze versie is gedeeld met de speler en gekoppelde ouders in de demo." : record ? "Concept bewaard. Alleen de coach ziet je antwoorden." : "Je formulier staat klaar. Begin met wat je zelf hebt gezien."}</p>
      {record?.published && (!publishedIsCurrent || dirty) ? <p className="mt-2 text-sm text-amber-800">De eerder gedeelde versie blijft zichtbaar totdat je opnieuw deelt.</p> : null}
      {chatEnabled && <div className="mt-5 flex gap-2" role="group" aria-label="Manier van nabespreken">
        {([{ id: "chat", label: "Gesprek" }, { id: "form", label: "Formulier" }] as const).map((option) => <button key={option.id} type="button" disabled={chatBusy} aria-pressed={mode === option.id} onClick={() => setMode(option.id)} className={`min-h-12 rounded-xl border px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-dia-green disabled:opacity-50 ${mode === option.id ? "border-dia-green bg-emerald-50 text-dia-green" : "border-stone-200"}`}>{option.label}</button>)}
      </div>}
      <div className="mt-6">
        {chatEnabled && mode === "chat" ? <>
          <PlayerReviewChat
            key={`${matchId}:${player.id}`}
            player={player}
            value={interview}
            answers={answers}
            onBusyChange={setChatBusy}
            onChange={(draft) => { if (!onCommand({ type: "saveInterview", matchId, playerId: player.id, draft })) setMessage("Het gesprek kon niet worden bewaard. Blijf op dit scherm en probeer opnieuw."); }}
            onApply={(value) => { setEdits((previous) => ({ ...previous, [player.id]: value })); setMode("form"); setMessage("Voorstel overgenomen in je concept. Controleer de antwoorden en bewaar ze voordat je deelt."); }}
          />
          <p className="mt-4 text-sm leading-relaxed text-stone-500">Het gesprek blijft lokaal in deze browser bewaard, per speler en wedstrijd. Alleen de coachweergave toont het gesprek; delen werkt pas nadat je het voorstel hebt overgenomen en nagelezen.</p>
        </> : <PlayerReviewForm
          key={`${matchId}:${player.id}`}
          player={player}
          answers={answers}
          onChange={(value) => { setEdits((previous) => ({ ...previous, [player.id]: value })); setMessage(""); }}
          onSave={save}
          saveDisabled={Boolean(record) && !dirty}
          onPublish={() => {
            if (!record || dirty || publishedIsCurrent) return;
            setMessage(onCommand({ type: "publishPlayerReview", reviewId: record.id }) ? `Verslag gedeeld met ${player.name} en de gekoppelde ouders in de demo.` : "Delen lukte niet. Controleer je opgeslagen antwoorden.");
          }}
          publishDisabled={!record || dirty || publishedIsCurrent}
          recordedMoments={state.highlights.filter((moment) => moment.matchId === matchId && moment.playerId === player.id && moment.status === "approved").map((moment) => ({ id: moment.id, label: `${moment.category}${moment.minute !== undefined ? ` · ${moment.minute}'` : ""}`, text: moment.description }))}
          storageNote={profile.roster ? "Selectiegegevens uit DIA Live. Bewaar vóór je van wedstrijd of scherm wisselt: deze nabesprekingen blijven lokaal in deze browser. Delen toont het verslag in de speler- en ouderdemo; ouder-kindkoppelingen zijn gesimuleerd." : "Fictieve proefversie: bewaar vóór je van wedstrijd of scherm wisselt. Concepten blijven lokaal in deze browser; delen maakt het verslag zichtbaar in de speler- en ouderdemo."}
        />}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
        <p role="status" className="text-sm font-medium text-dia-green">{message}</p>
        {players.indexOf(player) < players.length - 1 ? <button type="button" disabled={chatBusy} onClick={() => { if (save()) { setSelectedId(players[players.indexOf(player) + 1].id); setMessage(""); } }} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-dia-green disabled:opacity-50">Bewaar en volgende speler <ArrowRight size={17} aria-hidden="true" /></button> : <p className="text-sm text-stone-500">Dit is de laatste speler van deze wedstrijd.</p>}
      </div>
    </section>
  </div>;
}
