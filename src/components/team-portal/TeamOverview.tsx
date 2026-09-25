"use client";

import { ArrowUpRight, Flag, HeartHandshake, Sparkles, Trophy } from "lucide-react";
import type { DemoState } from "@/lib/team-portal/types";
import { getWinners } from "@/lib/team-portal/selectors";

export function TeamOverview({ state, now, onVote }: { state: DemoState; now: number; onVote: () => void }) {
  const finished = state.matches.find((match) => getWinners(state, match.id, now).playerIds.length > 0);
  const winners = finished ? getWinners(state, finished.id, now) : null;
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#123e30] p-6 text-white sm:p-8">
        <Flag className="absolute -right-4 -top-6 size-40 rotate-12 text-white/5" aria-hidden="true" />
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-dia-yellow"><HeartHandshake size={16} /> Ons teamdoel</p>
        <h2 className="max-w-xl text-2xl font-bold leading-tight sm:text-3xl">Een goede pass?<br />Daarna helpen we elkaar weer.</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-green-50/80">Deze week oefenen we op vrijlopen na een pass. Zo heeft de speler aan de bal altijd iemand om op te bouwen.</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold"><Sparkles size={15} className="text-dia-yellow" /> Samen beter, elke training weer</div>
      </section>
      {finished && winners ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-amber-800">DIA JO13 · {finished.opponent}</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-stone-900"><Trophy size={19} className="text-amber-700" /> Een applaus voor onze teamgenoten</h2></div><button type="button" onClick={onVote} className="flex min-h-11 items-center gap-1 text-sm font-bold text-dia-green">Bekijk wedstrijden <ArrowUpRight size={17} /></button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4"><p className="text-xs text-stone-500">Speler van de wedstrijd</p><p className="mt-1 font-bold text-stone-900">{winners.playerIds.map((id) => state.players.find((player) => player.id === id)?.name).join(" & ") || "Nog geen winnaar"}</p></div>
            <div className="rounded-xl bg-white p-4"><p className="text-xs text-stone-500">Actie van de wedstrijd</p><p className="mt-1 font-bold text-stone-900">{winners.highlightIds.map((id) => { const action = state.highlights.find((item) => item.id === id); return `${action?.category} van ${state.players.find((player) => player.id === action?.playerId)?.name}`; }).join(" · ") || "Nog geen winnaar"}</p></div>
          </div>
        </section>
      ) : null}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Iedereen hoort erbij</p><h2 className="mt-1 text-xl font-bold text-stone-900">Dit is ons team</h2></div><span className="text-sm text-stone-500">{state.players.length} spelers</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.players.map((player) => (
            <article key={player.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="mb-4 flex items-start justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-[#edf3e9] font-bold text-dia-green">{player.name.slice(0, 2).toUpperCase()}</div><span className="text-sm font-bold text-stone-400">#{player.number}</span></div>
              <h3 className="font-bold text-stone-900">{player.name}</h3><p className="mt-0.5 text-xs text-stone-500">{player.position}</p><p className="mt-3 border-t border-stone-100 pt-3 text-xs font-medium leading-relaxed text-dia-green">{player.qualities[0]}</p>
            </article>
          ))}
        </div>
      </section>
      <section><h2 className="mb-4 text-xl font-bold text-stone-900">Momenten om te onthouden</h2><div className="grid gap-3 sm:grid-cols-2">{state.highlights.filter((item) => item.status === "approved").slice().reverse().slice(0, 6).map((highlight) => <article key={highlight.id} className="rounded-2xl border border-stone-200 bg-white p-5"><p className="flex items-center gap-2 text-xs font-bold text-dia-green"><Sparkles size={15} />{highlight.category} · {state.players.find((player) => player.id === highlight.playerId)?.name}</p><p className="mt-3 break-words text-sm leading-relaxed text-stone-700">{highlight.description}</p><p className="mt-3 text-xs text-stone-400">Tegen {state.matches.find((match) => match.id === highlight.matchId)?.opponent}{highlight.minute ? ` · ${highlight.minute}e minuut` : ""}</p></article>)}</div></section>
    </div>
  );
}
