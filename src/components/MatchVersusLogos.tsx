"use client";

import { TeamLogo } from "@/components/TeamLogo";
import { resolveLogoUrl } from "@/lib/logos";

export interface MatchVersusLogosProps {
  isHome: boolean;
  teamName: string;
  opponent: string;
  teamLogoUrl?: string | null;
  clubLogoUrl?: string | null;
  opponentLogoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/** Compact home vs away logos (DIA team + opponent), same resolution as public live header. */
export function MatchVersusLogos({
  isHome,
  teamName,
  opponent,
  teamLogoUrl,
  clubLogoUrl,
  opponentLogoUrl,
  size = "sm",
  className = "",
}: MatchVersusLogosProps) {
  const dia = resolveLogoUrl(teamLogoUrl, clubLogoUrl);
  const opp = opponentLogoUrl ?? null;
  const homeLogo = isHome ? dia : opp;
  const awayLogo = isHome ? opp : dia;
  const homeName = isHome ? teamName : opponent;
  const awayName = isHome ? opponent : teamName;

  return (
    <div className={`flex items-center justify-center gap-1.5 sm:gap-2 ${className}`}>
      <TeamLogo logoUrl={homeLogo} teamName={homeName} size={size} className="flex-shrink-0" />
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
        vs
      </span>
      <TeamLogo logoUrl={awayLogo} teamName={awayName} size={size} className="flex-shrink-0" />
    </div>
  );
}
