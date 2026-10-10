"use client";

import { Id } from "@/convex/_generated/dataModel";

type Team = { _id: Id<"teams">; name: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  teamLinkFilter: "alle" | "met-team" | "zonder-team";
  onTeamLinkFilterChange: (value: "alle" | "met-team" | "zonder-team") => void;
  teams: Team[] | undefined;
  visibleCount: number;
  totalCount: number;
};

export function CoachesFilterBar({
  search,
  onSearchChange,
  teamFilter,
  onTeamFilterChange,
  teamLinkFilter,
  onTeamLinkFilterChange,
  teams,
  visibleCount,
  totalCount,
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dia-black">
            Coaches
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {visibleCount}/{totalCount} zichtbaar
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Zoek naam, e-mail of team…"
          className="min-h-[44px] w-full max-w-sm rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-dia-green"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          Team
          <select
            value={teamFilter}
            onChange={(e) => onTeamFilterChange(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Alle teams</option>
            {teams?.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Koppeling
          <select
            value={teamLinkFilter}
            onChange={(e) =>
              onTeamLinkFilterChange(
                e.target.value as "alle" | "met-team" | "zonder-team"
              )
            }
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="alle">Alle</option>
            <option value="met-team">Met team</option>
            <option value="zonder-team">Zonder team</option>
          </select>
        </label>
      </div>
    </div>
  );
}
