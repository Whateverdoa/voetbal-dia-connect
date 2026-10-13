import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicReport,
  matchDate,
  matchReportPath,
  matchTeams,
  publicMatches,
} from "@/lib/match-reports";
import { reportsPath, teamMatchesUrl, teamSlug } from "@/lib/team";

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: teamSlug }];
}
export const metadata: Metadata = {
  title: "Wedstrijdverslagen · DIA JO13-2",
  description:
    "Samen terugkijken op de wedstrijden van DIA JO13-2. Een eigen verslagpagina bij iedere gespeelde wedstrijd.",
  alternates: { canonical: reportsPath },
};

export default async function MatchReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== teamSlug) notFound();
  const latest = publicMatches[0];
  const teams = matchTeams(latest);

  return (
    <main id="inhoud" className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-14">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#aaa99f] hover:text-[#efc44b]"
      >
        <span aria-hidden="true">←</span> Terug naar het team
      </Link>
      <header className="mt-6 max-w-2xl">
        <p className="text-xs font-bold tracking-[0.2em] text-[#efc44b]">
          DIA JO13-2 · SEIZOEN 2026–2027
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Het verhaal achter
          <br />
          <span className="text-[#efc44b]">de wedstrijd.</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[#c0bfb5]">
          Samen terugkijken op wat we hebben meegemaakt. Iedere wedstrijd krijgt
          een eigen plek voor het verslag van de coach.
        </p>
      </header>
      <section
        aria-labelledby="latest-match"
        className="mt-8 rounded-3xl border border-[#efc44b]/30 bg-linear-to-br from-[#302c1e] to-[#191b15] p-6 sm:p-8"
      >
        <p className="text-xs font-bold tracking-widest text-[#efc44b]">
          LAATSTE WEDSTRIJD
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 id="latest-match" className="text-2xl font-bold">
              {teams.home} – {teams.away}
            </h2>
            <p className="mt-2 text-sm text-[#aaa99f]">
              {matchDate(latest)} · Afgelopen
            </p>
          </div>
          <p
            aria-label={`Eindstand ${latest.homeScore} tegen ${latest.awayScore}`}
            className="text-5xl font-black tabular-nums text-[#efc44b]"
          >
            {latest.homeScore} – {latest.awayScore}
          </p>
        </div>
        <Link
          href={matchReportPath(latest)}
          className="mt-6 inline-flex min-h-12 items-center gap-5 rounded-xl bg-[#efc44b] px-5 py-3 text-sm font-bold text-[#171810] hover:bg-[#ffda67] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc44b]"
        >
          Naar de verslagpagina <span aria-hidden="true">→</span>
        </Link>
      </section>
      <section aria-labelledby="all-reports" className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="all-reports" className="text-2xl font-bold">
            Alle wedstrijden
          </h2>
          <a
            href={teamMatchesUrl}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[#efc44b]"
          >
            Wedstrijden in DIA Live ↗
          </a>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicMatches.map((match) => {
            const sides = matchTeams(match);
            const report = getPublicReport(match.id);
            return (
              <li key={match.id}>
                <Link
                  href={matchReportPath(match)}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-[#191b15] p-5 transition hover:border-[#efc44b]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc44b]"
                >
                  <p className="text-xs text-[#aaa99f]">{matchDate(match)}</p>
                  <h3 className="mt-3 text-lg font-bold leading-snug">
                    {sides.home}
                    <span className="block text-[#aaa99f]">{sides.away}</span>
                  </h3>
                  <p className="mt-4 text-3xl font-black tabular-nums text-[#efc44b]">
                    {match.homeScore} – {match.awayScore}
                  </p>
                  <p className="mt-4 text-xs text-[#aaa99f]">
                    {report
                      ? "Verslag gepubliceerd"
                      : "Nog geen verslag gepubliceerd"}
                  </p>
                  <span className="mt-auto flex min-h-11 items-center justify-between gap-3 pt-4 text-sm font-semibold group-hover:text-[#efc44b]">
                    {report ? "Lees het verslag" : "Bekijk de verslagruimte"}
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mt-8 text-xs leading-relaxed text-[#888a7e]">
        Wedstrijdgegevens uit DIA Live · gecontroleerd op 13 oktober 2026.
        Bekijk de app voor de actuele registratie. Op deze pagina verschijnen
        alleen verslagen die voor openbare publicatie zijn goedgekeurd.
      </p>
    </main>
  );
}
