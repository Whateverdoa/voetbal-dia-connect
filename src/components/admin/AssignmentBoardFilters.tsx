"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type {
  AssignmentBoardStatusFilter,
  AssignmentBoardVenueFilter,
} from "@/lib/admin/assignmentBoard";
import type {
  AssignmentBoardDateWindowFilter,
  AssignmentBoardRefereeNeedFilter,
} from "@/lib/admin/assignmentBoardWindowFilters";

export function AssignmentBoardFilters({
  searchTerm,
  onSearchTermChange,
  venueFilter,
  onVenueFilterChange,
  teamFilter,
  onTeamFilterChange,
  teamOptions,
  refereeNeedFilter,
  onRefereeNeedFilterChange,
  dateWindowFilter,
  onDateWindowFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  venueFilter: AssignmentBoardVenueFilter;
  onVenueFilterChange: (value: AssignmentBoardVenueFilter) => void;
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  teamOptions: string[];
  refereeNeedFilter: AssignmentBoardRefereeNeedFilter;
  onRefereeNeedFilterChange: (value: AssignmentBoardRefereeNeedFilter) => void;
  dateWindowFilter: AssignmentBoardDateWindowFilter;
  onDateWindowFilterChange: (value: AssignmentBoardDateWindowFilter) => void;
  statusFilter: AssignmentBoardStatusFilter;
  onStatusFilterChange: (value: AssignmentBoardStatusFilter) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px_220px_220px]">
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Zoek op club, team, tegenstander, code of scheidsrechter"
          className="w-full rounded-2xl border border-white/70 bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
        />
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-500">
        <SlidersHorizontal size={16} className="text-slate-400" />
        <select value={venueFilter} onChange={(event) => onVenueFilterChange(event.target.value as AssignmentBoardVenueFilter)} className="w-full bg-transparent text-sm text-slate-700 outline-none">
          <option value="thuis">Thuiswedstrijden</option>
          <option value="alle">Alle wedstrijden</option>
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-500">
        <SlidersHorizontal size={16} className="text-slate-400" />
        <select value={teamFilter} onChange={(event) => onTeamFilterChange(event.target.value)} className="w-full bg-transparent text-sm text-slate-700 outline-none">
          <option value="alle">Alle teams</option>
          {teamOptions.map((teamName) => (
            <option key={teamName} value={teamName}>{teamName}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-500">
        <SlidersHorizontal size={16} className="text-slate-400" />
        <select value={refereeNeedFilter} onChange={(event) => onRefereeNeedFilterChange(event.target.value as AssignmentBoardRefereeNeedFilter)} className="w-full bg-transparent text-sm text-slate-700 outline-none">
          <option value="scheids-nodig">Alleen scheids nodig</option>
          <option value="coach-fluit-onder10">JO&lt;10 (coach fluit)</option>
          <option value="alle">Alles tonen</option>
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-500">
        <SlidersHorizontal size={16} className="text-slate-400" />
        <select value={dateWindowFilter} onChange={(event) => onDateWindowFilterChange(event.target.value as AssignmentBoardDateWindowFilter)} className="w-full bg-transparent text-sm text-slate-700 outline-none">
          <option value="huidige-speelweek">Huidige speelweek</option>
          <option value="drie-weekenden">Eerste 3 weekenden</option>
          <option value="alles">Alles (incl. oud)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-500">
        <SlidersHorizontal size={16} className="text-slate-400" />
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as AssignmentBoardStatusFilter)} className="w-full bg-transparent text-sm text-slate-700 outline-none">
          <option value="alle">Alle statussen</option>
          <option value="gepland">Alleen gepland</option>
          <option value="live">Alleen live</option>
          <option value="afgelopen">Alleen afgelopen</option>
          <option value="zonder-scheidsrechter">Zonder scheidsrechter</option>
        </select>
      </label>
    </div>
  );
}
