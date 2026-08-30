import { v } from "convex/values";
import { authenticatedQuery, requireClubRole } from "./lib/clubAccess";
import {
  assignmentAuditEventTypeValidator,
  refereeAssignmentStatusValidator,
  refereeNeedStatusValidator,
  refereeOfferStatusValidator,
} from "./refereeAssignmentSchema";
import { evaluateRefereeEligibility } from "./lib/refereeAssignmentEligibility";

const PLANNER_ROLES = ["club_admin", "planner"] as const;

const matchSummaryValidator = v.object({
  matchId: v.id("matches"),
  teamName: v.string(),
  opponent: v.string(),
  scheduledAt: v.union(v.number(), v.null()),
  isHome: v.boolean(),
});

const plannerOfferValidator = v.object({
  offerId: v.id("refereeOffers"),
  refereeProfileId: v.id("refereeProfiles"),
  refereeName: v.string(),
  status: refereeOfferStatusValidator,
  sentAt: v.number(),
  expiresAt: v.number(),
  respondedAt: v.union(v.number(), v.null()),
  version: v.number(),
});

const plannerAssignmentValidator = v.object({
  assignmentId: v.id("refereeAssignments"),
  refereeProfileId: v.id("refereeProfiles"),
  refereeName: v.string(),
  status: refereeAssignmentStatusValidator,
  confirmedAt: v.number(),
  version: v.number(),
});

const refereeEligibilityCodeValidator = v.union(
  v.literal("PROFILE_INACTIVE"),
  v.literal("PROFILE_WRONG_CLUB"),
  v.literal("CLUB_BLOCKED"),
  v.literal("TEAM_BLOCKED"),
  v.literal("AGE_GROUP_NOT_ALLOWED"),
  v.literal("MATCH_LEVEL_NOT_ALLOWED"),
  v.literal("QUALIFICATION_MISMATCH"),
  v.literal("MATCH_TIME_MISSING"),
  v.literal("REFEREE_UNAVAILABLE"),
  v.literal("REFEREE_CONFLICT")
);

export const getPlannerCandidateEligibility = authenticatedQuery({
  args: {
    needId: v.id("matchRefereeNeeds"),
    refereeProfileId: v.id("refereeProfiles"),
  },
  returns: v.object({
    refereeProfileId: v.id("refereeProfiles"),
    refereeName: v.string(),
    eligible: v.boolean(),
    codes: v.array(refereeEligibilityCodeValidator),
    startsAt: v.union(v.number(), v.null()),
    endsAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const need = await ctx.db.get(args.needId);
    const profile = await ctx.db.get(args.refereeProfileId);
    if (!need || !profile) throw new Error("NOT_FOUND");
    await requireClubRole(ctx, ctx.user._id, need.clubId, PLANNER_ROLES);
    if (profile.clubId !== need.clubId) throw new Error("FORBIDDEN");

    const result = await evaluateRefereeEligibility(ctx, need, profile);
    return {
      refereeProfileId: profile._id,
      refereeName: profile.displayName,
      eligible: result.eligible,
      codes: result.codes,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
    };
  },
});

export const listPlannerQueue = authenticatedQuery({
  args: {
    clubId: v.id("clubs"),
    status: v.optional(refereeNeedStatusValidator),
  },
  returns: v.array(
    v.object({
      needId: v.id("matchRefereeNeeds"),
      status: refereeNeedStatusValidator,
      version: v.number(),
      match: matchSummaryValidator,
      arrivalAt: v.union(v.number(), v.null()),
      expectedEndAt: v.union(v.number(), v.null()),
      venue: v.union(v.string(), v.null()),
      ageGroup: v.union(v.string(), v.null()),
      matchLevel: v.union(v.string(), v.null()),
      requiredQualification: v.union(v.string(), v.null()),
      responseDeadline: v.union(v.number(), v.null()),
      assignmentDeadline: v.union(v.number(), v.null()),
      offers: v.array(plannerOfferValidator),
      assignment: v.union(plannerAssignmentValidator, v.null()),
    })
  ),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, PLANNER_ROLES);
    const needs = args.status
      ? await ctx.db
          .query("matchRefereeNeeds")
          .withIndex("by_club_and_status", (q) =>
            q.eq("clubId", args.clubId).eq("status", args.status!)
          )
          .take(200)
      : await ctx.db
          .query("matchRefereeNeeds")
          .withIndex("by_club_and_status", (q) => q.eq("clubId", args.clubId))
          .take(200);

    const rows = await Promise.all(
      needs.map(async (need) => {
        const match = await ctx.db.get(need.matchId);
        if (!match) return null;
        const team = await ctx.db.get(match.teamId);
        if (!team) return null;
        const offers = await ctx.db
          .query("refereeOffers")
          .withIndex("by_need", (q) => q.eq("needId", need._id))
          .take(50);
        const offerRows = await Promise.all(
          offers.map(async (offer) => {
            const profile = await ctx.db.get(offer.refereeProfileId);
            return profile
              ? {
                  offerId: offer._id,
                  refereeProfileId: profile._id,
                  refereeName: profile.displayName,
                  status: offer.status,
                  sentAt: offer.sentAt,
                  expiresAt: offer.expiresAt,
                  respondedAt: offer.respondedAt ?? null,
                  version: offer.version,
                }
              : null;
          })
        );
        const assignment = await ctx.db
          .query("refereeAssignments")
          .withIndex("by_need", (q) => q.eq("needId", need._id))
          .order("desc")
          .first();
        const assignmentProfile = assignment
          ? await ctx.db.get(assignment.refereeProfileId)
          : null;
        return {
          needId: need._id,
          status: need.status,
          version: need.version,
          match: {
            matchId: match._id,
            teamName: team.name,
            opponent: match.opponent,
            scheduledAt: match.scheduledAt ?? null,
            isHome: match.isHome,
          },
          arrivalAt: need.arrivalAt ?? null,
          expectedEndAt: need.expectedEndAt ?? null,
          venue: need.venue ?? null,
          ageGroup: need.ageGroup ?? null,
          matchLevel: need.matchLevel ?? null,
          requiredQualification: need.requiredQualification ?? null,
          responseDeadline: need.responseDeadline ?? null,
          assignmentDeadline: need.assignmentDeadline ?? null,
          offers: offerRows.filter((offer) => offer !== null),
          assignment:
            assignment && assignmentProfile
              ? {
                  assignmentId: assignment._id,
                  refereeProfileId: assignmentProfile._id,
                  refereeName: assignmentProfile.displayName,
                  status: assignment.status,
                  confirmedAt: assignment.confirmedAt,
                  version: assignment.version,
                }
              : null,
        };
      })
    );
    return rows.filter((row) => row !== null);
  },
});

const refereeOfferValidator = v.object({
  offerId: v.id("refereeOffers"),
  status: refereeOfferStatusValidator,
  version: v.number(),
  sentAt: v.number(),
  expiresAt: v.number(),
  respondedAt: v.union(v.number(), v.null()),
  responseNote: v.union(v.string(), v.null()),
  needId: v.id("matchRefereeNeeds"),
  needStatus: refereeNeedStatusValidator,
  needVersion: v.number(),
  arrivalAt: v.union(v.number(), v.null()),
  venue: v.union(v.string(), v.null()),
  match: matchSummaryValidator,
});

export const listMyOffers = authenticatedQuery({
  args: {
    clubId: v.id("clubs"),
    status: v.optional(refereeOfferStatusValidator),
  },
  returns: v.array(refereeOfferValidator),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, ["referee"]);
    const profile = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    if (!profile) return [];
    const offers = args.status
      ? await ctx.db
          .query("refereeOffers")
          .withIndex("by_referee_and_status", (q) =>
            q.eq("refereeProfileId", profile._id).eq("status", args.status!)
          )
          .order("desc")
          .take(100)
      : await ctx.db
          .query("refereeOffers")
          .withIndex("by_referee_and_status", (q) =>
            q.eq("refereeProfileId", profile._id)
          )
          .order("desc")
          .take(100);

    const rows = await Promise.all(
      offers.map(async (offer) => {
        const need = await ctx.db.get(offer.needId);
        const match = await ctx.db.get(offer.matchId);
        if (!need || !match) return null;
        const team = await ctx.db.get(match.teamId);
        if (!team) return null;
        return {
          offerId: offer._id,
          status: offer.status,
          version: offer.version,
          sentAt: offer.sentAt,
          expiresAt: offer.expiresAt,
          respondedAt: offer.respondedAt ?? null,
          responseNote: offer.responseNote ?? null,
          needId: need._id,
          needStatus: need.status,
          needVersion: need.version,
          arrivalAt: need.arrivalAt ?? null,
          venue: need.venue ?? null,
          match: {
            matchId: match._id,
            teamName: team.name,
            opponent: match.opponent,
            scheduledAt: match.scheduledAt ?? null,
            isHome: match.isHome,
          },
        };
      })
    );
    return rows.filter((row) => row !== null);
  },
});

export const listMyAssignments = authenticatedQuery({
  args: {
    clubId: v.id("clubs"),
    status: v.optional(refereeAssignmentStatusValidator),
  },
  returns: v.array(
    v.object({
      assignmentId: v.id("refereeAssignments"),
      status: refereeAssignmentStatusValidator,
      version: v.number(),
      confirmedAt: v.number(),
      needId: v.id("matchRefereeNeeds"),
      arrivalAt: v.union(v.number(), v.null()),
      venue: v.union(v.string(), v.null()),
      match: matchSummaryValidator,
    })
  ),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, ["referee"]);
    const profile = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    if (!profile) return [];
    const assignments = args.status
      ? await ctx.db
          .query("refereeAssignments")
          .withIndex("by_referee_and_status", (q) =>
            q.eq("refereeProfileId", profile._id).eq("status", args.status!)
          )
          .order("desc")
          .take(100)
      : await ctx.db
          .query("refereeAssignments")
          .withIndex("by_referee_and_status", (q) =>
            q.eq("refereeProfileId", profile._id)
          )
          .order("desc")
          .take(100);
    const rows = await Promise.all(
      assignments.map(async (assignment) => {
        const need = await ctx.db.get(assignment.needId);
        const match = await ctx.db.get(assignment.matchId);
        if (!need || !match) return null;
        const team = await ctx.db.get(match.teamId);
        if (!team) return null;
        return {
          assignmentId: assignment._id,
          status: assignment.status,
          version: assignment.version,
          confirmedAt: assignment.confirmedAt,
          needId: need._id,
          arrivalAt: need.arrivalAt ?? null,
          venue: need.venue ?? null,
          match: {
            matchId: match._id,
            teamName: team.name,
            opponent: match.opponent,
            scheduledAt: match.scheduledAt ?? null,
            isHome: match.isHome,
          },
        };
      })
    );
    return rows.filter((row) => row !== null);
  },
});

export const listNeedAudit = authenticatedQuery({
  args: { needId: v.id("matchRefereeNeeds") },
  returns: v.array(
    v.object({
      auditId: v.id("assignmentAuditEvents"),
      eventType: assignmentAuditEventTypeValidator,
      actorType: v.union(
        v.literal("user"),
        v.literal("agent"),
        v.literal("system")
      ),
      previousStatus: v.union(v.string(), v.null()),
      newStatus: v.union(v.string(), v.null()),
      reasonCode: v.union(v.string(), v.null()),
      correlationId: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const need = await ctx.db.get(args.needId);
    if (!need) throw new Error("NOT_FOUND");
    await requireClubRole(ctx, ctx.user._id, need.clubId, PLANNER_ROLES);
    const events = await ctx.db
      .query("assignmentAuditEvents")
      .withIndex("by_need_and_created_at", (q) => q.eq("needId", need._id))
      .order("asc")
      .take(200);
    return events.map((event) => ({
      auditId: event._id,
      eventType: event.eventType,
      actorType: event.actorType,
      previousStatus: event.previousStatus ?? null,
      newStatus: event.newStatus ?? null,
      reasonCode: event.reasonCode ?? null,
      correlationId: event.correlationId,
      createdAt: event.createdAt,
    }));
  },
});
