"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminDashboardControls } from "@/components/AdminDashboardControls";
import { RefereeDashboard } from "@/components/referee/RefereeDashboard";
import { useRoleViewMode } from "@/hooks/useRoleViewMode";
import { activeSeasonKey } from "@/lib/season";
import {
  EMPTY_ADMIN_VIEW_FILTERS,
  filterAdminMatches,
  uniqueTeamsFromMatches,
} from "@/lib/adminViewFilters";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function ScheidsrechterPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Scheidsrechter toegang</h1>
          <p className="text-sm text-gray-600">
            Deze omgeving verwacht Clerk-login via e-mail en rollen.
          </p>
          <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-black">
            Terug naar home
          </Link>
        </div>
      </main>
    );
  }

  return <RefereePageWithClerk />;
}

function RefereePageWithClerk() {
  const access = useQuery(api.userQueries.getMyRoles);

  if (access === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-600">Scheidsrechterdashboard laden...</p>
      </main>
    );
  }

  return <RefereePageReady roles={access.roles} />;
}

function RefereePageReady({ roles }: { roles: string[] }) {
  const { signOut } = useClerk();
  const isAdmin = roles.includes("admin");
  const hasOwnRole = roles.includes("referee");
  const [viewMode, setViewMode] = useRoleViewMode("referee", {
    isAdmin,
    hasOwnRole,
  });
  const [filters, setFilters] = useState(EMPTY_ADMIN_VIEW_FILTERS);

  const data = useQuery(api.matches.getMatchesForReferee, {
    seasonKey: isAdmin && viewMode === "admin" ? activeSeasonKey() : undefined,
  });

  const filteredMatches = useMemo(() => {
    if (!data || !data.viewingAsAdmin) return data?.matches ?? [];
    return filterAdminMatches(data.matches, filters);
  }, [data, filters]);

  if (data === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-600">Scheidsrechterdashboard laden...</p>
      </main>
    );
  }

  const toolbar = isAdmin ? (
    <AdminDashboardControls
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      ownLabel="Scheidsrechter"
      hasOwnRole={hasOwnRole}
      filters={filters}
      onFiltersChange={setFilters}
      teams={uniqueTeamsFromMatches(data?.matches ?? [])}
      matchCount={filteredMatches.length}
      totalCount={data?.matches.length ?? 0}
    />
  ) : undefined;

  if (data === null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
          {toolbar}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold text-gray-900">Geen scheidsrechtertoegang</h1>
            <p className="text-sm text-gray-600">
              {isAdmin
                ? "Dit account is niet gekoppeld aan een scheidsrechter. Kies Admin om wedstrijden te zoeken."
                : "Dit account heeft geen actieve scheidsrechter-rol of is nog niet gekoppeld aan een scheidsrechterrecord."}
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
      </main>
    );
  }

  return (
    <RefereeDashboard
      refereeName={data.referee.name}
      assignedMatches={filteredMatches}
      viewingAsAdmin={data.viewingAsAdmin === true}
      toolbar={toolbar}
      onLogout={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
