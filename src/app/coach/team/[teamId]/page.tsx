"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TeamRosterEditor } from "@/components/coach/TeamRosterEditor";

export default function CoachTeamRosterPage() {
  const params = useParams();
  const teamId = String(params.teamId ?? "") as Id<"teams">;

  const setup = useQuery(
    api.coachQueries.getCoachTeamSetup,
    teamId ? { teamId } : "skip"
  );

  if (setup === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Selectie laden…</p>
      </main>
    );
  }

  if (setup === null) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-dia-green text-black p-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Link href="/coach" className="p-2 -ml-2 rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">Geen toegang</h1>
          </div>
        </header>
        <p className="p-6 text-center text-gray-600">
          Dit team bestaat niet of je hebt er geen coachrechten voor.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-dia-green text-black sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/coach"
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Terug naar coachdashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{setup.team.name}</h1>
            <p className="text-sm text-white/80">Rugnummer &amp; positie</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-sm text-gray-600 mb-4">
          Pas rugnummers en posities aan voor je selectie. Namen en actief/inactief blijven bij de admin.
        </p>
        <TeamRosterEditor players={setup.players} />
      </div>
    </main>
  );
}
