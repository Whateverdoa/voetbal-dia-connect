import { CalendarDays, Check, Trophy } from "lucide-react";
import type { LocalDemoRoster } from "@/lib/team-portal/localRoster";

type LocalMatch = NonNullable<LocalDemoRoster["matches"]>[number];

const panelClass = "rounded-3xl border border-stone-200 bg-white p-5 sm:p-6";
const snapshotFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
});
const matchFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
});

function MatchCard({ match, teamName }: { match: LocalMatch; teamName: string }) {
  const hasScore = match.status === "finished" || match.status === "live" || match.status === "halftime";
  const statusLabel = {
    scheduled: "Nog te spelen",
    lineup: "Opstelling voorbereiden",
    live: "Bezig bij ophalen",
    halftime: "Rust bij ophalen",
    finished: "Gespeeld",
  }[match.status];
  return (
    <article className="flex items-start justify-between gap-4 rounded-2xl bg-stone-50 p-4">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-bold text-stone-900">{match.isHome ? teamName : match.opponent} – {match.isHome ? match.opponent : teamName}</h3>
        <p className="mt-2 text-xs leading-relaxed text-stone-500"><time dateTime={new Date(match.scheduledAt).toISOString()}>{matchFormatter.format(match.scheduledAt)}</time> · {match.isHome ? "Thuis" : "Uit"}</p>
        <p className="mt-2 text-xs font-medium text-stone-600">{statusLabel}</p>
      </div>
      {hasScore ? <p aria-label={`${match.status === "finished" ? "Uitslag" : "Stand bij ophalen"}: ${match.homeScore} – ${match.awayScore}`} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xl font-black tabular-nums text-stone-900">{match.homeScore} – {match.awayScore}</p> : null}
    </article>
  );
}

/** Shows the imported facts without suggesting the local demo refreshes them live. */
export function LocalTeamSchedule({ roster, compact = false }: { roster: LocalDemoRoster; compact?: boolean }) {
  const matches = roster.matches ?? [];
  const played = matches.filter((match) => match.status === "finished").sort((a, b) => b.scheduledAt - a.scheduledAt);
  const scheduled = matches.filter((match) => match.status !== "finished").sort((a, b) => a.scheduledAt - b.scheduledAt);
  const nextMatch = scheduled.find((match) => (match.status === "scheduled" || match.status === "lineup") && match.scheduledAt >= Date.parse(roster.importedAt));
  const standings = roster.standings;
  const teamName = standings?.sportlinkTeamName || "DIA JO13-2";
  const ownRow = standings?.rows.find((row) => row.teamName === standings.sportlinkTeamName);

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-stone-500">Wedstrijdgegevens uit DIA Live · opgehaald op <time dateTime={roster.importedAt}>{snapshotFormatter.format(Date.parse(roster.importedAt))}</time>. Deze lokale kopie wordt niet automatisch bijgewerkt.</p>
      {compact ? (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={panelClass} aria-label="Volgende wedstrijd">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-stone-900"><CalendarDays size={18} aria-hidden="true" className="text-dia-green" />Volgende wedstrijd</h2>
            {nextMatch ? <MatchCard match={nextMatch} teamName={teamName} /> : <p className="text-sm text-stone-500">Er is nog geen volgende wedstrijd bekend in deze kopie.</p>}
          </section>
          <section className={panelClass} aria-label="Laatste uitslag">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-stone-900"><Check size={18} aria-hidden="true" className="text-dia-green" />Laatste uitslag</h2>
            {played[0] ? <MatchCard match={played[0]} teamName={teamName} /> : <p className="text-sm text-stone-500">Er is nog geen gespeelde wedstrijd bekend in deze kopie.</p>}
          </section>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className={panelClass} aria-label="Programma">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900"><CalendarDays size={19} aria-hidden="true" className="text-dia-green" />Programma</h2>
            {scheduled.length ? <div className="space-y-3">{scheduled.map((match) => <MatchCard key={match.id} match={match} teamName={teamName} />)}</div> : <p className="text-sm text-stone-500">Er staan nog geen wedstrijden op het programma in deze kopie.</p>}
          </section>
          <section className={panelClass} aria-label="Uitslagen">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900"><Check size={19} aria-hidden="true" className="text-dia-green" />Uitslagen</h2>
            {played.length ? <div className="space-y-3">{played.map((match) => <MatchCard key={match.id} match={match} teamName={teamName} />)}</div> : <p className="text-sm text-stone-500">Er zijn nog geen uitslagen bekend in deze kopie.</p>}
          </section>
        </div>
      )}

      <section className={panelClass} aria-label="Competitiestand">
        <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900"><Trophy size={19} aria-hidden="true" className="text-dia-green" />Competitiestand</h2>
        {standings ? (
          <>
            <p className="mt-2 text-sm text-stone-700">{standings.competitionName}{standings.klassepoule ? ` · ${standings.klassepoule}` : ""}</p>
            <p className="mt-2 text-xs text-stone-500">Stand uit Sportlink · bijgewerkt op <time dateTime={new Date(standings.fetchedAt).toISOString()}>{snapshotFormatter.format(standings.fetchedAt)}</time></p>
            {compact ? ownRow ? <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">{ownRow.teamName} · positie {ownRow.position} · {ownRow.points} punten uit {ownRow.played} wedstrijden</p> : <p className="mt-4 text-sm text-stone-500">De positie van {teamName} is niet bekend in deze stand.</p> : standings.rows.length ? (
              <div className="mt-5 overflow-x-auto rounded-xl border border-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green" tabIndex={0} role="region" aria-label="Stand bekijken, horizontaal scrollbaar">
                <table className="w-full min-w-[620px] text-left text-sm tabular-nums">
                  <caption className="sr-only">Competitiestand {standings.competitionName}. {teamName} is gemarkeerd indien aanwezig.</caption>
                  <thead className="bg-stone-50 text-xs text-stone-500"><tr>{[["#", "Positie"], ["Team", "Team"], ["G", "Gespeeld"], ["W", "Gewonnen"], ["GL", "Gelijk"], ["V", "Verloren"], ["Voor", "Doelpunten voor"], ["Tegen", "Doelpunten tegen"], ["Saldo", "Doelsaldo"], ["Pnt", "Punten"]].map(([label, title]) => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-medium" aria-label={title}>{label}</th>)}</tr></thead>
                  <tbody>{standings.rows.slice().sort((a, b) => a.position - b.position).map((row) => (
                    <tr key={row.teamName} aria-current={row.teamName === standings.sportlinkTeamName ? "true" : undefined} className={row.teamName === standings.sportlinkTeamName ? "border-t border-stone-100 bg-emerald-50 font-bold text-emerald-950" : "border-t border-stone-100 text-stone-700"}>
                      <td className="px-3 py-3">{row.position}</td><th scope="row" className="min-w-36 px-3 py-3 font-semibold">{row.teamName}</th><td className="px-3 py-3">{row.played}</td><td className="px-3 py-3">{row.won}</td><td className="px-3 py-3">{row.drawn}</td><td className="px-3 py-3">{row.lost}</td><td className="px-3 py-3">{row.goalsFor}</td><td className="px-3 py-3">{row.goalsAgainst}</td><td className="px-3 py-3">{row.goalDifference}</td><td className="px-3 py-3">{row.points}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="mt-4 text-sm text-stone-500">Er zijn nog geen teams opgenomen in deze competitiestand.</p>}
          </>
        ) : <p className="mt-3 text-sm text-stone-500">De competitiestand is nog niet opgehaald.</p>}
      </section>
    </div>
  );
}
