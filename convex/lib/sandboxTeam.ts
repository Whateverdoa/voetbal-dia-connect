/** Slug prefix for disposable practice teams (never synced from Sportlink). */
export const SANDBOX_TEAM_SLUG_PREFIX = "test-";

export const SANDBOX_TEAM_SLUG = "test-sandbox";
export const SANDBOX_TEAM_NAME = "TEST Sandbox";

export function isSandboxTeamSlug(slug: string): boolean {
  return slug.trim().toLowerCase().startsWith(SANDBOX_TEAM_SLUG_PREFIX);
}
