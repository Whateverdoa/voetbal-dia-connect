import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

export const backfillMatchCoachIds = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const dryRun = args.dryRun ?? true;

    const coaches = await ctx.db.query("coaches").collect();
    const matches = await ctx.db.query("matches").collect();

    const coachByPin = new Map<string, Id<"coaches">>();
    for (const coach of coaches) {
      if (coach.pin) coachByPin.set(coach.pin, coach._id);
    }

    let updated = 0;
    let unresolved = 0;

    for (const match of matches) {
      if (match.coachId) continue;

      let resolvedCoachId: Id<"coaches"> | undefined;

      if (match.coachPin) {
        resolvedCoachId = coachByPin.get(match.coachPin);
      }

      if (!resolvedCoachId) {
        const candidates = coaches.filter((coach) =>
          coach.teamIds.includes(match.teamId)
        );
        if (candidates.length === 1) {
          resolvedCoachId = candidates[0]._id;
        }
      }

      if (!resolvedCoachId) {
        unresolved++;
        continue;
      }

      updated++;
      if (!dryRun) {
        await ctx.db.patch(match._id, { coachId: resolvedCoachId });
      }
    }

    return { dryRun, totalMatches: matches.length, updated, unresolved };
  },
});

export const cleanupLegacyPinFields = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const dryRun = args.dryRun ?? true;

    const coaches = await ctx.db.query("coaches").collect();
    const referees = await ctx.db.query("referees").collect();
    const matches = await ctx.db.query("matches").collect();

    let cleanedCoaches = 0;
    let cleanedReferees = 0;
    let cleanedMatches = 0;

    for (const coach of coaches) {
      if (!coach.pin) continue;
      cleanedCoaches++;
      if (!dryRun) await ctx.db.patch(coach._id, { pin: undefined });
    }

    for (const referee of referees) {
      if (!referee.pin) continue;
      cleanedReferees++;
      if (!dryRun) await ctx.db.patch(referee._id, { pin: undefined });
    }

    for (const match of matches) {
      if (!match.coachPin) continue;
      cleanedMatches++;
      if (!dryRun) await ctx.db.patch(match._id, { coachPin: undefined });
    }

    return {
      dryRun,
      cleanedCoaches,
      cleanedReferees,
      cleanedMatches,
    };
  },
});
