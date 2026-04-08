/**
 * User-facing queries for the authenticated user's own access/roles.
 */
import { query } from "./_generated/server";
import { getCurrentUserAccess } from "./lib/userAccess";

/** Return the current signed-in user's app roles (empty array if not recognised). */
export const getMyRoles = query({
  args: {},
  handler: async (ctx) => {
    const access = await getCurrentUserAccess(ctx);
    return { roles: access?.roles ?? [] };
  },
});
