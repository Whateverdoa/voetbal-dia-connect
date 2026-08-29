"use client";

import type {
  AdminMatchStatusFilter,
  AdminViewFilters,
} from "@/lib/adminViewFilters";

export function AdminMatchFilterBar({
  filters,
  onChange,
  teams,
  matchCount,
  totalCount,
}: {
  filters: AdminViewFilters;
  onChange: (next: AdminViewFilters) => void;
  teams: { id: string; name: string }[];
  matchCount: number;
  totalCount: number;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <label className="block">
        <span className="sr-only">Zoek wedstrijd</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
          placeholder="Zoek team, tegenstander of code"
          className="min-h-[44px] w-full rounded-lg border border-gray-200 px-3 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="sr-only">Team</span>
          <select
            value={filters.teamId}
            onChange={(event) =>
              onChange({ ...filters, teamId: event.target.value })
            }
            className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">Alle teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as AdminMatchStatusFilter,
              })
            }
            className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="alle">Alle statussen</option>
            <option value="actief">Actief</option>
            <option value="gepland">Gepland</option>
            <option value="afgelopen">Afgelopen</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500">
        {matchCount} van {totalCount} wedstrijden
      </p>
    </div>
  );
}
