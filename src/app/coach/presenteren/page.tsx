"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { activeSeasonKey } from "@/lib/season";
import type { DashboardMatch } from "@/components/coach/DashboardMatchCard";

export default function CoachPresenterenPage() {
  const { signOut } = useClerk();
  const access = useQuery(api.userQueries.getMyRoles);
  const isAdmin = access?.roles.includes("admin") === true;
  const coachData = useQuery(
    api.matches.verifyCoachAccess,
    access === undefined
      ? "skip"
      : { seasonKey: isAdmin ? activeSeasonKey() : undefined }
  );

  if (access === undefined || coachData === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Wedstrijden laden…</p>
      </main>
    );
  }

  if (!coachData) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Geen coachtoegang.</p>
      </main>
    );
  }

  const matches = (coachData?.matches ?? []).filter(
    (match) => match.status !== "finished"
  ) as DashboardMatch[];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-dia-green text-black p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/coach"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Terug naar coach"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Presenteren</h1>
              <p className="text-sm text-black/70">Kies welke wedstrijd je toont</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut({ redirectUrl: "/" });
            }}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-white/10 min-h-[44px]"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-gray-600">
          Eén presentatie met tabs: Tactiek (vrij sleepbord), Kleedkamer
          (opstelling en wisselplan) en Spelerskaarten. Kantine is de TV-weergave.
        </p>

        {matches.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            Geen openstaande wedstrijden. Maak er een aan in het coachdashboard.
          </p>
        ) : (
          matches.map((match) => {
            const teamName =
              coachData?.teams.find((team) => team.id === match.teamId)?.name ??
              "Team";
            const code = match.publicCode.toUpperCase();
            return (
              <article
                key={match._id}
                className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <StatusBadge status={match.status} size="sm" />
                    <h2 className="font-bold text-gray-900 mt-2">
                      {teamName} {match.isHome ? "vs" : "@"} {match.opponent}
                    </h2>
                    <p className="text-xs font-mono text-gray-500 mt-1">{code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link
                    href={`/present/match/${code}/tactiek`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-dia-green px-4 py-3 text-sm font-semibold text-black"
                  >
                    Toon tactiek
                  </Link>
                  <Link
                    href={`/present/match/${code}/kleedkamer`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-dia-black px-4 py-3 text-sm font-semibold text-dia-black"
                  >
                    Toon kleedkamer
                  </Link>
                  <Link
                    href={`/present/match/${code}`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    Kantine / TV
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
