"use client";

import { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowLeft, ClipboardList, LockKeyhole } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activeSeasonKey } from "@/lib/season";
import { buildMatchReport } from "@/lib/team-portal/matchReport";
import { AfterMatchReportView } from "./AfterMatchReportView";
import { ConnectedPlayerReviews } from "./ConnectedPlayerReviews";

const panelClass = "rounded-3xl border border-stone-200 bg-white p-5 sm:p-7";
const buttonClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-dia-green px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dia-green";
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Uses the existing authenticated match queries; report data never enters demo storage. */
export function TeamMatchReport({ teamSlug }: { teamSlug: string }) {
  const backToDemo = process.env.NODE_ENV === "development" && teamSlug === "jo13-2";
  return (
    <main className="min-h-screen bg-[#f6f7f2] px-4 py-6 text-stone-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href={backToDemo ? "/demo/teamportaal/jo13-2" : "/coach"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-dia-green"><ArrowLeft size={17} aria-hidden="true" />{backToDemo ? "Terug naar het teamportaal" : "Terug naar coachdashboard"}</Link>
        <header>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-dia-green"><LockKeyhole size={16} aria-hidden="true" />Coach en admin</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Samen terugkijken</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">Het wedstrijdverslag gebruikt de uitslag en gebeurtenissen die in DIA Live zijn vastgelegd. Aanvullingen in de wedstrijdregistratie verschijnen hier automatisch.</p>
        </header>
        {!clerkConfigured ? <ReportMessage title="Inloggen is nog niet ingesteld">Open dit verslag in een omgeving waarin DIA Live met je coachaccount verbonden is.</ReportMessage> : (
          <ReportErrorBoundary key={teamSlug}><ReportAuthentication teamSlug={teamSlug} /></ReportErrorBoundary>
        )}
      </div>
    </main>
  );
}

function ReportAuthentication({ teamSlug }: { teamSlug: string }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (!isLoaded) return <ReportLoading />;
  if (!isSignedIn) {
    const returnUrl = `/team/${encodeURIComponent(teamSlug)}/verslag`;
    return <ReportMessage title="Log in om het wedstrijdverslag te bekijken"><p>De geregistreerde spelersgegevens zijn hier beschikbaar voor coaches van dit team en admins.</p><SignInButton mode="modal" forceRedirectUrl={returnUrl} signUpForceRedirectUrl={returnUrl} withSignUp={false}><button type="button" className={`${buttonClass} mt-5`}>Inloggen met mijn coachaccount</button></SignInButton></ReportMessage>;
  }
  if (isLoading) return <ReportLoading />;
  if (!isAuthenticated) return <ReportMessage title="Je toegang kon niet worden bevestigd">Vernieuw de pagina of log opnieuw in om verbinding te maken met de wedstrijdregistratie.</ReportMessage>;
  // Remount on identity changes so a prior account's selected match cannot linger.
  return <AuthorizedReports key={`${userId}:${teamSlug}`} teamSlug={teamSlug} />;
}

function AuthorizedReports({ teamSlug }: { teamSlug: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [hasUnsavedReview, setHasUnsavedReview] = useState(false);
  const coachData = useQuery(api.matches.verifyCoachAccess, { seasonKey: activeSeasonKey() });
  const team = useQuery(api.teams.getBySlug, { teamSlug });
  if (coachData === undefined || team === undefined) return <ReportLoading />;
  if (!coachData || !team || !coachData.teams.some((item) => item.id === team.id)) {
    return <ReportMessage title="Geen toegang tot dit team">Dit team bestaat niet of je account heeft er geen coachrechten voor. Vraag de clubbeheerder om je teamkoppeling te controleren.</ReportMessage>;
  }

  const matches = coachData.matches
    .filter((match) => match.teamId === team.id && match.status === "finished")
    .sort((a, b) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0));
  const selected = matches.find((match) => match._id === selectedId) ?? matches[0];
  if (!selected) return <ReportMessage title="Nog geen afgeronde wedstrijden">Voor {team.name} staan in je coachomgeving nog geen afgeronde wedstrijden klaar. Het verslag verschijnt zodra een geregistreerde wedstrijd is afgesloten.</ReportMessage>;

  return <div className="space-y-6">
    <section className={panelClass}>
      <label htmlFor="report-match" className="mb-3 flex items-center gap-2 text-sm font-bold"><ClipboardList size={18} aria-hidden="true" />Afgeronde wedstrijd · {team.name}</label>
      <select id="report-match" value={selected._id} onChange={(event) => {
        if (hasUnsavedReview && !window.confirm("Er staan nog niet bewaarde antwoorden in je spelerformulier. Wil je deze wedstrijd verlaten?")) return;
        setHasUnsavedReview(false);
        setSelectedId(event.target.value);
      }} className="min-h-12 w-full min-w-0 max-w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base focus-visible:outline-2 focus-visible:outline-dia-green">
        {matches.map((match) => <option key={match._id} value={match._id}>{match.scheduledAt ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" }).format(match.scheduledAt) : "Datum niet vastgelegd"} · {match.isHome ? `${team.name} – ${match.opponent}` : `${match.opponent} – ${team.name}`} · {match.homeScore} – {match.awayScore}</option>)}
      </select>
    </section>
    <SelectedMatchReport key={selected._id} matchId={selected._id} teamId={team.id} onDirtyChange={setHasUnsavedReview} />
  </div>;
}

function SelectedMatchReport({ matchId, teamId, onDirtyChange }: { matchId: Id<"matches">; teamId: Id<"teams">; onDirtyChange: (dirty: boolean) => void }) {
  const match = useQuery(api.matches.getForCoach, { matchId });
  if (match === undefined) return <ReportLoading />;
  if (!match || match._id !== matchId || match.teamId !== teamId) return <ReportMessage title="Wedstrijd niet beschikbaar">Deze wedstrijd bestaat niet meer of je hebt er geen toegang toe.</ReportMessage>;
  if (match.status !== "finished" || match.cancelledAt != null) return <ReportMessage title="Nog geen eindverslag">Deze wedstrijd is niet als afgerond beschikbaar. Kies een andere wedstrijd.</ReportMessage>;
  const report = buildMatchReport(match);
  if (!report) return <ReportMessage title="Nog geen eindverslag">Het verslag is beschikbaar na het afsluiten van de wedstrijd.</ReportMessage>;

  return <>
    <ConnectedPlayerReviews report={report} matchId={matchId} participantIds={match.players.filter((player) => player && !player.absent).map((player) => player!.playerId)} onDirtyChange={onDirtyChange} />
    <AfterMatchReportView report={report} />
    <section className={panelClass}>
      <h2 className="text-lg font-bold">Iets aanvullen in de registratie?</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">Dit verslag volgt de vastgelegde wedstrijd. Een coachbeoordeling of verkiezingswinnaar wordt hier niet automatisch uit afgeleid.</p>
      <Link href={`/coach/match/${matchId}`} className={`${buttonClass} mt-4`}>Open wedstrijdregistratie</Link>
    </section>
  </>;
}

function ReportLoading() {
  return <p role="status" className={`${panelClass} text-sm text-stone-600`}>Wedstrijdgegevens laden…</p>;
}

function ReportMessage({ title, children }: { title: string; children: ReactNode }) {
  return <section className={panelClass}><h2 className="text-xl font-bold">{title}</h2><div className="mt-3 text-sm leading-relaxed text-stone-600">{children}</div></section>;
}

class ReportErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <ReportMessage title="Het verslag kon niet worden geladen"><p>Controleer je verbinding en probeer het opnieuw.</p><button type="button" onClick={() => this.setState({ failed: false })} className={`${buttonClass} mt-4`}>Opnieuw proberen</button></ReportMessage>;
    return this.props.children;
  }
}
