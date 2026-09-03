"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { PresentTacticsBoard } from "@/components/presentation/PresentTacticsBoard";
import { StaffAccessFallback } from "@/components/presentation/StaffAccessFallback";
import {
  PresentStudio,
  parseStudioTab,
} from "@/components/presentation/PresentStudio";
import { useStaffPresentationAccess } from "@/hooks/useStaffPresentationAccess";
import { SHOW_SPELERSKAARTEN } from "@/lib/presentation/surfaces";

export default function PresentTeamPage() {
  const params = useParams();
  const search = useSearchParams();
  const slug = String(params.slug ?? "");
  const kiosk = search.get("kiosk") === "1";
  const pinnedCode = search.get("code")?.trim().toUpperCase() ?? "";
  const initialTab = parseStudioTab(search.get("tab"), "kleedkamer");
  const { rolesReady, allowed } = useStaffPresentationAccess();

  const team = useQuery(
    api.presentationQueries.getTeamPresentation,
    !rolesReady || !allowed ? "skip" : { teamSlug: slug }
  );
  const matchCode = pinnedCode || team?.liveMatch?.publicCode || "";
  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    matchCode && allowed ? { publicCode: matchCode } : "skip"
  );
  const deck = useQuery(
    api.presentationQueries.getTeamDeckPublic,
    SHOW_SPELERSKAARTEN && match ? { teamSlug: match.teamSlug } : "skip"
  );

  const accessScreen = (
    <StaffAccessFallback
      rolesReady={rolesReady}
      allowed={allowed}
      deniedBody="Opstelling is alleen voor coaches en admins."
    />
  );
  if (!rolesReady || !allowed) return accessScreen;

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
