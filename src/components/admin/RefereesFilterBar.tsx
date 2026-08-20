"use client";

import {
  REFEREE_QUALIFICATION_PRESETS,
  normalizeQualificationTags,
} from "@/lib/admin/assignmentBoard";
import type {
  RefereePoolActiveFilter,
  RefereePoolMembershipFilter,
  RefereePoolTagsFilter,
} from "@/lib/admin/refereePoolFilters";

export function RefereesFilterBar({
  search,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  membershipFilter,
  onMembershipFilterChange,
  tagsFilter,
  onTagsFilterChange,
  requiredTags,
  onRequiredTagsChange,
  summary,
  visibleCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: RefereePoolActiveFilter;
  onActiveFilterChange: (value: RefereePoolActiveFilter) => void;
  membershipFilter: RefereePoolMembershipFilter;
  onMembershipFilterChange: (value: RefereePoolMembershipFilter) => void;
  tagsFilter: RefereePoolTagsFilter;
  onTagsFilterChange: (value: RefereePoolTagsFilter) => void;
  requiredTags: string[];
  onRequiredTagsChange: (tags: string[]) => void;
  summary: {
    total: number;
    inPoule: number;
    active: number;
    withoutTags: number;
  };
  visibleCount: number;
}) {
  function toggleRequiredTag(tag: string) {
    const next = requiredTags.includes(tag)
      ? requiredTags.filter((t) => t !== tag)
      : normalizeQualificationTags([...requiredTags, tag]);
    onRequiredTagsChange(next);
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dia-black">
            Scheidsrechterspoule
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {summary.inPoule} in claimpoule · {summary.active} actief ·{" "}
            {summary.withoutTags} zonder tags · {visibleCount}/{summary.total}{" "}
            zichtbaar
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Zoek naam, e-mail of tag…"
          className="min-h-[44px] w-full max-w-sm rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-dia-green sm:w-72"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-600">
          Status
          <select
            value={activeFilter}
            onChange={(e) =>
              onActiveFilterChange(e.target.value as RefereePoolActiveFilter)
            }
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="alle">Alle</option>
            <option value="actief">Actief</option>
            <option value="inactief">Inactief</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Claimpoule
          <select
            value={membershipFilter}
            onChange={(e) =>
              onMembershipFilterChange(
                e.target.value as RefereePoolMembershipFilter
              )
            }
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="alle">Alle records</option>
            <option value="in-poule">Alleen in poule</option>
            <option value="buiten-poule">Buiten poule</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Kwalificaties
          <select
            value={tagsFilter}
            onChange={(e) =>
              onTagsFilterChange(e.target.value as RefereePoolTagsFilter)
            }
            className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="alle">Alle</option>
            <option value="met-tags">Met tags</option>
            <option value="zonder-tags">Zonder tags</option>
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500">
          Filter op leeftijd/veld (minstens één)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REFEREE_QUALIFICATION_PRESETS.map((tag) => {
            const active = requiredTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleRequiredTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-dia-green text-black"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {requiredTags.length > 0 && (
            <button
              type="button"
              onClick={() => onRequiredTagsChange([])}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 underline"
            >
              Tags wissen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
