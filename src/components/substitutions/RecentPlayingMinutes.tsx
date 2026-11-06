import { ChevronDown, ExternalLink } from "lucide-react";
import {
  RECENT_PLAYING_MINUTES,
  type RecentPlayingMinutesPlayer,
} from "@/lib/substitutions/recentPlayingMinutes";

const snapshot = RECENT_PLAYING_MINUTES;
const orderedPlayers = [...snapshot.players].sort((left, right) =>
  (left.totalMinutes ?? Infinity) - (right.totalMinutes ?? Infinity) || left.number - right.number,
);
const minutes = (value: number | null) => value === null
  ? "Onbekend"
  : value.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function PlayerRow({ player }: { player: RecentPlayingMinutesPlayer }) {
  return <tr className="border-b border-slate-100 last:border-0">
    <th scope="row" className="px-3 py-2.5 text-left font-semibold text-slate-800">
      {player.name} <span className="ml-1 font-normal text-slate-500">{player.number}</span>
    </th>
    {player.minutes.map((value, index) => <td key={snapshot.games[index].date} className="px-3 py-2.5 text-right tabular-nums text-slate-600">{minutes(value)}</td>)}
    <td className="bg-slate-50/70 px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{minutes(player.totalMinutes)}</td>
  </tr>;
}

/** A dated reference table only; it does not select players or change a plan. */
export function RecentPlayingMinutes() {
  return <details className="group rounded-xl border border-slate-200 bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 [&::-webkit-details-marker]:hidden">
      <span>Speelminuten laatste wedstrijden <span className="mt-0.5 block text-xs font-normal text-slate-500">{snapshot.team} · 3 wedstrijden · momentopname</span></span>
      <ChevronDown aria-hidden="true" size={18} className="shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t border-slate-200 px-4 pb-4 pt-3">
      <p className="text-xs leading-5 text-slate-600">Opgehaald op <time dateTime={snapshot.fetchedAt}>30 september 2026</time>. Dit zijn geregistreerde minuten van de 14 spelers uit het voorbeeld; deze tabel wordt niet live bijgewerkt.</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[540px] border-collapse text-sm">
          <caption className="sr-only">Geregistreerde speelminuten per wedstrijd, van laag naar hoog totaal. Luc staat apart als keeper van de oorspronkelijke voorbeeldopstelling.</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-3 text-left">Speler</th>
              {snapshot.games.map((game) => <th key={game.date} scope="col" className="max-w-32 px-3 py-3 text-right font-medium">
                <time dateTime={game.date} className="block font-semibold text-slate-800">{game.date.slice(8)}-{game.date.slice(5, 7)}</time>
                <span className="mt-0.5 block">{game.opponent}</span>
              </th>)}
              <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-900">Totaal</th>
            </tr>
          </thead>
          <tbody>{orderedPlayers.filter((player) => !player.currentDemoKeeper).map((player) => <PlayerRow key={player.number} player={player} />)}</tbody>
          <tbody>
            <tr><th colSpan={5} scope="rowgroup" className="border-y border-amber-100 bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-900">Keeper in het oorspronkelijke voorbeeld</th></tr>
            {orderedPlayers.filter((player) => player.currentDemoKeeper).map((player) => <PlayerRow key={player.number} player={player} />)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">Controleer de minuten en aanwezigheid met de coaches. Waarden boven 60 minuten zijn behouden: een wedstrijd kan langer duren. Lucs cijfers zijn totale speelminuten; eerdere keeperminuten zijn niet apart bekend.</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">Eerdere beginposities zijn niet apart opgeslagen. Je kunt de beginposities handmatig instellen. Deze tabel geeft nog geen automatisch opstellingsadvies.</p>
      <a href={snapshot.historyUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-dia-green underline decoration-green-200 underline-offset-4 hover:decoration-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">Open wedstrijdhistorie in de app <ExternalLink aria-hidden="true" size={14} /></a>
    </div>
  </details>;
}

export default RecentPlayingMinutes;
