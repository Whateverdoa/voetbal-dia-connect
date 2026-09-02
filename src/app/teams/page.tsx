"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { TeamDirectoryList } from "@/components/team/TeamDirectoryList";
import { filterTeams, groupTeamsByCategory } from "@/lib/teamDirectory";

/** Public team directory: look up any DIA team's standing and results. */
export default function TeamsPage() {
  const teams = useQuery(api.teams.listPublicTeams);
  const [search, setSearch] = useState("");

  const groups = useMemo(
    () => (teams ? groupTeamsByCategory(filterTeams(teams, search)) : []),
    [teams, search]
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-dia-green text-black">
        <div className="mx-auto max-w-lg px-4 py-4">
          <nav className="mb-2 flex items-center gap-1 text-sm text-dia-black/70">
            <Link href="/" className="hover:text-dia-black">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-dia-black">Teams</span>
          </nav>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-dia-black/70">
            Zoek een team voor de stand en de gespeelde wedstrijden.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek team, bijvoorbeeld JO13-2"
            aria-label="Zoek team"
            className="min-h-[52px] w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-base shadow-sm focus:border-dia-green focus:outline-none"
          />
        </label>

        <TeamDirectoryList
          groups={groups}
          isLoading={teams === undefined}
          search={search}
        />
      </div>
    </main>
  );
}
