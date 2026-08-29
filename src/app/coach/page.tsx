"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AdminDashboardControls } from "@/components/AdminDashboardControls";
import { CoachDashboard } from "@/components/CoachDashboard";
import { useRoleViewMode } from "@/hooks/useRoleViewMode";
import { activeSeasonKey } from "@/lib/season";
import {
  EMPTY_ADMIN_VIEW_FILTERS,
  filterAdminMatches,
  filterAdminTeams,
} from "@/lib/adminViewFilters";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function CoachPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-dia-green text-black p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">DIA Wedstrijduitslagen Live</h1>
              <p className="text-sm text-white/80">Coach toegang</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Inloggen is nog niet actief</h2>
            <p className="text-sm text-gray-600">
              Deze omgeving verwacht Clerk-login via e-mail en rollen. Configureer Clerk om coachtoegang te gebruiken.
            </p>
            <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-black">
              Terug naar home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <CoachPageWithClerk />;
}

function CoachPageWithClerk() {
  const access = useQuery(api.userQueries.getMyRoles);

  if (access === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600">Coachdashboard laden...</p>
      </main>
    );
  }

  return <CoachPageReady roles={access.roles} />;
}

function CoachPageReady({ roles }: { roles: string[] }) {
  const { signOut } = useClerk();
  const isAdmin = roles.includes("admin");
  const hasOwnRole = roles.includes("coach");
  const [viewMode, setViewMode] = useRoleViewMode("coach", { isAdmin, hasOwnRole });
  const [filters, setFilters] = useState(EMPTY_ADMIN_VIEW_FILTERS);

  const coachData = useQuery(api.matches.verifyCoachAccess, {
    seasonKey: isAdmin && viewMode === "admin" ? activeSeasonKey() : undefined,
  });

  const filteredData = useMemo(() => {
    if (!coachData || !coachData.viewingAsAdmin) return coachData;
    const matches = filterAdminMatches(coachData.matches, filters);
    const teams = filterAdminTeams(coachData.teams, matches, filters.teamId);
    return { ...coachData, matches, teams };
  }, [coachData, filters]);

  if (coachData === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600">Coachdashboard laden...</p>
      </main>
    );
  }

  const toolbar = isAdmin ? (
    <AdminDashboardControls
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      ownLabel="Coach"
      hasOwnRole={hasOwnRole}
      filters={filters}
      onFiltersChange={setFilters}
      teams={coachData?.teams ?? []}
      matchCount={filteredData?.matches.length ?? 0}
      totalCount={coachData?.matches.length ?? 0}
    />
  ) : undefined;

  if (!filteredData) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-dia-green text-black p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">DIA Wedstrijduitslagen Live</h1>
              <p className="text-sm text-white/80">Coach toegang</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
            {toolbar}
            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">Geen coachtoegang</h2>
              <p className="text-sm text-gray-600">
                {isAdmin
                  ? "Dit account is niet gekoppeld aan een coach. Kies Admin om wedstrijden te zoeken."
                  : "Dit account heeft geen actieve coach-rol of is nog niet gekoppeld aan een team."}
              </p>
            </div>
            {!isAdmin && (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-black"
                >
                  Naar inloggen
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void signOut({ redirectUrl: "/" });
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
                >
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <CoachDashboard
      data={filteredData}
      toolbar={toolbar}
      onLogout={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
