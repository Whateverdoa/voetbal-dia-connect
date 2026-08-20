/**
 * Client-side search/filter helpers for admin coaches & players lists.
 */

export type ActiveListFilter = "alle" | "actief" | "inactief";

export function matchesSearch(haystackParts: Array<string | number | undefined | null>, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystackParts
    .map((part) => String(part ?? "").toLowerCase())
    .join(" ")
    .includes(needle);
}

export type CoachListItem = {
  name: string;
  email?: string;
  teamIds: string[];
  teams: { id: string; name: string }[];
};

export function filterCoaches<T extends CoachListItem>(
  coaches: T[],
  opts: {
    search: string;
    teamId: string; // "" = alle
    teamLinkFilter: "alle" | "met-team" | "zonder-team";
  }
): T[] {
  return coaches
    .filter((coach) => {
      if (opts.teamLinkFilter === "met-team" && coach.teamIds.length === 0) {
        return false;
      }
      if (opts.teamLinkFilter === "zonder-team" && coach.teamIds.length > 0) {
        return false;
      }
      if (opts.teamId && !coach.teamIds.includes(opts.teamId)) {
        return false;
      }
      return matchesSearch(
        [coach.name, coach.email, ...coach.teams.map((t) => t.name)],
        opts.search
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl-NL"));
}

export type PlayerListItem = {
  name: string;
  number?: number | null;
  active: boolean;
  positionPrimary?: string | null;
  positionSecondary?: string | null;
};

export function filterPlayers<T extends PlayerListItem>(
  players: T[],
  opts: {
    search: string;
    activeFilter: ActiveListFilter;
    position: string; // "" = alle
  }
): T[] {
  return players
    .filter((player) => {
      if (opts.activeFilter === "actief" && !player.active) return false;
      if (opts.activeFilter === "inactief" && player.active) return false;
      if (
        opts.position &&
        player.positionPrimary !== opts.position &&
        player.positionSecondary !== opts.position
      ) {
        return false;
      }
      return matchesSearch(
        [
          player.name,
          player.number,
          player.positionPrimary,
          player.positionSecondary,
        ],
        opts.search
      );
    })
    .sort((a, b) => {
      const numA = a.number ?? 999;
      const numB = b.number ?? 999;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, "nl-NL");
    });
}

export function filterTeamsBySearch<T extends { name: string; clubName?: string }>(
  teams: T[],
  search: string
): T[] {
  return teams.filter((team) =>
    matchesSearch([team.name, team.clubName], search)
  );
}
