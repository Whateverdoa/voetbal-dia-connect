export type AppRole = "admin" | "coach" | "referee";

const VALID_ROLES: ReadonlySet<string> = new Set(["admin", "coach", "referee"]);

function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return VALID_ROLES.has(value) ? (value as AppRole) : null;
}

function parseRoleList(value: unknown): AppRole[] {
  if (!Array.isArray(value)) return [];
  const roles: AppRole[] = [];
  for (const item of value) {
    const role = normalizeRole(item);
    if (role && !roles.includes(role)) roles.push(role);
  }
  return roles;
}

/**
 * Parse app roles from Clerk-style metadata objects.
 * Supports both legacy single role (`role`) and new multi-role (`roles[]`) formats.
 */
export function parseRolesFromMetadata(metadata: unknown): AppRole[] {
  if (!metadata || typeof metadata !== "object") return [];
  const source = metadata as { role?: unknown; roles?: unknown };
  const parsed = parseRoleList(source.roles);
  if (parsed.length > 0) return parsed;
  const single = normalizeRole(source.role);
  return single ? [single] : [];
}

/**
 * Parse roles from Clerk session claims in different key shapes.
 * Clerk can expose metadata as `metadata`, `public_metadata` or `publicMetadata`.
 */
export function parseRolesFromSessionClaims(sessionClaims: unknown): AppRole[] {
  if (!sessionClaims || typeof sessionClaims !== "object") return [];
  const claims = sessionClaims as {
    metadata?: unknown;
    public_metadata?: unknown;
    publicMetadata?: unknown;
  };

  const candidates = [claims.metadata, claims.public_metadata, claims.publicMetadata];
  const merged: AppRole[] = [];
  for (const candidate of candidates) {
    for (const role of parseRolesFromMetadata(candidate)) {
      if (!merged.includes(role)) merged.push(role);
    }
  }
  return merged;
}

export function hasRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}
