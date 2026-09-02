"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { MatchList, SeasonSummary } from "@/components/history";
import { StandingsTable } from "@/components/standings";
import { isTeamTabId, TeamTabs, type TeamTabId } from "@/components/team/TeamTabs";
import { activeSeasonKey } from "@/lib/season";

/** Public team hub for parents: bond standing + played matches. */
export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = (params.slug as string).toLowerCase();

  const team = useQuery(api.teams.getBySlug, { teamSlug: slug });
  const seasonKey = activeSeasonKey();

  const tabParam = searchParams.get("tab");
  const activeTab: TeamTabId = isTeamTabId(tabParam) ? tabParam : "stand";

  const selectTab = (tab: TeamTabId) => {
    router.replace(`/team/${slug}?tab=${tab}`, { scroll: false });
  };

  if (team === undefined) return <LoadingScreen />;
  if (team === null) return <NotFoundScreen slug={slug} />;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-dia-green text-black">
        <div className="mx-auto max-w-lg px-4 py-4">
          <nav className="mb-2 flex items-center gap-1 text-sm text-dia-black/70">
            <Link href="/" className="hover:text-dia-black">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/teams" className="hover:text-dia-black">
              Teams
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-dia-black">{team.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-dia-black/70">
                {team.clubName} · seizoen {seasonKey}
              </p>
            </div>
            <Link
              href="/teams"
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-dia-black px-3 text-sm font-semibold text-dia-yellow"
            >
              <Users className="h-4 w-4" />
              Ander team
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <TeamTabs active={activeTab} onSelect={selectTab} />

        {activeTab === "stand" ? (
          <StandingsTable teamSlug={team.slug} teamName={team.name} />
        ) : (
          <>
            <SeasonSummary teamId={team.id} seasonKey={seasonKey} />
            <MatchList teamId={team.id} seasonKey={seasonKey} />
          </>
        )}
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dia-black">
      <div className="text-center text-white">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        <p className="mt-4">Team laden...</p>
      </div>
    </main>
  );
}

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <h1 className="mb-2 text-xl font-bold">Team niet gevonden</h1>
        <p className="mb-6 text-gray-500">
          Team <span className="font-mono font-bold">{slug}</span> bestaat niet.
        </p>
        <Link
          href="/teams"
          className="inline-block rounded-lg bg-dia-green px-6 py-3 font-medium text-black"
        >
          Alle teams
        </Link>
      </div>
    </main>
  );
}
