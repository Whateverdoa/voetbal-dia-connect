"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { StaffAccessFallback } from "@/components/presentation/StaffAccessFallback";
import {
  PresentStudio,
  parseStudioTab,
} from "@/components/presentation/PresentStudio";
import { useStaffPresentationAccess } from "@/hooks/useStaffPresentationAccess";
import { SHOW_SPELERSKAARTEN } from "@/lib/presentation/surfaces";

export default function PresentMatchKleedkamerPage() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code ?? "").toUpperCase();
  const kiosk = search.get("kiosk") === "1";
  const initialTab = parseStudioTab(search.get("tab"), "kleedkamer");
  const { rolesReady, allowed } = useStaffPresentationAccess();

  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    !rolesReady || !allowed ? "skip" : { publicCode: code }
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

  if (match === undefined) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Opstelling laden…</p>
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
      subtitle={`Presentatie · ${match.status} · code ${match.publicCode}`}
      kiosk={kiosk}
    >
      <PresentStudio
        match={match}
        deck={deck}
        kiosk={kiosk}
        initialTab={initialTab}
      />
    </PresentationShell>
  );
}
