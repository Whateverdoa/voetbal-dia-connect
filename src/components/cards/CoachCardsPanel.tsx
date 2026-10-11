"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FC_ATTRIBUTES, PLAY_STYLES, isFcAssessment, ratingOverall, ratingSpread, type FcAttribute, type FcAssessment } from "@/lib/cards/fc27";
import { FcPlayerShield } from "@/components/cards/FcPlayerShield";
import { PlayStyleIcon } from "@/components/cards/PlayStyleIcon";
import { CardRoundManager } from "@/components/cards/CardRoundManager";
import { VoterInvitationManager } from "@/components/cards/VoterInvitationManager";
import { cardButtonClass, cardError, cardInputClass } from "@/components/cards/cardUi";

export type StaffCardTeam = NonNullable<FunctionReturnType<typeof api.playerCards.getStaffTeam>>;
type StaffPlayer = StaffCardTeam["players"][number];

export function CoachCardsPanel({ teamId }: { teamId: Id<"teams"> }) {
  const data = useQuery(api.playerCards.getStaffTeam, { teamId });
  const [selectedId, setSelectedId] = useState<string>("");

  if (data === undefined) return <p className="text-sm text-slate-600">Spelerskaarten laden…</p>;
  if (!data || !data.team.isSelectionTeam) return null;

  const players = data.players.filter((player) => player.active);
  const selected = players.find((player) => player.playerId === selectedId) ?? players[0];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="coach-cards-title">
      <div>
        <h2 id="coach-cards-title" className="text-xl font-bold text-slate-900">Spelerskaarten</h2>
        <p className="mt-1 text-sm text-slate-600">Beoordeel zorgvuldig, herken sterke punten en kies de spelers van de week of maand.</p>
        <Link href={`/team/${encodeURIComponent(data.team.slug)}/app`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-dia-green underline">Teamportaal openen</Link>
      </div>
      {selected ? (
        <>
          <label className="block text-sm font-semibold text-slate-700">
            Speler beoordelen
            <select className={`${cardInputClass} mt-1`} value={selected.playerId} onChange={(event) => setSelectedId(event.target.value)}>
              {players.map((player) => <option key={player.playerId} value={player.playerId}>{player.name}{player.number != null ? ` · #${player.number}` : ""}</option>)}
            </select>
          </label>
          <PlayerRatingEditor key={selected.playerId} player={selected} players={players} />
        </>
      ) : <p className="text-sm text-slate-600">Er zijn nog geen actieve spelers.</p>}
      <CardRoundManager data={data} />
      <VoterInvitationManager data={data} />
    </section>
  );
}

function PlayerRatingEditor({ player, players }: { player: StaffPlayer; players: StaffPlayer[] }) {
  const id = useId();
  const update = useMutation(api.playerCards.updatePlayerCard);
  const [scores, setScores] = useState<Record<FcAttribute, string>>(() => Object.fromEntries(
    FC_ATTRIBUTES.map(({ key }) => [key, player.fcRatings?.[key]?.toString() ?? ""]),
  ) as Record<FcAttribute, string>);
  const [styles, setStyles] = useState<string[]>(player.playStyleIds);
  const [confirmedSpread, setConfirmedSpread] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const allEmpty = FC_ATTRIBUTES.every(({ key }) => scores[key].trim() === "");
  const draft = Object.fromEntries(FC_ATTRIBUTES.filter(({ key }) => scores[key].trim() !== "").map(({ key }) => [key, Number(scores[key])])) as FcAssessment;
  const ratings = !allEmpty && isFcAssessment(draft) ? draft : null;
  const overall = ratingOverall(ratings);
  const spread = ratingSpread(players.map((entry) => entry.playerId === player.playerId ? { ...entry, fcRatings: ratings } : entry));
  const spreadWarning = spread?.warning === true;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!ratings && !allEmpty) {
      setError("Gebruik gehele scores van 1 tot en met 99. Kenmerken die nog niet beoordeeld zijn, mogen leeg blijven.");
      return;
    }
    if (spreadWarning && !confirmedSpread) {
      setError("Controleer het verschil binnen het team en bevestig je beoordeling.");
      return;
    }
    setPending(true);
    try {
      await update({ playerId: player.playerId, fcRatings: ratings, playStyleIds: styles });
      setMessage("Beoordeling en speelstijlen opgeslagen.");
    } catch (cause) {
      setError(cardError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => { void save(event); }} className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold">Dezelfde meetlat voor het hele team</p>
        <p>80 = verwacht teamniveau · 75 = ontwikkelpunt · 85 = sterk punt. Beoordeel op meerdere observaties. Andere scores zijn mogelijk.</p>
        <p className="mt-2">Dit voetbalprofiel gebruikt scores van 1–99. Interne ontwikkelbeoordelingen van 1–5, wedstrijdfeedback en XP staan hier los van.</p>
        <p className="mt-2">Na opslaan worden deze kaartgegevens zichtbaar waar de toestemmingen van de speler dat toelaten.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_224px]">
        <div className="grid grid-cols-2 gap-3">
          {FC_ATTRIBUTES.map((attribute) => (
            <label key={attribute.key} htmlFor={`${id}-${attribute.key}`} className="text-sm font-semibold text-slate-800">
              <span className="mb-1 flex items-center gap-2"><PlayStyleIcon styleId={attribute.icon} size={24} decorative /> {attribute.label} · {attribute.name}</span>
              <input id={`${id}-${attribute.key}`} type="number" min={1} max={99} step={1} inputMode="numeric" value={scores[attribute.key]} onChange={(event) => {
                setScores((previous) => ({ ...previous, [attribute.key]: event.target.value }));
                setConfirmedSpread(false);
                setMessage("");
              }} className={cardInputClass} aria-describedby={`${id}-${attribute.key}-help`} />
              <span id={`${id}-${attribute.key}-help`} className="mt-1 block text-xs font-normal text-slate-500">{attribute.help}</span>
            </label>
          ))}
          <p className="col-span-2 text-sm text-slate-600">Basistotaalscore: <strong className="text-xl text-slate-900">{overall ?? "—"}</strong> · afgerond gemiddelde van de zes kenmerken.</p>
        </div>
        <div className="mx-auto w-56 max-w-full self-start">
          <FcPlayerShield name={player.name} number={player.number} position={player.positionPrimary} photoUrl={player.photoUrl} fcRatings={ratings} playStyleIds={styles} recognitions={player.recognitions} />
          <p className="mt-2 text-center text-xs text-slate-500">Kaartvoorbeeld met eventuele actieve bonus.</p>
        </div>
      </div>
      {spreadWarning && spread ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p>De basistotaalscores van dit team lopen {spread.difference} punten uiteen ({spread.min}–{spread.max}). Controleer of je dezelfde meetlat gebruikt. Bonussen tellen niet mee.</p>
          <label className="mt-2 flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" checked={confirmedSpread} onChange={(event) => setConfirmedSpread(event.target.checked)} className="h-5 w-5 accent-dia-green" />Ik heb dit gecontroleerd en wil zo opslaan.</label>
        </div>
      ) : null}
      <fieldset>
        <legend className="font-semibold text-slate-900">Speelstijlen · {styles.length}/3</legend>
        <p className="mb-3 text-sm text-slate-600">Kies maximaal drie kwaliteiten. Deze badges geven geen scorebonus.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLAY_STYLES.map((style) => {
            const checked = styles.includes(style.id);
            return (
              <label key={style.id} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 ${checked ? "border-dia-green bg-green-50" : "border-slate-200"}`}>
                <input type="checkbox" checked={checked} disabled={!checked && styles.length >= 3} onChange={() => {
                  setStyles((previous) => checked ? previous.filter((entry) => entry !== style.id) : [...previous, style.id]);
                  setMessage("");
                }} className="h-5 w-5 shrink-0 accent-dia-green" />
                <PlayStyleIcon styleId={style.id} size={30} decorative />
                <span><span className="block text-xs text-slate-500">{style.category}</span><span className="block text-sm font-semibold">{style.name}</span><span className="block text-xs text-slate-600">{style.description}</span></span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-green-800">{message}</p> : null}
      <button type="submit" disabled={pending} className={cardButtonClass}>{pending ? "Opslaan…" : "Beoordeling opslaan"}</button>
    </form>
  );
}
