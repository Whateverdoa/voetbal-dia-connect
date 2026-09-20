/** JO/MO slugs from the official teamindeling (e.g. jo13-2, mo20-1). */
const YOUTH_SLUG = /^(jo|mo)\d/i;

export function isYouthTeamSlug(slug: string): boolean {
  return YOUTH_SLUG.test(slug.trim());
}

/** Missing or true = current season. Explicit false = last-season leftover. */
export function isCurrentSeasonTeam(team: { active?: boolean }): boolean {
  return team.active !== false;
}

export function teamNameFromSlug(slug: string): string {
  return slug.trim().toUpperCase();
}

export function normalizeTeamSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
