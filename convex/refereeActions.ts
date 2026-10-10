/**
 * Referee assignment mutations.
 *
 * Split from matchActions.ts to respect the 300-LOC rule.
 * Re-exported via matchActions for a single public API surface.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { verifyCoachTeamMembership } from "./pinHelpers";
import { hasScheduleOverlap } from "../src/lib/referee/eligibility";

/** Assign or unassign a referee to a match (coach-only) */
export const assignReferee = mutation({
  args: {
    matchId: v.id("matches"),
    refereeId: v.optional(v.id("referees")),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    if (args.refereeId) {
      const referee = await ctx.db.get(args.refereeId);
      if (!referee) {
        throw new Error("Scheidsrechter niet gevonden");
      }
      if (!referee.active) {
        throw new Error("Scheidsrechter is niet actief");
      }

      if (match.scheduledAt !== undefined) {
        const mine = await ctx.db
          .query("matches")
          .withIndex("by_refereeId", (q) => q.eq("refereeId", args.refereeId!))
          .collect();
        const others = mine.filter((m) => m._id !== match._id);
        if (
          hasScheduleOverlap(
            {
              scheduledAt: match.scheduledAt,
              regulationDurationMinutes: match.regulationDurationMinutes,
            },
            others
          )
        ) {
          throw new Error("Scheidsrechter heeft al een overlappende wedstrijd");
        }
      }

      await ctx.db.patch(args.matchId, { refereeId: args.refereeId });
      const team = await ctx.db.get(match.teamId);
      await ctx.scheduler.runAfter(
        0,
        internal.refereeNotifications.notifyAssigned,
        {
          refereeId: args.refereeId,
          matchId: args.matchId,
          body: `Je bent toegewezen aan ${team?.name ?? "Team"} vs ${match.opponent}.`,
        }
      );
    } else {
      await ctx.db.patch(args.matchId, { refereeId: undefined });
    }
  },
});
