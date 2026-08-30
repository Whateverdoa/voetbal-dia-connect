import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

type FoundationResult = {
  usersCreated: number;
  membershipsCreated: number;
  profilesCreated: number;
  availabilityWindowsCreated: number;
  openMatchCreated: boolean;
  openNeedCreated: boolean;
};

type MigrationBatchResult = {
  continueCursor: string;
  isDone: boolean;
  scanned: number;
  migrated: number;
  skipped: number;
};

type RefereeFirstSeedResult = {
  foundation: FoundationResult;
  migration: {
    scanned: number;
    migrated: number;
    skipped: number;
  };
};

const foundationResultValidator = v.object({
  usersCreated: v.number(),
  membershipsCreated: v.number(),
  profilesCreated: v.number(),
  availabilityWindowsCreated: v.number(),
  openMatchCreated: v.boolean(),
  openNeedCreated: v.boolean(),
});

export const init = action({
  args: {},
  returns: v.object({
    foundation: foundationResultValidator,
    migration: v.object({
      scanned: v.number(),
      migrated: v.number(),
      skipped: v.number(),
    }),
  }),
  handler: async (ctx): Promise<RefereeFirstSeedResult> => {
    const club: { _id: Id<"clubs"> } | null = await ctx.runQuery(
      api.admin.getClubBySlug,
      { slug: "dia" }
    );
    if (!club) {
      throw new Error("Run seed:init before seed/refereeFirst:init");
    }

    const foundation: FoundationResult = await ctx.runMutation(
      internal.seed.refereeFirstMutations.seedFoundation,
      { clubId: club._id }
    );
    let cursor: string | null = null;
    let isDone = false;
    let scanned = 0;
    let migrated = 0;
    let skipped = 0;

    while (!isDone) {
      const batch: MigrationBatchResult = await ctx.runMutation(
        internal.migrations.refereeAssignments.migrateLegacyAssignmentsBatch,
        { paginationOpts: { cursor, numItems: 100 } }
      );
      cursor = batch.continueCursor;
      isDone = batch.isDone;
      scanned += batch.scanned;
      migrated += batch.migrated;
      skipped += batch.skipped;
    }

    return {
      foundation,
      migration: { scanned, migrated, skipped },
    };
  },
});
