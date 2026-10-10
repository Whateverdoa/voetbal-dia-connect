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

/** Teams linked to the signed-in coach (empty when not a coach). */
export const getMyCoachTeams = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("teams"),
      name: v.string(),
      slug: v.string(),
    })
  ),
  handler: async (ctx) => {
    const access = await getCurrentUserAccess(ctx);
    if (!access?.coachId) return [];
    const coach = await ctx.db.get(access.coachId);
    if (!coach) return [];
    const teamIds = [...new Set(coach.teamIds)];
    const teams = await Promise.all(teamIds.map((id) => ctx.db.get(id)));
    return teams
      .filter((team): team is NonNullable<typeof team> => team !== null)
      .map((team) => ({
        id: team._id,
        name: team.name,
        slug: team.slug,
      }));
  },
});
