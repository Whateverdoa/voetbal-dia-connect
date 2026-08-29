export type AdminMatchStatusFilter = "alle" | "actief" | "gepland" | "afgelopen";

export type AdminViewFilters = {
  search: string;
  teamId: string;
  status: AdminMatchStatusFilter;
};

export const EMPTY_ADMIN_VIEW_FILTERS: AdminViewFilters = {
  search: "",
  teamId: "",
  status: "alle",
};

const ACTIVE_STATUSES = new Set(["live", "halftime", "lineup"]);

export type AdminFilterableMatch = {
  teamId?: string;
  teamName?: string;
  opponent: string;
  publicCode?: string;
  status: string;
};

export function matchAdminStatus(
  status: string,
  filter: AdminMatchStatusFilter,
): boolean {
  if (filter === "alle") return true;
  if (filter === "actief") return ACTIVE_STATUSES.has(status);
  if (filter === "gepland") return status === "scheduled";
  return status === "finished";
}

export function filterAdminMatches<T extends AdminFilterableMatch>(
  matches: T[],
  filters: AdminViewFilters,
): T[] {
  const needle = filters.search.trim().toLowerCase();
  return matches.filter((match) => {
    if (filters.teamId && match.teamId !== filters.teamId) return false;
    if (!matchAdminStatus(match.status, filters.status)) return false;
    if (!needle) return true;
    const haystack = [match.teamName, match.opponent, match.publicCode]
      .map((part) => String(part ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(needle);
  });
}

export function filterAdminTeams<T extends { id: string }>(
  teams: T[],
  matches: { teamId?: string }[],
  selectedTeamId: string,
): T[] {
  if (selectedTeamId) {
    return teams.filter((team) => team.id === selectedTeamId);
  }
  const visible = new Set(
    matches.map((match) => match.teamId).filter((id): id is string => !!id),
  );
  return teams.filter((team) => visible.has(team.id));
}

export function uniqueTeamsFromMatches(
  matches: { teamId?: string; teamName: string }[],
): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const match of matches) {
    const id = match.teamId ?? match.teamName;
    if (!byId.has(id)) {
      byId.set(id, match.teamName);
    }
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "nl"));
}
