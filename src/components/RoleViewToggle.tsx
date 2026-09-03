"use client";

import type { RoleViewMode } from "@/hooks/useRoleViewMode";

export function RoleViewToggle({
  viewMode,
  onChange,
  ownLabel,
  hasOwnRole,
}: {
  viewMode: RoleViewMode;
  onChange: (mode: RoleViewMode) => void;
  ownLabel: string;
  hasOwnRole: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Bekijk als
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("admin")}
          className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold ${
            viewMode === "admin"
              ? "bg-amber-400 text-gray-900"
              : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          Admin
        </button>
        <button
          type="button"
          onClick={() => onChange("own")}
          disabled={!hasOwnRole}
          className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
            viewMode === "own"
              ? "bg-dia-green text-white"
              : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          {ownLabel}
        </button>
      </div>
      {!hasOwnRole && (
        <p className="text-xs text-gray-500">
          Dit account heeft geen {ownLabel.toLowerCase()}-rol. Kies Admin om
          wedstrijden te zoeken en te openen.
        </p>
      )}
    </div>
  );
}
