/**
 * Internal queries used by referee e-mail actions (no "use node").
 */
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listActiveRefereeEmails = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      email: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const referees = await ctx.db.query("referees").collect();
    return referees
      .filter((r) => r.active && r.inClaimPool === true)
      .map((r) => ({
        name: r.name,
        email: r.email,
        contactEmail: r.contactEmail,
      }));
  },
});
