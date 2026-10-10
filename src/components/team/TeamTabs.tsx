"use client";

export const TEAM_TABS = [
  { id: "stand", label: "Stand" },
  { id: "wedstrijden", label: "Gespeelde wedstrijden" },
] as const;

export type TeamTabId = (typeof TEAM_TABS)[number]["id"];

export function isTeamTabId(value: string | null): value is TeamTabId {
  return TEAM_TABS.some((tab) => tab.id === value);
}

interface TeamTabsProps {
  active: TeamTabId;
  onSelect: (id: TeamTabId) => void;
}

export function TeamTabs({ active, onSelect }: TeamTabsProps) {
  return (
    <nav className="flex gap-2" aria-label="Teamonderdelen">
      {TEAM_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`min-h-[48px] flex-1 rounded-xl px-4 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-dia-green text-white"
                : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
