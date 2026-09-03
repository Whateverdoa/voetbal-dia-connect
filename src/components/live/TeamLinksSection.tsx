"use client";

import Link from "next/link";
import { ListOrdered, Trophy } from "lucide-react";

interface TeamLinksSectionProps {
  teamSlug: string;
  teamName: string;
}

/** Route parents from a live match to their team's standing and results. */
export function TeamLinksSection({
  teamSlug,
  teamName,
}: TeamLinksSectionProps) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-gray-900">Meer over {teamName}</h2>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/team/${teamSlug}?tab=stand`}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-dia-green px-3 py-2 text-center text-sm font-semibold text-white"
        >
          <Trophy className="h-5 w-5" />
          Stand
        </Link>
        <Link
          href={`/team/${teamSlug}?tab=wedstrijden`}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-dia-black px-3 py-2 text-center text-sm font-semibold text-dia-yellow"
        >
          <ListOrdered className="h-5 w-5" />
          Gespeelde wedstrijden
        </Link>
      </div>
    </section>
  );
}
