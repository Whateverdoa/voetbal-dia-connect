"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { TeamLogo } from "@/components/TeamLogo";
import { resolveLogoUrl } from "@/lib/logos";

function formatDate(timestamp?: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RefereeOpenMatchCard({
  match,
  onClaim,
  busy,
}: {
  match: {
    id: Id<"matches">;
    opponent: string;
    isHome: boolean;
    scheduledAt?: number;
    teamName: string;
    teamLogoUrl?: string;
    clubLogoUrl?: string;
    opponentLogoUrl?: string;
  };
  onClaim: () => void;
  busy: boolean;
}) {
  const homeName = match.isHome ? match.teamName : match.opponent;
  const awayName = match.isHome ? match.opponent : match.teamName;
  const dia = resolveLogoUrl(match.teamLogoUrl, match.clubLogoUrl);
  const opp = match.opponentLogoUrl ?? null;

  return (
    <div className="rounded-xl bg-white shadow-md overflow-hidden">
      <div className="px-4 py-2 bg-dia-green-light text-xs font-semibold text-dia-black">
        Beschikbaar · {formatDate(match.scheduledAt)}
      </div>
      <div className="px-4 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo logoUrl={match.isHome ? dia : opp} teamName={homeName} size="sm" />
          <span className="text-sm font-semibold truncate">{homeName}</span>
        </div>
        <span className="text-gray-400 text-sm">vs</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">{awayName}</span>
          <TeamLogo logoUrl={match.isHome ? opp : dia} teamName={awayName} size="sm" />
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onClaim}
        className="w-full min-h-[48px] bg-dia-green text-black text-sm font-semibold disabled:opacity-60"
      >
        Claim deze wedstrijd
      </button>
    </div>
  );
}
