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
import { reportsPath, teamSlug } from "@/lib/team";
import { ReportMatchLink } from "@/components/MatchLink";

type RouteProps = { params: Promise<{ slug: string; matchId: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return publicMatches.map((match) => ({ slug: teamSlug, matchId: match.id }));
}
export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { slug, matchId } = await params;
  const match =
    slug === teamSlug
      ? publicMatches.find((item) => item.id === matchId)
      : undefined;
  if (!match) return {};
  const sides = matchTeams(match);
  return {
    title: `${sides.home} – ${sides.away} · Wedstrijdverslag`,
    description: `De verslagpagina voor ${sides.home} – ${sides.away}.`,
    alternates: { canonical: matchReportPath(match) },
  };
}

export default async function MatchReportPage({ params }: RouteProps) {
  const { slug, matchId } = await params;
  const match =
    slug === teamSlug
      ? publicMatches.find((item) => item.id === matchId)
      : undefined;
  if (!match) notFound();
  const sides = matchTeams(match);
  const report = getPublicReport(match.id);

  return (
    <main id="inhoud" className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-14">
      <Link
        href={reportsPath}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#aaa99f] hover:text-[#efc44b]"
      >
        <span aria-hidden="true">←</span> Alle wedstrijdverslagen
      </Link>
      <header className="mt-6 rounded-3xl border border-[#efc44b]/30 bg-linear-to-br from-[#302c1e] to-[#191b15] p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-[#efc44b]">
          DIA JO13-2 · WEDSTRIJDVERSLAG
        </p>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">
          {sides.home}
          <span className="mt-1 block text-[#c0bfb5]">tegen {sides.away}</span>
        </h1>
        <p className="mt-4 text-sm text-[#aaa99f]">
          {matchDate(match)} · Afgelopen
        </p>
        <p className="mt-6 text-5xl font-black tabular-nums text-[#efc44b] sm:text-6xl">
          {match.homeScore} – {match.awayScore}
        </p>
        <p className="mt-2 text-xs font-semibold tracking-widest text-[#aaa99f]">
          EINDSTAND
        </p>
      </header>
      {report ? (
        <article className="mt-7 rounded-3xl border border-white/10 bg-[#191b15] p-6 sm:p-8">
          <h2 className="text-2xl font-bold">{report.title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-[#efc44b]">
            {report.introduction}
          </p>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-[#c0bfb5]">
            {report.paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-wrap break-words">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      ) : (
        <section
          aria-labelledby="report-space"
          className="mt-7 rounded-3xl border border-dashed border-[#efc44b]/30 bg-[#191b15] p-6 sm:p-8"
        >
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#efc44b]/10 text-2xl text-[#efc44b]"
          >
            ✎
          </span>
          <h2 id="report-space" className="mt-5 text-2xl font-bold">
            Hier komt het wedstrijdverslag
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#c0bfb5]">
            De plek staat klaar. Voor deze wedstrijd is nog geen verslag
            gepubliceerd. Zodra het verhaal van de coach is goedgekeurd voor
            openbare publicatie, kun je het hier lezen.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#aaa99f]">
            Deze wedstrijd heeft een eigen, vaste link. Je kunt die straks delen
            met ouders, spelers en supporters.
          </p>
        </section>
      )}
      <section
        aria-labelledby="match-in-app"
        className="mt-7 rounded-2xl border border-white/10 p-5 sm:p-6"
      >
        <h2 id="match-in-app" className="text-lg font-bold">
          Rondom de wedstrijd
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#aaa99f]">
          Bekijk de wedstrijd en de actuele registratie in DIA Live.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ReportMatchLink slug={slug} matchId={match.id} />
        </div>
      </section>
      <p className="mt-7 text-xs leading-relaxed text-[#888a7e]">
        Wedstrijdgegevens gecontroleerd op 13 oktober 2026. Alleen de openbare
        verslagversie krijgt hier een plek.
      </p>
    </main>
  );
}
