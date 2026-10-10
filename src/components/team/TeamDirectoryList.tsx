"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import type { DirectoryTeam } from "@/lib/teamDirectory";

interface TeamDirectoryListProps {
  groups: { category: string; teams: DirectoryTeam[] }[];
  isLoading: boolean;
  search: string;
}

export function TeamDirectoryList({
  groups,
  isLoading,
  search,
}: TeamDirectoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
        Geen team gevonden voor{" "}
        <span className="font-semibold">{search.trim()}</span>.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.category} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {group.category}
          </h2>
          <ul className="overflow-hidden rounded-xl bg-white shadow-sm">
            {group.teams.map((team) => (
              <li key={team.id} className="border-b border-gray-50 last:border-0">
                <Link
                  href={`/team/${team.slug}`}
                  className="flex min-h-[56px] items-center gap-3 px-3 py-2 hover:bg-gray-50"
                >
                  <TeamLogo
                    logoUrl={team.logoUrl}
                    teamName={team.name}
                    size="sm"
                  />
                  <span className="flex-1 font-semibold text-gray-900">
                    {team.name}
                  </span>
                  {team.hasStanding ? (
                    <span className="rounded-full bg-dia-green/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                      Stand
                    </span>
                  ) : null}
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
