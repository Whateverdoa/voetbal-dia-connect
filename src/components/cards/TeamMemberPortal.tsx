"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TeamDeckGrid } from "@/components/cards/TeamDeckGrid";
import { authPageUrl } from "@/lib/auth/returnTo";
import { cardButtonClass, cardDate, cardError } from "@/components/cards/cardUi";

type PortalData = NonNullable<FunctionReturnType<typeof api.playerCards.getPortal>>;
type PortalRound = PortalData["rounds"][number];
type PortalSeat = PortalData["seats"][number];

export function TeamMemberPortal({ teamSlug }: { teamSlug: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const portal = useQuery(api.playerCards.getPortal, isAuthenticated ? { teamSlug } : "skip");
  const [tab, setTab] = useState<"cards" | "vote">("cards");
  const returnTo = `/team/${encodeURIComponent(teamSlug)}/app`;

  if (isLoading || (isAuthenticated && portal === undefined)) return <main className="p-6 text-center text-slate-600">Teamportaal laden…</main>;
  if (!isAuthenticated) return <main className="mx-auto max-w-md space-y-4 p-6"><h1 className="text-2xl font-bold">Teamportaal</h1><p className="text-slate-600">Log in met het e-mailadres van je uitnodiging.</p><Link href={authPageUrl("sign-in", returnTo)} className={`${cardButtonClass} inline-flex items-center`}>Inloggen</Link></main>;
  if (!portal) return <main className="mx-auto max-w-md space-y-3 p-6"><h1 className="text-2xl font-bold">Nog geen toegang</h1><p className="text-slate-600">Open de uitnodigingslink van je coach om je spelers- of ouderaccount te koppelen. Gebruik het e-mailadres waarop je bent uitgenodigd.</p><Link href="/" className="inline-flex min-h-11 items-center font-semibold text-dia-green underline">Naar home</Link></main>;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-dia-green px-4 py-6 text-white"><div className="mx-auto max-w-5xl"><p className="text-sm text-white/80">DIA · Teamportaal</p><h1 className="text-2xl font-bold">{portal.team.name}</h1></div></header>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <div role="tablist" aria-label="Teamportaal" className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
          <button type="button" role="tab" aria-selected={tab === "cards"} aria-controls="portal-cards" id="portal-cards-tab" tabIndex={tab === "cards" ? 0 : -1} onClick={() => setTab("cards")} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setTab("vote"); document.getElementById("portal-vote-tab")?.focus(); } }} className={`min-h-12 flex-1 rounded-lg px-4 font-semibold ${tab === "cards" ? "bg-dia-green text-white" : "text-slate-700"}`}>Kaarten</button>
          <button type="button" role="tab" aria-selected={tab === "vote"} aria-controls="portal-vote" id="portal-vote-tab" tabIndex={tab === "vote" ? 0 : -1} onClick={() => setTab("vote")} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setTab("cards"); document.getElementById("portal-cards-tab")?.focus(); } }} className={`min-h-12 flex-1 rounded-lg px-4 font-semibold ${tab === "vote" ? "bg-dia-green text-white" : "text-slate-700"}`}>Stemmen</button>
        </div>
        {tab === "cards" ? <section id="portal-cards" role="tabpanel" aria-labelledby="portal-cards-tab" className="rounded-2xl bg-slate-950 p-3 sm:p-5"><h2 className="mb-4 text-lg font-bold text-white">Spelerskaarten</h2><TeamDeckGrid players={portal.players} /></section> : (
          <section id="portal-vote" role="tabpanel" aria-labelledby="portal-vote-tab" className="space-y-4">
            <div><h2 className="text-xl font-bold text-slate-900">Jouw stem telt</h2><p className="mt-1 text-sm text-slate-600">Kies spelers die het verdienen. Je mag je keuzes aanpassen tot de sluiting. Alleen jouw eigen keuzes zijn zichtbaar; de coach kan een veto toepassen.</p></div>
            {portal.rounds.length === 0 ? <p className="rounded-xl bg-white p-5 text-slate-600">Er is nog geen stemronde. Je coach opent deze voor de week of maand.</p> : null}
            {portal.rounds.map((round) => <PortalRoundPanel key={round._id} round={round} seats={portal.seats} players={portal.players} />)}
          </section>
        )}
      </div>
    </main>
  );
}

function PortalRoundPanel({ round, seats, players }: { round: PortalRound; seats: PortalSeat[]; players: PortalData["players"] }) {
  const names = new Map(players.map((player) => [player.playerId, player.displayName]));
  const published = round.status === "published";
  const eligibleSeats = seats.filter((seat) => round.myBallots.some((ballot) => ballot.membershipId === seat._id));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (round.status !== "open" || now >= round.closesAt) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, round.closesAt - now), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [now, round.closesAt, round.status]);
  const canVote = round.status === "open" && now < round.closesAt;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-900">{round.kind === "week" ? "Team van de week" : "Team van de maand"} · {round.periodKey}</h3>
      <p className="mt-1 text-sm text-slate-600">{published ? `Gepubliceerd ${cardDate(round.publishedAt)} · geldig tot ${cardDate(round.expiresAt)}` : round.status === "cancelled" ? "Deze ronde is geannuleerd." : `Stemmen tot ${cardDate(round.closesAt)} (Nederlandse tijd)`}</p>
      {round.status === "open" && !canVote ? <p className="mt-2 text-sm text-amber-800">De stemming is gesloten. De uitslag verschijnt automatisch.</p> : null}
      {published ? <div className="mt-4"><h4 className="font-semibold text-slate-800">Gekozen spelers</h4>{round.winnerIds.length ? <ul className="mt-2 flex flex-wrap gap-2">{round.winnerIds.map((playerId) => names.has(playerId) ? <li key={playerId} className="rounded-full bg-purple-100 px-3 py-2 text-sm font-semibold text-purple-950">{names.get(playerId)}</li> : null)}</ul> : <p className="mt-1 text-sm text-slate-600">Deze ronde heeft geen winnaars.</p>}</div> : null}
      {round.mode === "vote" && round.status !== "cancelled" ? <div className="mt-4 space-y-4">{eligibleSeats.length === 0 && round.status === "open" ? <p className="text-sm text-slate-600">{seats.length ? "Je stemrecht doet vanaf een volgende ronde mee." : "Je bekijkt het teamportaal als begeleider. Stemmen gebeurt met een spelers- of ouderaccount."}</p> : null}{eligibleSeats.map((seat) => {
        const ballot = round.myBallots.find((entry) => entry.membershipId === seat._id);
        return <BallotEditor key={`${seat._id}:${round._id}`} round={round} seat={seat} initialPlayerIds={ballot?.playerIds ?? []} players={players} canVote={canVote} />;
      })}</div> : null}
    </article>
  );
}

function BallotEditor({ round, seat, initialPlayerIds, players, canVote }: { round: PortalRound; seat: PortalSeat; initialPlayerIds: Id<"players">[]; players: PortalData["players"]; canVote: boolean }) {
  const cast = useMutation(api.playerCards.castBallot);
  const [selected, setSelected] = useState<Id<"players">[]>(initialPlayerIds);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const owner = players.find((player) => player.playerId === seat.playerId)?.displayName ?? "de gekoppelde speler";
  const open = canVote;
  const candidates = round.candidateIds.flatMap((playerId) => {
    const player = players.find((entry) => entry.playerId === playerId);
    return player && !(seat.kind === "player" && playerId === seat.playerId) ? [{ ...player, playerId }] : [];
  });
  const candidateIds = new Set(candidates.map((player) => player.playerId));
  const visibleSelected = selected.filter((playerId) => candidateIds.has(playerId));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (round.closesAt != null && Date.now() >= round.closesAt) {
      setError("De sluitingstijd is bereikt. De uitslag verschijnt automatisch.");
      return;
    }
    setPending(true);
    try {
      await cast({ roundId: round._id, membershipId: seat._id, playerIds: visibleSelected });
      setMessage("Jouw keuzes zijn opgeslagen. Je kunt ze wijzigen tot de sluiting.");
    } catch (cause) {
      setError(cardError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => { void save(event); }} className="space-y-3 rounded-xl bg-slate-50 p-3">
      <fieldset disabled={!open || pending}>
        <legend className="font-semibold text-slate-900">{seat.kind === "parent" ? `Ouderstem voor ${owner}` : `Spelersstem van ${owner}`}</legend>
        <p className="mb-3 text-sm text-slate-600">{open ? `Kies maximaal ${round.winnerCount} verschillende spelers. ${seat.kind === "player" ? "Je kunt niet op jezelf stemmen." : "Je mag op je eigen kind stemmen."}` : "Jouw opgeslagen keuzes"}</p>
        <div className="grid gap-2 sm:grid-cols-2">{candidates.map((player) => {
          const checked = (open ? visibleSelected : initialPlayerIds).includes(player.playerId);
          return <label key={player.playerId} className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm ${checked ? "border-dia-green bg-green-50" : "border-slate-200 bg-white"}`}><input type="checkbox" checked={checked} disabled={!checked && visibleSelected.length >= round.winnerCount} onChange={() => {
            setSelected((previous) => {
              const visible = previous.filter((playerId) => candidateIds.has(playerId));
              return checked ? visible.filter((playerId) => playerId !== player.playerId) : [...visible, player.playerId];
            });
            setMessage("");
          }} className="h-5 w-5 accent-dia-green" /><span className="font-semibold">{player.displayName}{player.number != null ? ` · #${player.number}` : ""}</span></label>;
        })}</div>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-green-800">{message}</p> : null}
      {open ? <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className={cardButtonClass}>{pending ? "Opslaan…" : "Stem opslaan"}</button><span className="text-sm text-slate-600">{visibleSelected.length}/{round.winnerCount} gekozen</span></div> : null}
    </form>
  );
}
