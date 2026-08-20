"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { TeamDeckGrid } from "@/components/cards/TeamDeckGrid";
import { getFormation } from "@/lib/formations";
import Link from "next/link";

type Tab = "opstelling" | "deck";

export default function PresentTeamPage() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params.slug ?? "");
  const kiosk = search.get("kiosk") === "1";
  const [tab, setTab] = useState<Tab>("opstelling");

  const team = useQuery(api.presentationQueries.getTeamPresentation, {
    teamSlug: slug,
  });
  const deck = useQuery(api.presentationQueries.getTeamDeckPublic, {
    teamSlug: slug,
  });
  const matchCode = team?.liveMatch?.publicCode;
  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    matchCode ? { publicCode: matchCode } : "skip"
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

  const formation = getFormation(match?.formationId ?? undefined);

  return (
    <PresentationShell
      title={team.teamName}
      subtitle={
        team.liveMatch
          ? `vs ${team.liveMatch.opponent} · ${team.liveMatch.status}`
          : "Kleedkamer — tactiekbord"
      }
      kiosk={kiosk}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={tab === "opstelling"} onClick={() => setTab("opstelling")}>
          Opstelling
        </TabButton>
        {team.isSelectionTeam ? (
          <TabButton active={tab === "deck"} onClick={() => setTab("deck")}>
            Teamdeck
          </TabButton>
        ) : null}
        {team.liveMatch ? (
          <Link
            href={`/present/team/${slug}/live${kiosk ? "?kiosk=1" : ""}`}
            className="ml-auto px-4 py-2 rounded-lg bg-dia-yellow text-black hover:bg-dia-yellow-deep font-semibold min-h-[48px] flex items-center"
          >
            Kantine live →
          </Link>
        ) : null}
      </div>

      {tab === "opstelling" ? (
        match ? (
          <PresentationPitchView
            players={match.players}
            formationId={match.formationId ?? undefined}
            resolvedFormation={formation}
          />
        ) : (
          <p className="text-slate-400 text-center py-16">
            Geen actieve wedstrijd voor dit team. Start of open een wedstrijd als coach.
          </p>
        )
      ) : (
        <TeamDeckGrid players={deck ?? []} />
      )}
    </PresentationShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold min-h-[48px] ${
        active ? "bg-white text-slate-900" : "bg-slate-800 text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
