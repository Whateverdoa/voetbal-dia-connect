"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { PresentTacticsBoard } from "@/components/presentation/PresentTacticsBoard";
import {
  PresentStudio,
  parseStudioTab,
} from "@/components/presentation/PresentStudio";

export default function PresentTeamPage() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params.slug ?? "");
  const kiosk = search.get("kiosk") === "1";
  const pinnedCode = search.get("code")?.trim().toUpperCase() ?? "";
  const initialTab = parseStudioTab(search.get("tab"), "kleedkamer");

  const team = useQuery(api.presentationQueries.getTeamPresentation, {
    teamSlug: slug,
  });
  const matchCode = pinnedCode || team?.liveMatch?.publicCode || "";
  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    matchCode ? { publicCode: matchCode } : "skip"
  );
  const deck = useQuery(
    api.presentationQueries.getTeamDeckPublic,
    match ? { teamSlug: match.teamSlug } : "skip"
  );

  if (team === undefined) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Presentatie laden…</p>
      </PresentationShell>
    );
  }

  if (team === null) {
    return (
      <PresentationShell title="Team niet gevonden">
        <p className="text-slate-400">Onbekend team: {slug}</p>
      </PresentationShell>
    );
  }

  return (
    <PresentationShell
      title={team.teamName}
      subtitle={
        match
          ? `vs ${match.opponent} · ${match.status}`
          : "Kies een wedstrijd via Coach → Presenteren"
      }
      kiosk={kiosk}
    >
      {match ? (
        <PresentStudio
          match={match}
          deck={deck}
          kiosk={kiosk}
          initialTab={initialTab}
        />
      ) : (
        <PresentTacticsBoard match={null} kiosk={kiosk} />
      )}
    </PresentationShell>
  );
}
