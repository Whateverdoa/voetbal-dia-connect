/**
 * Single swap point for “external programma + uitslagen” → staging table `wedstrijden`.
 *
 * Contract for any provider: populate `wedstrijden` (same shape as VoetbalAssist import).
 * Today: VoetbalAssist. When Sportlink lands, replace the implementation below only.
 */
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/** Return shape of `importWedstrijden.fetchAndImportInternal` (and public `fetchAndImport`). */
export type VoetbalAssistImportSummary = {
  totalFromApi: number;
  totalMapped: number;
  totalCreated: number;
  totalSkipped: number;
  batchCount: number;
};

export const fetchLatestResults = internalAction({
  args: {},
  handler: async (ctx): Promise<VoetbalAssistImportSummary> => {
    // TODO(Sportlink): call Sportlink/Club.Dataservice here instead of VoetbalAssist.
    return await ctx.runAction(
      internal.import.importWedstrijden.fetchAndImportInternal,
      {},
    );
  },
});
