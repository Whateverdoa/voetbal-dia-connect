"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import {
  PresentStudio,
  parseStudioTab,
} from "@/components/presentation/PresentStudio";
import { canPresentTactics } from "@/lib/auth/roles";

export default function PresentMatchTacticsPage() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code ?? "").toUpperCase();
  const kiosk = search.get("kiosk") === "1";
  const initialTab = parseStudioTab(search.get("tab"), "tactiek");

  const { isLoaded, isSignedIn } = useUser();
  const access = useQuery(api.userQueries.getMyRoles);
  const rolesReady = isLoaded && access !== undefined;
  const allowed =
    isSignedIn === true && canPresentTactics(access?.roles ?? []);
  const match = useQuery(
    api.presentationQueries.getMatchPresentation,
    !rolesReady || !allowed ? "skip" : { publicCode: code }
  );
  const deck = useQuery(
    api.presentationQueries.getTeamDeckPublic,
    match ? { teamSlug: match.teamSlug } : "skip"
  );

  if (!rolesReady) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Toegang controleren…</p>
      </PresentationShell>
    );
  }

  if (!allowed) {
    return (
      <PresentationShell title="Geen toegang">
        <p className="text-slate-400 text-center py-8">
          Tactiek is alleen voor coaches en admins.
        </p>
        <div className="flex justify-center">
          <Link
            href="/sign-in"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-dia-yellow px-5 py-3 font-semibold text-black"
          >
            Inloggen
          </Link>
        </div>
      </PresentationShell>
    );
  }

  if (match === undefined) {
    return (
      <PresentationShell title="Laden…">
        <p className="text-slate-400">Presentatie laden…</p>
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
      subtitle={`Presentatie · ${match.publicCode}`}
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
