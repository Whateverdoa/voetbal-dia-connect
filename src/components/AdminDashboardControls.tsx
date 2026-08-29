"use client";

import { AdminMatchFilterBar } from "@/components/AdminMatchFilterBar";
import { RoleViewToggle } from "@/components/RoleViewToggle";
import type { RoleViewMode } from "@/hooks/useRoleViewMode";
import type { AdminViewFilters } from "@/lib/adminViewFilters";

export function AdminDashboardControls({
  viewMode,
  onViewModeChange,
  ownLabel,
  hasOwnRole,
  filters,
  onFiltersChange,
  teams,
  matchCount,
  totalCount,
}: {
  viewMode: RoleViewMode;
  onViewModeChange: (mode: RoleViewMode) => void;
  ownLabel: string;
  hasOwnRole: boolean;
  filters: AdminViewFilters;
  onFiltersChange: (next: AdminViewFilters) => void;
  teams: { id: string; name: string }[];
  matchCount: number;
  totalCount: number;
}) {
  return (
    <div className="space-y-3">
      <RoleViewToggle
        viewMode={viewMode}
        onChange={onViewModeChange}
        ownLabel={ownLabel}
        hasOwnRole={hasOwnRole}
      />
      {viewMode === "admin" && (
        <AdminMatchFilterBar
          filters={filters}
          onChange={onFiltersChange}
          teams={teams}
          matchCount={matchCount}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
