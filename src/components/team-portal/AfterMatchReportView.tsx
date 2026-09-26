import { ArrowLeftRight, CalendarDays, ClipboardList, Clock3, Flag, Info, RectangleVertical, Target, Users } from "lucide-react";
import type { AfterMatchReport } from "@/lib/team-portal/matchReport";

const panelClass = "rounded-3xl border border-stone-200 bg-white p-5 sm:p-7";
const eventStyles = {
  goal: { label: "Doelpunt", icon: Target, className: "bg-emerald-50 text-emerald-800" },
  assist: { label: "Assist", icon: ArrowLeftRight, className: "bg-teal-50 text-teal-800" },
  card: { label: "Kaart", icon: RectangleVertical, className: "bg-amber-50 text-amber-800" },
  substitution: { label: "Wissel", icon: ArrowLeftRight, className: "bg-stone-100 text-stone-600" },
  period: { label: "Wedstrijdverloop", icon: Clock3, className: "bg-stone-100 text-stone-600" },
} as const;

function matchDate(timestamp: number | null): { label: string; iso: string } | null {
  if (timestamp === null || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    label: new Intl.DateTimeFormat("nl-NL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
    }).format(date),
    iso: date.toISOString(),
  };
}

function recordedMinutes(minutes: number | null): string {
  return minutes === null
    ? "Niet geregistreerd"
    : `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(minutes)} min`;
}

/** Display only: the report mapper supplies recorded, authenticated match facts. */
export function AfterMatchReportView({ report }: { report: AfterMatchReport }) {
  const date = matchDate(report.scheduledAt);
  const players = [...report.players].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const counts = [
    { label: "Doelpunten", value: report.recorded.teamGoals },
    { label: "Assists", value: report.recorded.assists },
    { label: "Wissels", value: report.recorded.substitutions },
    { label: "Gele kaarten", value: report.recorded.yellowCards },
    { label: "Rode kaarten", value: report.recorded.redCards },
  ];

  return (
    <article className="space-y-6 text-stone-900" aria-labelledby="after-match-title">
      <header className="overflow-hidden rounded-3xl bg-[#123e30] p-5 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100"><ClipboardList aria-hidden="true" size={16} />Na de wedstrijd</p>
            <h2 id="after-match-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Het wedstrijdverslag</h2>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">Afgelopen</span>
        </div>

        <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-black/10 p-4 sm:gap-5 sm:p-6" aria-label={`Eindstand: ${report.homeTeam} ${report.score.home}, ${report.awayTeam} ${report.score.away}`}>
          <div className="min-w-0 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">Thuis</p><p className="mt-2 break-words text-sm font-bold leading-snug sm:text-lg">{report.homeTeam}</p></div>
          <div className="text-center"><p className="whitespace-nowrap text-3xl font-black tabular-nums tracking-tight text-dia-yellow sm:text-5xl">{report.score.label}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Eindstand</p></div>
          <div className="min-w-0 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">Uit</p><p className="mt-2 break-words text-sm font-bold leading-snug sm:text-lg">{report.awayTeam}</p></div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-relaxed text-emerald-100 sm:text-sm">
          <p className="flex items-center gap-2"><CalendarDays aria-hidden="true" size={16} className="shrink-0" />{date ? <time dateTime={date.iso}>{date.label}</time> : "Datum niet geregistreerd"}</p>
          <p className="flex items-center gap-2"><Flag aria-hidden="true" size={16} className="shrink-0" />{report.isHome ? "Thuiswedstrijd" : "Uitwedstrijd"} van {report.teamName}</p>
        </div>
      </header>

      <section className={panelClass} aria-labelledby="after-match-summary">
        <h3 id="after-match-summary" className="text-lg font-bold tracking-tight">In het kort</h3>
        <p className="mt-3 text-base leading-relaxed text-stone-700">{report.summary}</p>
        <p className="mt-6 text-xs font-semibold text-stone-500">Geregistreerd bij {report.teamName}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {counts.map(({ label, value }) => <div key={label} className="rounded-2xl bg-stone-50 p-3 sm:p-4"><dt className="text-xs leading-relaxed text-stone-500">{label}</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-dia-green">{value}</dd></div>)}
        </dl>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className={panelClass} aria-labelledby="after-match-timeline">
          <h3 id="after-match-timeline" className="flex items-center gap-2 text-lg font-bold tracking-tight"><Clock3 aria-hidden="true" size={19} className="text-dia-green" />De wedstrijd in momenten</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">De vastgelegde momenten, in volgorde van de wedstrijd.</p>
          {report.timeline.length > 0 ? (
            <ol className="mt-6 space-y-5" aria-label="Wedstrijdmomenten op volgorde">
              {report.timeline.map((event) => {
                const style = eventStyles[event.type];
                const Icon = style.icon;
                return (
                  <li key={event.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <div className="pt-1 text-right"><p className="text-sm font-bold tabular-nums text-dia-green">{event.timeLabel}</p>{event.periodLabel && event.periodLabel !== event.timeLabel ? <p className="mt-1 text-[10px] leading-snug text-stone-500">{event.periodLabel}</p> : null}</div>
                    <div className="min-w-0 border-l-2 border-stone-100 pb-1 pl-4">
                      <p className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${style.className}`}><Icon aria-hidden="true" size={13} />{style.label}</p>
                      <p className="mt-2 break-words text-sm font-semibold leading-relaxed">{event.text}</p>
                      {event.detail ? <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{event.detail}</p> : null}
                      {event.note ? <div className="mt-3 rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Vastgelegde notitie</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">{event.note}</p></div> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : <div className="mt-5 rounded-2xl bg-stone-50 p-5"><p className="font-semibold text-stone-700">Geen wedstrijdmomenten vastgelegd</p><p className="mt-2 text-sm leading-relaxed text-stone-500">De eindstand staat hierboven. Er zijn geen geregistreerde momenten om een tijdlijn van te maken.</p></div>}
        </section>

        <section className={panelClass} aria-labelledby="after-match-minutes">
          <h3 id="after-match-minutes" className="flex items-center gap-2 text-lg font-bold tracking-tight"><Users aria-hidden="true" size={19} className="text-dia-green" />Selectie en speeltijd</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">Spelers op alfabet, met hun geregistreerde minuten.</p>
          {players.length > 0 ? (
            <table className="mt-5 w-full table-fixed text-left text-sm">
              <caption className="sr-only">Geregistreerde speeltijd per speler</caption>
              <thead><tr className="border-b border-stone-200 text-xs text-stone-500"><th scope="col" className="w-3/5 py-3 pr-3 font-semibold">Speler</th><th scope="col" className="py-3 text-right font-semibold">Minuten</th></tr></thead>
              <tbody>{players.map((player) => <tr key={player.playerId} className="border-b border-stone-100 last:border-0"><th scope="row" className="break-words py-3.5 pr-3 font-medium leading-relaxed">{player.name}{player.number !== undefined ? <span className="ml-2 inline-block text-xs font-normal text-stone-400">#{player.number}</span> : null}</th><td className={`py-3.5 text-right tabular-nums ${player.minutesPlayed === null ? "text-xs leading-relaxed text-stone-500" : "font-semibold text-dia-green"}`}>{recordedMinutes(player.minutesPlayed)}</td></tr>)}</tbody>
            </table>
          ) : <p className="mt-5 rounded-2xl bg-stone-50 p-5 text-sm leading-relaxed text-stone-500">Er is geen wedstrijdselectie vastgelegd voor dit verslag.</p>}
        </section>
      </div>

      {report.completenessNotes.length > 0 ? <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6" aria-labelledby="after-match-recording"><h3 id="after-match-recording" className="flex items-center gap-2 text-sm font-bold text-amber-950"><Info aria-hidden="true" size={17} />Over de registratie</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-950/80">{report.completenessNotes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul></aside> : null}
    </article>
  );
}
