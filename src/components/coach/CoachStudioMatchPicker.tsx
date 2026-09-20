"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { activeSeasonKey } from "@/lib/season";
import type { DashboardMatch } from "@/components/coach/DashboardMatchCard";

interface CoachStudioMatchPickerProps {
  title: string;
  subtitle: string;
  blurbTitle: string;
  blurb: string;
  actionLabel: string;
  hrefFor: (match: DashboardMatch) => string;
}

/** Shared match picker for PC studio pages (Presenteren / Plannen). */
export function CoachStudioMatchPicker({
  title,
  subtitle,
  blurbTitle,
  blurb,
  actionLabel,
  hrefFor,
}: CoachStudioMatchPickerProps) {
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
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Wedstrijden laden…</p>
      </main>
    );
  }

  if (!coachData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Geen coachtoegang.</p>
      </main>
    );
  }

  const matches = (coachData.matches ?? []).filter(
    (match) => match.status !== "finished"
  ) as DashboardMatch[];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-dia-green p-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/coach"
              className="-ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-white/10"
              aria-label="Terug naar coach"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{title}</h1>
              <p className="text-sm text-white/80">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut({ redirectUrl: "/" });
            }}
            className="min-h-[44px] rounded-lg bg-white/10 px-3 py-2 text-sm font-medium"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">{blurbTitle}</p>
          <p>{blurb}</p>
        </div>

        {matches.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            Geen openstaande wedstrijden. Maak er een aan in het coachdashboard.
          </p>
        ) : (
          matches.map((match) => {
            const teamName =
              coachData.teams.find((team) => team.id === match.teamId)?.name ??
              "Team";
            const code = match.publicCode.toUpperCase();
            return (
              <article
                key={match._id}
                className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div>
                  <StatusBadge status={match.status} size="sm" />
                  <h2 className="mt-2 font-bold text-gray-900">
                    {teamName} {match.isHome ? "vs" : "@"} {match.opponent}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-gray-500">{code}</p>
                </div>
                <Link
                  href={hrefFor(match)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-dia-green px-4 py-3 text-sm font-semibold text-white"
                >
                  {actionLabel}
                </Link>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
