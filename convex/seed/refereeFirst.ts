import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

type SyntheticBaseResult = {
  clubId: Id<"clubs">;
  clubCreated: boolean;
  teamCreated: boolean;
  refereesCreated: number;
};

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
  base: SyntheticBaseResult;
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
    base: v.object({
      clubId: v.id("clubs"),
      clubCreated: v.boolean(),
      teamCreated: v.boolean(),
      refereesCreated: v.number(),
    }),
    foundation: foundationResultValidator,
    migration: v.object({
      scanned: v.number(),
      migrated: v.number(),
      skipped: v.number(),
    }),
  }),
  handler: async (ctx): Promise<RefereeFirstSeedResult> => {
    const base: SyntheticBaseResult = await ctx.runMutation(
      internal.seed.refereeFirstMutations.ensureSyntheticBase,
      {}
    );

    const foundation: FoundationResult = await ctx.runMutation(
      internal.seed.refereeFirstMutations.seedFoundation,
      { clubId: base.clubId }
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
      base,
      foundation,
      migration: { scanned, migrated, skipped },
    };
  },
});
