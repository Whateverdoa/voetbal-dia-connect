"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import {
  PresentStudio,
  parseStudioTab,
} from "@/components/presentation/PresentStudio";

export default function PresentMatchKleedkamerPage() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code ?? "").toUpperCase();
  const kiosk = search.get("kiosk") === "1";
  const initialTab = parseStudioTab(search.get("tab"), "kleedkamer");

  const match = useQuery(api.presentationQueries.getMatchPresentation, {
    publicCode: code,
  });
  const deck = useQuery(
    api.presentationQueries.getTeamDeckPublic,
    match ? { teamSlug: match.teamSlug } : "skip"
  );

  if (match === undefined) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Kleedkamer laden…</p>
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
