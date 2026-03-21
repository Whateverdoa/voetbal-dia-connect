/**
 * One-shot backfill: set club + match logos to locally hosted paths.
 *
 * Usage:
 *   npx convex run import/backfillLogos:backfillAll
 *   npx convex run import/backfillLogos:backfillAll '{"dryRun": true}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { findLocalLogo, LOCAL_LOGOS } from "../lib/localLogos";

export const backfillAll = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const matches = await ctx.db.query("matches").collect();
    const clubs = await ctx.db.query("clubs").collect();

    let clubsUpdated = 0;
    let matchesUpdated = 0;
    let matchesSkipped = 0;

    // --- Step 1: Set DIA club logo to local path ---
    const diaClub = clubs.find((c) => c.slug === "dia");
    if (diaClub) {
      const localDiaLogo = LOCAL_LOGOS["dia"];
      if (diaClub.logoUrl !== localDiaLogo) {
        if (!dryRun) {
          await ctx.db.patch(diaClub._id, { logoUrl: localDiaLogo });
        }
        clubsUpdated++;
      }
    }

    // --- Step 2: Update match opponent logos to local paths ---
    for (const match of matches) {
      const localLogo = findLocalLogo(match.opponent);
      if (!localLogo) {
        matchesSkipped++;
        continue;
      }
      if (match.opponentLogoUrl === localLogo) {
        matchesSkipped++;
        continue;
      }
      if (!dryRun) {
        await ctx.db.patch(match._id, { opponentLogoUrl: localLogo });
      }
      matchesUpdated++;
    }

    return {
      dryRun,
      clubsUpdated,
      matchesUpdated,
      matchesSkipped,
      totalMatches: matches.length,
    };
  },
});
