"use client";

import { TeamLogo } from "@/components/TeamLogo";

export type StandingRowData = {
  position: number;
  teamName: string;
  clubLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isOwnClub: boolean;
};

interface StandingsRowProps {
  row: StandingRowData;
  isOwnTeam: boolean;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function StandingsRow({ row, isOwnTeam }: StandingsRowProps) {
  // A poule can hold a sibling DIA team; mark it softly so parents recognise it
  // without confusing it with the team whose page they opened.
  const emphasis = isOwnTeam
    ? "bg-dia-green/20 font-semibold"
    : row.isOwnClub
      ? "bg-dia-green/5"
      : "";

  return (
    <tr className={`border-b border-gray-50 last:border-0 ${emphasis}`}>
      <td className="py-2 pl-3 pr-1 text-gray-500 tabular-nums">
        {row.position}
      </td>
      <td className="py-2 px-1">
        <span className="flex items-center gap-2">
          <TeamLogo
            logoUrl={row.clubLogoUrl}
            teamName={row.teamName}
            size="sm"
            className="shrink-0"
          />
          <span className="truncate">{row.teamName}</span>
        </span>
      </td>
      <td className="py-2 px-1 text-right tabular-nums">{row.played}</td>
      <td className="hidden py-2 px-1 text-right tabular-nums sm:table-cell">
        {row.won}
      </td>
      <td className="hidden py-2 px-1 text-right tabular-nums sm:table-cell">
        {row.drawn}
      </td>
      <td className="hidden py-2 px-1 text-right tabular-nums sm:table-cell">
        {row.lost}
      </td>
      <td className="py-2 px-1 text-right tabular-nums text-gray-500">
        {signed(row.goalDifference)}
      </td>
      <td className="py-2 pl-1 pr-3 text-right tabular-nums">{row.points}</td>
    </tr>
  );
}
