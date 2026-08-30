import { v } from "convex/values";
import {
  authenticatedMutation,
  authenticatedQuery,
  getClubMembership,
  membershipHasAnyRole,
  requireClubRole,
} from "./lib/clubAccess";
import {
  availabilityStatusValidator,
  refereeProfileStatusValidator,
} from "./refereeAssignmentSchema";
import {
  getAssignmentAuditByCorrelation,
  requireMatchingReplay,
} from "./lib/assignmentAudit";

const ownProfileValidator = v.object({
  profileId: v.id("refereeProfiles"),
  clubId: v.id("clubs"),
  displayName: v.string(),
  status: refereeProfileStatusValidator,
  travelRadiusKm: v.union(v.number(), v.null()),
  qualificationLevel: v.union(v.string(), v.null()),
  allowedAgeGroups: v.array(v.string()),
  allowedMatchLevels: v.array(v.string()),
  maxMatchesPerDay: v.union(v.number(), v.null()),
  minimumRestMinutes: v.union(v.number(), v.null()),
  version: v.number(),
});

const availabilityWindowValidator = v.object({
  windowId: v.id("refereeAvailabilityWindows"),
  startsAt: v.number(),
  endsAt: v.number(),
  status: availabilityStatusValidator,
  recurrenceRule: v.union(v.string(), v.null()),
  source: v.union(
    v.literal("referee"),
    v.literal("planner"),
    v.literal("import"),
    v.literal("seed")
  ),
  note: v.union(v.string(), v.null()),
  version: v.number(),
});

export const getMyRefereeProfile = authenticatedQuery({
  args: { clubId: v.id("clubs") },
  returns: v.union(ownProfileValidator, v.null()),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, ["referee"]);
    const profile = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    if (!profile) return null;

    return {
      profileId: profile._id,
      clubId: profile.clubId,
      displayName: profile.displayName,
      status: profile.status,
      travelRadiusKm: profile.travelRadiusKm ?? null,
      qualificationLevel: profile.qualificationLevel ?? null,
      allowedAgeGroups: profile.allowedAgeGroups ?? [],
      allowedMatchLevels: profile.allowedMatchLevels ?? [],
      maxMatchesPerDay: profile.maxMatchesPerDay ?? null,
      minimumRestMinutes: profile.minimumRestMinutes ?? null,
      version: profile.version,
    };
  },
});

export const listPlannerRefereeProfiles = authenticatedQuery({
  args: { clubId: v.id("clubs") },
  returns: v.array(
    v.object({
      profileId: v.id("refereeProfiles"),
      userId: v.union(v.id("appUsers"), v.null()),
      legacyRefereeId: v.union(v.id("referees"), v.null()),
      displayName: v.string(),
      status: refereeProfileStatusValidator,
      qualificationLevel: v.union(v.string(), v.null()),
      privatePlannerNotes: v.union(v.string(), v.null()),
      version: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, [
      "club_admin",
      "planner",
    ]);
    const profiles = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .take(500);
    return profiles.map((profile) => ({
      profileId: profile._id,
      userId: profile.userId ?? null,
      legacyRefereeId: profile.legacyRefereeId ?? null,
      displayName: profile.displayName,
      status: profile.status,
      qualificationLevel: profile.qualificationLevel ?? null,
      privatePlannerNotes: profile.privatePlannerNotes ?? null,
      version: profile.version,
    }));
  },
});

export const upsertRefereeProfile = authenticatedMutation({
  args: {
    clubId: v.id("clubs"),
    userId: v.optional(v.id("appUsers")),
    legacyRefereeId: v.optional(v.id("referees")),
    displayName: v.string(),
    status: refereeProfileStatusValidator,
    qualificationLevel: v.optional(v.string()),
    allowedAgeGroups: v.optional(v.array(v.string())),
    allowedMatchLevels: v.optional(v.array(v.string())),
    travelRadiusKm: v.optional(v.number()),
    maxMatchesPerDay: v.optional(v.number()),
    minimumRestMinutes: v.optional(v.number()),
    privatePlannerNotes: v.optional(v.string()),
    correlationId: v.string(),
  },
  returns: v.object({
    profileId: v.id("refereeProfiles"),
    created: v.boolean(),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, [
      "club_admin",
      "planner",
    ]);
    if (!args.userId && !args.legacyRefereeId) {
      throw new Error("VALIDATION_ERROR: userId or legacyRefereeId is required");
    }
    if (!args.displayName.trim() || !args.correlationId.trim()) {
      throw new Error("VALIDATION_ERROR");
    }
    if (args.travelRadiusKm !== undefined && args.travelRadiusKm < 0) {
      throw new Error("VALIDATION_ERROR: travelRadiusKm must be non-negative");
    }

    const inputFingerprint = JSON.stringify({
      userId: args.userId ? String(args.userId) : null,
      legacyRefereeId: args.legacyRefereeId ? String(args.legacyRefereeId) : null,
      displayName: args.displayName.trim(),
      status: args.status,
      qualificationLevel: args.qualificationLevel ?? null,
      allowedAgeGroups: args.allowedAgeGroups ?? null,
      allowedMatchLevels: args.allowedMatchLevels ?? null,
      travelRadiusKm: args.travelRadiusKm ?? null,
      maxMatchesPerDay: args.maxMatchesPerDay ?? null,
      minimumRestMinutes: args.minimumRestMinutes ?? null,
      privatePlannerNotes: args.privatePlannerNotes ?? null,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      args.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.refereeProfileId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      const replayVersion = replay.metadata?.resultVersion;
      if (typeof replayVersion !== "number") {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      return {
        profileId: replay.refereeProfileId,
        created: replay.eventType === "referee_profile_created",
        version: replayVersion,
      };
    }

    if (args.userId) {
      const targetUser = await ctx.db.get(args.userId);
      const membership = await getClubMembership(ctx, args.clubId, args.userId);
      if (!targetUser || !membershipHasAnyRole(membership, ["referee"])) {
        throw new Error("REFEREE_MEMBERSHIP_REQUIRED");
      }
    }
    if (args.legacyRefereeId && !(await ctx.db.get(args.legacyRefereeId))) {
      throw new Error("NOT_FOUND");
    }

    const byUser = args.userId
      ? await ctx.db
          .query("refereeProfiles")
          .withIndex("by_club_and_user", (q) =>
            q.eq("clubId", args.clubId).eq("userId", args.userId)
          )
          .unique()
      : null;
    const byLegacy = args.legacyRefereeId
      ? await ctx.db
          .query("refereeProfiles")
          .withIndex("by_club_and_legacy_referee", (q) =>
            q
              .eq("clubId", args.clubId)
              .eq("legacyRefereeId", args.legacyRefereeId)
          )
          .unique()
      : null;
    if (byUser && byLegacy && byUser._id !== byLegacy._id) {
      throw new Error("PROFILE_LINK_CONFLICT");
    }

    const existing = byUser ?? byLegacy;
    const now = Date.now();
    const nextVersion = (existing?.version ?? 0) + 1;
    const values = {
      userId: args.userId,
      legacyRefereeId: args.legacyRefereeId,
      displayName: args.displayName.trim(),
      status: args.status,
      qualificationLevel: args.qualificationLevel,
      allowedAgeGroups: args.allowedAgeGroups,
      allowedMatchLevels: args.allowedMatchLevels,
      travelRadiusKm: args.travelRadiusKm,
      maxMatchesPerDay: args.maxMatchesPerDay,
      minimumRestMinutes: args.minimumRestMinutes,
      privatePlannerNotes: args.privatePlannerNotes,
      updatedAt: now,
      version: nextVersion,
    };
    let profileId;

    if (existing) {
      await ctx.db.patch(existing._id, values);
      profileId = existing._id;
    } else {
      profileId = await ctx.db.insert("refereeProfiles", {
        clubId: args.clubId,
        ...values,
        createdAt: now,
      });
    }

    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: args.clubId,
      refereeProfileId: profileId,
      eventType: existing ? "referee_profile_updated" : "referee_profile_created",
      metadata: { inputFingerprint, resultVersion: nextVersion },
      correlationId: args.correlationId,
      createdAt: now,
    });

    return { profileId, created: !existing, version: nextVersion };
  },
});

export const listMyAvailability = authenticatedQuery({
  args: {
    clubId: v.id("clubs"),
    from: v.number(),
    to: v.number(),
  },
  returns: v.array(availabilityWindowValidator),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, ["referee"]);
    if (args.from >= args.to) {
      throw new Error("VALIDATION_ERROR");
    }
    const profile = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    if (!profile) return [];

    const windows = await ctx.db
      .query("refereeAvailabilityWindows")
      .withIndex("by_referee_and_starts_at", (q) =>
        q.eq("refereeProfileId", profile._id).lt("startsAt", args.to)
      )
      .take(500);
    return windows
      .filter((window) => window.endsAt > args.from)
      .map((window) => ({
        windowId: window._id,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        status: window.status,
        recurrenceRule: window.recurrenceRule ?? null,
        source: window.source,
        note: window.note ?? null,
        version: window.version,
      }));
  },
});

export const createMyAvailability = authenticatedMutation({
  args: {
    clubId: v.id("clubs"),
    startsAt: v.number(),
    endsAt: v.number(),
    status: availabilityStatusValidator,
    recurrenceRule: v.optional(v.string()),
    note: v.optional(v.string()),
    correlationId: v.string(),
  },
  returns: v.object({
    windowId: v.id("refereeAvailabilityWindows"),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireClubRole(ctx, ctx.user._id, args.clubId, ["referee"]);
    if (args.startsAt >= args.endsAt || !args.correlationId.trim()) {
      throw new Error("VALIDATION_ERROR");
    }
    const profile = await ctx.db
      .query("refereeProfiles")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    if (!profile || profile.status !== "active") {
      throw new Error("REFEREE_PROFILE_REQUIRED");
    }

    const inputFingerprint = JSON.stringify({
      refereeProfileId: String(profile._id),
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      status: args.status,
      recurrenceRule: args.recurrenceRule ?? null,
      note: args.note ?? null,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      args.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.availabilityWindowId) {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      const replayVersion = replay.metadata?.resultVersion;
      if (typeof replayVersion !== "number") {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      return {
        windowId: replay.availabilityWindowId,
        version: replayVersion,
      };
    }

    const now = Date.now();
    const windowId = await ctx.db.insert("refereeAvailabilityWindows", {
      refereeProfileId: profile._id,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      status: args.status,
      recurrenceRule: args.recurrenceRule,
      source: "referee",
      note: args.note,
      createdByUserId: ctx.user._id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: args.clubId,
      availabilityWindowId: windowId,
      eventType: "availability_created",
      metadata: { inputFingerprint, resultVersion: 1 },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return { windowId, version: 1 };
  },
});
