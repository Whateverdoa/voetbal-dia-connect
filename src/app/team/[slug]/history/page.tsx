"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SeasonSummary, MatchList } from "@/components/history";

export default function TeamHistoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const team = useQuery(api.teams.getBySlug, { teamSlug: slug });

  if (team === undefined) {
    return <LoadingScreen />;
  }

  if (team === null) {
    return <NotFoundScreen slug={slug} />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dia-green text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-green-200 mb-2">
            <Link href="/" className="hover:text-white">
              DIA
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{team.name}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Geschiedenis</span>
          </nav>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-green-200">{team.clubName}</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <SeasonSummary teamId={team.id} />
        <MatchList teamId={team.id} />
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dia-green to-green-800">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4">Team laden...</p>
      </div>
    </main>
  );
}

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Team niet gevonden</h1>
        <p className="text-gray-500 mb-6">
          Team <span className="font-mono font-bold">{slug}</span> bestaat niet.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-dia-green text-white rounded-lg font-medium"
        >
          Terug naar home
        </Link>
      </div>
    </main>
  );
}
