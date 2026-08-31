/**
 * User-facing queries for the authenticated user's own access/roles.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserAccess } from "./lib/userAccess";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("coach"),
  v.literal("referee"),
);

/** Return the current signed-in user's app roles (empty array if not recognised). */
export const getMyRoles = query({
  args: {},
  returns: v.object({
    roles: v.array(roleValidator),
  }),
  handler: async (ctx) => {
    const access = await getCurrentUserAccess(ctx);
    return { roles: access?.roles ?? [] };
  },
});
