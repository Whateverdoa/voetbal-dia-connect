/**
 * Daily Sportlink programma sync (schedule changes, new fixtures).
 * Separate from weekend results gate in weeklyUpdate.
 */
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { VoetbalAssistImportSummary } from "./resultsFetch";

type SyncWedstrijdenSummary = {
  created: number;
  updatedScheduledAt: number;
  updatedFinished: number;
  reassignedTeam?: number;
  cancelledMatches: number;
  skippedUnknownTeam: number;
};

export const runDailyProgrammaSync = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    fetchResult: VoetbalAssistImportSummary;
    syncResult: SyncWedstrijdenSummary;
  }> => {
    const fetchResult: VoetbalAssistImportSummary = await ctx.runAction(
      internal.import.resultsFetch.fetchLatestResults,
      {},
    );
    const syncResult = (await ctx.runMutation(
      internal.import.syncWedstrijdenToMatches.syncAllInternal,
      { dryRun: false },
    )) as SyncWedstrijdenSummary;

    console.log(
      `[programmaSync] mapped=${fetchResult.totalMapped} created=${syncResult.created} ` +
        `tijdDrift=${syncResult.updatedScheduledAt} finished=${syncResult.updatedFinished} ` +
        `cancelled=${syncResult.cancelledMatches} unknownTeam=${syncResult.skippedUnknownTeam}`,
    );

    return { fetchResult, syncResult };
  },
});
