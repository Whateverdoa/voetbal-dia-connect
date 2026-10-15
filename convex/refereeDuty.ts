import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { pilotIdentity } from "./lib/mobilePilotAccess";

/** Existing admins appoint; own-team coaches may fill only an empty duty. */
export const appointCoach = mutation({
  args: { matchId: v.id("matches"), coachId: v.id("coaches"), expectedVersion: v.number(), correlationId: v.string() },
  returns: v.object({ commandEventId: v.id("matchEvents"), commandCorrelationId: v.string(), version: v.number() }),
  handler: async (ctx, args) => {
    const { subject, access } = await pilotIdentity(ctx);
    if (!args.correlationId.trim() || args.correlationId.length > 200 || !Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0) {
      throw new ConvexError("VALIDATION_ERROR");
    }
    const match = await ctx.db.get(args.matchId);
    if (!match?.refereePolicy) throw new ConvexError("PILOT_POLICY_REQUIRED");
    const coach = await ctx.db.get(args.coachId);
    const team = await ctx.db.get(match.teamId);
    if (!coach?.teamIds.includes(match.teamId) || !team || team.active === false) throw new ConvexError("FORBIDDEN");
    const isAdmin = access.roles.includes("admin");
    const isSelf = access.roles.includes("coach") && access.coachId === coach._id;
    if (!isAdmin && !isSelf) throw new ConvexError("FORBIDDEN");
    const fingerprint = JSON.stringify({ coachId: args.coachId, expectedVersion: args.expectedVersion });
    const previous = await ctx.db.query("matchCommandDedupes").withIndex("by_match_command_correlation", q =>
      q.eq("matchId", args.matchId).eq("commandType", "APPOINT_COACH").eq("correlationId", args.correlationId)).unique();
    if (previous) {
      if (previous.actorSubject !== subject || previous.fingerprint !== fingerprint) throw new ConvexError("CORRELATION_CONTENT_MISMATCH");
      if (!previous.commandEventId || previous.commandVersion === undefined) throw new ConvexError("INVALID_RECEIPT");
      return { commandEventId: previous.commandEventId, commandCorrelationId: args.correlationId, version: previous.commandVersion };
    }
    if (match.refereePolicy.commandVersion !== args.expectedVersion) throw new ConvexError("VERSION_CONFLICT");
    // A disabled referee still occupies the task until explicitly unassigned.
    if (match.refereeId || match.cancelledAt !== undefined || match.status === "finished") throw new ConvexError("OFFICIAL_DUTY_UNAVAILABLE");
    if (!isAdmin && match.leadCoachId) throw new ConvexError("OFFICIAL_DUTY_OCCUPIED");
    const now = Date.now();
    const version = args.expectedVersion + 1;
    await ctx.db.patch(match._id, { leadCoachId: coach._id, refereePolicy: { ...match.refereePolicy, commandVersion: version } });
    const commandEventId = await ctx.db.insert("matchEvents", { matchId: match._id, type: "official_audit",
      quarter: match.currentQuarter, timestamp: now, createdAt: now, actorKind: "user", actorSubject: subject,
      correlationId: args.correlationId, commandType: "APPOINT_COACH", note: String(coach._id),
    });
    await ctx.db.insert("matchCommandDedupes", { matchId: match._id, commandType: "APPOINT_COACH", correlationId: args.correlationId,
      actorSubject: subject, fingerprint, commandEventId, commandVersion: version, createdAt: now });
    return { commandEventId, commandCorrelationId: args.correlationId, version };
  },
});
