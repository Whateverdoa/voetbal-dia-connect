/** Admin override for coach/referee match access (phase: club-wide control). */
export const ADMIN_DISPLAY_NAME = "Admin";

export function hasAdminRole(
  access: { active: boolean; roles: readonly string[] } | null | undefined,
): boolean {
  return Boolean(access?.active && access.roles.includes("admin"));
}
