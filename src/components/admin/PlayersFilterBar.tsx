"use client";

import { POSITIONS } from "@/lib/positions";
import type { ActiveListFilter } from "@/lib/admin/adminListFilters";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: ActiveListFilter;
  onActiveFilterChange: (value: ActiveListFilter) => void;
  position: string;
  onPositionChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
};

export function PlayersFilterBar({
  search,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  position,
  onPositionChange,
  visibleCount,
  totalCount,
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-slate-600">
          {visibleCount}/{totalCount} spelers zichtbaar
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Zoek naam, rugnummer of positie…"
          className="min-h-[44px] w-full max-w-sm rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-dia-green"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          Status
          <select
            value={activeFilter}
            onChange={(e) =>
              onActiveFilterChange(e.target.value as ActiveListFilter)
            }
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="actief">Alleen actief</option>
            <option value="inactief">Alleen inactief</option>
            <option value="alle">Alle (incl. inactief)</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Positie
          <select
            value={position}
            onChange={(e) => onPositionChange(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Alle posities</option>
            {POSITIONS.map((pos) => (
              <option key={pos.code} value={pos.code}>
                {pos.code} — {pos.nameDutch}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
