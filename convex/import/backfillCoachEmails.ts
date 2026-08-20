/**
 * Backfill missing coach emails from last-season TEAM_COACH_DATA (CSV seed).
 *
 * Usage:
 *   npx convex run import/backfillCoachEmails:backfillFromLastSeason '{"dryRun": true}'
 *   npx convex run import/backfillCoachEmails:backfillFromLastSeason '{"dryRun": false}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { TEAM_COACH_DATA } from "../seed/coachData";
import {
  buildCoachEmailIndex,
  findSeedEmailForCoach,
} from "../lib/coachNameMatch";
import {
  getUserAccessByEmail,
  upsertUserAccess,
  type AccessRole,
} from "../lib/userAccess";

function withCoachRole(existing: AccessRole[] | undefined): AccessRole[] {
  return Array.from(
    new Set([...(existing ?? []), "coach" as const])
  ).sort() as AccessRole[];
}

const resultItem = v.object({
  coachId: v.id("coaches"),
  name: v.string(),
  email: v.string(),
  seedName: v.string(),
});

export const backfillFromLastSeason = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    totalCoaches: v.number(),
    alreadyHadEmail: v.number(),
    updated: v.number(),
    unmatched: v.number(),
    skippedEmailTaken: v.number(),
    updatedItems: v.array(resultItem),
    unmatchedNames: v.array(v.string()),
    skippedTakenItems: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        reason: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const seedCoaches = TEAM_COACH_DATA.flatMap((team) => team.coaches);
    const index = buildCoachEmailIndex(seedCoaches);
    const coaches = await ctx.db.query("coaches").collect();

    let alreadyHadEmail = 0;
    let updated = 0;
    let unmatched = 0;
    let skippedEmailTaken = 0;
    const updatedItems: Array<{
      coachId: (typeof coaches)[number]["_id"];
      name: string;
      email: string;
      seedName: string;
    }> = [];
    const unmatchedNames: string[] = [];
    const skippedTakenItems: Array<{
      name: string;
      email: string;
      reason: string;
    }> = [];

    // Track emails assigned in this run to avoid duplicates.
    const claimedEmails = new Set(
      coaches
        .map((c) => c.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e))
    );

    for (const coach of coaches) {
      if (coach.email?.trim()) {
        alreadyHadEmail++;
        continue;
      }

      const hit = findSeedEmailForCoach(index, coach.name);
      if (!hit) {
        unmatched++;
        unmatchedNames.push(coach.name);
        continue;
      }

      if (claimedEmails.has(hit.email)) {
        skippedEmailTaken++;
        skippedTakenItems.push({
          name: coach.name,
          email: hit.email,
          reason: "E-mail al in gebruik door andere coach",
        });
        continue;
      }

      const existingByEmail = await ctx.db
        .query("coaches")
        .withIndex("by_email", (q) => q.eq("email", hit.email))
        .first();
      if (existingByEmail && existingByEmail._id !== coach._id) {
        skippedEmailTaken++;
        skippedTakenItems.push({
          name: coach.name,
          email: hit.email,
          reason: "E-mail al gekoppeld in database",
        });
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(coach._id, { email: hit.email });
        const existingAccess = await getUserAccessByEmail(ctx, hit.email);
        await upsertUserAccess(ctx, {
          email: hit.email,
          roles: withCoachRole(existingAccess?.roles),
          coachId: coach._id,
          refereeId: existingAccess?.refereeId,
          source: "migration_backfill",
        });
      }

      claimedEmails.add(hit.email);
      updated++;
      updatedItems.push({
        coachId: coach._id,
        name: coach.name,
        email: hit.email,
        seedName: hit.name,
      });
    }

    unmatchedNames.sort((a, b) => a.localeCompare(b, "nl-NL"));
    updatedItems.sort((a, b) => a.name.localeCompare(b.name, "nl-NL"));

    return {
      dryRun,
      totalCoaches: coaches.length,
      alreadyHadEmail,
      updated,
      unmatched,
      skippedEmailTaken,
      updatedItems,
      unmatchedNames,
      skippedTakenItems,
    };
  },
});
