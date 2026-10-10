/** Filtering + grouping for the public team directory. */

export type DirectoryTeam = {
  id: string;
  name: string;
  slug: string;
  clubName: string;
  logoUrl: string | null;
  hasStanding: boolean;
};

/** Match on name or slug, ignoring case, spaces and dashes. */
export function filterTeams(
  teams: readonly DirectoryTeam[],
  search: string
): DirectoryTeam[] {
  const needle = normalize(search);
  if (!needle) return [...teams];
  return teams.filter(
    (team) =>
      normalize(team.name).includes(needle) ||
      normalize(team.slug).includes(needle)
  );
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]/g, "");
}

/**
 * Group teams by age category so a parent can scan for "JO13" at a glance.
 * Anything without an age prefix lands under "Senioren & overig".
 */
export function groupTeamsByCategory(
  teams: readonly DirectoryTeam[]
): { category: string; teams: DirectoryTeam[] }[] {
  const groups = new Map<string, DirectoryTeam[]>();

  for (const team of teams) {
    const category = categoryOf(team.name);
    const bucket = groups.get(category);
    if (bucket) {
      bucket.push(team);
    } else {
      groups.set(category, [team]);
    }
  }

  return [...groups.entries()]
    .map(([category, list]) => ({ category, teams: list }))
    .sort((a, b) => compareCategory(a.category, b.category));
}

export const OTHER_CATEGORY = "Senioren & overig";

function categoryOf(name: string): string {
  const youth = /^([a-z]*o)\s?(\d{1,2})/i.exec(name.trim());
  if (youth) return `${youth[1]!.toUpperCase()}${youth[2]}`;
  return OTHER_CATEGORY;
}

function compareCategory(a: string, b: string): number {
  if (a === OTHER_CATEGORY) return 1;
  if (b === OTHER_CATEGORY) return -1;
  return a.localeCompare(b, "nl", { numeric: true });
}
