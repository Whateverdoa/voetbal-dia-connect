import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const migrateLegacyAssignmentsBatch = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    scanned: v.number(),
    migrated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("matches")
      .order("asc")
      .paginate(args.paginationOpts);
    let migrated = 0;
    let skipped = 0;

    for (const match of page.page) {
      if (!match.refereeId) {
        skipped += 1;
        continue;
      }

      const existingAssignment = await ctx.db
        .query("refereeAssignments")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .first();
      if (existingAssignment) {
        skipped += 1;
        continue;
      }

      const team = await ctx.db.get(match.teamId);
      const legacyReferee = await ctx.db.get(match.refereeId);
      if (!team || !legacyReferee) {
        skipped += 1;
        continue;
      }

      let profile = await ctx.db
        .query("refereeProfiles")
        .withIndex("by_club_and_legacy_referee", (q) =>
          q.eq("clubId", team.clubId).eq("legacyRefereeId", legacyReferee._id)
        )
        .unique();
      const now = Date.now();

      if (!profile) {
        const profileId = await ctx.db.insert("refereeProfiles", {
          clubId: team.clubId,
          legacyRefereeId: legacyReferee._id,
          displayName: legacyReferee.name,
          status: legacyReferee.active ? "active" : "inactive",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        profile = await ctx.db.get(profileId);
      }
      if (!profile) {
        throw new Error("Legacy referee profile could not be created");
      }

      let need = await ctx.db
        .query("matchRefereeNeeds")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .first();
      const assignmentStatus = match.status === "finished" ? "completed" : "confirmed";
      const needStatus = match.status === "finished" ? "completed" : "assigned";

      if (!need) {
        const needId = await ctx.db.insert("matchRefereeNeeds", {
          matchId: match._id,
          clubId: team.clubId,
          status: needStatus,
          policyVersion: "legacy-v1",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
        need = await ctx.db.get(needId);
      }
      if (!need) {
        throw new Error("Legacy referee need could not be created");
      }

      const confirmedAt = match.scheduledAt ?? match.createdAt;
      const assignmentId = await ctx.db.insert("refereeAssignments", {
        needId: need._id,
        matchId: match._id,
        clubId: team.clubId,
        refereeProfileId: profile._id,
        source: "legacy_migration",
        status: assignmentStatus,
        confirmedAt,
        ...(assignmentStatus === "completed" ? { completedAt: match.finishedAt ?? now } : {}),
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      await ctx.db.insert("assignmentAuditEvents", {
        actorType: "system",
        actorServiceId: "legacy-referee-assignment-migration",
        clubId: team.clubId,
        matchId: match._id,
        needId: need._id,
        assignmentId,
        eventType: "legacy_assignment_migrated",
        newStatus: assignmentStatus,
        metadata: {
          legacyRefereeId: String(legacyReferee._id),
        },
        correlationId: `legacy-assignment:${match._id}`,
        createdAt: now,
      });
      migrated += 1;
    }

    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      scanned: page.page.length,
      migrated,
      skipped,
    };
  },
});
