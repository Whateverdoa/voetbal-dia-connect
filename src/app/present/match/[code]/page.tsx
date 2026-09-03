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

export default function PresentMatchPage() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code ?? "").toUpperCase();
  const kiosk = search.get("kiosk") === "1";
  const [pitchLayout, setPitchLayout] = usePitchLayout();

  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    SHOW_KANTINE ? { publicCode: code } : "skip"
  );

  if (!SHOW_KANTINE) {
    return (
      <UnavailablePresentationSurface
        title="Kantine"
        body="Kantine-weergave is tijdelijk uitgeschakeld."
      />
    );
  }

  if (match === undefined) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Wedstrijd laden…</p>
      </PresentationShell>
    );
  }

  if (match === null) {
    return (
      <PresentationShell title="Niet gevonden">
        <p className="text-slate-400">Geen wedstrijd met code {code}</p>
      </PresentationShell>
    );
  }

  return (
    <PresentationShell
      title={`${match.teamName} vs ${match.opponent}`}
      subtitle={`Code ${match.publicCode}`}
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
