"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { LivePresentationBoard } from "@/components/presentation/LivePresentationBoard";
import { PitchLayoutToggle } from "@/components/presentation/PitchLayoutToggle";
import { UnavailablePresentationSurface } from "@/components/presentation/UnavailablePresentationSurface";
import { usePitchLayout } from "@/hooks/usePitchLayout";
import { SHOW_KANTINE } from "@/lib/presentation/surfaces";

export default function PresentTeamLivePage() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params.slug ?? "");
  const kiosk = search.get("kiosk") === "1";
  const [pitchLayout, setPitchLayout] = usePitchLayout();

  const team = useQuery(
    api.presentationQueries.getTeamPresentation,
    SHOW_KANTINE ? { teamSlug: slug } : "skip"
  );
  const matchCode = team?.liveMatch?.publicCode;
  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    SHOW_KANTINE && matchCode ? { publicCode: matchCode } : "skip"
  );

  if (!SHOW_KANTINE) {
    return (
      <UnavailablePresentationSurface
        title="Kantine"
        body="Kantine-weergave is tijdelijk uitgeschakeld."
      />
    );
  }

  if (team === undefined || (matchCode && match === undefined)) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Live presentatie laden…</p>
      </PresentationShell>
    );
  }

  if (!team || !match) {
    return (
      <PresentationShell title={team?.teamName ?? "Live"}>
        <p className="text-slate-400 text-center py-16">
          Geen live wedstrijd voor dit team.
        </p>
      </PresentationShell>
    );
  }

  return (
    <PresentationShell
      title={`${match.teamName} vs ${match.opponent}`}
      subtitle="Kantine · live"
      kiosk={kiosk}
      actions={
        <PitchLayoutToggle value={pitchLayout} onChange={setPitchLayout} />
      }
    >
      <LivePresentationBoard
        teamName={match.teamName}
        opponent={match.opponent}
        isHome={match.isHome}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        status={match.status}
        currentQuarter={match.currentQuarter}
        quarterCount={match.quarterCount}
        formationId={match.formationId}
        quarterStartedAt={match.quarterStartedAt}
        pausedAt={match.pausedAt}
        accumulatedPauseTime={match.accumulatedPauseTime}
        frozenClockMs={match.frozenClockMs}
        players={match.players}
        pitchLayout={pitchLayout}
      />
    </PresentationShell>
  );
}
