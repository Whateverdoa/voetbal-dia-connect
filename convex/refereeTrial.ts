import { makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getUserAccessByEmail } from "./lib/userAccess";
import { officialDutyEligibility } from "./lib/mobilePilotAccess";
import { TRIAL_MATCH_ID, TRIAL_EMAIL, PENDING_TRIAL_SUBJECT, trialIdentity } from "./lib/singleMatchTrial";

const expire = makeFunctionReference<"mutation", { scopeId: Id<"mobilePilotScopes">; expiresAt: number }, null>("mobilePilotScopes:expire");

// Operator-only, atomic opt-in. Never resets a clock, score or existing event.
export const activate = internalMutation({
  args: { matchId: v.id("matches"), expiresAt: v.number() },
  returns: v.object({ matchId: v.id("matches"), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.matchId !== TRIAL_MATCH_ID || !Number.isSafeInteger(args.expiresAt) ||
        args.expiresAt <= now || args.expiresAt > now + 24 * 60 * 60_000) throw new ConvexError("PILOT_ACCESS_DENIED");
    const match = await ctx.db.get(TRIAL_MATCH_ID);
    if (!match || match.publicCode !== "2P23BS" || match.refereePolicy || match.startedAt !== undefined ||
        match.cancelledAt !== undefined || !["scheduled", "lineup"].includes(match.status) ||
        match.currentQuarter !== 1 || match.homeScore !== 0 || match.awayScore !== 0 ||
        ![2, 4].includes(match.quarterCount) || !match.refereeId) throw new ConvexError("TRIAL_REQUIRES_UNSTARTED_MATCH");
    const team = await ctx.db.get(match.teamId);
    const referee = await ctx.db.get(match.refereeId);
    const access = await getUserAccessByEmail(ctx, TRIAL_EMAIL);
    if (!team || team.active === false || !referee?.active || referee.email?.trim().toLowerCase() !== TRIAL_EMAIL ||
        !access?.active || !access.roles.includes("referee") || access.refereeId !== match.refereeId) throw new ConvexError("OFFICIAL_REGISTRATOR_REQUIRED");
    const scopes = await ctx.db.query("mobilePilotScopes").withIndex("by_subject_and_match", q =>
      q.eq("subject", PENDING_TRIAL_SUBJECT).eq("matchId", TRIAL_MATCH_ID)).unique();
    if (scopes) throw new ConvexError("TRIAL_ALREADY_CONFIGURED");
    await ctx.db.patch(match._id, { refereePolicy: { version: 1, generation: 0, commandVersion: 0,
      elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 } });
    const scopeId = await ctx.db.insert("mobilePilotScopes", { subject: PENDING_TRIAL_SUBJECT,
      matchId: match._id, teamId: match.teamId, enabled: true, writesEnabled: true, expiresAt: args.expiresAt, updatedAt: now });
    await ctx.scheduler.runAt(args.expiresAt, expire, { scopeId, expiresAt: args.expiresAt });
    await ctx.db.insert("matchEvents", { matchId: match._id, type: "official_audit", quarter: 1,
      matchMs: 0, timestamp: now, createdAt: now, actorKind: "system", commandType: "PILOT_ACTIVATED",
      note: "Owner-approved 2P23BS iPhone trial; no match action performed." });
    return { matchId: match._id, expiresAt: args.expiresAt };
  },
});

// Binds the operator-approved ticket to the genuine verified Clerk subject once.
// No account, role, referee assignment or match action is created here.
export const enroll = mutation({
  args: { matchId: v.id("matches") },
  returns: v.object({ matchId: v.id("matches"), subject: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await trialIdentity(ctx, args.matchId);
    if (process.env.MOBILE_REFEREE_WRITES_ENABLED !== "true") throw new ConvexError("PILOT_WRITES_DISABLED");
    const match = await ctx.db.get(TRIAL_MATCH_ID);
    const team = match ? await ctx.db.get(match.teamId) : null;
    if (!match?.refereePolicy || !team || team.active === false ||
        (!(await officialDutyEligibility(ctx, match, actor.access)).isOfficialRegistrar || match.cancelledAt !== undefined)) throw new ConvexError("OFFICIAL_REGISTRATOR_REQUIRED");
    const find = (subject: string) => ctx.db.query("mobilePilotScopes").withIndex("by_subject_and_match", q =>
      q.eq("subject", subject).eq("matchId", TRIAL_MATCH_ID)).unique();
    const existing = await find(actor.subject);
    const pending = existing ?? await find(PENDING_TRIAL_SUBJECT);
    const now = Date.now();
    if (!pending?.enabled || pending.expiresAt <= now || pending.teamId !== match.teamId) throw new ConvexError("PILOT_ACCESS_DENIED");
    if (!existing) {
      await ctx.db.patch(pending._id, { subject: actor.subject, updatedAt: now });
      await ctx.db.insert("matchEvents", { matchId: match._id, type: "official_audit", quarter: match.currentQuarter,
        matchMs: 0, timestamp: now, createdAt: now, actorKind: "system", commandType: "PILOT_SUBJECT_BOUND" });
    }
    return { matchId: match._id, subject: actor.subject, expiresAt: pending.expiresAt };
  },
});
