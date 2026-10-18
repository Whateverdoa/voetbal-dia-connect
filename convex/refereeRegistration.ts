import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUserAccess } from "./lib/userAccess";

// The original strictly pinned read-only diagnostic remains available.
const DIAGNOSIS_OWNER_EMAIL = "mjtenhoonte@gmail.com";
const TEST_MATCH_ID = "jn7cw69dexmjjmg88jbwsxj4kx8gecgr";
export const diagnose = query({
  args: { matchId: v.id("matches") },
  returns: v.object({
    diagnosticVersion: v.literal(1), readOnly: v.literal(true),
    actorSubject: v.string(), matchId: v.id("matches"),
    controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
    isOfficialRegistrar: v.boolean(), eligibleToControl: v.boolean(),
    policyActive: v.boolean(), mobileScopeStatus: v.union(v.literal("unavailable"), v.literal("missing"), v.literal("disabled"), v.literal("expired"), v.literal("team_mismatch"), v.literal("ready")),
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
    const scope = match.refereePolicy ? await ctx.db.query("mobilePilotScopes")
      .withIndex("by_subject_and_match", q => q.eq("subject", identity.subject).eq("matchId", match._id)).unique() : null;
    const mobileScopeStatus = !match.refereePolicy ? "unavailable" as const : !scope ? "missing" as const :
      !scope.enabled ? "disabled" as const : scope.teamId !== match.teamId ? "team_mismatch" as const :
      scope.expiresAt <= Date.now() ? "expired" as const : "ready" as const;
    return { diagnosticVersion: 1 as const, readOnly: true as const,
      actorSubject: identity.subject, matchId: match._id,
      controller: match.refereeId ? "referee" as const : match.leadCoachId ? "coach" as const : "none" as const,
      isOfficialRegistrar, eligibleToControl: isOfficialRegistrar && match.cancelledAt === undefined && match.status !== "finished",
      policyActive: !!match.refereePolicy, mobileScopeStatus };
  },
});
