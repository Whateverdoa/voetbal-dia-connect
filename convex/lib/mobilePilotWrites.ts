import type { Doc } from "../_generated/dataModel";

/** Both gates default closed. Policy persists when either permission is revoked. */
export function mobilePilotWritesAllowed(scope: Doc<"mobilePilotScopes">, match: Doc<"matches">) {
  return process.env.MOBILE_REFEREE_WRITES_ENABLED === "true" && scope.enabled &&
    scope.writesEnabled === true && scope.expiresAt > Date.now() && match.refereePolicy?.version === 1;
}
