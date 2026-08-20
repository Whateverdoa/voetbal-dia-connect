/**
 * Single swap point for “external programma + uitslagen” → staging table `wedstrijden`.
 *
 * Prefers Sportlink when `SPORTLINK_CLIENT_ID` is set; otherwise VoetbalAssist.
 */
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { SportlinkImportSummary } from "./sportlinkFixturesFetch";

/** Return shape shared by VoetbalAssist / Sportlink imports (cron + weeklyUpdate). */
export type VoetbalAssistImportSummary = {
  totalFromApi: number;
  totalMapped: number;
  totalCreated: number;
  totalSkipped: number;
  batchCount: number;
  source?: "sportlink" | "voetbalassist";
  programmaPages?: number;
  uitslagenPages?: number;
};

function toSharedSummary(
  result: SportlinkImportSummary | VoetbalAssistImportSummary,
): VoetbalAssistImportSummary {
  if ("source" in result && result.source === "sportlink") {
    return {
      source: "sportlink",
      totalFromApi: result.totalFromApi,
      totalMapped: result.totalMapped,
      totalCreated: result.totalCreated,
      totalSkipped: result.totalSkipped,
      batchCount: result.batchCount,
      programmaPages: result.programmaPages,
      uitslagenPages: result.uitslagenPages,
    };
  }
  return {
    source: "voetbalassist",
    totalFromApi: result.totalFromApi,
    totalMapped: result.totalMapped,
    totalCreated: result.totalCreated,
    totalSkipped: result.totalSkipped,
    batchCount: result.batchCount,
  };
}

export const fetchLatestResults = internalAction({
  args: {},
  handler: async (ctx): Promise<VoetbalAssistImportSummary> => {
    const clientId = process.env.SPORTLINK_CLIENT_ID?.trim();
    if (clientId) {
      const result = await ctx.runAction(
        internal.import.sportlinkFixturesFetch.fetchAndImportInternal,
        {},
      );
      return toSharedSummary(result);
    }

    const result = await ctx.runAction(
      internal.import.importWedstrijden.fetchAndImportInternal,
      {},
    );
    return toSharedSummary(result);
  },
});
