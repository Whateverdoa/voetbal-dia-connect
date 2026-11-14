import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUserAccess } from "./lib/userAccess";

// Diagnosis-only production patch. No pilot schema, policy, command or scope rollout.
const DIAGNOSIS_OWNER_EMAIL = "mjtenhoonte@gmail.com";
const TEST_MATCH_ID = "jn7cw69dexmjjmg88jbwsxj4kx8gecgr";
export const diagnose = query({
  args: { matchId: v.id("matches") },
  returns: v.object({
    diagnosticVersion: v.literal(1), readOnly: v.literal(true),
    actorSubject: v.string(), matchId: v.id("matches"),
    controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
    isOfficialRegistrar: v.boolean(), eligibleToControl: v.boolean(),
    policyActive: v.literal(false), mobileScopeStatus: v.literal("unavailable"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    if (!identity.subject || typeof identity.email !== "string" ||
        (identity.emailVerified !== true && identity.email_verified !== true)) {
      throw new ConvexError("AUTH_IDENTITY_INCOMPLETE");
    }
    if (identity.email.trim().toLowerCase() !== DIAGNOSIS_OWNER_EMAIL) throw new ConvexError("FORBIDDEN");
    if (args.matchId !== TEST_MATCH_ID) throw new ConvexError("FORBIDDEN");
    const access = await getCurrentUserAccess(ctx);
    if (!access?.active) throw new ConvexError("FORBIDDEN");
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new ConvexError("NOT_FOUND");
    const team = await ctx.db.get(match.teamId);
    if (!team || team.active === false) throw new ConvexError("FORBIDDEN");
    const referee = match.refereeId ? await ctx.db.get(match.refereeId) : null;
    const coach = access.roles.includes("coach") && access.coachId ? await ctx.db.get(access.coachId) : null;
    const ownCoach = !!coach && coach.teamIds.includes(match.teamId);
    const assignedReferee = !!referee?.active && access.roles.includes("referee") && access.refereeId === referee._id;
    if (!access.roles.includes("admin") && !assignedReferee && !ownCoach) throw new ConvexError("FORBIDDEN");
    const isOfficialRegistrar = !!(match.refereeId ? assignedReferee : ownCoach && match.leadCoachId === coach?._id);
    return { diagnosticVersion: 1 as const, readOnly: true as const,
      actorSubject: identity.subject, matchId: match._id,
      controller: match.refereeId ? "referee" as const : match.leadCoachId ? "coach" as const : "none" as const,
      isOfficialRegistrar, eligibleToControl: isOfficialRegistrar && match.cancelledAt === undefined && match.status !== "finished",
      // No mobile match API is deployed; scope availability must not be inferred from leftover tables.
      policyActive: false as const, mobileScopeStatus: "unavailable" as const };
  },
});
