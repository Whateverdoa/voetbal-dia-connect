"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { StaffCardTeam } from "@/components/cards/CoachCardsPanel";
import { cardButtonClass, cardError, cardInputClass } from "@/components/cards/cardUi";

export function VoterInvitationManager({ data }: { data: StaffCardTeam }) {
  const invite = useMutation(api.playerCards.inviteVoter);
  const revoke = useMutation(api.playerCards.revokeVoter);
  const players = data.players.filter((player) => player.active);
  const [playerId, setPlayerId] = useState<string>("");
  const [kind, setKind] = useState<"player" | "parent">("player");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = players.find((player) => player.playerId === playerId) ?? players[0];
  const playerNames = new Map(data.players.map((player) => [player.playerId, player.name]));

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setPending(true);
    setError("");
    setMessage("");
    setLink("");
    try {
      const result = await invite({ teamId: data.team.id, playerId: selected.playerId, kind, email: email.trim() });
      setLink(`${window.location.origin}/team/${encodeURIComponent(data.team.slug)}/app/invite/${encodeURIComponent(result.token)}`);
      setMessage("Uitnodiging aangemaakt. Deel de link met het opgegeven e-mailadres. De link is zeven dagen geldig.");
    } catch (cause) {
      setError(cardError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border border-slate-200 p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-bold text-slate-900">Spelers en ouders uitnodigen</summary>
      <p className="mb-4 text-sm text-slate-600">Per speler één spelersstem en één gezamenlijke ouderstem. Een ouder met meerdere kinderen krijgt per kind een uitnodiging. Maak opnieuw een uitnodiging om een verlopen link te vervangen.</p>
      <form onSubmit={(event) => { void createInvite(event); }} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Speler<select value={selected?.playerId ?? ""} onChange={(event) => setPlayerId(event.target.value)} className={`${cardInputClass} mt-1`} required>{players.map((player) => <option key={player.playerId} value={player.playerId}>{player.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Stemrecht<select value={kind} onChange={(event) => setKind(event.target.value as "player" | "parent")} className={`${cardInputClass} mt-1`}><option value="player">Speler</option><option value="parent">Ouder (gezamenlijke stem)</option></select></label>
        <label className="text-sm font-semibold sm:col-span-2">E-mailadres<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={`${cardInputClass} mt-1`} /></label>
        <button type="submit" disabled={pending || !selected} className={`${cardButtonClass} sm:col-span-2`}>{pending ? "Aanmaken…" : "Uitnodigingslink maken"}</button>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="mt-3 text-sm text-green-800">{message}</p> : null}
      {link ? (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-semibold">Uitnodigingslink<input readOnly value={link} onFocus={(event) => event.target.select()} className={`${cardInputClass} mt-1 text-xs`} /></label>
          <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => {
            if (!navigator.clipboard) {
              setError("Selecteer de link en kopieer deze zelf.");
              return;
            }
            void navigator.clipboard.writeText(link).then(() => setMessage("Link gekopieerd."), () => setError("Kopiëren lukt niet. Selecteer de link en kopieer deze zelf."));
          }}>Link kopiëren</button>
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-slate-100">
        {data.memberships.map((membership) => (
          <li key={membership._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div><p className="font-semibold">{playerNames.get(membership.playerId) ?? "Speler"} · {membership.kind === "parent" ? "Ouder" : "Speler"}</p><p className="break-all text-slate-600">{membership.email}</p><p className="text-xs text-slate-500">{!membership.active ? "Ingetrokken" : membership.claimed ? "Account gekoppeld" : "Nog niet geaccepteerd"}</p></div>
            {membership.active ? <button type="button" disabled={pending} className="min-h-11 rounded-lg border border-red-200 px-3 font-semibold text-red-700 disabled:opacity-50" onClick={() => {
              setPending(true);
              setError("");
              void revoke({ membershipId: membership._id }).then(() => setMessage("Stemrecht en open uitnodigingen ingetrokken."), (cause: unknown) => setError(cardError(cause))).finally(() => setPending(false));
            }}>Intrekken</button> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
